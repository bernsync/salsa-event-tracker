import { Api, mapSupabaseEvents as mapApiSupabaseEvents } from "./api.js";
import { localDateString, formatDate, dateRange, monthOverlaps } from "./date-utils.js";
import { escapeHtml, setSelectOptions } from "./dom-utils.js";
import {
  cleanTripLabel,
  formatEventSize,
  formatStyles,
  isWatchlistEvent,
  watchlistLabel
} from "./event-metadata.js";
import {
  formatPtoAmount,
  holidayForDate
} from "./trip-calculations.js";
import { eventLocation, eventPrice } from "./event-view-utils.js";
import { sourceLink } from "./link-utils.js";
import { mapSupabaseReview, mapSupabaseTrip } from "./supabase-mappers.js";
import { downloadCalendarFile, googleCalendarUrl } from "./calendar-links.js";
import { eventForTripPlace, tripPlaceMatchesEvent } from "./trip-event-matching.js";
import { normalizeText } from "./text-utils.js";
import {
  eventMonthValue,
  eventOccursOnDate,
  eventYear,
  isHistorical,
  monthOptions
} from "./event-date-utils.js";
import {
  reviewScoreForEvent as calculateReviewScoreForEvent,
} from "./review-scoring.js";
import {
  authSessionFromStorage,
  authSessionFromUrlHash,
  clearAuthSession,
  currentUserEmail as sessionUserEmail,
  currentUserId as sessionUserId,
  saveAuthSession
} from "./auth-session.js";
import { createTripsView } from "./trips-view.js";
import { createReviewsView } from "./reviews-view.js";

const storageKey = "salsa-festivals-tracker-v1";

const loadStatusLabels = {
  loaded: "Loaded",
  error: "Error",
  "not-configured": "Not configured",
  "signed-out": "Signed out",
  "optional-unavailable": "Optional data unavailable"
};

const state = {
  events: [],
  reviews: [],
  trips: [],
  personalTrips: [],
  authSession: null,
  danceStyles: [],
  schengenCountries: new Map(),
  schengenCountriesLoaded: false,
  supabaseLoadStatus: {},
  activeView: localStorage.getItem("salsa-festivals-active-view") || "calendar",
  search: "",
  sort: "date",
  selectedMonth: localDateString(new Date()).slice(0, 7),
  selectedCalendarDate: localDateString(new Date()),
  hideDuplicateAttendedEvents: localStorage.getItem("salsa-festivals-hide-duplicate-attended") !== "false",
  attendedOnlyCalendar: localStorage.getItem("salsa-festivals-attended-only-calendar") === "true",
  mobileCalendarMonthView: localStorage.getItem("salsa-festivals-mobile-calendar-month-view") === "true",
  showHistorical: false,
  festivalYear: localStorage.getItem("salsa-festivals-event-list-year") || String(new Date().getFullYear()),
  listYear: "",
  listMonth: "",
  festivalMonth: "",
  festivalCountry: "",
  festivalSize: "",
  showHistoricalTrips: localStorage.getItem("salsa-festivals-show-historical-trips") === "true",
  showSchengenImpactingTrips: localStorage.getItem("salsa-festivals-show-schengen-impacting-trips") === "true",
  tripCountry: "",
  tripYear: "",
  tripMonth: "",
  collapsedCards: {
    calendarList: { all: true, expanded: new Set(), collapsed: new Set() },
    eventList: { all: true, expanded: new Set(), collapsed: new Set() },
    recentlyAdded: { all: true, expanded: new Set(), collapsed: new Set() },
    trips: { all: true, expanded: new Set(), collapsed: new Set() },
    reviews: { all: true, expanded: new Set(), collapsed: new Set() }
  },
  schengenCheckDate: localDateString(new Date())
};

const $ = (selector) => document.querySelector(selector);

const elements = {
  tabs: document.querySelectorAll(".tab"),
  views: document.querySelectorAll(".view"),
  reviewTab: document.querySelector('[data-view="reviews"]'),
  tripsTab: document.querySelector('[data-view="trips"]'),
  authStatus: $("#authStatus"),
  dataStatus: $("#dataStatus"),
  authDialog: $("#authDialog"),
  authForm: $("#authForm"),
  authEmail: $("#authEmail"),
  authPassword: $("#authPassword"),
  authMessage: $("#authMessage"),
  reviewAuthPanel: $("#reviewAuthPanel"),
  tripsAuthPanel: $("#tripsAuthPanel"),
  calendarView: $("#calendarView"),
  monthPicker: $("#monthPicker"),
  calendarMonthJump: $("#calendarMonthJump"),
  monthJumpRail: $("#monthJumpRail"),
  mobileCalendarModeToggle: $("#mobileCalendarModeToggle"),
  hideDuplicateAttendedToggle: $("#hideDuplicateAttendedToggle"),
  attendedOnlyToggle: $("#attendedOnlyToggle"),
  prevMonthBtn: $("#prevMonthBtn"),
  nextMonthBtn: $("#nextMonthBtn"),
  calendarGrid: $("#calendarGrid"),
  calendarSelectedDay: $("#calendarSelectedDay"),
  eventList: $("#eventList"),
  festivalList: $("#festivalList"),
  festivalSearchInput: $("#festivalSearchInput"),
  festivalYearSelect: $("#festivalYearSelect"),
  festivalCountrySelect: $("#festivalCountrySelect"),
  festivalSizeSelect: $("#festivalSizeSelect"),
  recentlyAddedList: $("#recentlyAddedList"),
  tripsView: $("#tripsView"),
  tripList: $("#tripList"),
  schengenSummary: $("#schengenSummary"),
  ptoYearSummary: $("#ptoYearSummary"),
  schengenCheckDate: $("#schengenCheckDate"),
  tripHistoryToggle: $("#tripHistoryToggle"),
  schengenImpactToggle: $("#schengenImpactToggle"),
  tripCountrySelect: $("#tripCountrySelect"),
  tripYearSelect: $("#tripYearSelect"),
  tripMonthSelect: $("#tripMonthSelect"),
  addTripBtn: $("#addTripBtn"),
  tripDialog: $("#tripDialog"),
  tripForm: $("#tripForm"),
  tripDialogTitle: $("#tripDialogTitle"),
  tripId: $("#tripId"),
  tripLabel: $("#tripLabel"),
  tripStartDate: $("#tripStartDate"),
  tripEndDate: $("#tripEndDate"),
  tripNotes: $("#tripNotes"),
  tripPlacesEditor: $("#tripPlacesEditor"),
  addTripPlaceBtn: $("#addTripPlaceBtn"),
  ptoDaysEditor: $("#ptoDaysEditor"),
  addPtoDayBtn: $("#addPtoDayBtn"),
  deleteTripBtn: $("#deleteTripBtn"),
  saveTripBtn: $("#saveTripBtn"),
  reviewsView: $("#reviewsView"),
  eventDetailsDialog: $("#eventDetailsDialog"),
  eventDetailsTitle: $("#eventDetailsTitle"),
  eventDetailsMeta: $("#eventDetailsMeta"),
  eventDetailsBody: $("#eventDetailsBody"),
  eventDetailsLinks: $("#eventDetailsLinks"),
  reviewList: $("#reviewList"),
  todayBtn: $("#todayBtn"),
  searchInput: $("#searchInput"),
  listYearSelect: $("#listYearSelect"),
  listMonthSelect: $("#listMonthSelect"),
  sortSelect: $("#sortSelect"),
  historyToggle: $("#historyToggle"),
  collapseCalendarListBtn: $("#collapseCalendarListBtn"),
  expandCalendarListBtn: $("#expandCalendarListBtn"),
  festivalMonthSelect: $("#festivalMonthSelect"),
  collapseFestivalListBtn: $("#collapseFestivalListBtn"),
  expandFestivalListBtn: $("#expandFestivalListBtn"),
  collapseRecentlyAddedBtn: $("#collapseRecentlyAddedBtn"),
  expandRecentlyAddedBtn: $("#expandRecentlyAddedBtn"),
  collapseTripsBtn: $("#collapseTripsBtn"),
  expandTripsBtn: $("#expandTripsBtn"),
  collapseReviewsBtn: $("#collapseReviewsBtn"),
  expandReviewsBtn: $("#expandReviewsBtn"),
  backToTopBtn: $("#backToTopBtn"),
  reviewDialog: $("#reviewDialog"),
  reviewEventName: $("#reviewEventName"),
  reviewEventId: $("#reviewEventId"),
  reviewId: $("#reviewId"),
  scoreFields: $("#scoreFields"),
  liveScore: $("#liveScore"),
  topReason: $("#topReason"),
  reviewNotes: $("#reviewNotes"),
  saveReviewBtn: $("#saveReviewBtn"),
  emptyStateTemplate: $("#emptyStateTemplate")
};

let tripsView;
let reviewsView;

function loadState() {
  localStorage.removeItem(storageKey);
  state.events = [];
  state.reviews = [];
}

function loadAuthSession() {
  const urlSession = authSessionFromUrlHash(location.hash);
  if (urlSession) {
    state.authSession = urlSession;
    saveAuthSession(urlSession);
    history.replaceState(null, "", `${location.pathname}${location.search}`);
    return;
  }
  state.authSession = authSessionFromStorage();
}

function isSignedIn() {
  return Boolean(state.authSession?.accessToken);
}

function viewAllowed(view) {
  return !["reviews", "trips"].includes(view) || isSignedIn();
}

function setSupabaseLoadStatus(table, status, count = 0) {
  state.supabaseLoadStatus[table] = { status, count };
}

function tableStatusItems(status = {}) {
  return Object.entries(status).map(([table, value]) => ({
    table,
    status: value.status,
    count: value.count || 0,
    label: loadStatusLabels[value.status] || value.status
  }));
}

function hasLoadWarnings(status = {}) {
  return tableStatusItems(status).some((item) => item.status === "error" || item.status === "not-configured");
}

function clearPrivateSupabaseData() {
  state.reviews = [];
  state.trips = [];
  state.personalTrips = [];
  setSupabaseLoadStatus("reviews", "signed-out");
  setSupabaseLoadStatus("trips", "signed-out");
  setSupabaseLoadStatus("personal_trips", "signed-out");
  setSupabaseLoadStatus("personal_pto_days", "signed-out");
}

function currentUserId() {
  return sessionUserId(state.authSession);
}

function currentUserEmail() {
  return sessionUserEmail(state.authSession);
}

async function signInWithPassword(email, password) {
  return await Api.signIn(email, password);
}

function signOut() {
  state.authSession = null;
  clearPrivateSupabaseData();
  clearAuthSession();
  closeAuthDialog();
  renderAuth();
  render();
  switchView("calendar");
}

function openAuthDialog() {
  elements.authMessage.textContent = "";
  elements.authPassword.value = "";
  if (elements.authDialog?.showModal) {
    elements.authDialog.showModal();
  }
  elements.authEmail.focus();
}

function closeAuthDialog() {
  if (elements.authDialog?.open) {
    elements.authDialog.close();
  }
}

async function loadSupabaseEvents() {
  const config = window.supabaseConfig;
  if (!config?.url || !config?.publishableKey) {
    setSupabaseLoadStatus("events", "not-configured");
    setSupabaseLoadStatus("event_editions", "not-configured");
    return [];
  }

  try {
    const rows = await Api.fetchPublicEvents();
    setSupabaseLoadStatus("events", "loaded", rows.length);
    setSupabaseLoadStatus(
      "event_editions",
      "loaded",
      rows.reduce((total, row) => total + (Array.isArray(row.event_editions) ? row.event_editions.length : 0), 0)
    );
    return mapApiSupabaseEvents(rows);
  } catch (error) {
    console.warn("Supabase public events unavailable.", error);
    setSupabaseLoadStatus("events", "error");
    setSupabaseLoadStatus("event_editions", "error");
    return [];
  }
}

async function loadSupabaseSchengenCountries() {
  const config = window.supabaseConfig;
  if (!config?.url || !config?.publishableKey) {
    setSupabaseLoadStatus("schengen_countries", "not-configured");
    return new Map();
  }

  try {
    const rows = await Api.fetchSchengenCountries();
    setSupabaseLoadStatus("schengen_countries", "loaded", rows.length);
    return new Map(rows.map((row) => [normalizeText(row.country_name), Boolean(row.is_schengen)]));
  } catch (error) {
    console.warn("Supabase Schengen country data unavailable.", error);
    setSupabaseLoadStatus("schengen_countries", "error");
    return new Map();
  }
}

async function loadSupabaseDanceStyles() {
  const config = window.supabaseConfig;
  if (!config?.url || !config?.publishableKey) {
    setSupabaseLoadStatus("dance_styles", "not-configured");
    return [];
  }

  try {
    const rows = await Api.fetchDanceStyles();
    setSupabaseLoadStatus("dance_styles", "loaded", rows.length);
    return rows
      .map((row) => ({ name: row.name || "", slug: row.slug || "", sortOrder: Number(row.sort_order || 0) }))
      .filter((style) => style.name);
  } catch (error) {
    console.warn("Supabase dance style data unavailable.", error);
    setSupabaseLoadStatus("dance_styles", "optional-unavailable");
    return [];
  }
}

async function loadSupabasePersonalTrips() {
  if (!isSignedIn()) {
    setSupabaseLoadStatus("personal_trips", "signed-out");
    setSupabaseLoadStatus("personal_trip_places", "signed-out");
    return [];
  }

  try {
    const rows = await Api.fetchPersonalTrips();
    setSupabaseLoadStatus("personal_trips", "loaded", rows.length);
    setSupabaseLoadStatus(
      "personal_trip_places",
      "loaded",
      rows.reduce((total, row) => total + (Array.isArray(row.personal_trip_places) ? row.personal_trip_places.length : 0), 0)
    );
    setSupabaseLoadStatus(
      "personal_pto_days",
      "loaded",
      rows.reduce((total, row) => total + (Array.isArray(row.personal_pto_days) ? row.personal_pto_days.length : 0), 0)
    );
    return rows.map(mapSupabaseTrip);
  } catch (error) {
    console.warn("Supabase private trips unavailable.", error);
    setSupabaseLoadStatus("personal_trips", "error");
    setSupabaseLoadStatus("personal_trip_places", "error");
    setSupabaseLoadStatus("personal_pto_days", "error");
    return [];
  }
}

async function loadSupabaseReviews() {
  if (!isSignedIn()) return [];
  try {
    const rows = await Api.fetchReviews();
    setSupabaseLoadStatus("reviews", "loaded", rows.length);
    return rows.map(mapSupabaseReview).filter((review) => state.events.some((event) => event.id === review.eventId));
  } catch (error) {
    console.warn("Supabase private reviews unavailable.", error);
    return [];
  }
}

async function refreshPrivateTablesFromSupabase() {
  if (!isSignedIn()) {
    clearPrivateSupabaseData();
    render();
    return;
  }

  const [reviews, personalTrips] = await Promise.all([
    loadSupabaseReviews(),
    loadSupabasePersonalTrips()
  ]);

  state.reviews = reviews;
  state.trips = [];
  state.personalTrips = personalTrips;
  console.info("Supabase table load status", state.supabaseLoadStatus);
  render();
}

async function refreshPublicEventsFromSupabase() {
  const [supabaseEvents, schengenCountries, danceStyles] = await Promise.all([
    loadSupabaseEvents(),
    loadSupabaseSchengenCountries(),
    loadSupabaseDanceStyles()
  ]);
  state.schengenCountries = schengenCountries;
  state.schengenCountriesLoaded = schengenCountries.size > 0;
  state.danceStyles = danceStyles;
  if (!supabaseEvents.length) {
    if (!isSignedIn()) clearPrivateSupabaseData();
    console.info("Supabase table load status", state.supabaseLoadStatus);
    render();
    return;
  }

  state.events = supabaseEvents;
  if (!isSignedIn()) clearPrivateSupabaseData();
  console.info("Supabase table load status", state.supabaseLoadStatus);
  render();
}

function eventFamilyKey(event) {
  return normalizeText(event.name);
}

function schengenStatus(event) {
  if (!state.schengenCountriesLoaded || !event.country) return null;
  return state.schengenCountries.get(normalizeText(event.country)) === true;
}

function schengenLabel(event) {
  const status = schengenStatus(event);
  if (status === null) return "";
  return status ? "Yes" : "No";
}

function shiftSelectedMonth(offset) {
  const [year, month] = state.selectedMonth.split("-").map(Number);
  const date = new Date(year, month - 1 + offset, 1);
  state.selectedMonth = localDateString(date).slice(0, 7);
  renderCalendar();
}

function setSelectedMonth(monthValue) {
  if (!/^\d{4}-\d{2}$/.test(String(monthValue || ""))) return;
  state.selectedMonth = monthValue;
  renderCalendar();
}

function goToCurrentDate() {
  setSelectedMonth(localDateString(new Date()).slice(0, 7));
}

function monthLabel(monthValue, { short = false } = {}) {
  const [year, month] = monthValue.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString(undefined, {
    month: short ? "short" : "long",
    year: "numeric"
  });
}

function mobileCalendarDayLabel(date) {
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric"
  });
}

function availableCalendarMonths() {
  const months = new Set();
  state.events.forEach((event) => {
    if (!event.startDate) return;
    let cursor = event.startDate.slice(0, 7);
    const end = (event.endDate || event.startDate).slice(0, 7);
    while (cursor <= end) {
      months.add(cursor);
      const [year, month] = cursor.split("-").map(Number);
      cursor = localDateString(new Date(year, month, 1)).slice(0, 7);
    }
  });
  if (isSignedIn()) {
    state.personalTrips.forEach((trip) => {
      let cursor = trip.startDate.slice(0, 7);
      const end = trip.endDate.slice(0, 7);
      while (cursor <= end) {
        months.add(cursor);
        const [year, month] = cursor.split("-").map(Number);
        cursor = localDateString(new Date(year, month, 1)).slice(0, 7);
      }
    });
  }
  months.add(state.selectedMonth);
  return [...months].sort();
}

function renderCalendarMonthJump() {
  if (elements.calendarMonthJump) {
    const months = availableCalendarMonths();
    setSelectOptions(
      elements.calendarMonthJump,
      months.map((month) => ({ value: month, label: monthLabel(month) })),
      state.selectedMonth
    );
  }

  if (!elements.monthJumpRail) return;
  const [year, month] = state.selectedMonth.split("-").map(Number);
  elements.monthJumpRail.innerHTML = "";
  for (let offset = -3; offset <= 8; offset += 1) {
    const monthValue = localDateString(new Date(year, month - 1 + offset, 1)).slice(0, 7);
    const button = document.createElement("button");
    button.type = "button";
    button.className = `month-jump-button ${monthValue === state.selectedMonth ? "is-active" : ""}`;
    button.dataset.month = monthValue;
    button.textContent = monthLabel(monthValue, { short: true });
    button.setAttribute("aria-label", `Jump to ${monthLabel(monthValue)}`);
    elements.monthJumpRail.append(button);
  }
}

function renderMobileCalendarModeToggle() {
  if (!elements.mobileCalendarModeToggle) return;
  elements.mobileCalendarModeToggle.classList.toggle("is-active", state.mobileCalendarMonthView);
  elements.mobileCalendarModeToggle.setAttribute("aria-pressed", String(state.mobileCalendarMonthView));
  elements.mobileCalendarModeToggle.setAttribute(
    "aria-label",
    state.mobileCalendarMonthView ? "Show mobile calendar as a date list" : "Show mobile calendar as a month grid"
  );
}

function selectedCalendarDateForMonth() {
  const currentMonth = localDateString(new Date()).slice(0, 7);
  if (state.selectedCalendarDate?.startsWith(state.selectedMonth)) return state.selectedCalendarDate;
  if (state.selectedMonth === currentMonth) return localDateString(new Date());
  return `${state.selectedMonth}-01`;
}

function setSelectedCalendarDate(dateValue) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dateValue || ""))) return;
  const nextMonth = dateValue.slice(0, 7);
  const monthChanged = nextMonth !== state.selectedMonth;
  state.selectedMonth = nextMonth;
  state.selectedCalendarDate = dateValue;
  if (monthChanged) {
    renderCalendar();
    return;
  }
  renderCalendarSelection();
}

function reviewScoreForEvent(event) {
  return calculateReviewScoreForEvent(event, {
    events: state.events,
    reviews: state.reviews,
    eventFamilyKey
  });
}

function emptyState(label = "No festivals yet", help = "Add your first festival to start building your tracker.") {
  const node = elements.emptyStateTemplate.content.firstElementChild.cloneNode(true);
  node.querySelector("strong").textContent = label;
  node.querySelector("p").textContent = help;
  return node;
}

function detailRow(label, value) {
  if (!value) return "";
  return `
    <div class="detail-row">
      <span class="detail-label">${escapeHtml(label)}</span>
      <span>${escapeHtml(value)}</span>
    </div>
  `;
}

function detailLinkRow(label, value, linkLabel = "Open link") {
  if (!value) return "";
  return `
    <div class="detail-row">
      <span class="detail-label">${escapeHtml(label)}</span>
      <span>${sourceLink(linkLabel, value)}</span>
    </div>
  `;
}

function eventDetailRows(event, { includeStatus = false, includeDates = false, includeStyles = false } = {}) {
  return [
    includeDates ? ["Dates", dateRange(event)] : null,
    includeStatus ? ["Status", isHistorical(event) ? "Past event" : "Upcoming"] : null,
    includeStyles ? ["Styles", formatStyles(event, state.danceStyles)] : null,
    ["Schengen", schengenLabel(event)],
    ["Organizer", event.organizer],
    ["Venue", event.venue],
    ["Event size", formatEventSize(event.eventSize)],
    ["Price", eventPrice(event)],
    ["DJs", event.djs],
    ["Artists", event.artists],
    ["Travel planning", event.travel],
    ["Notes", event.notes]
  ]
    .filter(Boolean)
    .map(([label, value]) => detailRow(label, value))
    .join("");
}

function editionBlock(event) {
  const title = `${eventYear(event)} edition`;
  const rows = [
    detailRow("Dates", dateRange(event)),
    detailRow("Location", eventLocation(event)),
    detailRow("Schengen", schengenLabel(event)),
    detailRow("Venue", event.venue),
    detailRow("Organizer", event.organizer),
    detailRow("Event size", formatEventSize(event.eventSize)),
    detailRow("Price", eventPrice(event)),
    detailLinkRow("Ticket link", event.tickets, "Tickets"),
    detailRow("DJs", event.djs),
    detailRow("Artists", event.artists),
    detailRow("Travel planning", event.travel),
    detailRow("Notes", event.notes)
  ].join("");

  return `
    <section class="edition-block">
      <h4>${escapeHtml(title)}</h4>
      <div class="event-detail">${rows}</div>
    </section>
  `;
}

function missingEditionBlock(year) {
  return `
    <section class="edition-block is-empty">
      <h4>${escapeHtml(year)} edition</h4>
      <p class="muted">Not tracked.</p>
    </section>
  `;
}

function editionHistoryBlocks(group) {
  const currentYear = new Date().getFullYear();
  const nextEdition = group.editions.find((event) => !isHistorical(event));
  const startYear = nextEdition ? Number(eventYear(nextEdition)) : currentYear;
  const years = [startYear, startYear - 1, startYear - 2];

  return years.map((year) => {
    const edition = group.editions
      .filter((event) => Number(eventYear(event)) === year)
      .sort((a, b) => b.startDate.localeCompare(a.startDate))[0];
    return edition ? editionBlock(edition) : missingEditionBlock(year);
  }).join("");
}

function priorEditionFor(event) {
  return state.events
    .filter((item) => eventFamilyKey(item) === eventFamilyKey(event) && item.startDate < event.startDate)
    .sort((a, b) => b.startDate.localeCompare(a.startDate))[0] || null;
}

function calendarActionMenu(event) {
  if (!event) return "";
  return `
    <details class="calendar-add-menu">
      <summary>Add to calendar</summary>
      <div class="calendar-add-options">
        <button type="button" data-action="add-google-calendar" data-id="${escapeHtml(event.id)}">Google Calendar</button>
        <button type="button" data-action="download-calendar-file" data-id="${escapeHtml(event.id)}">Phone calendar file</button>
      </div>
    </details>
  `;
}

function openGoogleCalendar(eventId) {
  const event = state.events.find((item) => item.id === eventId);
  if (!event) return;
  window.open(googleCalendarUrl(event), "_blank", "noopener,noreferrer");
}

function downloadCalendarFileForEvent(eventId) {
  const event = state.events.find((item) => item.id === eventId);
  if (!event) return;
  downloadCalendarFile(event);
}

function collapseHeaderButtonFromClick(event) {
  if (event.target.closest("a, button, details, input, label, select, summary, textarea")) return null;
  const header = event.target.closest(".event-card-header");
  return header?.querySelector('[data-action="toggle-card-collapse"]') || null;
}

function recentAddedDate(event) {
  return event.addedOn || "";
}

function isRecentlyAdded(event) {
  const addedOn = recentAddedDate(event);
  if (!addedOn) return false;
  const addedDate = new Date(`${addedOn}T12:00:00`);
  if (Number.isNaN(addedDate.getTime())) return false;
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  return addedDate >= sevenDaysAgo;
}

function collapsedStateFor(view) {
  return state.collapsedCards[view] || { all: false, expanded: new Set(), collapsed: new Set() };
}

function isCardCollapsed(view, id) {
  if (!view || !id) return false;
  const collapseState = collapsedStateFor(view);
  return collapseState.all ? !collapseState.expanded.has(id) : collapseState.collapsed.has(id);
}

function cardCollapseButton(view, id) {
  if (!view || !id) return "";
  const collapsed = isCardCollapsed(view, id);
  return `
    <button class="secondary-action card-collapse-button" type="button" data-action="toggle-card-collapse" data-view="${escapeHtml(view)}" data-id="${escapeHtml(id)}">
      ${collapsed ? "Expand" : "Collapse"}
    </button>
  `;
}

function collapsibleCardBody(view, id, content) {
  const collapsed = isCardCollapsed(view, id);
  return `<div class="card-collapsible" ${collapsed ? "hidden" : ""}>${content}</div>`;
}

function setCollapseMode(view, collapsed) {
  const collapseState = collapsedStateFor(view);
  collapseState.all = collapsed;
  collapseState.expanded.clear();
  collapseState.collapsed.clear();
  renderCollapseView(view);
}

function renderCollapseView(view) {
  if (view === "calendarList") renderEvents();
  if (view === "eventList") renderFestivalList();
  if (view === "recentlyAdded") renderRecentlyAdded();
  if (view === "trips") tripsView.renderTrips();
  if (view === "reviews") reviewsView.renderReviews();
}

function toggleCardCollapse(view, id) {
  const collapseState = collapsedStateFor(view);
  if (collapseState.all) {
    if (collapseState.expanded.has(id)) {
      collapseState.expanded.delete(id);
    } else {
      collapseState.expanded.add(id);
    }
  } else if (collapseState.collapsed.has(id)) {
    collapseState.collapsed.delete(id);
  } else {
    collapseState.collapsed.add(id);
  }
  renderCollapseView(view);
}

function isAttendingEvent(event) {
  if (!isSignedIn()) return false;
  return state.personalTrips.some((trip) =>
    trip.places.some((place) => tripPlaceMatchesEvent({ ...place, trip }, event))
  );
}

function eventVisualState(event) {
  const attending = isAttendingEvent(event);
  return {
    attending,
    watchlistOnly: isWatchlistEvent(event) && !attending
  };
}

function eventBadgeMarkup(event) {
  const visualState = eventVisualState(event);
  return [
    visualState.attending ? `<span class="pill attending-pill">Attending</span>` : "",
    visualState.watchlistOnly ? `<span class="pill watchlist-pill">${escapeHtml(watchlistLabel(event))}</span>` : ""
  ].filter(Boolean).join("");
}

function renderEventCard(event, options = {}) {
  const collapseView = options.collapseView || "";
  const collapseId = event.id;
  const score = reviewScoreForEvent(event);
  const location = eventLocation(event);
  const detailRows = eventDetailRows(event);
  const visualState = eventVisualState(event);
  const card = document.createElement("article");
  card.className = `event-card ${visualState.attending ? "is-attending" : ""} ${visualState.watchlistOnly ? "is-watchlist" : ""}`;
  card.innerHTML = `
    <div class="event-card-header">
      <div>
        <h3>${escapeHtml(event.name)}</h3>
        <p class="muted">${escapeHtml(dateRange(event))}</p>
      </div>
      <div class="card-header-actions">
        ${eventBadgeMarkup(event)}
        ${score ? `<span class="pill score-pill">${score.average.toFixed(1)}${score.isPrior ? " prior" : ""}</span>` : ""}
        ${cardCollapseButton(collapseView, collapseId)}
      </div>
    </div>
    ${collapsibleCardBody(collapseView, collapseId, `
      ${location ? `<div class="event-meta"><span class="pill location-pill">${escapeHtml(location)}</span></div>` : ""}
      ${detailRows ? `<div class="event-detail">${detailRows}</div>` : ""}
      <div class="event-actions">
        ${sourceLink("Website", event.website)}
        ${sourceLink("Instagram", event.instagram)}
        ${sourceLink("Facebook", event.facebook)}
        ${sourceLink("Tickets", event.tickets)}
        ${calendarActionMenu(event)}
        <span class="event-status">${isHistorical(event) ? "Past event" : "Upcoming"}</span>
      </div>
    `)}
  `;
  return card;
}

function renderCalendar() {
  elements.monthPicker.value = state.selectedMonth;
  renderCalendarMonthJump();
  renderMobileCalendarModeToggle();
  if (state.mobileCalendarMonthView) {
    state.selectedCalendarDate = selectedCalendarDateForMonth();
  }
  if (elements.hideDuplicateAttendedToggle) {
    elements.hideDuplicateAttendedToggle.checked = state.hideDuplicateAttendedEvents;
    elements.hideDuplicateAttendedToggle.disabled = !isSignedIn();
  }
  if (elements.attendedOnlyToggle) {
    elements.attendedOnlyToggle.checked = state.attendedOnlyCalendar;
    elements.attendedOnlyToggle.disabled = !isSignedIn();
  }
  elements.calendarGrid.innerHTML = "";
  elements.calendarGrid.classList.remove("is-agenda-empty");
  elements.calendarGrid.classList.remove("is-refreshing");
  elements.calendarView?.classList.toggle("is-mobile-month-view", state.mobileCalendarMonthView);
  void elements.calendarGrid.offsetWidth;
  elements.calendarGrid.classList.add("is-refreshing");

  const [year, month] = state.selectedMonth.split("-").map(Number);
  const firstOfMonth = new Date(year, month - 1, 1);
  const start = new Date(firstOfMonth);
  start.setDate(firstOfMonth.getDate() - firstOfMonth.getDay());
  let hasVisibleAgendaItems = false;

  for (let index = 0; index < 42; index += 1) {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const dateValue = localDateString(date);
    const { events: dayEvents, trips: dayTripPlaces, ptoDays: dayPtoDays } = calendarItemsForDate(dateValue);
    const day = document.createElement("section");
    day.className = "calendar-day";
    if (state.mobileCalendarMonthView) {
      day.dataset.action = "select-calendar-day";
      day.dataset.date = dateValue;
      day.setAttribute("role", "button");
      day.setAttribute("tabindex", "0");
      day.setAttribute("aria-label", `Select ${mobileCalendarDayLabel(date)}`);
    }
    if (date.getMonth() !== month - 1) day.classList.add("is-outside");
    if (dateValue === localDateString(new Date())) day.classList.add("is-today");
    if (state.mobileCalendarMonthView && dateValue === state.selectedCalendarDate) day.classList.add("is-selected");
    if (!dayEvents.length && !dayTripPlaces.length && !dayPtoDays.length) day.classList.add("is-empty");
    if (date.getMonth() === month - 1 && (dayEvents.length || dayTripPlaces.length || dayPtoDays.length)) {
      hasVisibleAgendaItems = true;
    }
    day.innerHTML = `
      <div class="calendar-date">
        <span>${date.getDate()}</span>
        <span class="calendar-date-label">${escapeHtml(mobileCalendarDayLabel(date))}</span>
      </div>
    `;

    dayEvents.forEach((event) => {
      const wrapper = document.createElement("div");
      wrapper.className = "calendar-event-card";
      const button = document.createElement("button");
      const visualState = eventVisualState(event);
      button.className = `calendar-event ${visualState.attending ? "is-attending" : ""} ${visualState.watchlistOnly ? "is-watchlist" : ""}`;
      button.type = "button";
      button.dataset.action = "details";
      button.dataset.id = event.id;
      button.setAttribute("aria-label", `View details for ${event.name}`);
      button.innerHTML = calendarEventMarkup(event);
      wrapper.append(button);
      day.append(wrapper);
    });

    dayTripPlaces.forEach((place) => {
      const chip = document.createElement("button");
      chip.className = `calendar-trip ${place.eventId ? "is-event-linked" : "is-travel"}`;
      chip.type = "button";
      chip.disabled = true;
      chip.setAttribute("aria-label", `Trip ${cleanTripLabel(place.trip.label) || place.trip.label}`);
      chip.innerHTML = calendarTripMarkup(place);
      day.append(chip);
    });

    dayPtoDays.forEach((ptoDay) => {
      const chip = document.createElement("button");
      chip.className = `calendar-trip calendar-pto ${holidayForDate(ptoDay.date) ? "is-holiday" : ""}`;
      chip.type = "button";
      chip.disabled = true;
      chip.setAttribute("aria-label", `PTO for ${cleanTripLabel(ptoDay.trip.label) || ptoDay.trip.label}`);
      chip.innerHTML = calendarPtoMarkup(ptoDay);
      day.append(chip);
    });

    elements.calendarGrid.append(day);
  }

  elements.calendarGrid.classList.toggle("is-agenda-empty", !hasVisibleAgendaItems);
  renderCalendarSelection();
}

function calendarItemsForDate(dateValue) {
  const searchQuery = state.search.trim().toLowerCase();
  const trips = calendarTripPlacesForDate(dateValue)
    .filter((place) => {
      if (!searchQuery) return true;
      const event = place.eventId ? state.events.find((item) => item.id === place.eventId) : null;
      const haystack = [
        place.city,
        place.country,
        place.notes,
        place.trip.label,
        event?.name,
        schengenLabel(place)
      ].join(" ").toLowerCase();
      return haystack.includes(searchQuery);
    });
  const events = state.events
    .filter((event) => {
      const occursOnDate = eventOccursOnDate(event, dateValue);
      if (!occursOnDate) return false;
      if (state.attendedOnlyCalendar && isSignedIn()) return false;
      if (state.hideDuplicateAttendedEvents && attendedPlaceMatchesEventOnDate(event, dateValue)) return false;
      if (!searchQuery) return true;

      const haystack = [
        event.name, event.city, event.country, event.venue, event.organizer,
        event.djs, event.artists, event.notes, formatStyles(event, state.danceStyles), watchlistLabel(event), schengenLabel(event)
      ].join(" ").toLowerCase();
      return haystack.includes(searchQuery);
    })
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
  const ptoDays = calendarPtoDaysForDate(dateValue)
    .filter((ptoDay) => {
      if (!searchQuery) return true;
      return [ptoDay.trip.label, ptoDay.notes, holidayForDate(ptoDay.date), "pto"].join(" ").toLowerCase().includes(searchQuery);
    });
  return { events, trips, ptoDays };
}

function renderSelectedCalendarDay() {
  if (!elements.calendarSelectedDay) return;
  elements.calendarSelectedDay.innerHTML = "";
  if (!state.mobileCalendarMonthView) return;

  const { events, trips, ptoDays } = calendarItemsForDate(state.selectedCalendarDate);
  const heading = document.createElement("h3");
  heading.textContent = formatDate(state.selectedCalendarDate);
  elements.calendarSelectedDay.append(heading);

  if (!events.length && !trips.length && !ptoDays.length) {
    elements.calendarSelectedDay.append(emptyState("No items for this day", "Select another day in the month grid."));
    return;
  }

  events.forEach((event) => {
    const wrapper = document.createElement("div");
    wrapper.className = "calendar-selected-item";
    const button = document.createElement("button");
    const visualState = eventVisualState(event);
    button.className = `calendar-event ${visualState.attending ? "is-attending" : ""} ${visualState.watchlistOnly ? "is-watchlist" : ""}`;
    button.type = "button";
    button.dataset.action = "details";
    button.dataset.id = event.id;
    button.setAttribute("aria-label", `View details for ${event.name}`);
    button.innerHTML = calendarEventMarkup(event);
    wrapper.append(button);
    elements.calendarSelectedDay.append(wrapper);
  });

  trips.forEach((place) => {
    const chip = document.createElement("button");
    chip.className = `calendar-trip ${place.eventId ? "is-event-linked" : "is-travel"}`;
    chip.type = "button";
    chip.disabled = true;
    chip.innerHTML = calendarTripMarkup(place);
    elements.calendarSelectedDay.append(chip);
  });

  ptoDays.forEach((ptoDay) => {
    const chip = document.createElement("button");
    chip.className = `calendar-trip calendar-pto ${holidayForDate(ptoDay.date) ? "is-holiday" : ""}`;
    chip.type = "button";
    chip.disabled = true;
    chip.innerHTML = calendarPtoMarkup(ptoDay);
    elements.calendarSelectedDay.append(chip);
  });
}

function renderCalendarSelection() {
  if (elements.calendarGrid) {
    elements.calendarGrid.querySelectorAll(".calendar-day").forEach((day) => {
      day.classList.toggle("is-selected", day.dataset.date === state.selectedCalendarDate);
    });
  }
  renderSelectedCalendarDay();
}

function calendarTripPlacesForDate(dateValue) {
  if (!isSignedIn()) return [];
  return state.personalTrips
    .flatMap((trip) => trip.places.map((place) => ({ ...place, trip })))
    .filter((place) => place.startDate <= dateValue && place.endDate >= dateValue)
    .sort((a, b) => a.sequence - b.sequence || a.city.localeCompare(b.city));
}

function attendedPlaceMatchesEventOnDate(event, dateValue) {
  return calendarTripPlacesForDate(dateValue).some((place) => tripPlaceMatchesEvent(place, event));
}

function calendarTripMarkup(place) {
  const event = eventForTripPlace(place, state.events);
  return `
    <strong>${escapeHtml(event?.name || [place.city, place.country].filter(Boolean).join(", "))}</strong>
    ${event ? `<span>${escapeHtml([place.city, place.country].filter(Boolean).join(", "))}</span>` : ""}
  `;
}

function calendarPtoDaysForDate(dateValue) {
  if (!isSignedIn()) return [];
  return state.personalTrips
    .flatMap((trip) => (trip.ptoDays || []).map((ptoDay) => ({ ...ptoDay, trip })))
    .filter((ptoDay) => ptoDay.date === dateValue)
    .sort((a, b) => a.trip.startDate.localeCompare(b.trip.startDate));
}

function calendarPtoMarkup(ptoDay) {
  const holiday = holidayForDate(ptoDay.date);
  return `
    <strong>${escapeHtml(holiday || formatPtoAmount(ptoDay.amount))}</strong>
    <span>${escapeHtml(holiday ? "Holiday" : "PTO")}</span>
  `;
}

function calendarEventMarkup(event) {
  const visualState = eventVisualState(event);
  return `
    <strong>${escapeHtml(event.name)}</strong>
    ${eventLocation(event) ? `<span>${escapeHtml(eventLocation(event))}</span>` : ""}
    ${visualState.attending ? `<span class="calendar-badge">Attending</span>` : ""}
    ${visualState.watchlistOnly ? `<span class="calendar-badge">${escapeHtml(watchlistLabel(event))}</span>` : ""}
  `;
}

function renderEvents() {
  elements.eventList.innerHTML = "";
  if (state.sort === "score") state.sort = "date";
  if (elements.sortSelect && elements.sortSelect.value !== state.sort) {
    elements.sortSelect.value = state.sort;
  }
  const listYears = availableEventListYears();
  if (state.listYear && !listYears.includes(state.listYear)) state.listYear = "";
  setSelectOptions(
    elements.listYearSelect,
    [{ value: "", label: "All years" }, ...listYears.map((year) => ({ value: year, label: year }))],
    state.listYear
  );
  setSelectOptions(elements.listMonthSelect, monthOptions(), state.listMonth);
  elements.historyToggle.checked = state.showHistorical;
  const search = state.search.trim().toLowerCase();
  let events = state.events.filter((event) => {
    const haystack = [
      event.name, event.city, event.country, event.venue, event.organizer, 
      event.djs, event.artists, event.notes, schengenLabel(event)
    ].join(" ").toLowerCase();
    const matchesSearch = !search || haystack.includes(search);
    const matchesTimeframe = state.showHistorical ? isHistorical(event) : !isHistorical(event);
    const matchesYear = !state.listYear || eventYear(event) === state.listYear;
    const matchesMonth = !state.listMonth || eventMonthValue(event) === state.listMonth;
    return matchesSearch && matchesTimeframe && matchesYear && matchesMonth;
  });

  events = events.sort((a, b) => {
    if (state.sort === "name") return a.name.localeCompare(b.name);
    if (state.sort === "country") return `${a.country} ${a.city}`.localeCompare(`${b.country} ${b.city}`);
    return a.startDate.localeCompare(b.startDate);
  });

  if (!events.length) {
    elements.eventList.append(emptyState("No matching festivals", state.showHistorical ? "No past events match this search." : "No upcoming events match this search."));
    return;
  }

  events.forEach((event) => elements.eventList.append(renderEventCard(event, { collapseView: "calendarList" })));
}

function availableEventListYears() {
  return uniqueValues(state.events
    .filter((event) => state.showHistorical ? isHistorical(event) : !isHistorical(event))
    .map(eventYear)
    .filter(Boolean)
  ).sort();
}

function availableFestivalYears() {
  return uniqueValues(state.events.map(eventYear).filter(Boolean)).sort();
}

function ensureFestivalYear(years) {
  if (years.includes(state.festivalYear)) return;

  const currentYear = String(new Date().getFullYear());
  state.festivalYear = years.includes(currentYear)
    ? currentYear
    : years.find((year) => year >= currentYear) || years[0] || currentYear;
  localStorage.setItem("salsa-festivals-event-list-year", state.festivalYear);
}

function populateFestivalFilters() {
  const years = availableFestivalYears();
  ensureFestivalYear(years);

  setSelectOptions(
    elements.festivalYearSelect,
    years.map((year) => ({ value: year, label: year })),
    state.festivalYear
  );

  setSelectOptions(elements.festivalMonthSelect, monthOptions(), state.festivalMonth);

  const countries = uniqueValues(
    state.events
      .filter((event) => eventYear(event) === state.festivalYear)
      .map((event) => event.country)
      .filter(Boolean)
  ).sort((a, b) => a.localeCompare(b));
  if (state.festivalCountry && !countries.includes(state.festivalCountry)) {
    state.festivalCountry = "";
  }

  setSelectOptions(
    elements.festivalCountrySelect,
    [{ value: "", label: "All countries" }, ...countries.map((country) => ({ value: country, label: country }))],
    state.festivalCountry
  );

  setSelectOptions(
    elements.festivalSizeSelect,
    [
      { value: "", label: "All sizes" },
      { value: "small", label: "Small" },
      { value: "medium", label: "Medium" },
      { value: "large", label: "Large" },
      { value: "extra large", label: "Extra large" }
    ],
    state.festivalSize
  );
}

function filteredFestivalEditions() {
  const search = elements.festivalSearchInput.value.trim().toLowerCase();
  const country = state.festivalCountry;
  const size = normalizeText(state.festivalSize);
  const month = state.festivalMonth;

  return state.events
    .filter((event) => {
      const haystack = [
        event.name,
        event.city,
        event.country,
        event.venue,
        event.organizer,
        event.djs,
        event.artists,
        event.notes,
        formatStyles(event, state.danceStyles),
        watchlistLabel(event),
        schengenLabel(event)
      ].join(" ").toLowerCase();
      const matchesYear = eventYear(event) === state.festivalYear;
      const matchesSearch = !search || haystack.includes(search);
      const matchesCountry = !country || event.country === country;
      const matchesSize = !size || normalizeText(event.eventSize) === size;
      const matchesMonth = !month || eventMonthValue(event) === month;
      return matchesYear && matchesSearch && matchesCountry && matchesSize && matchesMonth;
    })
    .sort((a, b) => a.startDate.localeCompare(b.startDate) || a.name.localeCompare(b.name));
}

function renderFestivalList() {
  elements.festivalList.innerHTML = "";
  populateFestivalFilters();
  const filteredEditions = filteredFestivalEditions();
  const visibleKeys = new Set(filteredEditions.map(eventFamilyKey));
  const filteredEditionsByKey = new Map();
  filteredEditions.forEach((event) => {
    const key = eventFamilyKey(event);
    if (!filteredEditionsByKey.has(key)) filteredEditionsByKey.set(key, []);
    filteredEditionsByKey.get(key).push(event);
  });
  filteredEditionsByKey.forEach((events) => events.sort((a, b) => a.startDate.localeCompare(b.startDate)));
  const groups = uniqueFestivalGroups()
    .filter((group) => visibleKeys.has(normalizeText(group.name)))
    .sort((a, b) => {
      const aDate = filteredEditionsByKey.get(normalizeText(a.name))?.[0]?.startDate || "9999-12-31";
      const bDate = filteredEditionsByKey.get(normalizeText(b.name))?.[0]?.startDate || "9999-12-31";
      return aDate.localeCompare(bDate) || a.name.localeCompare(b.name);
    });

  if (!groups.length) {
    elements.festivalList.append(emptyState("No matching festivals", "Adjust the year, country, size, or search filters."));
    return;
  }

  groups.forEach((group) => {
    const card = document.createElement("article");
    const hasAttendingEdition = group.editions.some(isAttendingEvent);
    const hasWatchlistEdition = group.editions.some((event) => eventVisualState(event).watchlistOnly);
    card.className = `event-card ${hasAttendingEdition ? "is-attending" : ""} ${hasWatchlistEdition ? "is-watchlist" : ""}`;
    const selectedEditions = filteredEditionsByKey.get(normalizeText(group.name)) || [];
    const firstSelected = selectedEditions[0];
    const lastSelected = selectedEditions[selectedEditions.length - 1];
    const priorEdition = group.editions
      .filter((event) => firstSelected && event.startDate < firstSelected.startDate)
      .at(-1);
    const nextTrackedEdition = group.editions.find((event) => lastSelected && event.startDate > lastSelected.startDate);
    const detailsTarget = firstSelected || nextTrackedEdition || priorEdition || group.editions[group.editions.length - 1];
    const score = detailsTarget ? reviewScoreForEvent(detailsTarget) : null;
    const collapseId = normalizeText(group.name);

    card.innerHTML = `
      <div class="event-card-header">
        <div>
          <h3>${escapeHtml(group.name)}</h3>
          <p class="muted">${escapeHtml(group.locations.join(" | "))}</p>
        </div>
        <div class="card-header-actions">
          ${hasAttendingEdition ? `<span class="pill attending-pill">Attending</span>` : ""}
          ${hasWatchlistEdition ? `<span class="pill watchlist-pill">Watchlist</span>` : ""}
          ${score ? `<span class="pill score-pill">${score.average.toFixed(1)}${score.isPrior ? " prior" : ""}</span>` : ""}
          ${cardCollapseButton("eventList", collapseId)}
        </div>
      </div>
      ${collapsibleCardBody("eventList", collapseId, `
        <div class="festival-editions">
          ${editionHistoryBlocks(group)}
        </div>
        <div class="event-actions">
          ${sourceLink("Website", group.website)}
          ${sourceLink("Instagram", group.instagram)}
          ${sourceLink("Facebook", group.facebook)}
          ${sourceLink("Tickets", group.tickets)}
          ${calendarActionMenu(detailsTarget)}
        </div>
      `)}
    `;
    elements.festivalList.append(card);
  });
}

function renderRecentlyAdded() {
  elements.recentlyAddedList.innerHTML = "";
  const events = state.events
    .filter(isRecentlyAdded)
    .sort((a, b) => recentAddedDate(b).localeCompare(recentAddedDate(a)) || a.startDate.localeCompare(b.startDate));

  if (!events.length) {
    elements.recentlyAddedList.append(emptyState("No recently added events", "New database additions from the last 7 days will show here."));
    return;
  }

  events.forEach((event) => {
    const card = renderEventCard(event, { collapseView: "recentlyAdded" });
    const details = card.querySelector(".event-detail");
    const addedRow = detailRow("Added", formatDate(recentAddedDate(event)));
    if (details) {
      details.insertAdjacentHTML("afterbegin", addedRow);
    } else {
      card.querySelector(".event-actions")?.insertAdjacentHTML("beforebegin", `<div class="event-detail">${addedRow}</div>`);
    }
    elements.recentlyAddedList.append(card);
  });
}

function uniqueFestivalGroups() {
  const groups = new Map();
  state.events.forEach((event) => {
    const key = eventFamilyKey(event);
    if (!groups.has(key)) {
      groups.set(key, { name: event.name, editions: [] });
    }
    groups.get(key).editions.push(event);
  });

  return [...groups.values()]
    .map((group) => {
      const editions = group.editions.sort((a, b) => a.startDate.localeCompare(b.startDate));
      const upcoming = editions.filter((event) => !isHistorical(event));
      const past = editions.filter(isHistorical);
      const source = upcoming[0] || editions[editions.length - 1];
      return {
        ...group,
        editions,
        upcoming,
        past,
        locations: uniqueValues(editions.map(eventLocation).filter(Boolean)),
        organizers: uniqueValues(editions.map((event) => event.organizer).filter(Boolean)),
        website: source.website,
        instagram: source.instagram,
        facebook: source.facebook,
        tickets: source.tickets
      };
    })
    .sort((a, b) => {
      const aDate = a.upcoming[0]?.startDate || "9999-12-31";
      const bDate = b.upcoming[0]?.startDate || "9999-12-31";
      return aDate.localeCompare(bDate) || a.name.localeCompare(b.name);
    });
}

function uniqueValues(values) {
  return [...new Set(values)];
}

function renderDataStatus() {
  if (!elements.dataStatus) return;
  const items = tableStatusItems(state.supabaseLoadStatus);
  if (!items.length || !hasLoadWarnings(state.supabaseLoadStatus)) {
    elements.dataStatus.hidden = true;
    elements.dataStatus.innerHTML = "";
    return;
  }

  elements.dataStatus.hidden = false;
  elements.dataStatus.innerHTML = `
    <strong>Data status</strong>
    <span>${items
      .filter((item) => item.status === "error" || item.status === "not-configured")
      .map((item) => `${escapeHtml(item.table)}: ${escapeHtml(item.label)}`)
      .join(" · ")}</span>
  `;
}

function renderAuth() {
  if (elements.authStatus) {
    elements.authStatus.replaceChildren();
    if (isSignedIn()) {
      const label = document.createElement("span");
      label.className = "auth-label";
      label.textContent = "Signed in";
      elements.authStatus.append(label);
    }
    const button = document.createElement("button");
    button.className = "secondary-action";
    button.type = "button";
    button.dataset.authAction = isSignedIn() ? "signout" : "signin";
    button.textContent = isSignedIn() ? "Sign out" : "Sign in";
    elements.authStatus.append(button);
  }

  if (elements.reviewTab) {
    elements.reviewTab.hidden = !isSignedIn();
  }
  if (elements.tripsTab) {
    elements.tripsTab.hidden = !isSignedIn();
  }
  if (elements.reviewsView) {
    elements.reviewsView.hidden = !isSignedIn();
  }
  if (elements.tripsView) {
    elements.tripsView.hidden = !isSignedIn();
  }
  if (!isSignedIn() && ["reviews", "trips"].includes(state.activeView)) {
    switchView("calendar");
  }
  if (elements.reviewAuthPanel) {
    elements.reviewAuthPanel.hidden = isSignedIn();
  }
  if (elements.tripsAuthPanel) {
    elements.tripsAuthPanel.hidden = isSignedIn();
  }
  if (elements.reviewList) {
    elements.reviewList.hidden = !isSignedIn();
  }
  if (elements.tripList) {
    elements.tripList.hidden = !isSignedIn();
  }
  if (elements.schengenSummary) {
    elements.schengenSummary.hidden = !isSignedIn();
  }
  if (elements.ptoYearSummary) {
    elements.ptoYearSummary.hidden = !isSignedIn();
  }
  if (elements.addTripBtn) {
    elements.addTripBtn.hidden = true;
  }
  [
    elements.tripHistoryToggle,
    elements.schengenImpactToggle,
    elements.tripCountrySelect,
    elements.tripYearSelect,
    elements.tripMonthSelect
  ].forEach((control) => {
    if (control) control.disabled = !isSignedIn();
  });
}

function render() {
  renderAuth();
  renderDataStatus();
  renderCalendar();
  renderEvents();
  renderFestivalList();
  renderRecentlyAdded();
  tripsView.renderTrips();
  reviewsView.renderReviews();
}

function switchView(view) {
  const nextView = [...elements.tabs].some((tab) => tab.dataset.view === view && !tab.hidden) && viewAllowed(view) ? view : "calendar";
  state.activeView = nextView;
  localStorage.setItem("salsa-festivals-active-view", nextView);
  elements.tabs.forEach((tab) => tab.classList.toggle("is-active", tab.dataset.view === nextView));
  elements.views.forEach((section) => section.classList.toggle("is-active", section.id === `${nextView}View`));
}

function openEventDetails(eventId) {
  const event = state.events.find((item) => item.id === eventId);
  if (!event) return;

  const score = reviewScoreForEvent(event);
  const priorEdition = priorEditionFor(event);
  const visualState = eventVisualState(event);
  elements.eventDetailsTitle.textContent = event.name;
  elements.eventDetailsMeta.innerHTML = [
    visualState.attending ? `<span class="pill attending-pill">Attending</span>` : "",
    visualState.watchlistOnly ? `<span class="pill watchlist-pill">${escapeHtml(watchlistLabel(event))}</span>` : "",
    eventLocation(event) ? `<span class="pill location-pill">${escapeHtml(eventLocation(event))}</span>` : "",
    score ? `<span class="pill score-pill">${score.average.toFixed(1)}${score.isPrior ? " prior" : ""}</span>` : ""
  ].filter(Boolean).join("");

  const detailRows = eventDetailRows(event, { includeDates: true, includeStatus: true, includeStyles: true });
  const priorEditionSection = priorEdition
    ? `
      <section class="edition-block detail-edition-block">
        <h4>${escapeHtml(eventYear(priorEdition))} edition</h4>
        <div class="event-detail">
          ${[
            detailRow("Dates", dateRange(priorEdition)),
            detailRow("Location", eventLocation(priorEdition)),
            detailRow("Styles", formatStyles(priorEdition, state.danceStyles)),
            detailRow("Venue", priorEdition.venue),
            detailRow("Organizer", priorEdition.organizer),
            detailRow("Event size", formatEventSize(priorEdition.eventSize)),
            detailRow("Price", eventPrice(priorEdition)),
            detailLinkRow("Ticket link", priorEdition.tickets, "Tickets"),
            detailRow("DJs", priorEdition.djs),
            detailRow("Artists", priorEdition.artists),
            detailRow("Travel planning", priorEdition.travel),
            detailRow("Notes", priorEdition.notes)
          ].join("")}
        </div>
      </section>
    `
    : "";

  elements.eventDetailsBody.innerHTML = detailRows.length || priorEditionSection
    ? `${detailRows}${priorEditionSection}`
    : "<p class=\"muted\">No extra details have been added yet.</p>";

  elements.eventDetailsLinks.innerHTML = [
    sourceLink("Website", event.website),
    sourceLink("Tickets", event.tickets),
    sourceLink("Instagram", event.instagram),
    sourceLink("Facebook", event.facebook),
    calendarActionMenu(event)
  ].filter(Boolean).join("") || "<span class=\"event-status\">No source links yet</span>";

  elements.eventDetailsDialog.showModal();
}

function handleAction(event) {
  const target = event.target.closest("[data-action]");
  if (!target) {
    const collapseButton = collapseHeaderButtonFromClick(event);
    if (collapseButton) toggleCardCollapse(collapseButton.dataset.view, collapseButton.dataset.id);
    return;
  }
  const { action, id } = target.dataset;
  if (state.mobileCalendarMonthView && target.closest(".calendar-grid")) {
    return setSelectedCalendarDate(target.closest(".calendar-day")?.dataset.date);
  }
  if (action === "details") return openEventDetails(id);
  if (action === "select-calendar-day") return setSelectedCalendarDate(target.dataset.date);
  if (action === "add-google-calendar") return openGoogleCalendar(id);
  if (action === "download-calendar-file") return downloadCalendarFileForEvent(id);
  if (action === "edit-trip") return;
  if (action === "toggle-card-collapse") return toggleCardCollapse(target.dataset.view, id);
}

function updateBackToTopVisibility() {
  if (!elements.backToTopBtn) return;
  elements.backToTopBtn.hidden = window.scrollY < 600;
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function handleAuthSubmit(event) {
  event.preventDefault();
  const email = elements.authEmail.value.trim();
  const password = elements.authPassword.value;
  if (!email || !password) return;

  elements.authMessage.textContent = "Signing in...";
  try {
    state.authSession = await signInWithPassword(email, password);
    saveAuthSession(state.authSession);
    elements.authForm.reset();
    elements.authMessage.textContent = "";
    closeAuthDialog();
    renderAuth();
    await refreshPrivateTablesFromSupabase();
  } catch (error) {
    elements.authMessage.textContent = `Could not sign in: ${error.message}`;
    console.warn(error);
  }
}

async function refreshReviews() {
  await refreshPrivateTablesFromSupabase();
}

function handleAuthAction(event) {
  const target = event.target.closest("[data-auth-action]");
  if (!target) return;
  const action = target.dataset.authAction;
  if (action === "signin") openAuthDialog();
  if (action === "signout") signOut();
  if (action === "close") closeAuthDialog();
}

function bindEvents() {
  tripsView.bindEvents();
  reviewsView.bindEvents();
  elements.authForm?.addEventListener("submit", handleAuthSubmit);
  document.addEventListener("click", handleAuthAction);
  elements.calendarGrid.addEventListener("click", handleAction);
  elements.calendarGrid.addEventListener("keydown", (event) => {
    if (!["Enter", " "].includes(event.key)) return;
    const target = event.target.closest('[data-action="select-calendar-day"]');
    if (!target) return;
    event.preventDefault();
    setSelectedCalendarDate(target.dataset.date);
  });
  elements.calendarSelectedDay?.addEventListener("click", handleAction);
  elements.eventList.addEventListener("click", handleAction);
  elements.festivalList.addEventListener("click", handleAction);
  elements.recentlyAddedList.addEventListener("click", handleAction);
  elements.tripList.addEventListener("click", handleAction);
  elements.reviewList.addEventListener("click", handleAction);
  elements.monthPicker.addEventListener("change", (event) => {
    setSelectedMonth(event.target.value);
  });
  elements.calendarMonthJump?.addEventListener("change", (event) => setSelectedMonth(event.target.value));
  elements.todayBtn?.addEventListener("click", goToCurrentDate);
  elements.mobileCalendarModeToggle?.addEventListener("click", () => {
    state.mobileCalendarMonthView = !state.mobileCalendarMonthView;
    localStorage.setItem("salsa-festivals-mobile-calendar-month-view", String(state.mobileCalendarMonthView));
    renderCalendar();
  });
  elements.monthJumpRail?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-month]");
    if (button) setSelectedMonth(button.dataset.month);
  });
  elements.hideDuplicateAttendedToggle?.addEventListener("change", (event) => {
    state.hideDuplicateAttendedEvents = event.target.checked;
    localStorage.setItem("salsa-festivals-hide-duplicate-attended", String(state.hideDuplicateAttendedEvents));
    renderCalendar();
  });
  elements.attendedOnlyToggle?.addEventListener("change", (event) => {
    state.attendedOnlyCalendar = event.target.checked;
    localStorage.setItem("salsa-festivals-attended-only-calendar", String(state.attendedOnlyCalendar));
    renderCalendar();
  });
  elements.prevMonthBtn.addEventListener("click", () => shiftSelectedMonth(-1));
  elements.nextMonthBtn.addEventListener("click", () => shiftSelectedMonth(1));
  elements.searchInput.addEventListener("input", (event) => {
    state.search = event.target.value;
    renderEvents();
    renderCalendar();
  });
  elements.listYearSelect?.addEventListener("change", (event) => {
    state.listYear = event.target.value;
    renderEvents();
  });
  elements.listMonthSelect?.addEventListener("change", (event) => {
    state.listMonth = event.target.value;
    renderEvents();
  });
  elements.collapseCalendarListBtn?.addEventListener("click", () => setCollapseMode("calendarList", true));
  elements.expandCalendarListBtn?.addEventListener("click", () => setCollapseMode("calendarList", false));
  elements.festivalSearchInput.addEventListener("input", renderFestivalList);
  elements.festivalYearSelect.addEventListener("change", (event) => {
    state.festivalYear = event.target.value;
    state.festivalCountry = "";
    localStorage.setItem("salsa-festivals-event-list-year", state.festivalYear);
    renderFestivalList();
  });
  elements.festivalMonthSelect?.addEventListener("change", (event) => {
    state.festivalMonth = event.target.value;
    renderFestivalList();
  });
  elements.festivalCountrySelect.addEventListener("change", (event) => {
    state.festivalCountry = event.target.value;
    renderFestivalList();
  });
  elements.festivalSizeSelect.addEventListener("change", (event) => {
    state.festivalSize = event.target.value;
    renderFestivalList();
  });
  elements.collapseFestivalListBtn?.addEventListener("click", () => setCollapseMode("eventList", true));
  elements.expandFestivalListBtn?.addEventListener("click", () => setCollapseMode("eventList", false));
  elements.collapseRecentlyAddedBtn?.addEventListener("click", () => setCollapseMode("recentlyAdded", true));
  elements.expandRecentlyAddedBtn?.addEventListener("click", () => setCollapseMode("recentlyAdded", false));
  elements.collapseTripsBtn?.addEventListener("click", () => setCollapseMode("trips", true));
  elements.expandTripsBtn?.addEventListener("click", () => setCollapseMode("trips", false));
  elements.collapseReviewsBtn?.addEventListener("click", () => setCollapseMode("reviews", true));
  elements.expandReviewsBtn?.addEventListener("click", () => setCollapseMode("reviews", false));
  elements.backToTopBtn?.addEventListener("click", scrollToTop);
  window.addEventListener("scroll", updateBackToTopVisibility, { passive: true });
  elements.schengenCheckDate?.addEventListener("change", (event) => {
    state.schengenCheckDate = event.target.value || localDateString(new Date());
    tripsView.renderTrips();
  });
  elements.tripHistoryToggle?.addEventListener("change", (event) => {
    state.showHistoricalTrips = event.target.checked;
    localStorage.setItem("salsa-festivals-show-historical-trips", String(state.showHistoricalTrips));
    tripsView.renderTrips();
  });
  elements.schengenImpactToggle?.addEventListener("change", (event) => {
    state.showSchengenImpactingTrips = event.target.checked;
    localStorage.setItem("salsa-festivals-show-schengen-impacting-trips", String(state.showSchengenImpactingTrips));
    tripsView.renderTrips();
  });
  elements.tripCountrySelect?.addEventListener("change", (event) => {
    state.tripCountry = event.target.value;
    tripsView.renderTrips();
  });
  elements.tripYearSelect?.addEventListener("change", (event) => {
    state.tripYear = event.target.value;
    tripsView.renderTrips();
  });
  elements.tripMonthSelect?.addEventListener("change", (event) => {
    state.tripMonth = event.target.value;
    tripsView.renderTrips();
  });
  elements.sortSelect.addEventListener("change", (event) => {
    state.sort = event.target.value;
    renderEvents();
  });
  elements.historyToggle.addEventListener("change", (event) => {
    state.showHistorical = event.target.checked;
    state.listYear = "";
    renderEvents();
  });
  elements.tabs.forEach((tab) => {
    tab.addEventListener("click", () => switchView(tab.dataset.view));
  });
  updateBackToTopVisibility();
}

function initializeFeatureViews() {
  tripsView = createTripsView({
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
  });
  reviewsView = createReviewsView({
    Api,
    state,
    elements,
    isSignedIn,
    currentUserId,
    loadSupabaseReviews,
    render,
    switchView,
    emptyState,
    cardCollapseButton,
    collapsibleCardBody
  });
}

async function init() {
  loadAuthSession();
  loadState();
  if (!isSignedIn()) {
    state.reviews = [];
  }
  initializeFeatureViews();
  bindEvents();
  render();
  switchView(state.activeView);
  await refreshPublicEventsFromSupabase();
  if (isSignedIn()) {
    await refreshPrivateTablesFromSupabase();
  }
}

init();
