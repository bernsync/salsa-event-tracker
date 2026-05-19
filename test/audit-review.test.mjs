import test from "node:test";
import assert from "node:assert/strict";
import { auditReviewItems, tableStatusItems, upsertPayloadFromAuditItem } from "../web/audit-review.js";

test("tableStatusItems converts load status into display rows", () => {
  assert.deepEqual(tableStatusItems({ events: { status: "loaded", count: 3 } }), [
    { table: "events", status: "loaded", count: 3, label: "Loaded" }
  ]);
});

test("auditReviewItems finds next-edition candidates", () => {
  const items = auditReviewItems({
    results: [
      { event: { name: "Tracked" }, alreadyTracked: true, proposedSeedRows: [] },
      { event: { name: "Candidate" }, alreadyTracked: false, proposedSeedRows: [{ name: "Candidate" }] }
    ]
  });

  assert.equal(items.length, 1);
  assert.equal(items[0].event.name, "Candidate");
});

test("auditReviewItems accepts data quality JSON issues", () => {
  const items = auditReviewItems({
    issues: [
      { event: { name: "Needs Venue" }, issue: "Missing venue" }
    ]
  });

  assert.equal(items.length, 1);
  assert.equal(items[0].type, "quality");
  assert.equal(items[0].issue, "Missing venue");
});

test("upsertPayloadFromAuditItem drafts manual upsert JSON", () => {
  const payload = JSON.parse(upsertPayloadFromAuditItem({
    event: { name: "Candidate" },
    proposedSeedRows: [
      { name: "Candidate", startDate: "2027-03-01", endDate: "2027-03-03", city: "Madrid", country: "Spain" }
    ]
  }));

  assert.equal(payload.events[0].name, "Candidate");
  assert.equal(payload.events[0].editions[0].start_date, "2027-03-01");
  assert.equal(payload.events[0].editions[0].country, "Spain");
});
