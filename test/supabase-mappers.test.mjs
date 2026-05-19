import test from "node:test";
import assert from "node:assert/strict";
import { mapSupabaseEvents, mapSupabaseTrip } from "../web/supabase-mappers.js";

test("mapSupabaseEvents flattens public editions only", () => {
  const events = mapSupabaseEvents([
    {
      name: "Test Fest",
      website: "https://example.com",
      event_editions: [
        { id: "1", visibility: "public", start_date: "2026-01-02", city: "Paris", country: "France" },
        { id: "2", visibility: "private", start_date: "2026-02-02", city: "Rome", country: "Italy" }
      ]
    }
  ]);

  assert.equal(events.length, 1);
  assert.equal(events[0].id, "1");
  assert.equal(events[0].endDate, "2026-01-02");
  assert.equal(events[0].website, "https://example.com");
});

test("mapSupabaseTrip deduplicates repeated place rows", () => {
  const trip = mapSupabaseTrip({
    id: "trip-1",
    label: "Trip 1",
    start_date: "2026-01-01",
    personal_trip_places: [
      { trip_id: "trip-1", start_date: "2026-01-01", end_date: "2026-01-02", city: "Madrid", country: "Spain", travel_role: "stay" },
      { trip_id: "trip-1", start_date: "2026-01-01", end_date: "2026-01-02", city: "Madrid", country: "Spain", travel_role: "stay" }
    ],
    personal_pto_days: [
      { trip_id: "trip-1", pto_date: "2026-01-02", amount: 0.5 }
    ]
  });

  assert.equal(trip.places.length, 1);
  assert.equal(trip.ptoDays[0].amount, 0.5);
});
