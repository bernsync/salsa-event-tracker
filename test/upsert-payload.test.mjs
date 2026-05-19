import test from "node:test";
import assert from "node:assert/strict";
import { parseAndValidateEventUpsertPayload } from "../web/upsert-payload.js";

test("parseAndValidateEventUpsertPayload normalizes valid payloads", () => {
  const { events, errors } = parseAndValidateEventUpsertPayload(JSON.stringify({
    events: [
      {
        name: " Test Festival ",
        instagram: "@testfestival",
        editions: [
          { start_date: "2027-01-02", city: "Paris", country: "France", event_size: "XL" }
        ]
      }
    ]
  }));

  assert.deepEqual(errors, []);
  assert.equal(events[0].name, "Test Festival");
  assert.equal(events[0].editions[0].end_date, "2027-01-02");
  assert.equal(events[0].editions[0].event_size, "extra large");
});

test("parseAndValidateEventUpsertPayload reports duplicate editions", () => {
  const { errors } = parseAndValidateEventUpsertPayload(JSON.stringify({
    events: [
      {
        name: "Duplicate Fest",
        editions: [
          { start_date: "2027-01-02", city: "Paris", country: "France" },
          { start_date: "2027-01-02", city: " Paris ", country: "france" }
        ]
      }
    ]
  }));

  assert.equal(errors.some((error) => error.includes("Duplicate edition")), true);
});
