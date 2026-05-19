import test from "node:test";
import assert from "node:assert/strict";
import { buildTripSavePayload } from "../web/trip-api.js";

test("buildTripSavePayload creates owner-scoped rows and normalizes end date", () => {
  let counter = 0;
  const payload = buildTripSavePayload({
    label: "  Madrid Weekend  ",
    startDate: "2026-05-10",
    endDate: "2026-05-09",
    notes: "  private note ",
    ownerId: "owner-1",
    ownerEmail: "owner@example.com",
    uuid: () => `id-${++counter}`,
    places: [
      { startDate: "2026-05-10", endDate: "2026-05-12", city: "Madrid", country: "Spain", role: "stay", sequence: 0, eventId: "", notes: "" }
    ],
    ptoDays: [
      { date: "2026-05-11", amount: 1, notes: "travel" }
    ]
  });

  assert.equal(payload.tripRow.id, "id-1");
  assert.equal(payload.tripRow.label, "Madrid Weekend");
  assert.equal(payload.tripRow.end_date, "2026-05-10");
  assert.equal(payload.tripRow.owner_id, "owner-1");
  assert.equal(payload.placeRows[0].trip_id, "id-1");
  assert.equal(payload.placeRows[0].event_edition_id, null);
  assert.equal(payload.ptoRows[0].trip_id, "id-1");
  assert.equal(payload.ptoRows[0].access_level, "owner");
});
