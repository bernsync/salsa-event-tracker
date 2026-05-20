import test from "node:test";
import assert from "node:assert/strict";
import {
  addDays,
  formatPtoAmount,
  holidayForDate,
  ptoDayCount,
  ptoYearStats,
  schengenPlaceDays,
  schengenUsedOn,
  schengenWindowDetails,
  tripHasSchengenImpact
} from "../web/trip-calculations.js";

test("addDays uses local calendar dates without UTC drift", () => {
  assert.equal(addDays("2026-03-08", 1), "2026-03-09");
  assert.equal(addDays("2026-01-01", -1), "2025-12-31");
});

test("US holidays do not count against PTO", () => {
  assert.equal(holidayForDate("2026-07-03"), "July 4th observed");
  assert.equal(ptoDayCount({ date: "2026-07-03", amount: 1 }), 0);
  assert.equal(ptoDayCount({ date: "2026-07-06", amount: 0.5 }), 0.5);
});

test("PTO year stats separate requested and counted days", () => {
  const stats = ptoYearStats([
    {
      label: "Trip 1",
      ptoDays: [
        { date: "2026-07-03", amount: 1 },
        { date: "2026-07-06", amount: 1 },
        { date: "2026-07-07", amount: 0.5 }
      ]
    }
  ], "2026");

  assert.equal(stats.requested, 2.5);
  assert.equal(stats.counted, 1.5);
  assert.equal(stats.holidays.length, 1);
  assert.equal(formatPtoAmount(stats.counted), "1.5 days");
});

test("Schengen rolling usage counts unique Schengen calendar days", () => {
  const trips = [
    {
      places: [
        { startDate: "2026-01-01", endDate: "2026-01-03", country: "Spain" },
        { startDate: "2026-02-01", endDate: "2026-02-02", country: "United States" }
      ]
    }
  ];
  const schengenStatus = (place) => place.country === "Spain";

  assert.equal(schengenUsedOn(trips, "2026-01-03", schengenStatus), 3);
  assert.equal(tripHasSchengenImpact(trips[0], "2026-06-29", schengenStatus), true);
  assert.equal(tripHasSchengenImpact(trips[0], "2026-07-02", schengenStatus), false);
});

test("Schengen window details clip segment days to the check-date window", () => {
  const trips = [
    {
      label: "Winter Spain",
      places: [
        { startDate: "2026-01-01", endDate: "2026-01-03", city: "Madrid", country: "Spain" },
        { startDate: "2026-01-04", endDate: "2026-01-05", city: "London", country: "United Kingdom" }
      ]
    },
    {
      label: "Spring Italy",
      places: [
        { startDate: "2026-04-01", endDate: "2026-04-02", city: "Rome", country: "Italy" }
      ]
    }
  ];
  const schengenStatus = (place) => ["Spain", "Italy"].includes(place.country);

  assert.equal(schengenPlaceDays(trips[0].places[0], schengenStatus), 3);
  assert.equal(schengenPlaceDays(trips[0].places[1], schengenStatus), 0);

  const details = schengenWindowDetails(trips, "2026-06-30", schengenStatus);
  assert.equal(details.windowStart, "2026-01-02");
  assert.equal(details.used, 4);
  assert.deepEqual(details.segments.map((place) => [place.city, place.startDate, place.endDate, place.days]), [
    ["Madrid", "2026-01-02", "2026-01-03", 2],
    ["Rome", "2026-04-01", "2026-04-02", 2]
  ]);
});
