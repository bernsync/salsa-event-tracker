import test from "node:test";
import assert from "node:assert/strict";
import {
  calendarDisplayEndDate,
  eventMonthIndex,
  eventMonthValue,
  eventOccursOnDate,
  eventYear,
  isHistorical,
  monthOptions
} from "../web/event-date-utils.js";

test("event date helpers expose year and month values", () => {
  const event = { startDate: "2026-09-04", endDate: "2026-09-07" };

  assert.equal(eventYear(event), "2026");
  assert.equal(eventMonthIndex(event), 8);
  assert.equal(eventMonthValue(event), "09");
});

test("monthOptions returns all months with a custom all label", () => {
  const options = monthOptions("Any month");

  assert.deepEqual(options[0], { value: "", label: "Any month" });
  assert.deepEqual(options[1], { value: "01", label: "January" });
  assert.deepEqual(options[12], { value: "12", label: "December" });
});

test("calendarDisplayEndDate hides default Monday travel day unless forced", () => {
  const weekendEvent = { startDate: "2026-09-04", endDate: "2026-09-07" };
  const forcedEvent = { ...weekendEvent, forceShowMonday: true };
  const mondayOnlyEvent = { startDate: "2026-09-07", endDate: "2026-09-07" };

  assert.equal(calendarDisplayEndDate(weekendEvent), "2026-09-06");
  assert.equal(calendarDisplayEndDate(forcedEvent), "2026-09-07");
  assert.equal(calendarDisplayEndDate(mondayOnlyEvent), "2026-09-07");
});

test("eventOccursOnDate respects adjusted calendar end date", () => {
  const event = { startDate: "2026-09-04", endDate: "2026-09-07" };

  assert.equal(eventOccursOnDate(event, "2026-09-06"), true);
  assert.equal(eventOccursOnDate(event, "2026-09-07"), false);
});

test("isHistorical accepts an explicit today date for deterministic checks", () => {
  const event = { startDate: "2026-06-01", endDate: "2026-06-03" };

  assert.equal(isHistorical(event, "2026-06-04"), true);
  assert.equal(isHistorical(event, "2026-06-03"), false);
});
