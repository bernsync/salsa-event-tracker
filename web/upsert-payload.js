import { normalizeExternalUrl } from "./link-utils.js";

const eventSizes = new Set(["small", "medium", "large", "extra large", "xl"]);

function normalize(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function pushError(errors, message) {
  errors.push(message);
}

function validDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));
}

function normalizeSize(value, errors, label) {
  if (!value) return value;
  const size = normalize(value);
  if (!eventSizes.has(size)) {
    pushError(errors, `${label} must be one of: ${[...eventSizes].join(", ")}. Got: ${value}`);
    return value;
  }
  return size === "xl" ? "extra large" : size;
}

function requireValidUrl(value, errors, label) {
  if (!value) return;
  if (!normalizeExternalUrl(value)) {
    pushError(errors, `${label} must be an http(s) URL or Instagram @handle. Got: ${value}`);
  }
}

export function parseEventUpsertPayload(payloadText) {
  if (!String(payloadText || "").trim()) {
    return { payload: null, errors: ["Payload is required."] };
  }
  try {
    const payload = JSON.parse(payloadText);
    return { payload: Array.isArray(payload) ? { events: payload } : payload, errors: [] };
  } catch (error) {
    return { payload: null, errors: [`Invalid JSON payload: ${error.message}`] };
  }
}

export function validateEventUpsertPayload(payload) {
  const errors = [];
  if (!Array.isArray(payload?.events)) {
    return { events: [], errors: ["Payload must be an array or an object with an events array."] };
  }

  const events = payload.events.map((event, eventIndex) => {
    if (!event.name?.trim()) pushError(errors, `events[${eventIndex}].name is required.`);
    if (!Array.isArray(event.editions) || !event.editions.length) {
      pushError(errors, `events[${eventIndex}].editions must contain at least one edition.`);
    }
    requireValidUrl(event.website, errors, `events[${eventIndex}].website`);
    requireValidUrl(event.instagram, errors, `events[${eventIndex}].instagram`);
    requireValidUrl(event.facebook, errors, `events[${eventIndex}].facebook`);

    const payloadEditionKeys = new Set();
    const editions = Array.isArray(event.editions) ? event.editions : [];

    return {
      ...event,
      name: String(event.name || "").trim(),
      visibility: event.visibility || "public",
      editions: editions.map((edition, editionIndex) => {
        if (!edition.city?.trim()) pushError(errors, `events[${eventIndex}].editions[${editionIndex}].city is required.`);
        if (!edition.country?.trim()) pushError(errors, `events[${eventIndex}].editions[${editionIndex}].country is required.`);
        if (!validDate(edition.start_date)) {
          pushError(errors, `events[${eventIndex}].editions[${editionIndex}].start_date must be YYYY-MM-DD. Got: ${edition.start_date || "(empty)"}`);
        }
        const startDate = edition.start_date;
        const endDate = edition.end_date || edition.start_date;
        if (!validDate(endDate)) {
          pushError(errors, `events[${eventIndex}].editions[${editionIndex}].end_date must be YYYY-MM-DD. Got: ${endDate || "(empty)"}`);
        }
        if (validDate(startDate) && validDate(endDate) && endDate < startDate) {
          pushError(errors, `events[${eventIndex}].editions[${editionIndex}].end_date must not be before start_date. Got: ${startDate} to ${endDate}`);
        }
        requireValidUrl(edition.tickets, errors, `events[${eventIndex}].editions[${editionIndex}].tickets`);
        const eventSize = normalizeSize(edition.event_size, errors, `events[${eventIndex}].editions[${editionIndex}].event_size`);
        const editionKey = [
          normalize(event.name),
          startDate,
          endDate,
          normalize(edition.city),
          normalize(edition.country)
        ].join("|");
        if (payloadEditionKeys.has(editionKey)) {
          pushError(errors, `Duplicate edition in payload: ${event.name} ${startDate} to ${endDate}, ${edition.city}, ${edition.country}`);
        }
        payloadEditionKeys.add(editionKey);

        return {
          ...edition,
          start_date: startDate,
          end_date: endDate,
          city: String(edition.city || "").trim(),
          country: String(edition.country || "").trim(),
          event_size: eventSize || edition.event_size,
          visibility: edition.visibility || event.visibility || "public"
        };
      })
    };
  });

  return { events, errors };
}

export function parseAndValidateEventUpsertPayload(payloadText) {
  const { payload, errors } = parseEventUpsertPayload(payloadText);
  if (errors.length) return { events: [], errors };
  return validateEventUpsertPayload(payload);
}
