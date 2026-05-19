import { parseAndValidateEventUpsertPayload } from "../web/upsert-payload.js";

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const payloadText = process.env.EVENT_UPSERT_JSON || "";
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

function compactObject(source, fields) {
  return Object.fromEntries(
    fields
      .filter((field) => source[field] !== undefined && source[field] !== null && source[field] !== "")
      .map((field) => [field, source[field]])
  );
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

const { events, errors } = parseAndValidateEventUpsertPayload(payloadText);
if (errors.length) fail(errors.join("\n"));
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
