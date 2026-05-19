import test from "node:test";
import assert from "node:assert/strict";
import {
  latestScoreForEvent,
  reviewScoreForEvent,
  scoreCategories,
  totalScore
} from "../web/review-scoring.js";

function scores(value) {
  return Object.fromEntries(scoreCategories.map(([key]) => [key, value]));
}

const events = [
  { id: "past-2025", name: "Salsa Weekend", startDate: "2025-06-01", endDate: "2025-06-03" },
  { id: "future-2026", name: "Salsa Weekend", startDate: "2026-06-01", endDate: "2026-06-03" },
  { id: "other", name: "Other Festival", startDate: "2025-06-01", endDate: "2025-06-03" }
];

const eventFamilyKey = (event) => event.name.toLowerCase();

test("totalScore averages configured score categories", () => {
  assert.equal(totalScore({ scores: scores(8) }), 8);
});

test("latestScoreForEvent uses most recent review for the event", () => {
  const reviews = [
    { eventId: "past-2025", reviewedAt: "2026-01-01T00:00:00Z", scores: scores(6) },
    { eventId: "past-2025", reviewedAt: "2026-02-01T00:00:00Z", scores: scores(9) }
  ];

  assert.equal(latestScoreForEvent("past-2025", reviews), 9);
});

test("reviewScoreForEvent averages direct reviews for historical events", () => {
  const reviews = [
    { eventId: "past-2025", reviewedAt: "2026-01-01T00:00:00Z", scores: scores(6) },
    { eventId: "past-2025", reviewedAt: "2026-02-01T00:00:00Z", scores: scores(8) },
    { eventId: "other", reviewedAt: "2026-02-01T00:00:00Z", scores: scores(10) }
  ];

  assert.deepEqual(
    reviewScoreForEvent(events[0], {
      events,
      reviews,
      eventFamilyKey,
      isHistoricalEvent: () => true
    }),
    { average: 7, count: 2, isPrior: false }
  );
});

test("reviewScoreForEvent uses prior family reviews for upcoming events", () => {
  const reviews = [
    { eventId: "past-2025", reviewedAt: "2026-01-01T00:00:00Z", scores: scores(7) },
    { eventId: "future-2026", reviewedAt: "2026-02-01T00:00:00Z", scores: scores(10) },
    { eventId: "other", reviewedAt: "2026-02-01T00:00:00Z", scores: scores(3) }
  ];

  assert.deepEqual(
    reviewScoreForEvent(events[1], {
      events,
      reviews,
      eventFamilyKey,
      isHistoricalEvent: () => false
    }),
    { average: 7, count: 1, isPrior: true }
  );
});
