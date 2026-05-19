import { normalizeExternalUrl } from "../web/link-utils.js";

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const payloadText = process.env.EVENT_UPSERT_JSON || "";
const eventSizes = new Set(["small", "medium", "large", "extra large", "xl"]);

const eventFields = ["organizer", "website", "instagram", "facebook", "styles", "watchlist"];
const editionFields = [
  "venue",
  "tickets",
  "price",
  "currency",
  "djs",
  "artists",
  "event_size",
  "travel",
  "notes",
  "added_on",
  "visibility"
];

function fail(message) {
  console.error(message);
  process.exit(1);
}

function normalize(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function compactObject(source, fields) {
  return Object.fromEntries(
    fields
      .filter((field) => source[field] !== undefined && source[field] !== null && source[field] !== "")
      .map((field) => [field, source[field]])
  );
}

function requireDate(value, label) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) {
    fail(`${label} must be YYYY-MM-DD. Got: ${value || "(empty)"}`);
  }
  return value;
}

function requireValidDateRange(startDate, endDate, label) {
  if (endDate < startDate) {
    fail(`${label}.end_date must not be before start_date. Got: ${startDate} to ${endDate}`);
  }
}

function requireValidUrl(value, label) {
  if (!value) return;
  if (!normalizeExternalUrl(value)) {
    fail(`${label} must be an http(s) URL or Instagram @handle. Got: ${value}`);
  }
}

function normalizeSize(value, label) {
  if (!value) return value;
  const size = normalize(value);
  if (!eventSizes.has(size)) {
    fail(`${label} must be one of: ${[...eventSizes].join(", ")}. Got: ${value}`);
  }
  return size === "xl" ? "extra large" : size;
}

function parsePayload() {
  if (!payloadText.trim()) fail("EVENT_UPSERT_JSON is required.");
  try {
    const payload = JSON.parse(payloadText);
    if (Array.isArray(payload)) return { events: payload };
    if (Array.isArray(payload.events)) return payload;
    fail("Payload must be an array or an object with an events array.");
  } catch (error) {
    fail(`Invalid JSON payload: ${error.message}`);
  }
}

function validatePayload(payload) {
  return payload.events.map((event, eventIndex) => {
    if (!event.name?.trim()) fail(`events[${eventIndex}].name is required.`);
    if (!Array.isArray(event.editions) || !event.editions.length) {
      fail(`events[${eventIndex}].editions must contain at least one edition.`);
    }
    requireValidUrl(event.website, `events[${eventIndex}].website`);
    requireValidUrl(event.instagram, `events[${eventIndex}].instagram`);
    requireValidUrl(event.facebook, `events[${eventIndex}].facebook`);

    const payloadEditionKeys = new Set();

    return {
      ...event,
      name: event.name.trim(),
      visibility: event.visibility || "public",
      editions: event.editions.map((edition, editionIndex) => {
        if (!edition.city?.trim()) fail(`events[${eventIndex}].editions[${editionIndex}].city is required.`);
        if (!edition.country?.trim()) fail(`events[${eventIndex}].editions[${editionIndex}].country is required.`);
        const startDate = requireDate(edition.start_date, `events[${eventIndex}].editions[${editionIndex}].start_date`);
        const endDate = requireDate(edition.end_date || edition.start_date, `events[${eventIndex}].editions[${editionIndex}].end_date`);
        requireValidDateRange(startDate, endDate, `events[${eventIndex}].editions[${editionIndex}]`);
        requireValidUrl(edition.tickets, `events[${eventIndex}].editions[${editionIndex}].tickets`);
        const eventSize = normalizeSize(edition.event_size, `events[${eventIndex}].editions[${editionIndex}].event_size`);
        const editionKey = [
          normalize(event.name),
          startDate,
          endDate,
          normalize(edition.city),
          normalize(edition.country)
        ].join("|");
        if (payloadEditionKeys.has(editionKey)) {
          fail(`Duplicate edition in payload: ${event.name} ${startDate} to ${endDate}, ${edition.city}, ${edition.country}`);
        }
        payloadEditionKeys.add(editionKey);

        return {
          ...edition,
          start_date: startDate,
          end_date: endDate,
          city: edition.city.trim(),
          country: edition.country.trim(),
          event_size: eventSize || edition.event_size,
          visibility: edition.visibility || event.visibility || "public"
        };
      })
    };
  });
}

async function supabaseRequest(path, { method = "GET", body } = {}) {
  if (!supabaseUrl || !supabaseKey) {
    fail("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
  }

  const response = await fetch(`${supabaseUrl.replace(/\/$/, "")}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation"
    },
    body: body ? JSON.stringify(body) : undefined
  });

  if (!response.ok) {
    const text = await response.text();
    fail(`Supabase ${method} ${path} returned ${response.status}: ${text}`);
  }

  if (response.status === 204) return null;
  return response.json();
}

async function findEvent(name, visibility) {
  const params = new URLSearchParams({
    select: "id,name,organizer,website,instagram,facebook,visibility",
    name: `eq.${name}`,
    visibility: `eq.${visibility}`,
    limit: "1"
  });
  const rows = await supabaseRequest(`events?${params}`);
  return rows[0] || null;
}

async function createEvent(event) {
  const rows = await supabaseRequest("events", {
    method: "POST",
    body: {
      id: crypto.randomUUID(),
      name: event.name,
      visibility: event.visibility,
      ...compactObject(event, eventFields)
    }
  });
  return rows[0];
}

async function updateEvent(existing, event) {
  const updates = compactObject(event, eventFields);
  if (!Object.keys(updates).length) return existing;

  const rows = await supabaseRequest(`events?id=eq.${existing.id}`, {
    method: "PATCH",
    body: updates
  });
  return rows[0] || existing;
}

async function findEdition(eventId, edition) {
  const params = new URLSearchParams({
    select: "id,event_id,start_date,end_date,city,country",
    event_id: `eq.${eventId}`,
    start_date: `eq.${edition.start_date}`,
    end_date: `eq.${edition.end_date}`,
    city: `eq.${edition.city}`,
    country: `eq.${edition.country}`,
    limit: "1"
  });
  const rows = await supabaseRequest(`event_editions?${params}`);
  return rows[0] || null;
}

async function createEdition(eventId, edition) {
  const rows = await supabaseRequest("event_editions", {
    method: "POST",
    body: {
      id: crypto.randomUUID(),
      event_id: eventId,
      start_date: edition.start_date,
      end_date: edition.end_date,
      city: edition.city,
      country: edition.country,
      ...compactObject(edition, editionFields)
    }
  });
  return rows[0];
}

async function updateEdition(existing, edition) {
  const updates = compactObject(edition, editionFields);
  if (!Object.keys(updates).length) return existing;

  const rows = await supabaseRequest(`event_editions?id=eq.${existing.id}`, {
    method: "PATCH",
    body: updates
  });
  return rows[0] || existing;
}

const payload = parsePayload();
const events = validatePayload(payload);
const summary = [];

for (const event of events) {
  const existingEvent = await findEvent(event.name, event.visibility);
  const supabaseEvent = existingEvent
    ? await updateEvent(existingEvent, event)
    : await createEvent(event);

  const eventAction = existingEvent ? "updated event" : "created event";
  summary.push(`- ${eventAction}: ${supabaseEvent.name}`);

  for (const edition of event.editions) {
    const existingEdition = await findEdition(supabaseEvent.id, edition);
    const supabaseEdition = existingEdition
      ? await updateEdition(existingEdition, edition)
      : await createEdition(supabaseEvent.id, edition);
    const editionAction = existingEdition ? "updated edition" : "created edition";
    summary.push(`  - ${editionAction}: ${supabaseEdition.start_date} to ${supabaseEdition.end_date}, ${supabaseEdition.city}, ${supabaseEdition.country}`);
  }
}

console.log("Supabase event upsert complete:");
console.log(summary.join("\n"));
