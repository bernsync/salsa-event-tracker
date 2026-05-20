import { localDateString, formatDate, dateRange } from "./date-utils.js";
import { escapeHtml, setSelectOptions } from "./dom-utils.js";
import { cleanTripLabel, isImportProvenanceNote } from "./event-metadata.js";
import {
  addDays,
  formatPtoAmount,
  holidayForDate,
  ptoYearStats as calculatePtoYearStats,
  schengenTripSegmentDetails as calculateSchengenTripSegmentDetails,
  schengenTripStats as calculateSchengenTripStats,
  schengenUsedOn as calculateSchengenUsedOn,
  schengenWindowDetails as calculateSchengenWindowDetails,
  tripCountries,
  tripHasSchengenImpact as calculateTripHasSchengenImpact,
  tripMonths,
  tripPtoStats,
  tripYears
} from "./trip-calculations.js";
import { monthOptions } from "./event-date-utils.js";
import { buildTripSavePayload, deletePersonalTrip, savePersonalTrip } from "./trip-api.js";

export function createTripsView({
  Api,
  state,
  elements,
  isSignedIn,
  currentUserId,
  currentUserEmail,
  loadSupabasePersonalTrips,
  render,
  schengenStatus,
  schengenLabel,
  emptyState,
  detailRow,
  cardCollapseButton,
  collapsibleCardBody
}) {
  function uniqueValues(values) {
    return [...new Set(values)];
  }

  function currentYearValue() {
    return localDateString(new Date()).slice(0, 4);
  }

  function ptoYearStats(year) {
    return calculatePtoYearStats(state.personalTrips, year);
  }

  function tripHasSchengenImpact(trip) {
    return calculateTripHasSchengenImpact(trip, state.schengenCheckDate, schengenStatus);
  }

  function tripMatchesFilters(trip) {
    const today = localDateString(new Date());
    const isPastTrip = trip.endDate < today;
    const includeHistorical = state.showHistoricalTrips || (state.showSchengenImpactingTrips && tripHasSchengenImpact(trip));
    if (isPastTrip && !includeHistorical) return false;
    if (state.showSchengenImpactingTrips && !tripHasSchengenImpact(trip)) return false;
    if (state.tripCountry && !tripCountries(trip).includes(state.tripCountry)) return false;
    if (state.tripYear && !tripYears(trip).includes(state.tripYear)) return false;
    if (state.tripMonth && !tripMonths(trip).includes(state.tripMonth)) return false;
    return true;
  }

  function filteredTrips() {
    return [...state.personalTrips]
      .filter(tripMatchesFilters)
      .sort((a, b) => a.startDate.localeCompare(b.startDate));
  }

  function populateTripFilters() {
    if (elements.tripHistoryToggle) elements.tripHistoryToggle.checked = state.showHistoricalTrips;
    if (elements.schengenImpactToggle) elements.schengenImpactToggle.checked = state.showSchengenImpactingTrips;

    const countries = uniqueValues(state.personalTrips.flatMap(tripCountries)).sort((a, b) => a.localeCompare(b));
    if (state.tripCountry && !countries.includes(state.tripCountry)) state.tripCountry = "";
    setSelectOptions(
      elements.tripCountrySelect,
      [{ value: "", label: "All countries" }, ...countries.map((country) => ({ value: country, label: country }))],
      state.tripCountry
    );

    const years = uniqueValues(state.personalTrips.flatMap(tripYears)).sort();
    if (state.tripYear && !years.includes(state.tripYear)) state.tripYear = "";
    setSelectOptions(
      elements.tripYearSelect,
      [{ value: "", label: "All years" }, ...years.map((year) => ({ value: year, label: year }))],
      state.tripYear
    );

    setSelectOptions(elements.tripMonthSelect, monthOptions(), state.tripMonth);
  }

  function tripDateRange(item) {
    return dateRange({ startDate: item.startDate, endDate: item.endDate });
  }

  function schengenUsedOn(dateValue) {
    return calculateSchengenUsedOn(state.personalTrips, dateValue, schengenStatus);
  }

  function tripPlaceKey(place) {
    return [place.id || "", place.sequence ?? "", place.startDate, place.endDate, place.city, place.country].join("|");
  }

  function schengenTripSegmentDayMap(trip) {
    return new Map(calculateSchengenTripSegmentDetails(trip, schengenStatus).map((place) => [tripPlaceKey(place), place.days]));
  }

  function schengenTripStats(trip) {
    return calculateSchengenTripStats(state.personalTrips, trip, schengenStatus);
  }

  function schengenWindowDetails() {
    return calculateSchengenWindowDetails(state.personalTrips, state.schengenCheckDate, schengenStatus);
  }

  function dayCountLabel(days) {
    return `${days} day${days === 1 ? "" : "s"}`;
  }

  function renderSchengenWindowSummary(details) {
    const segmentRows = details.segments.map((place) => `
      <div class="schengen-impact-row">
        <strong>${escapeHtml(tripDateRange(place))}</strong>
        <span>${escapeHtml([place.city, place.country].filter(Boolean).join(", "))}</span>
        <span>${escapeHtml(cleanTripLabel(place.trip.label) || place.trip.label)}</span>
        <span class="pill score-pill">${escapeHtml(dayCountLabel(place.days))}</span>
      </div>
    `).join("");
    return `
      <article class="event-card schengen-window-card">
        <details>
          <summary>
            <span>
              <strong>Schengen day detail</strong>
              <small>${escapeHtml(dayCountLabel(details.used))} counted from ${escapeHtml(formatDate(details.windowStart))} - ${escapeHtml(formatDate(details.windowEnd))}</small>
            </span>
          </summary>
          ${segmentRows ? `
            <div class="schengen-impact-list">
              ${segmentRows}
            </div>
          ` : "<p class=\"muted\">No Schengen trip segments impact this check date.</p>"}
        </details>
      </article>
    `;
  }

  function renderTrips() {
    if (!elements.tripList || !elements.schengenSummary) return;
    elements.schengenCheckDate.value = state.schengenCheckDate;
    elements.tripList.innerHTML = "";
    elements.schengenSummary.innerHTML = "";
    if (elements.ptoYearSummary) elements.ptoYearSummary.innerHTML = "";
    if (!isSignedIn()) return;
    populateTripFilters();

    const usedOnCheckDate = schengenUsedOn(state.schengenCheckDate);
    const windowStart = addDays(state.schengenCheckDate, -180);
    const windowDetails = schengenWindowDetails();
    elements.schengenSummary.innerHTML = `
      <article class="summary-card">
        <span class="detail-label">Check date</span>
        <strong>${escapeHtml(formatDate(state.schengenCheckDate))}</strong>
        <p class="muted">Includes today and 180 days back: ${escapeHtml(formatDate(windowStart))} - ${escapeHtml(formatDate(state.schengenCheckDate))}</p>
      </article>
      <article class="summary-card ${usedOnCheckDate > 90 ? "is-danger" : ""}">
        <span class="detail-label">Schengen days used</span>
        <strong>${usedOnCheckDate} / 90</strong>
        <p class="muted">${Math.max(0, 90 - usedOnCheckDate)} days remaining</p>
      </article>
      ${renderSchengenWindowSummary(windowDetails)}
    `;
    renderPtoYearSummary();

    if (!state.personalTrips.length) {
      elements.tripList.append(emptyState("No trips yet", "Add city-by-city trip rows to start counting Schengen days."));
      return;
    }

    const trips = filteredTrips();
    if (!trips.length) {
      elements.tripList.append(emptyState("No matching trips", "Adjust the trip filters or turn on historical trips."));
      return;
    }

    trips.forEach((trip) => {
      const stats = schengenTripStats(trip);
      const ptoStats = tripPtoStats(trip);
      const visibleTripNotes = isImportProvenanceNote(trip.notes) ? "" : trip.notes;
      const collapseId = trip.id;
      const segmentDayMap = schengenTripSegmentDayMap(trip);
      const placesMarkup = trip.places.map((place) => {
        const schengenDays = segmentDayMap.get(tripPlaceKey(place)) || 0;
        return `
          <div class="trip-place">
            <strong>${escapeHtml(tripDateRange(place))}</strong>
            <span>${escapeHtml([place.city, place.country].filter(Boolean).join(", "))}</span>
            <span class="trip-place-pills">
              <span class="pill ${schengenStatus(place) ? "score-pill" : "location-pill"}">${schengenLabel(place) || "Schengen unknown"}</span>
              ${schengenDays ? `<span class="pill score-pill">${escapeHtml(dayCountLabel(schengenDays))}</span>` : ""}
            </span>
          </div>
        `;
      }).join("");
      const ptoMarkup = (trip.ptoDays || []).map((ptoDay) => {
        const holiday = holidayForDate(ptoDay.date);
        return `
          <div class="trip-place pto-place ${holiday ? "is-holiday" : ""}">
            <strong>${escapeHtml(formatDate(ptoDay.date))}</strong>
            <span>${escapeHtml(ptoDay.notes || "PTO")}</span>
            <span class="pill ${holiday ? "location-pill" : "score-pill"}">${escapeHtml(holiday || formatPtoAmount(ptoDay.amount))}</span>
          </div>
        `;
      }).join("");
      const card = document.createElement("article");
      card.className = "event-card trip-card";
      card.innerHTML = `
        <div class="event-card-header">
          <div>
            <h3>${escapeHtml(cleanTripLabel(trip.label) || trip.label)}</h3>
            <p class="muted">${escapeHtml(tripDateRange(trip))}</p>
          </div>
          <div class="card-header-actions">
            <span class="pill score-pill">${stats.daysAdded} days</span>
            ${cardCollapseButton("trips", collapseId)}
          </div>
        </div>
        ${collapsibleCardBody("trips", collapseId, `
          <div class="event-detail">
            ${detailRow("First Schengen day count", stats.entryDate ? `${stats.entryUsed} / 90 on ${formatDate(stats.entryDate)}` : "0 / 90")}
            ${detailRow("Last Schengen day count", stats.exitDate ? `${stats.exitUsed} / 90 on ${formatDate(stats.exitDate)}` : "0 / 90")}
            ${detailRow("Max during trip", `${stats.maxUsed} / 90`)}
            ${detailRow("PTO count", `${formatPtoAmount(ptoStats.counted)}${ptoStats.holidays ? ` (${ptoStats.holidays} holiday${ptoStats.holidays === 1 ? "" : "s"} excluded)` : ""}`)}
            ${visibleTripNotes ? detailRow("Notes", visibleTripNotes) : ""}
          </div>
          <div class="trip-place-list">${placesMarkup}</div>
          ${ptoMarkup ? `<div class="trip-place-list pto-place-list">${ptoMarkup}</div>` : ""}
        `)}
      `;
      elements.tripList.append(card);
    });
  }

  function renderPtoYearSummary() {
    if (!elements.ptoYearSummary) return;
    const year = currentYearValue();
    const stats = ptoYearStats(year);
    const ptoRows = stats.ptoDays.slice(0, 8).map((ptoDay) => {
      const holiday = holidayForDate(ptoDay.date);
      return `
        <div class="pto-year-row ${holiday ? "is-holiday" : ""}">
          <strong>${escapeHtml(formatDate(ptoDay.date))}</strong>
          <span>${escapeHtml(cleanTripLabel(ptoDay.trip.label) || ptoDay.trip.label)}</span>
          <span class="pill ${holiday ? "location-pill" : "score-pill"}">${escapeHtml(holiday || formatPtoAmount(ptoDay.amount))}</span>
        </div>
      `;
    }).join("");
    const hiddenCount = Math.max(0, stats.ptoDays.length - 8);
    elements.ptoYearSummary.innerHTML = `
      <article class="event-card pto-year-card">
        <div class="event-card-header">
          <div>
            <h3>${escapeHtml(year)} PTO tracker</h3>
            <p class="muted">Full and half PTO days, with holidays excluded from the total.</p>
          </div>
          <span class="pill score-pill">${escapeHtml(formatPtoAmount(stats.counted))}</span>
        </div>
        <div class="summary-grid pto-year-grid">
          <article class="summary-card">
            <span class="detail-label">PTO used</span>
            <strong>${escapeHtml(formatPtoAmount(stats.counted))}</strong>
            <p class="muted">${escapeHtml(formatPtoAmount(stats.requested))} requested before holiday exclusions</p>
          </article>
          <article class="summary-card">
            <span class="detail-label">Breakdown</span>
            <strong>${stats.fullDays} full / ${stats.halfDays} half</strong>
            <p class="muted">${stats.holidays.length} holiday${stats.holidays.length === 1 ? "" : "s"} excluded</p>
          </article>
        </div>
        ${ptoRows ? `<div class="pto-year-list">${ptoRows}${hiddenCount ? `<p class="muted">+ ${hiddenCount} more PTO entr${hiddenCount === 1 ? "y" : "ies"}</p>` : ""}</div>` : "<p class=\"muted\">No PTO days marked for this year yet.</p>"}
      </article>
    `;
  }

  function tripPlaceTemplate(place = {}) {
    const row = document.createElement("section");
    row.className = "trip-place-row";
    row.innerHTML = `
      <div class="form-grid trip-place-grid">
        <label class="field">
          <span>Start</span>
          <input data-trip-place="startDate" type="date" value="${escapeHtml(place.startDate || elements.tripStartDate.value || localDateString(new Date()))}" required>
        </label>
        <label class="field">
          <span>End</span>
          <input data-trip-place="endDate" type="date" value="${escapeHtml(place.endDate || place.startDate || elements.tripEndDate.value || localDateString(new Date()))}" required>
        </label>
        <label class="field">
          <span>City</span>
          <input data-trip-place="city" type="text" value="${escapeHtml(place.city || "")}" required>
        </label>
        <label class="field">
          <span>Country</span>
          <input data-trip-place="country" type="text" value="${escapeHtml(place.country || "")}" required>
        </label>
        <label class="field">
          <span>Role</span>
          <select data-trip-place="role">
            ${["stay", "origin", "stop", "destination"].map((role) => `<option value="${role}" ${role === (place.role || "stay") ? "selected" : ""}>${role}</option>`).join("")}
          </select>
        </label>
        <label class="field">
          <span>Event</span>
          <select data-trip-place="eventId">
            <option value="">No event</option>
            ${state.events.map((event) => `<option value="${escapeHtml(event.id)}" ${event.id === place.eventId ? "selected" : ""}>${escapeHtml(`${event.name} (${event.startDate})`)}</option>`).join("")}
          </select>
        </label>
      </div>
      <label class="field">
        <span>Place notes</span>
        <input data-trip-place="notes" type="text" value="${escapeHtml(place.notes || "")}" placeholder="Flight, hotel, or Schengen note">
      </label>
      <button class="secondary-action" type="button" data-trip-action="remove-place">Remove city</button>
    `;
    return row;
  }

  function addTripPlaceRow(place) {
    elements.tripPlacesEditor.append(tripPlaceTemplate(place));
  }

  function ptoDayTemplate(ptoDay = {}) {
    const row = document.createElement("section");
    row.className = "trip-pto-row";
    const dateValue = ptoDay.date || elements.tripStartDate.value || localDateString(new Date());
    row.innerHTML = `
      <div class="form-grid pto-day-grid">
        <label class="field">
          <span>Date</span>
          <input data-pto-day="date" type="date" value="${escapeHtml(dateValue)}" required>
        </label>
        <label class="field">
          <span>Amount</span>
          <select data-pto-day="amount">
            <option value="1" ${Number(ptoDay.amount || 1) === 1 ? "selected" : ""}>Full day</option>
            <option value="0.5" ${Number(ptoDay.amount) === 0.5 ? "selected" : ""}>Half day</option>
          </select>
        </label>
        <label class="field">
          <span>Note</span>
          <input data-pto-day="notes" type="text" value="${escapeHtml(ptoDay.notes || "")}" placeholder="Optional PTO note">
        </label>
        <div class="pto-day-status" data-pto-holiday>${escapeHtml(holidayForDate(dateValue) || "Counts as PTO")}</div>
      </div>
      <button class="secondary-action" type="button" data-trip-action="remove-pto">Remove PTO</button>
    `;
    return row;
  }

  function addPtoDayRow(ptoDay) {
    elements.ptoDaysEditor.append(ptoDayTemplate(ptoDay));
  }

  function openTripDialog(tripId = "") {
    const trip = state.personalTrips.find((item) => item.id === tripId);
    elements.tripDialogTitle.textContent = trip ? "Edit trip" : "Add trip";
    elements.tripId.value = trip?.id || "";
    elements.tripLabel.value = trip?.label || "";
    elements.tripStartDate.value = trip?.startDate || localDateString(new Date());
    elements.tripEndDate.value = trip?.endDate || trip?.startDate || localDateString(new Date());
    elements.tripNotes.value = trip?.notes || "";
    elements.deleteTripBtn.hidden = !trip;
    elements.tripPlacesEditor.innerHTML = "";
    elements.ptoDaysEditor.innerHTML = "";
    (trip?.places?.length ? trip.places : [{}]).forEach(addTripPlaceRow);
    (trip?.ptoDays || []).forEach(addPtoDayRow);
    elements.tripDialog.showModal();
  }

  function closeTripDialog() {
    if (elements.tripDialog?.open) {
      elements.tripDialog.close();
    }
  }

  function collectTripPlaces() {
    return [...elements.tripPlacesEditor.querySelectorAll(".trip-place-row")].map((row, index) => {
      const value = (field) => row.querySelector(`[data-trip-place="${field}"]`)?.value.trim() || "";
      const startDate = value("startDate");
      const endDate = value("endDate") < startDate ? startDate : value("endDate");
      return {
        startDate,
        endDate,
        city: value("city"),
        country: value("country"),
        role: value("role") || "stay",
        eventId: value("eventId"),
        notes: value("notes"),
        sequence: index
      };
    });
  }

  function collectPtoDays() {
    return [...elements.ptoDaysEditor.querySelectorAll(".trip-pto-row")].map((row) => {
      const value = (field) => row.querySelector(`[data-pto-day="${field}"]`)?.value.trim() || "";
      return {
        date: value("date"),
        amount: Number(value("amount") || 1),
        notes: value("notes")
      };
    }).filter((ptoDay) => ptoDay.date);
  }

  function updatePtoHolidayStatus(row) {
    const dateValue = row.querySelector('[data-pto-day="date"]')?.value || "";
    const status = row.querySelector("[data-pto-holiday]");
    if (!status) return;
    const holiday = holidayForDate(dateValue);
    status.textContent = holiday || "Counts as PTO";
    status.classList.toggle("is-holiday", Boolean(holiday));
  }

  async function saveTrip(event) {
    event.preventDefault();
    if (!elements.tripForm.reportValidity()) return;
    if (!isSignedIn()) return;

    const places = collectTripPlaces();
    const ptoDays = collectPtoDays();
    if (!places.length) {
      window.alert("Add at least one city segment.");
      return;
    }

    const startDate = elements.tripStartDate.value;
    const endDate = elements.tripEndDate.value < startDate ? startDate : elements.tripEndDate.value;
    const tripId = elements.tripId.value;
    const payload = buildTripSavePayload({
      tripId,
      label: elements.tripLabel.value,
      startDate,
      endDate,
      notes: elements.tripNotes.value,
      places,
      ptoDays,
      ownerId: currentUserId(),
      ownerEmail: currentUserEmail()
    });

    try {
      await savePersonalTrip(Api, payload);
      closeTripDialog();
      state.personalTrips = await loadSupabasePersonalTrips();
      render();
    } catch (error) {
      window.alert(error.message);
    }
  }

  async function deleteTrip(tripId) {
    if (!tripId) return;
    const trip = state.personalTrips.find((item) => item.id === tripId);
    const confirmed = window.confirm(`Delete ${trip?.label || "this trip"}?`);
    if (!confirmed) return;
    try {
      await deletePersonalTrip(Api, tripId);
      closeTripDialog();
      state.personalTrips = await loadSupabasePersonalTrips();
      render();
    } catch (error) {
      window.alert(error.message);
    }
  }

  function bindEvents() {
    elements.addTripBtn?.addEventListener("click", () => openTripDialog());
    elements.tripForm?.addEventListener("submit", saveTrip);
    elements.addTripPlaceBtn?.addEventListener("click", () => addTripPlaceRow());
    elements.addPtoDayBtn?.addEventListener("click", () => addPtoDayRow());
    elements.tripPlacesEditor?.addEventListener("click", (event) => {
      const target = event.target.closest("[data-trip-action]");
      if (!target) return;
      if (target.dataset.tripAction === "remove-place") {
        target.closest(".trip-place-row")?.remove();
      }
    });
    elements.ptoDaysEditor?.addEventListener("click", (event) => {
      const target = event.target.closest("[data-trip-action]");
      if (!target) return;
      if (target.dataset.tripAction === "remove-pto") {
        target.closest(".trip-pto-row")?.remove();
      }
    });
    elements.ptoDaysEditor?.addEventListener("change", (event) => {
      if (event.target.matches('[data-pto-day="date"]')) {
        updatePtoHolidayStatus(event.target.closest(".trip-pto-row"));
      }
    });
    elements.tripDialog?.addEventListener("click", (event) => {
      const target = event.target.closest("[data-trip-action]");
      if (!target) return;
      if (target.dataset.tripAction === "close") closeTripDialog();
    });
    elements.deleteTripBtn?.addEventListener("click", () => deleteTrip(elements.tripId.value));
  }

  return {
    bindEvents,
    renderTrips,
    openTripDialog
  };
}
