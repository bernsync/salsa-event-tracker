import assert from "node:assert/strict";
import test from "node:test";

import { eventForTripPlace, tripPlaceMatchesEvent } from "../web/trip-event-matching.js";

const events = [
  {
    id: "city-festival-2026",
    name: "Central City Salsa Festival",
    startDate: "2026-09-24",
    endDate: "2026-09-28",
    city: "Central City",
    country: "Exampleland",
    venue: "Central Hall, Central City, Exampleland"
  },
  {
    id: "coast-festival-2026",
    name: "Coast Salsa Weekender",
    startDate: "2026-09-10",
    endDate: "2026-09-13",
    city: "Seaside Town",
    country: "Exampleland",
    venue: "Beach Resort, Seaside Town, Metro City"
  }
];

test("eventForTripPlace connects unlinked trips by matching dates and city", () => {
  const event = eventForTripPlace({
    startDate: "2026-09-24",
    endDate: "2026-09-28",
    city: "Central City",
    country: "Exampleland",
    trip: { label: "Festival weekend" }
  }, events);

  assert.equal(event.id, "city-festival-2026");
});

test("eventForTripPlace can match regional city labels through the venue", () => {
  const event = eventForTripPlace({
    startDate: "2026-09-10",
    endDate: "2026-09-13",
    city: "Metro City",
    country: "Exampleland",
    trip: { label: "Coastal event" }
  }, events);

  assert.equal(event.id, "coast-festival-2026");
});

test("tripPlaceMatchesEvent honors explicit event links first", () => {
  assert.equal(tripPlaceMatchesEvent({
    eventId: "city-festival-2026",
    startDate: "2026-09-10",
    endDate: "2026-09-13",
    city: "Metro City",
    country: "Exampleland",
    trip: { label: "Coastal event" }
  }, events[0]), true);
});
