const storageKey = "salsa-festivals-tracker-v1";
const authStorageKey = "salsa-festivals-auth-session-v1";

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
  trips: [],
  personalTrips: [],
  authSession: null,
  schengenCountries: new Map(),
  schengenCountriesLoaded: false,
  supabaseLoadStatus: {},
  deletedReviewSourceIds: [],
  activeView: localStorage.getItem("salsa-festivals-active-view") || "calendar",
  search: "",
  sort: "date",
  selectedMonth: localDateString(new Date()).slice(0, 7),
  showHistorical: false,
  festivalYear: localStorage.getItem("salsa-festivals-event-list-year") || String(new Date().getFullYear()),
  listMonth: "",
  festivalMonth: "",
  festivalCountry: "",
  festivalSize: ""
};

const canonicalEventNames = {
  "big 3 festival": "Big 3 Festival",
  "dancehub": "The Dance Hub",
  "dance hub": "The Dance Hub",
  "the dancehub": "The Dance Hub",
  "live 2 mambo first weekend": "Live 2 Mambo: Novotel",
  "live 2 mambo: first weekend": "Live 2 Mambo: Novotel",
  "live 2 mambo novotel": "Live 2 Mambo: Novotel",
  "live 2 mambo: novotel": "Live 2 Mambo: Novotel",
  "live 2 mambo carnival days": "Live 2 Mambo: Carnival Days",
  "live 2 mambo: carnival days": "Live 2 Mambo: Carnival Days",
  "live 2 mambo second weekend": "Live 2 Mambo: New York Palace",
  "live 2 mambo: second weekend": "Live 2 Mambo: New York Palace",
  "live 2 mambo new york palace": "Live 2 Mambo: New York Palace",
  "live 2 mambo: new york palace": "Live 2 Mambo: New York Palace",
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
  "amsterdam salsa weekender": "Amsterdam Salsa Weekend",
  "beat passion mambo": "Beats Passion Mambo",
  "beats passion mambo": "Beats Passion Mambo",
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
  "sfsbkz",
  "world salsa festival",
  "live 2 mambo: 2 weekends",
  "super mario birthday"
]);

const sharedEventFields = ["organizer", "website", "instagram", "facebook"];
const editionSpecificEventFields = ["venue", "tickets", "price", "currency", "djs", "artists", "eventSize", "travel", "addedOn", "notes"];
const eventMetadataFields = [...sharedEventFields, ...editionSpecificEventFields];

const eventDateCorrections = {
  "prague salsa marathon|2026-05-09|2026-05-11": ["2026-05-07", "2026-05-11"],
  "smyrna mambo getaway|2026-05-22|2026-05-26": ["2026-05-21", "2026-05-24"],
  "mambo y nada mas|2026-05-29|2026-06-02": ["2026-05-29", "2026-05-31"],
  "porto salsa weekend|2025-10-02|2025-10-06": ["2025-10-02", "2025-10-05"],
  "porto salsa weekend|2026-10-02|2026-10-06": ["2026-10-02", "2026-10-04"],
  "pink marathon|2026-10-23|2026-10-26": ["2026-10-23", "2026-10-25"],
  "mambo marathonios|2027-04-23|2027-04-26": ["2027-04-21", "2027-04-26"],
  "zagreb salsa marathon|2026-04-23|2026-04-27": ["2026-04-24", "2026-04-26"],
  "zagreb salsa marathon|2026-04-24|2026-04-27": ["2026-04-24", "2026-04-26"],
  "zagreb salsa marathon|2026-04-30|2026-05-02": ["2026-04-24", "2026-04-26"],
  "5star congress|2026-05-01|2026-05-05": ["2026-05-01", "2026-05-04"],
  "5star congress|2026-05-08|2026-05-11": ["2026-05-01", "2026-05-04"],
  "berlin salsa congress|2026-08-28|2026-08-31": ["2026-08-27", "2026-08-30"],
  "brussels salsa marathon|2026-12-06|2026-12-09": ["2026-12-04", "2026-12-07"],
  "magic slovenian salsa festival|2026-01-16|2026-01-20": ["2026-01-15", "2026-01-18"],
  "agozar|2026-12-19|2026-12-21": ["2026-12-18", "2026-12-20"]
};

const $ = (selector) => document.querySelector(selector);

const elements = {
  addEventBtn: $("#addEventBtn"),
  tabs: document.querySelectorAll(".tab"),
  views: document.querySelectorAll(".view"),
  reviewTab: document.querySelector('[data-view="reviews"]'),
  authStatus: $("#authStatus"),
  authDialog: $("#authDialog"),
  authForm: $("#authForm"),
  authEmail: $("#authEmail"),
  authPassword: $("#authPassword"),
  authMessage: $("#authMessage"),
  reviewAuthPanel: $("#reviewAuthPanel"),
  monthPicker: $("#monthPicker"),
  prevMonthBtn: $("#prevMonthBtn"),
  nextMonthBtn: $("#nextMonthBtn"),
  calendarGrid: $("#calendarGrid"),
  eventList: $("#eventList"),
  festivalList: $("#festivalList"),
  festivalSearchInput: $("#festivalSearchInput"),
  festivalYearSelect: $("#festivalYearSelect"),
  festivalCountrySelect: $("#festivalCountrySelect"),
  festivalSizeSelect: $("#festivalSizeSelect"),
  recentlyAddedList: $("#recentlyAddedList"),
  reviewsView: $("#reviewsView"),
  eventDetailsDialog: $("#eventDetailsDialog"),
  eventDetailsTitle: $("#eventDetailsTitle"),
  eventDetailsMeta: $("#eventDetailsMeta"),
  eventDetailsBody: $("#eventDetailsBody"),
  eventDetailsLinks: $("#eventDetailsLinks"),
  reviewList: $("#reviewList"),
  searchInput: $("#searchInput"),
  listMonthSelect: $("#listMonthSelect"),
  sortSelect: $("#sortSelect"),
  historyToggle: $("#historyToggle"),
  festivalMonthSelect: $("#festivalMonthSelect"),
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
      removeUnverifiedEditionDefaults();
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
  removeUnverifiedEditionDefaults();
  deduplicateEvents();
  deduplicateCalendarEditions();
  mergeHardcodedReviews();
}

function loadAuthSession() {
  const urlSession = authSessionFromUrl();
  if (urlSession) {
    state.authSession = urlSession;
    localStorage.setItem(authStorageKey, JSON.stringify(urlSession));
    history.replaceState(null, "", `${location.pathname}${location.search}`);
    return;
  }

  try {
    const saved = JSON.parse(localStorage.getItem(authStorageKey) || "null");
    if (saved?.accessToken && (!saved.expiresAt || saved.expiresAt * 1000 > Date.now())) {
      state.authSession = saved;
    } else {
      localStorage.removeItem(authStorageKey);
    }
  } catch {
    localStorage.removeItem(authStorageKey);
  }
}

function authSessionFromUrl() {
  const params = new URLSearchParams(location.hash.slice(1));
  const accessToken = params.get("access_token");
  if (!accessToken) return null;
  return {
    accessToken,
    refreshToken: params.get("refresh_token") || "",
    expiresAt: Number(params.get("expires_at") || 0),
    tokenType: params.get("token_type") || "bearer"
  };
}

function isSignedIn() {
  return Boolean(state.authSession?.accessToken);
}

function viewAllowed(view) {
  return view !== "reviews" || isSignedIn();
}

function authHeaders() {
  const config = window.supabaseConfig;
  return {
    apikey: config.publishableKey,
    Authorization: `Bearer ${state.authSession.accessToken}`,
    "Content-Type": "application/json"
  };
}

function publicSupabaseHeaders() {
  const config = window.supabaseConfig;
  return {
    apikey: config.publishableKey,
    Authorization: `Bearer ${config.publishableKey}`,
    "Content-Type": "application/json"
  };
}

function setSupabaseLoadStatus(table, status, count = 0) {
  state.supabaseLoadStatus[table] = { status, count };
}

function clearPrivateSupabaseData() {
  state.reviews = [];
  state.trips = [];
  state.personalTrips = [];
  setSupabaseLoadStatus("reviews", "signed-out");
  setSupabaseLoadStatus("trips", "signed-out");
  setSupabaseLoadStatus("personal_trips", "signed-out");
}

function normalizeAuthSession(payload) {
  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token || "",
    expiresAt: Number(payload.expires_at || Math.floor(Date.now() / 1000) + (payload.expires_in || 3600)),
    tokenType: payload.token_type || "bearer"
  };
}

async function signInWithPassword(email, password) {
  const config = window.supabaseConfig;
  if (!config?.url || !config?.publishableKey) {
    throw new Error("Supabase is not configured.");
  }

  const response = await fetch(`${config.url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: config.publishableKey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      email,
      password
    })
  });

  if (!response.ok) {
    let message = `Supabase returned ${response.status}`;
    try {
      const payload = await response.json();
      message = payload.msg || payload.message || payload.error_description || payload.error || message;
    } catch {
      const text = await response.text();
      if (text) message = text;
    }
    throw new Error(message);
  }

  return normalizeAuthSession(await response.json());
}

function signOut() {
  state.authSession = null;
  clearPrivateSupabaseData();
  localStorage.removeItem(authStorageKey);
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

  const endpoint = `${config.url}/rest/v1/events?select=*,event_editions(*)&visibility=eq.public&order=name.asc`;
  try {
    const response = await fetch(endpoint, {
      headers: publicSupabaseHeaders()
    });
    if (!response.ok) throw new Error(`Supabase returned ${response.status}`);
    const rows = await response.json();
    setSupabaseLoadStatus("events", "loaded", rows.length);
    setSupabaseLoadStatus(
      "event_editions",
      "loaded",
      rows.reduce((total, row) => total + (Array.isArray(row.event_editions) ? row.event_editions.length : 0), 0)
    );
    return mapSupabaseEvents(rows);
  } catch (error) {
    console.warn("Supabase public events unavailable; using repo seed data.", error);
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

  const endpoint = `${config.url}/rest/v1/schengen_countries?select=country_name,is_schengen`;
  try {
    const response = await fetch(endpoint, {
      headers: publicSupabaseHeaders()
    });
    if (!response.ok) throw new Error(`Supabase returned ${response.status}`);
    const rows = await response.json();
    setSupabaseLoadStatus("schengen_countries", "loaded", rows.length);
    return new Map(rows.map((row) => [normalizeText(row.country_name), Boolean(row.is_schengen)]));
  } catch (error) {
    console.warn("Supabase Schengen country data unavailable.", error);
    setSupabaseLoadStatus("schengen_countries", "error");
    return new Map();
  }
}

async function loadSupabaseTable(table, { requiresAuth = false } = {}) {
  const config = window.supabaseConfig;
  if (!config?.url || !config?.publishableKey) {
    setSupabaseLoadStatus(table, "not-configured");
    return [];
  }
  if (requiresAuth && !isSignedIn()) {
    setSupabaseLoadStatus(table, "signed-out");
    return [];
  }

  const endpoint = `${config.url}/rest/v1/${table}?select=*`;
  try {
    const response = await fetch(endpoint, {
      headers: requiresAuth ? authHeaders() : publicSupabaseHeaders()
    });
    if (!response.ok) throw new Error(`Supabase returned ${response.status}`);
    const rows = await response.json();
    setSupabaseLoadStatus(table, "loaded", rows.length);
    return rows;
  } catch (error) {
    console.warn(`Supabase ${table} unavailable.`, error);
    setSupabaseLoadStatus(table, "error");
    return [];
  }
}

function mapSupabaseEvents(rows) {
  return rows.flatMap((event) => {
    const editions = Array.isArray(event.event_editions) ? event.event_editions : [];
    return editions
      .filter((edition) => edition.visibility === "public")
      .map((edition) => ({
        id: edition.id,
        name: canonicalNameFor(event.name),
        startDate: edition.start_date || "",
        endDate: edition.end_date || edition.start_date || "",
        city: edition.city || "",
        country: edition.country || "",
        venue: edition.venue || "",
        organizer: event.organizer || "",
        website: event.website || "",
        instagram: event.instagram || "",
        facebook: event.facebook || "",
        tickets: edition.tickets || "",
        price: edition.price || "",
        currency: edition.currency || "",
        djs: edition.djs || "",
        artists: edition.artists || "",
        eventSize: edition.event_size || "",
        travel: edition.travel || "",
        addedOn: edition.added_on || "",
        notes: edition.notes || "",
        createdAt: edition.created_at || event.created_at || new Date().toISOString(),
        updatedAt: edition.updated_at || event.updated_at || edition.created_at || event.created_at || new Date().toISOString()
      }));
  });
}

async function loadSupabaseReviews() {
  const config = window.supabaseConfig;
  if (!config?.url || !config?.publishableKey) {
    setSupabaseLoadStatus("reviews", "not-configured");
    return [];
  }
  if (!isSignedIn()) {
    setSupabaseLoadStatus("reviews", "signed-out");
    return [];
  }

  const endpoint = `${config.url}/rest/v1/reviews?select=*&order=reviewed_at.desc`;
  try {
    const response = await fetch(endpoint, {
      headers: authHeaders()
    });
    if (!response.ok) throw new Error(`Supabase returned ${response.status}`);
    const rows = await response.json();
    setSupabaseLoadStatus("reviews", "loaded", rows.length);
    return rows.map(mapSupabaseReview).filter((review) => state.events.some((event) => event.id === review.eventId));
  } catch (error) {
    console.warn("Supabase private reviews unavailable.", error);
    setSupabaseLoadStatus("reviews", "error");
    return [];
  }
}

async function refreshPrivateTablesFromSupabase() {
  if (!isSignedIn()) {
    clearPrivateSupabaseData();
    render();
    return;
  }

  const [reviews, trips, personalTrips] = await Promise.all([
    loadSupabaseReviews(),
    loadSupabaseTable("trips", { requiresAuth: true }),
    loadSupabaseTable("personal_trips", { requiresAuth: true })
  ]);

  state.reviews = reviews;
  state.trips = trips;
  state.personalTrips = personalTrips;
  console.info("Supabase table load status", state.supabaseLoadStatus);
  render();
}

function mapSupabaseReview(review) {
  return {
    id: review.id,
    eventId: review.event_edition_id,
    reviewedAt: review.reviewed_at || review.created_at || new Date().toISOString(),
    scores: {
      music: review.music_score,
      dancingLevel: review.dancing_level_score,
      stageImpact: review.stage_impact_score,
      floor: review.floor_score,
      vibe: review.vibe_score,
      eventCost: review.event_cost_score,
      servicesProvided: review.services_score,
      eventHours: review.event_hours_score,
      hostCity: review.host_city_score,
      eventSize: review.event_size_score,
      travelToEvent: review.travel_score
    },
    categoryComments: {
      music: review.music_comment,
      dancingLevel: review.dancing_level_comment,
      stageImpact: review.stage_impact_comment,
      floor: review.floor_comment,
      vibe: review.vibe_comment,
      eventCost: review.event_cost_comment,
      servicesProvided: review.services_comment,
      eventHours: review.event_hours_comment,
      hostCity: review.host_city_comment,
      eventSize: review.event_size_comment,
      travelToEvent: review.travel_comment
    },
    topReason: review.top_reason || "",
    notes: review.notes || "",
    isPublished: review.visibility === "public",
    sourceId: `supabase-${review.id}`
  };
}

async function refreshPublicEventsFromSupabase() {
  const [supabaseEvents, schengenCountries] = await Promise.all([
    loadSupabaseEvents(),
    loadSupabaseSchengenCountries()
  ]);
  state.schengenCountries = schengenCountries;
  state.schengenCountriesLoaded = schengenCountries.size > 0;
  if (!supabaseEvents.length) {
    if (!isSignedIn()) clearPrivateSupabaseData();
    console.info("Supabase table load status", state.supabaseLoadStatus);
    render();
    return;
  }

  state.events = supabaseEvents;
  canonicalizeEventNames();
  correctEventDates();
  removeLegacySampleEvents();
  deduplicateEvents();
  deduplicateCalendarEditions();
  if (!isSignedIn()) clearPrivateSupabaseData();
  console.info("Supabase table load status", state.supabaseLoadStatus);
  render();
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
    const isNonNewYorkUsEvent = normalizeText(event.country) === "united states" && normalizeText(event.city) !== "new york";
    return !legacyKeys.has(eventKey(event)) && !isLegacyName && !isRemovedEvent && !isNonNewYorkUsEvent;
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
  ["city", "country", "venue", "organizer", "website", "instagram", "facebook", "tickets", "price", "currency", "djs", "artists", "eventSize", "travel", "addedOn", "notes"].forEach((field) => {
    if (!target[field] && source[field]) {
      target[field] = source[field];
    }
  });
}

function richerEvent(first, second) {
  return eventDetailScore(second) > eventDetailScore(first) ? second : first;
}

function eventDetailScore(event) {
  return ["city", "country", "venue", "organizer", "website", "instagram", "facebook", "tickets", "price", "currency", "djs", "artists", "eventSize", "travel", "addedOn", "notes"]
    .reduce((score, field) => score + (event[field] ? String(event[field]).length : 0), 0);
}

function pickFields(source, fields) {
  return fields.reduce((picked, field) => {
    if (source?.[field]) {
      picked[field] = source[field];
    }
    return picked;
  }, {});
}

function editionDetailsKey(event) {
  return [canonicalNameFor(event.name), event.startDate].map(normalizeText).join("|");
}

function sharedEventDetails(event) {
  const canonicalName = canonicalNameFor(event.name);
  const linkData = window.eventLinks?.[canonicalName] || window.eventLinks?.[event.name] || {};
  return pickFields(linkData, sharedEventFields);
}

function editionSpecificDetails(event) {
  return window.eventEditionDetails?.[editionDetailsKey(event)] || {};
}

function hydrateEventDetails(event) {
  return {
    ...event,
    ...sharedEventDetails(event),
    ...editionSpecificDetails(event)
  };
}

function mergeSeedEvents() {
  if (!Array.isArray(window.seedEvents)) return;

  let changed = false;
  window.seedEvents.forEach((seed) => {
    seed.name = canonicalNameFor(seed.name);
    const hydratedSeed = hydrateEventDetails(seed);
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
      tickets: hydratedSeed.tickets || "",
      price: hydratedSeed.price || "",
      currency: hydratedSeed.currency || "",
      djs: hydratedSeed.djs || "",
      artists: hydratedSeed.artists || "",
      eventSize: hydratedSeed.eventSize || "",
      travel: hydratedSeed.travel || "",
      addedOn: hydratedSeed.addedOn || "",
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

function removeUnverifiedEditionDefaults() {
  let changed = false;

  state.events.forEach((event) => {
    let eventChanged = false;
    event.name = canonicalNameFor(event.name);
    const sharedData = window.eventLinks?.[event.name] || {};
    const editionData = editionSpecificDetails(event);

    editionSpecificEventFields.forEach((field) => {
      if (!editionData[field] && sharedData[field] && event[field] === sharedData[field]) {
        event[field] = "";
        eventChanged = true;
      }
    });

    if (!event.price && event.currency) {
      event.currency = "";
      eventChanged = true;
    }

    if (eventChanged) {
      event.updatedAt = new Date().toISOString();
      changed = true;
    }
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
  let changed = false;

  eventMetadataFields.forEach((field) => {
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

function formatEventSize(value) {
  const size = normalizeText(value);
  if (!size) return "";
  const labels = {
    small: "Small (under 200)",
    medium: "Medium (200-500)",
    large: "Large (500-999)",
    "extra large": "Extra large (1000+)",
    xl: "Extra large (1000+)"
  };
  return labels[size] || value;
}

function eventLocation(event) {
  return [event.city, event.country].filter(Boolean).join(", ");
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

function eventPrice(event) {
  return [event.price, event.currency].filter(Boolean).join(" ");
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

function eventDetailRows(event, { includeStatus = false, includeDates = false } = {}) {
  return [
    includeDates ? ["Dates", dateRange(event)] : null,
    includeStatus ? ["Status", isHistorical(event) ? "Past event" : "Upcoming"] : null,
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
      <p class="muted">Not tracked in Supabase yet.</p>
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

function detailActionButton(event, label = "Details", action = "details") {
  if (!event) return "";
  return `
    <button type="button" data-action="${escapeHtml(action)}" data-id="${event.id}">
      ${escapeHtml(label)}
    </button>
  `;
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
  const location = eventLocation(event);
  const detailRows = eventDetailRows(event);
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
    ${location ? `<div class="event-meta"><span class="pill location-pill">${escapeHtml(location)}</span></div>` : ""}
    ${detailRows ? `<div class="event-detail">${detailRows}</div>` : ""}
    <div class="event-actions">
      <button type="button" data-action="details" data-id="${event.id}">Details</button>
      ${sourceLink("Website", event.website)}
      ${sourceLink("Instagram", event.instagram)}
      ${sourceLink("Facebook", event.facebook)}
      ${sourceLink("Tickets", event.tickets)}
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
      button.dataset.action = "details";
      button.dataset.id = event.id;
      button.setAttribute("aria-label", `View details for ${event.name}`);
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
  setSelectOptions(elements.listMonthSelect, monthOptions(), state.listMonth);
  elements.historyToggle.checked = state.showHistorical;
  const search = state.search.trim().toLowerCase();
  let events = state.events.filter((event) => {
    const haystack = [event.name, event.city, event.country, event.venue, event.organizer, event.djs, event.artists, schengenLabel(event)].join(" ").toLowerCase();
    const matchesSearch = !search || haystack.includes(search);
    const matchesTimeframe = state.showHistorical ? isHistorical(event) : !isHistorical(event);
    const matchesMonth = !state.listMonth || eventMonthValue(event) === state.listMonth;
    return matchesSearch && matchesTimeframe && matchesMonth;
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

const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
];

function eventYear(event) {
  return event.startDate.slice(0, 4);
}

function eventMonthIndex(event) {
  return Number(event.startDate.slice(5, 7)) - 1;
}

function eventMonthValue(event) {
  return event.startDate.slice(5, 7);
}

function monthOptions(allLabel = "All months") {
  return [
    { value: "", label: allLabel },
    ...monthNames.map((name, index) => ({
      value: String(index + 1).padStart(2, "0"),
      label: name
    }))
  ];
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

function setSelectOptions(select, options, selectedValue) {
  if (!select) return;
  const markup = options
    .map((option) => `<option value="${escapeHtml(option.value)}">${escapeHtml(option.label)}</option>`)
    .join("");
  if (select.innerHTML !== markup) {
    select.innerHTML = markup;
  }
  select.value = selectedValue;
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
    card.className = "event-card";
    const selectedEditions = filteredEditionsByKey.get(normalizeText(group.name)) || [];
    const firstSelected = selectedEditions[0];
    const lastSelected = selectedEditions[selectedEditions.length - 1];
    const priorEdition = group.editions
      .filter((event) => firstSelected && event.startDate < firstSelected.startDate)
      .at(-1);
    const nextTrackedEdition = group.editions.find((event) => lastSelected && event.startDate > lastSelected.startDate);
    const detailsTarget = firstSelected || nextTrackedEdition || priorEdition || group.editions[group.editions.length - 1];
    const score = detailsTarget ? reviewScoreForEvent(detailsTarget) : null;

    card.innerHTML = `
      <div class="event-card-header">
        <div>
          <h3>${escapeHtml(group.name)}</h3>
          <p class="muted">${escapeHtml(group.locations.join(" | "))}</p>
        </div>
        ${score ? `<span class="pill score-pill">${score.average.toFixed(1)}${score.isPrior ? " prior" : ""}</span>` : ""}
      </div>
      ${detailsTarget && eventLocation(detailsTarget) ? `<div class="event-meta"><span class="pill location-pill">${escapeHtml(eventLocation(detailsTarget))}</span></div>` : ""}
      <div class="festival-editions">
        ${selectedEditionBlocks(selectedEditions, state.festivalYear)}
        ${editionBlock("Prior tracked edition", priorEdition, "No tracked prior edition yet. Add the verified older Facebook/event-page edition to Supabase when found.")}
        ${editionBlock("Next tracked edition", nextTrackedEdition, "No later tracked edition yet.")}
      </div>
      <div class="event-actions">
        ${detailsTarget ? `<button type="button" data-action="details" data-id="${detailsTarget.id}">Details</button>` : ""}
        ${sourceLink("Website", group.website)}
        ${sourceLink("Instagram", group.instagram)}
        ${sourceLink("Facebook", group.facebook)}
        ${sourceLink("Tickets", group.tickets)}
      </div>
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
    const card = renderEventCard(event);
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

function renderAuth() {
  if (elements.authStatus) {
    elements.authStatus.innerHTML = isSignedIn()
      ? "<span class=\"auth-label\">Signed in</span><button class=\"secondary-action\" type=\"button\" data-auth-action=\"signout\">Sign out</button>"
      : "<button class=\"secondary-action\" type=\"button\" data-auth-action=\"signin\">Sign in</button>";
  }

  if (elements.reviewTab) {
    elements.reviewTab.hidden = !isSignedIn();
  }
  if (elements.reviewsView) {
    elements.reviewsView.hidden = !isSignedIn();
  }
  if (!isSignedIn() && state.activeView === "reviews") {
    switchView("calendar");
  }
  if (elements.reviewAuthPanel) {
    elements.reviewAuthPanel.hidden = isSignedIn();
  }
  if (elements.reviewList) {
    elements.reviewList.hidden = !isSignedIn();
  }
}

function renderReviews() {
  elements.reviewList.innerHTML = "";
  if (!isSignedIn()) {
    return;
  }

  const reviews = [...state.reviews].sort((a, b) => b.reviewedAt.localeCompare(a.reviewedAt));

  if (!reviews.length) {
    elements.reviewList.append(emptyState("No reviews yet", "Your private reviews will show here once they are added to Supabase."));
    return;
  }

  reviews.forEach((review) => {
    const event = state.events.find((item) => item.id === review.eventId);
    const reviewDate = new Date(review.reviewedAt).toLocaleDateString();
    const card = document.createElement("article");
    card.className = "review-card";
    card.innerHTML = `
      <div class="event-card-header">
        <div>
          <h3>${escapeHtml(event?.name || "Deleted event")}</h3>
          <p class="muted">
            ${event ? `Edition: ${escapeHtml(dateRange(event))}${eventLocation(event) ? ` | ${escapeHtml(eventLocation(event))}` : ""}` : "Edition: deleted event"}
          </p>
          <p class="muted">Review date: ${escapeHtml(reviewDate)}</p>
        </div>
        <span class="pill score-pill">${totalScore(review).toFixed(1)}</span>
      </div>
      ${review.topReason ? `<p><strong>Top reason:</strong> ${escapeHtml(review.topReason)}</p>` : ""}
      ${review.notes ? `<p class="muted">${escapeHtml(review.notes)}</p>` : ""}
      ${renderCategoryComments(review)}
    `;
    elements.reviewList.append(card);
  });
}

function renderCategoryComments(review) {
  const comments = review.categoryComments || {};
  const rows = scoreCategories
    .map(([key, label]) => `
      <div class="review-comment">
        <div class="review-category-header">
          <strong>${escapeHtml(label)}</strong>
          <span class="review-score-badge">${escapeHtml(review.scores?.[key] ?? "")}/10</span>
        </div>
        ${comments[key] ? `<p>${escapeHtml(comments[key])}</p>` : ""}
      </div>
    `)
    .join("");

  return rows ? `<div class="review-comments">${rows}</div>` : "";
}

function render() {
  renderAuth();
  renderCalendar();
  renderEvents();
  renderFestivalList();
  renderRecentlyAdded();
  renderReviews();
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
  elements.eventDetailsTitle.textContent = event.name;
  elements.eventDetailsMeta.innerHTML = [
    eventLocation(event) ? `<span class="pill location-pill">${escapeHtml(eventLocation(event))}</span>` : "",
    score ? `<span class="pill score-pill">${score.average.toFixed(1)}${score.isPrior ? " prior" : ""}</span>` : ""
  ].filter(Boolean).join("");

  const detailRows = eventDetailRows(event, { includeDates: true, includeStatus: true });

  elements.eventDetailsBody.innerHTML = detailRows.length
    ? detailRows
    : "<p class=\"muted\">No extra details have been added yet.</p>";

  elements.eventDetailsLinks.innerHTML = [
    sourceLink("Website", event.website),
    sourceLink("Tickets", event.tickets),
    sourceLink("Instagram", event.instagram),
    sourceLink("Facebook", event.facebook)
  ].filter(Boolean).join("") || "<span class=\"event-status\">No source links yet</span>";

  elements.eventDetailsDialog.showModal();
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
    currency: $("#currency").value.trim(),
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
  if (action === "details") openEventDetails(id);
}

async function handleAuthSubmit(event) {
  event.preventDefault();
  const email = elements.authEmail.value.trim();
  const password = elements.authPassword.value;
  if (!email || !password) return;

  elements.authMessage.textContent = "Signing in...";
  try {
    state.authSession = await signInWithPassword(email, password);
    localStorage.setItem(authStorageKey, JSON.stringify(state.authSession));
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
  elements.saveEventBtn?.addEventListener("click", saveEvent);
  elements.deleteEventBtn?.addEventListener("click", () => {
    const eventId = $("#eventId").value;
    if (!eventId) return;
    elements.eventDialog.close();
    deleteEvent(eventId);
  });
  elements.saveReviewBtn?.addEventListener("click", saveReview);
  elements.authForm?.addEventListener("submit", handleAuthSubmit);
  document.addEventListener("click", handleAuthAction);
  elements.calendarGrid.addEventListener("click", handleAction);
  elements.eventList.addEventListener("click", handleAction);
  elements.festivalList.addEventListener("click", handleAction);
  elements.recentlyAddedList.addEventListener("click", handleAction);
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
  elements.listMonthSelect?.addEventListener("change", (event) => {
    state.listMonth = event.target.value;
    renderEvents();
  });
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
  elements.scoreFields?.addEventListener("input", updateLiveScore);
}

async function init() {
  loadAuthSession();
  loadState();
  if (!isSignedIn()) {
    state.reviews = [];
  }
  bindEvents();
  render();
  switchView(state.activeView);
  await refreshPublicEventsFromSupabase();
  if (isSignedIn()) {
    await refreshPrivateTablesFromSupabase();
  }
}

init();
