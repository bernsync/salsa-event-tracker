const storageKey = "salsa-festivals-tracker-v1";

const scoreCategories = [
  ["music", "Music"],
  ["dancingLevel", "Dancing Level"],
  ["stageImpact", "Stage Impact"],
  ["floor", "Floor"],
  ["vibe", "Vibe"],
  ["eventCost", "Event Cost"],
  ["servicesProvided", "Services Provided"],
  ["eventHours", "Event Hours"],
  ["hostCity", "Host City"],
  ["eventSize", "Event Size"],
  ["travelToEvent", "Travel to Event"]
];

const state = {
  events: [],
  reviews: [],
  deletedReviewSourceIds: [],
  activeView: localStorage.getItem("salsa-festivals-active-view") || "calendar",
  search: "",
  sort: "date",
  selectedMonth: localDateString(new Date()).slice(0, 7),
  showHistorical: false
};

const canonicalEventNames = {
  "big 3 festival": "Big 3 Festival",
  "dancehub": "The Dance Hub",
  "dance hub": "The Dance Hub",
  "the dancehub": "The Dance Hub",
  "live 2 mambo 2 weekends": "Live 2 Mambo: 2 Weekends",
  "live 2 mambo 2 weekend": "Live 2 Mambo: 2 Weekends",
  "live 2 mambo: 2 weekends": "Live 2 Mambo: 2 Weekends",
  "magic": "Magic Slovenian Salsa Festival",
  "magic slovenian salsa festival": "Magic Slovenian Salsa Festival",
  "cobeatparty salsa rave": "SalsaRave by CoBeatParty",
  "salsarave": "SalsaRave by CoBeatParty",
  "salsa rave": "SalsaRave by CoBeatParty",
  "salsarave by cobeatparty": "SalsaRave by CoBeatParty",
  "mambo city": "5Star Congress",
  "mambocity 5 star": "5Star Congress",
  "mambocity 5 star congress": "5Star Congress",
  "mambocity 5star congress": "5Star Congress",
  "mambo city 5 star": "5Star Congress",
  "mambo city 5 star congress": "5Star Congress",
  "mambo city 5star congress": "5Star Congress",
  "5 star congress": "5Star Congress",
  "5star congress": "5Star Congress",
  "mambo marathon": "Mambo Marathonios",
  "m. mambo marathonios": "Mambo Marathonios"
};

const removedEventNames = new Set([
  "caldac",
  "cisc",
  "csbf",
  "chicago international salsa congress",
  "chicago salsa bachata festival",
  "reno latin dance festival",
  "orlando salsa congress",
  "sf sbk",
  "sfsbkz"
]);

const eventDateCorrections = {
  "prague salsa marathon|2026-05-09|2026-05-11": ["2026-05-07", "2026-05-11"],
  "smyrna mambo getaway|2026-05-22|2026-05-26": ["2026-05-21", "2026-05-24"],
  "mambo y nada mas|2026-05-29|2026-06-02": ["2026-05-29", "2026-05-31"],
  "porto salsa weekend|2025-10-02|2025-10-06": ["2025-10-02", "2025-10-05"],
  "porto salsa weekend|2026-10-02|2026-10-06": ["2026-10-02", "2026-10-04"],
  "pink marathon|2026-10-23|2026-10-26": ["2026-10-23", "2026-10-25"],
  "mambo marathonios|2027-04-23|2027-04-26": ["2027-04-21", "2027-04-26"],
  "zagreb salsa marathon|2026-04-23|2026-04-27": ["2026-04-30", "2026-05-02"],
  "5star congress|2026-05-01|2026-05-05": ["2026-05-01", "2026-05-04"],
  "5star congress|2026-05-08|2026-05-11": ["2026-05-01", "2026-05-04"]
};

const $ = (selector) => document.querySelector(selector);

const elements = {
  addEventBtn: $("#addEventBtn"),
  tabs: document.querySelectorAll(".tab"),
  views: document.querySelectorAll(".view"),
  monthPicker: $("#monthPicker"),
  prevMonthBtn: $("#prevMonthBtn"),
  nextMonthBtn: $("#nextMonthBtn"),
  calendarGrid: $("#calendarGrid"),
  eventList: $("#eventList"),
  festivalList: $("#festivalList"),
  festivalSearchInput: $("#festivalSearchInput"),
  reviewList: $("#reviewList"),
  searchInput: $("#searchInput"),
  sortSelect: $("#sortSelect"),
  historyToggle: $("#historyToggle"),
  eventDialog: $("#eventDialog"),
  eventDialogTitle: $("#eventDialogTitle"),
  eventForm: $("#eventForm"),
  saveEventBtn: $("#saveEventBtn"),
  deleteEventBtn: $("#deleteEventBtn"),
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

function loadState() {
  const raw = localStorage.getItem(storageKey);
  if (raw) {
    try {
      const saved = JSON.parse(raw);
      state.events = saved.events || [];
      state.reviews = saved.reviews || [];
      state.deletedReviewSourceIds = saved.deletedReviewSourceIds || [];
      canonicalizeEventNames();
      correctEventDates();
      removeLegacySampleEvents();
      deduplicateEvents();
      mergeSeedEvents();
      deduplicateEvents();
      deduplicateCalendarEditions();
      mergeHardcodedReviews();
      return;
    } catch {
      localStorage.removeItem(storageKey);
    }
  }

  state.events = [];
  mergeSeedEvents();
  deduplicateEvents();
  deduplicateCalendarEditions();
  mergeHardcodedReviews();
}

function canonicalizeEventNames() {
  let changed = false;

  state.events.forEach((event) => {
    const canonicalName = canonicalNameFor(event.name);
    if (event.name !== canonicalName) {
      event.name = canonicalName;
      event.updatedAt = new Date().toISOString();
      changed = true;
    }
  });

  if (changed) {
    saveState();
  }
}

function correctEventDates() {
  let changed = false;

  state.events.forEach((event) => {
    const correction = eventDateCorrections[[event.name, event.startDate, event.endDate].map(normalizeText).join("|")];
    if (!correction) return;
    event.startDate = correction[0];
    event.endDate = correction[1];
    event.updatedAt = new Date().toISOString();
    changed = true;
  });

  if (changed) {
    saveState();
  }
}

function canonicalNameFor(name) {
  return canonicalEventNames[normalizeText(name)] || name;
}

function removeLegacySampleEvents() {
  const legacyKeys = new Set([
    "mambocity 5 star congress|2026-05-08|2026-05-11|london|united kingdom",
    "mambo city 5 star|2026-05-01|2026-05-05|london|united kingdom",
    "mambo city 5 star congress|2026-05-01|2026-05-05|london|united kingdom",
    "berlin salsa congress|2026-09-24|2026-09-28|berlin|germany",
    "test salsa weekender|2026-06-12|2026-06-14|lisbon|portugal"
  ]);
  const beforeCount = state.events.length;

  state.events = state.events.filter((event) => {
    const isLegacyName = normalizeText(event.name).includes("mambo city 5 star");
    const isRemovedEvent = removedEventNames.has(normalizeText(event.name));
    return !legacyKeys.has(eventKey(event)) && !isLegacyName && !isRemovedEvent;
  });

  if (state.events.length !== beforeCount) {
    const eventIds = new Set(state.events.map((event) => event.id));
    state.reviews = state.reviews.filter((review) => eventIds.has(review.eventId));
    saveState();
  }
}

function deduplicateEvents() {
  const seen = new Map();
  const idRedirects = new Map();
  const deduped = [];

  state.events.forEach((event) => {
    const key = duplicateEventKey(event);
    const existing = seen.get(key);

    if (!existing) {
      seen.set(key, event);
      deduped.push(event);
      return;
    }

    const keeper = richerEvent(existing, event);
    const duplicate = keeper === existing ? event : existing;
    const keeperIndex = deduped.findIndex((item) => item.id === existing.id);

    mergeEventDetails(keeper, duplicate);
    seen.set(key, keeper);
    if (keeperIndex >= 0) {
      deduped[keeperIndex] = keeper;
    }
    idRedirects.set(duplicate.id, keeper.id);
  });

  if (!idRedirects.size) return;

  state.events = deduped;
  state.reviews = state.reviews
    .map((review) => ({ ...review, eventId: idRedirects.get(review.eventId) || review.eventId }))
    .filter((review) => state.events.some((event) => event.id === review.eventId));
  saveState();
}

function deduplicateCalendarEditions() {
  const seen = new Map();
  const idRedirects = new Map();
  const deduped = [];

  state.events
    .sort((a, b) => eventDetailScore(b) - eventDetailScore(a))
    .forEach((event) => {
      const key = calendarEditionKey(event);
      const existing = seen.get(key);
      if (!existing) {
        seen.set(key, event);
        deduped.push(event);
        return;
      }

      mergeEventDetails(existing, event);
      idRedirects.set(event.id, existing.id);
    });

  if (!idRedirects.size) return;

  state.events = deduped.sort((a, b) => a.startDate.localeCompare(b.startDate) || a.name.localeCompare(b.name));
  state.reviews = state.reviews
    .map((review) => ({ ...review, eventId: idRedirects.get(review.eventId) || review.eventId }))
    .filter((review) => state.events.some((event) => event.id === review.eventId));
  saveState();
}

function calendarEditionKey(event) {
  return [
    eventFamilyKey(event),
    event.city,
    event.country,
    event.startDate.slice(0, 7)
  ].map(normalizeText).join("|");
}

function mergeEventDetails(target, source) {
  ["city", "country", "venue", "organizer", "website", "instagram", "facebook", "price", "currency", "djs", "artists", "notes"].forEach((field) => {
    if (!target[field] && source[field]) {
      target[field] = source[field];
    }
  });
}

function richerEvent(first, second) {
  return eventDetailScore(second) > eventDetailScore(first) ? second : first;
}

function eventDetailScore(event) {
  return ["city", "country", "venue", "organizer", "website", "instagram", "facebook", "price", "currency", "djs", "artists", "notes"]
    .reduce((score, field) => score + (event[field] ? String(event[field]).length : 0), 0);
}

function mergeSeedEvents() {
  if (!Array.isArray(window.seedEvents)) return;

  let changed = false;
  window.seedEvents.forEach((seed) => {
    seed.name = canonicalNameFor(seed.name);
    const linkData = window.eventLinks?.[seed.name] || {};
    const hydratedSeed = { ...seed, ...linkData };
    const existing = state.events.find((event) => eventKey(event) === eventKey(seed));
    if (existing) {
      changed = updateMissingEventFields(existing, hydratedSeed) || changed;
      return;
    }

    state.events.push({
      id: crypto.randomUUID(),
      name: hydratedSeed.name,
      startDate: hydratedSeed.startDate,
      endDate: hydratedSeed.endDate,
      city: hydratedSeed.city || "",
      country: hydratedSeed.country || "",
      venue: hydratedSeed.venue || "",
      organizer: hydratedSeed.organizer || "",
      website: hydratedSeed.website || "",
      instagram: hydratedSeed.instagram || "",
      facebook: hydratedSeed.facebook || "",
      price: hydratedSeed.price || "",
      currency: hydratedSeed.currency || "EUR",
      djs: hydratedSeed.djs || "",
      artists: hydratedSeed.artists || "",
      notes: hydratedSeed.notes || "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    changed = true;
  });

  if (changed) {
    saveState();
  }
}

function mergeHardcodedReviews() {
  if (!Array.isArray(window.hardcodedReviews)) return;

  let changed = false;
  window.hardcodedReviews.forEach((sourceReview) => {
    if (state.deletedReviewSourceIds.includes(sourceReview.sourceId)) return;
    const event = state.events.find((item) => (
      eventFamilyKey(item) === normalizeText(sourceReview.eventName)
      && item.startDate === sourceReview.eventStartDate
      && item.endDate === sourceReview.eventEndDate
    ));
    if (!event) return;

    const existing = state.reviews.find((review) => review.sourceId === sourceReview.sourceId);
    const nextReview = {
      sourceId: sourceReview.sourceId,
      eventId: event.id,
      scores: sourceReview.scores,
      categoryComments: sourceReview.categoryComments || {},
      topReason: sourceReview.topReason || "",
      notes: sourceReview.notes || "",
      reviewedAt: sourceReview.reviewedAt || new Date().toISOString(),
      isPublished: true
    };

    if (existing) {
      if (existing.userModified) return;
      Object.assign(existing, nextReview, { id: existing.id, updatedAt: new Date().toISOString() });
    } else {
      state.reviews.push({ id: crypto.randomUUID(), ...nextReview });
    }
    changed = true;
  });

  if (changed) {
    saveState();
  }
}

function updateMissingEventFields(event, source) {
  const fields = ["venue", "organizer", "website", "instagram", "facebook", "price", "currency", "djs", "artists", "notes"];
  let changed = false;

  fields.forEach((field) => {
    if (source[field] && event[field] !== source[field]) {
      event[field] = source[field];
      changed = true;
    }
  });

  if (changed) {
    event.updatedAt = new Date().toISOString();
  }

  return changed;
}

function eventKey(event) {
  return [
    event.name,
    event.startDate,
    event.endDate,
    event.city,
    event.country
  ].map(normalizeText).join("|");
}

function duplicateEventKey(event) {
  return [
    event.name,
    event.startDate,
    event.endDate
  ].map(normalizeText).join("|");
}

function eventFamilyKey(event) {
  return normalizeText(canonicalNameFor(event.name));
}

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function saveState() {
  localStorage.setItem(storageKey, JSON.stringify({
    events: state.events,
    reviews: state.reviews,
    deletedReviewSourceIds: state.deletedReviewSourceIds
  }));
}

function localDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(`${value}T12:00:00`);
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function dateRange(event) {
  if (event.startDate === event.endDate) return formatDate(event.startDate);
  return `${formatDate(event.startDate)} - ${formatDate(event.endDate)}`;
}

function eventLocation(event) {
  return [event.city, event.country].filter(Boolean).join(", ");
}

function monthOverlaps(event, month) {
  const start = event.startDate.slice(0, 7);
  const end = event.endDate.slice(0, 7);
  return start <= month && end >= month;
}

function shiftSelectedMonth(offset) {
  const [year, month] = state.selectedMonth.split("-").map(Number);
  const date = new Date(year, month - 1 + offset, 1);
  state.selectedMonth = localDateString(date).slice(0, 7);
  renderCalendar();
}

function eventOccursOnDate(event, dateValue) {
  return event.startDate <= dateValue && calendarDisplayEndDate(event) >= dateValue;
}

function calendarDisplayEndDate(event) {
  const start = new Date(`${event.startDate}T12:00:00`);
  const end = new Date(`${event.endDate}T12:00:00`);
  const endsMonday = end.getDay() === 1;
  const keepsMonday = normalizeText(event.name) === "prague salsa marathon";

  if (endsMonday && event.startDate !== event.endDate && !keepsMonday) {
    end.setDate(end.getDate() - 1);
    return localDateString(end);
  }

  return event.endDate;
}

function isHistorical(event) {
  return event.endDate < localDateString(new Date());
}

function eventReviews(eventId) {
  return state.reviews.filter((review) => review.eventId === eventId);
}

function eventFamilyReviews(event) {
  return state.reviews.filter((review) => {
    const reviewedEvent = state.events.find((item) => item.id === review.eventId);
    return reviewedEvent && eventFamilyKey(reviewedEvent) === eventFamilyKey(event);
  });
}

function priorEditionReviews(event) {
  return eventFamilyReviews(event).filter((review) => {
    const reviewedEvent = state.events.find((item) => item.id === review.eventId);
    return reviewedEvent && reviewedEvent.endDate < event.startDate;
  });
}

function totalScore(review) {
  const sum = scoreCategories.reduce((total, [key]) => total + Number(review.scores[key] || 0), 0);
  return sum / scoreCategories.length;
}

function latestScore(eventId) {
  const reviews = eventReviews(eventId).sort((a, b) => b.reviewedAt.localeCompare(a.reviewedAt));
  return reviews.length ? totalScore(reviews[0]) : null;
}

function reviewScoreForEvent(event) {
  const reviews = isHistorical(event) ? eventReviews(event.id) : priorEditionReviews(event);
  if (!reviews.length) return null;
  const average = reviews.reduce((sum, review) => sum + totalScore(review), 0) / reviews.length;
  return {
    average,
    count: reviews.length,
    isPrior: !isHistorical(event)
  };
}

function emptyState(label = "No festivals yet", help = "Add your first festival to start building your tracker.") {
  const node = elements.emptyStateTemplate.content.firstElementChild.cloneNode(true);
  node.querySelector("strong").textContent = label;
  node.querySelector("p").textContent = help;
  return node;
}

function sourceLink(label, value) {
  if (!value) return "";
  let href = value;
  if (value.startsWith("@")) href = `https://instagram.com/${value.slice(1)}`;
  if (!href.startsWith("http")) return "";
  return `<a href="${escapeHtml(href)}" target="_blank" rel="noreferrer">${label}</a>`;
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderEventCard(event) {
  const score = reviewScoreForEvent(event);
  const card = document.createElement("article");
  card.className = "event-card";
  card.innerHTML = `
    <div class="event-card-header">
      <div>
        <h3>${escapeHtml(event.name)}</h3>
        <p class="muted">${escapeHtml(dateRange(event))}</p>
      </div>
      ${score ? `<span class="pill score-pill">${score.average.toFixed(1)}${score.isPrior ? " prior" : ""}</span>` : ""}
    </div>
    <div class="event-meta">
      ${eventLocation(event) ? `<span class="pill">${escapeHtml(eventLocation(event))}</span>` : ""}
      ${event.organizer ? `<span class="pill">${escapeHtml(event.organizer)}</span>` : ""}
      ${event.price ? `<span class="pill">${escapeHtml(event.price)}</span>` : ""}
      ${event.currency ? `<span class="pill">${escapeHtml(event.currency)}</span>` : ""}
    </div>
    <div class="event-detail">
      ${event.venue ? `<div><strong>Venue:</strong> ${escapeHtml(event.venue)}</div>` : ""}
      ${event.organizer ? `<div><strong>Organizer:</strong> ${escapeHtml(event.organizer)}</div>` : ""}
      ${event.djs ? `<div><strong>DJs:</strong> ${escapeHtml(event.djs)}</div>` : ""}
      ${event.artists ? `<div><strong>Artists:</strong> ${escapeHtml(event.artists)}</div>` : ""}
      ${event.notes ? `<div><strong>Notes:</strong> ${escapeHtml(event.notes)}</div>` : ""}
    </div>
    <div class="event-actions">
      ${sourceLink("Website", event.website)}
      ${sourceLink("Instagram", event.instagram)}
      ${sourceLink("Facebook", event.facebook)}
      <span class="event-status">${isHistorical(event) ? "Past event" : "Upcoming"}</span>
    </div>
  `;
  return card;
}

function renderCalendar() {
  elements.monthPicker.value = state.selectedMonth;
  elements.calendarGrid.innerHTML = "";

  const [year, month] = state.selectedMonth.split("-").map(Number);
  const firstOfMonth = new Date(year, month - 1, 1);
  const start = new Date(firstOfMonth);
  start.setDate(firstOfMonth.getDate() - firstOfMonth.getDay());

  for (let index = 0; index < 42; index += 1) {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const dateValue = localDateString(date);
    const dayEvents = state.events
      .filter((event) => eventOccursOnDate(event, dateValue))
      .sort((a, b) => a.startDate.localeCompare(b.startDate));
    const day = document.createElement("section");
    day.className = "calendar-day";
    if (date.getMonth() !== month - 1) day.classList.add("is-outside");
    if (dateValue === localDateString(new Date())) day.classList.add("is-today");
    day.innerHTML = `
      <div class="calendar-date">
        <span>${date.getDate()}</span>
      </div>
    `;

    dayEvents.forEach((event) => {
      const button = document.createElement("button");
      button.className = "calendar-event";
      button.type = "button";
      button.innerHTML = calendarEventMarkup(event);
      day.append(button);
    });

    elements.calendarGrid.append(day);
  }
}

function calendarEventMarkup(event) {
  return `
    <strong>${escapeHtml(event.name)}</strong>
    ${eventLocation(event) ? `<span>${escapeHtml(eventLocation(event))}</span>` : ""}
  `;
}

function renderEvents() {
  elements.eventList.innerHTML = "";
  elements.historyToggle.checked = state.showHistorical;
  const search = state.search.trim().toLowerCase();
  let events = state.events.filter((event) => {
    const haystack = [event.name, event.city, event.country, event.venue, event.organizer, event.djs, event.artists].join(" ").toLowerCase();
    const matchesSearch = !search || haystack.includes(search);
    const matchesTimeframe = state.showHistorical ? isHistorical(event) : !isHistorical(event);
    return matchesSearch && matchesTimeframe;
  });

  events = events.sort((a, b) => {
    if (state.sort === "name") return a.name.localeCompare(b.name);
    if (state.sort === "country") return `${a.country} ${a.city}`.localeCompare(`${b.country} ${b.city}`);
    if (state.sort === "score") return (reviewScoreForEvent(b)?.average || 0) - (reviewScoreForEvent(a)?.average || 0);
    return a.startDate.localeCompare(b.startDate);
  });

  if (!events.length) {
    elements.eventList.append(emptyState("No matching festivals", state.showHistorical ? "No past events match this search." : "No upcoming events match this search."));
    return;
  }

  events.forEach((event) => elements.eventList.append(renderEventCard(event)));
}

function renderFestivalList() {
  elements.festivalList.innerHTML = "";
  const search = elements.festivalSearchInput.value.trim().toLowerCase();
  const groups = uniqueFestivalGroups().filter((group) => {
    const haystack = [
      group.name,
      group.locations.join(" "),
      group.organizers.join(" ")
    ].join(" ").toLowerCase();
    return !search || haystack.includes(search);
  });

  if (!groups.length) {
    elements.festivalList.append(emptyState("No matching festivals", "Adjust search or add another event."));
    return;
  }

  groups.forEach((group) => {
    const card = document.createElement("article");
    card.className = "event-card";
    const nextEdition = group.upcoming[0];
    const reviewScore = nextEdition ? reviewScoreForEvent(nextEdition) : null;
    card.innerHTML = `
      <div class="event-card-header">
        <div>
          <h3>${escapeHtml(group.name)}</h3>
          <p class="muted">${escapeHtml(group.locations.join(" | "))}</p>
        </div>
        ${reviewScore ? `<span class="pill score-pill">${reviewScore.average.toFixed(1)} prior</span>` : ""}
      </div>
      <div class="event-meta">
        <span class="pill">${group.editions.length} edition${group.editions.length === 1 ? "" : "s"}</span>
        ${nextEdition ? `<span class="pill">Next: ${escapeHtml(dateRange(nextEdition))}</span>` : "<span class=\"pill\">No upcoming editions</span>"}
        ${group.organizers.map((organizer) => `<span class="pill">${escapeHtml(organizer)}</span>`).join("")}
      </div>
      <div class="event-detail">
        ${nextEdition?.venue ? `<div><strong>Next venue:</strong> ${escapeHtml(nextEdition.venue)}</div>` : ""}
        ${nextEdition?.djs ? `<div><strong>DJs:</strong> ${escapeHtml(nextEdition.djs)}</div>` : ""}
        ${nextEdition?.artists ? `<div><strong>Artists:</strong> ${escapeHtml(nextEdition.artists)}</div>` : ""}
      </div>
      <div class="event-actions">
        ${sourceLink("Website", group.website)}
        ${sourceLink("Instagram", group.instagram)}
        ${sourceLink("Facebook", group.facebook)}
      </div>
    `;
    elements.festivalList.append(card);
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
      const source = upcoming[0] || editions[editions.length - 1];
      return {
        ...group,
        editions,
        upcoming,
        locations: uniqueValues(editions.map(eventLocation).filter(Boolean)),
        organizers: uniqueValues(editions.map((event) => event.organizer).filter(Boolean)),
        website: source.website,
        instagram: source.instagram,
        facebook: source.facebook
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

function renderReviews() {
  elements.reviewList.innerHTML = "";
  const reviews = [...state.reviews].sort((a, b) => b.reviewedAt.localeCompare(a.reviewedAt));

  if (!reviews.length) {
    elements.reviewList.append(emptyState("No reviews yet", "Reviews are added through the repo so they publish consistently."));
    return;
  }

  reviews.forEach((review) => {
    const event = state.events.find((item) => item.id === review.eventId);
    const card = document.createElement("article");
    card.className = "review-card";
    card.innerHTML = `
      <div class="event-card-header">
        <div>
          <h3>${escapeHtml(event?.name || "Deleted event")}</h3>
          <p class="muted">${escapeHtml(new Date(review.reviewedAt).toLocaleDateString())}</p>
        </div>
        <span class="pill score-pill">${totalScore(review).toFixed(1)}</span>
      </div>
      ${review.topReason ? `<p><strong>Top reason:</strong> ${escapeHtml(review.topReason)}</p>` : ""}
      ${review.notes ? `<p class="muted">${escapeHtml(review.notes)}</p>` : ""}
      <div class="event-meta">
        ${scoreCategories.map(([key, label]) => `<span class="pill">${label}: ${review.scores[key]}</span>`).join("")}
      </div>
      ${renderCategoryComments(review)}
    `;
    elements.reviewList.append(card);
  });
}

function renderCategoryComments(review) {
  const comments = review.categoryComments || {};
  const rows = scoreCategories
    .filter(([key]) => comments[key])
    .map(([key, label]) => `
      <div class="review-comment">
        <strong>${escapeHtml(label)}</strong>
        <p>${escapeHtml(comments[key])}</p>
      </div>
    `)
    .join("");

  return rows ? `<div class="review-comments">${rows}</div>` : "";
}

function render() {
  renderCalendar();
  renderEvents();
  renderFestivalList();
  renderReviews();
}

function switchView(view) {
  state.activeView = view;
  localStorage.setItem("salsa-festivals-active-view", view);
  elements.tabs.forEach((tab) => tab.classList.toggle("is-active", tab.dataset.view === view));
  elements.views.forEach((section) => section.classList.toggle("is-active", section.id === `${view}View`));
}

function openEventDialog(eventId) {
  const event = state.events.find((item) => item.id === eventId);
  elements.eventDialogTitle.textContent = event ? "Edit event" : "Add event";
  elements.deleteEventBtn.hidden = !event;
  $("#eventId").value = event?.id || "";
  $("#eventName").value = event?.name || "";
  $("#startDate").value = event?.startDate || new Date().toISOString().slice(0, 10);
  $("#endDate").value = event?.endDate || new Date().toISOString().slice(0, 10);
  $("#city").value = event?.city || "";
  $("#country").value = event?.country || "";
  $("#venue").value = event?.venue || "";
  $("#organizer").value = event?.organizer || "";
  $("#website").value = event?.website || "";
  $("#instagram").value = event?.instagram || "";
  $("#facebook").value = event?.facebook || "";
  $("#price").value = event?.price || "";
  $("#currency").value = event?.currency || "EUR";
  $("#djs").value = event?.djs || "";
  $("#artists").value = event?.artists || "";
  $("#notes").value = event?.notes || "";
  elements.eventDialog.showModal();
}

function saveEvent() {
  if (!elements.eventForm.reportValidity()) return;

  const id = $("#eventId").value || crypto.randomUUID();
  const startDate = $("#startDate").value;
  const endDate = $("#endDate").value < startDate ? startDate : $("#endDate").value;
  const existing = state.events.find((event) => event.id === id);
  const nextEvent = {
    id,
    name: $("#eventName").value.trim(),
    startDate,
    endDate,
    city: $("#city").value.trim(),
    country: $("#country").value.trim(),
    venue: $("#venue").value.trim(),
    organizer: $("#organizer").value.trim(),
    website: $("#website").value.trim(),
    instagram: $("#instagram").value.trim(),
    facebook: $("#facebook").value.trim(),
    price: $("#price").value.trim(),
    currency: $("#currency").value.trim() || "EUR",
    djs: $("#djs").value.trim(),
    artists: $("#artists").value.trim(),
    notes: $("#notes").value.trim(),
    createdAt: existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  if (existing) {
    state.events = state.events.map((event) => event.id === id ? nextEvent : event);
  } else {
    state.events.push(nextEvent);
  }

  state.selectedMonth = nextEvent.startDate.slice(0, 7);
  saveState();
  elements.eventDialog.close();
  render();
}

function buildScoreFields() {
  elements.scoreFields.innerHTML = "";
  scoreCategories.forEach(([key, label]) => {
    const row = document.createElement("label");
    row.className = "score-row";
    row.innerHTML = `
      <span>${label}</span>
      <span class="score-value" id="${key}Value">5</span>
      <input data-score="${key}" type="range" min="1" max="10" value="5">
      <textarea data-comment="${key}" rows="2" placeholder="${label} comments"></textarea>
    `;
    elements.scoreFields.append(row);
  });
}

function setScoreFieldValues(scores) {
  document.querySelectorAll("[data-score]").forEach((input) => {
    const value = scores?.[input.dataset.score] || 5;
    input.value = value;
  });
  updateLiveScore();
}

function setCommentFieldValues(comments = {}) {
  document.querySelectorAll("[data-comment]").forEach((textarea) => {
    textarea.value = comments[textarea.dataset.comment] || "";
  });
}

function updateLiveScore() {
  const values = [...document.querySelectorAll("[data-score]")].map((input) => Number(input.value));
  const total = values.reduce((sum, value) => sum + value, 0) / values.length;
  elements.liveScore.textContent = total.toFixed(1);
  document.querySelectorAll("[data-score]").forEach((input) => {
    $(`#${input.dataset.score}Value`).textContent = input.value;
  });
}

function openReviewDialog(eventId) {
  const event = state.events.find((item) => item.id === eventId);
  if (!event) return;
  if (!isHistorical(event)) {
    window.alert("Reviews can only be added after an event has happened. Upcoming editions show prior-edition reviews when available.");
    return;
  }
  elements.reviewEventName.textContent = event.name;
  elements.reviewEventId.value = event.id;
  elements.reviewId.value = "";
  elements.topReason.value = "";
  elements.reviewNotes.value = "";
  buildScoreFields();
  setScoreFieldValues();
  setCommentFieldValues();
  elements.saveReviewBtn.textContent = "Save review";
  elements.reviewDialog.showModal();
}

function openReviewEditor(reviewId) {
  const review = state.reviews.find((item) => item.id === reviewId);
  if (!review) return;
  const event = state.events.find((item) => item.id === review.eventId);
  elements.reviewEventName.textContent = event?.name || "Festival review";
  elements.reviewEventId.value = review.eventId;
  elements.reviewId.value = review.id;
  elements.topReason.value = review.topReason || "";
  elements.reviewNotes.value = review.notes || "";
  buildScoreFields();
  setScoreFieldValues(review.scores);
  setCommentFieldValues(review.categoryComments);
  elements.saveReviewBtn.textContent = "Update review";
  elements.reviewDialog.showModal();
}

function saveReview() {
  const scores = {};
  document.querySelectorAll("[data-score]").forEach((input) => {
    scores[input.dataset.score] = Number(input.value);
  });
  const categoryComments = {};
  document.querySelectorAll("[data-comment]").forEach((textarea) => {
    const value = textarea.value.trim();
    if (value) {
      categoryComments[textarea.dataset.comment] = value;
    }
  });

  const reviewId = elements.reviewId.value;
  const existing = state.reviews.find((review) => review.id === reviewId);
  if (existing) {
    existing.scores = scores;
    existing.categoryComments = categoryComments;
    existing.topReason = elements.topReason.value.trim();
    existing.notes = elements.reviewNotes.value.trim();
    existing.userModified = Boolean(existing.sourceId);
    existing.updatedAt = new Date().toISOString();
  } else {
    state.reviews.push({
      id: crypto.randomUUID(),
      eventId: elements.reviewEventId.value,
      scores,
      categoryComments,
      topReason: elements.topReason.value.trim(),
      notes: elements.reviewNotes.value.trim(),
      reviewedAt: new Date().toISOString()
    });
  }

  saveState();
  elements.reviewDialog.close();
  render();
  switchView("reviews");
}

function deleteReview(reviewId) {
  const review = state.reviews.find((item) => item.id === reviewId);
  if (!review) return;
  const event = state.events.find((item) => item.id === review.eventId);
  const confirmed = window.confirm(`Delete review for ${event?.name || "this event"}?`);
  if (!confirmed) return;
  if (review.sourceId && !state.deletedReviewSourceIds.includes(review.sourceId)) {
    state.deletedReviewSourceIds.push(review.sourceId);
  }
  state.reviews = state.reviews.filter((item) => item.id !== reviewId);
  saveState();
  render();
}

function deleteEvent(eventId) {
  const event = state.events.find((item) => item.id === eventId);
  if (!event) return;
  const confirmed = window.confirm(`Delete ${event.name}? This also removes its reviews.`);
  if (!confirmed) return;
  state.events = state.events.filter((item) => item.id !== eventId);
  state.reviews = state.reviews.filter((review) => review.eventId !== eventId);
  saveState();
  render();
}

function handleAction(event) {
  const target = event.target.closest("[data-action]");
  if (!target) return;
  const { action, id } = target.dataset;
  if (action === "edit") openEventDialog(id);
  if (action === "delete") deleteEvent(id);
}

function bindEvents() {
  elements.saveEventBtn?.addEventListener("click", saveEvent);
  elements.deleteEventBtn?.addEventListener("click", () => {
    const eventId = $("#eventId").value;
    if (!eventId) return;
    elements.eventDialog.close();
    deleteEvent(eventId);
  });
  elements.saveReviewBtn?.addEventListener("click", saveReview);
  elements.calendarGrid.addEventListener("click", handleAction);
  elements.eventList.addEventListener("click", handleAction);
  elements.reviewList.addEventListener("click", handleAction);
  elements.monthPicker.addEventListener("change", (event) => {
    state.selectedMonth = event.target.value;
    renderCalendar();
  });
  elements.prevMonthBtn.addEventListener("click", () => shiftSelectedMonth(-1));
  elements.nextMonthBtn.addEventListener("click", () => shiftSelectedMonth(1));
  elements.searchInput.addEventListener("input", (event) => {
    state.search = event.target.value;
    renderEvents();
  });
  elements.festivalSearchInput.addEventListener("input", renderFestivalList);
  elements.sortSelect.addEventListener("change", (event) => {
    state.sort = event.target.value;
    renderEvents();
  });
  elements.historyToggle.addEventListener("change", (event) => {
    state.showHistorical = event.target.checked;
    renderEvents();
  });
  elements.tabs.forEach((tab) => {
    tab.addEventListener("click", () => switchView(tab.dataset.view));
  });
  elements.scoreFields.addEventListener("input", updateLiveScore);
}

loadState();
bindEvents();
render();
switchView(state.activeView);
