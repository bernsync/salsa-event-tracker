import { calendarDisplayEndDate } from "./event-date-utils.js";
import { normalizeText } from "./text-utils.js";

function rangesOverlap(startA, endA, startB, endB) {
  return startA <= endB && endA >= startB;
}

function eventSearchText(event) {
  return normalizeText([
    event.name,
    event.city,
    event.country,
    event.venue,
    event.notes
  ].filter(Boolean).join(" "));
}

function locationMatches(place, event) {
  if (normalizeText(place.country) !== normalizeText(event.country)) return false;

  const placeCity = normalizeText(place.city);
  const eventCity = normalizeText(event.city);
  const venue = normalizeText(event.venue);

  return Boolean(placeCity && (
    placeCity === eventCity ||
    venue.includes(placeCity) ||
    (eventCity && placeCity.includes(eventCity)) ||
    (eventCity && venue.includes(eventCity))
  ));
}

function nameMatches(place, event) {
  const haystack = normalizeText([
    place.trip?.label,
    place.notes
  ].filter(Boolean).join(" "));
  if (!haystack) return false;

  return normalizeText(event.name)
    .split(" ")
    .filter((token) => token.length > 2)
    .some((token) => haystack.includes(token));
}

function candidateScore(place, event) {
  if (!locationMatches(place, event)) return 0;
  if (!rangesOverlap(place.startDate, place.endDate, event.startDate, calendarDisplayEndDate(event))) return 0;

  let score = 1;
  if (place.startDate === event.startDate) score += 1;
  if (place.endDate === event.endDate || place.endDate === calendarDisplayEndDate(event)) score += 1;
  if (nameMatches(place, event)) score += 3;

  return score;
}

export function eventForTripPlace(place, events) {
  if (place.eventId) {
    return events.find((event) => event.id === place.eventId) || null;
  }

  const candidates = events
    .map((event) => ({ event, score: candidateScore(place, event) }))
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) =>
      b.score - a.score ||
      a.event.startDate.localeCompare(b.event.startDate) ||
      eventSearchText(a.event).localeCompare(eventSearchText(b.event))
    );

  if (!candidates.length) return null;
  if (candidates.length === 1) return candidates[0].event;

  const [best, next] = candidates;
  return best.score > next.score ? best.event : null;
}

export function tripPlaceMatchesEvent(place, event) {
  if (place.eventId) return place.eventId === event.id;
  return eventForTripPlace(place, [event])?.id === event.id;
}
