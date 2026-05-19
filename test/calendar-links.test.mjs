import test from "node:test";
import assert from "node:assert/strict";
import {
  calendarFileContent,
  calendarFilename,
  googleCalendarUrl
} from "../web/calendar-links.js";

const sampleEvent = {
  id: "abc-123",
  name: "Mambo Fest; NY",
  startDate: "2026-06-12",
  endDate: "2026-06-14",
  venue: "Dance Hall, Main",
  city: "New York",
  country: "United States",
  organizer: "Noam Events",
  website: "https://example.com",
  tickets: "https://example.com/tickets",
  notes: "Line one\nLine two"
};

test("googleCalendarUrl creates all-day event with exclusive end date", () => {
  const url = new URL(googleCalendarUrl(sampleEvent));

  assert.equal(url.origin, "https://calendar.google.com");
  assert.equal(url.searchParams.get("action"), "TEMPLATE");
  assert.equal(url.searchParams.get("text"), sampleEvent.name);
  assert.equal(url.searchParams.get("dates"), "20260612/20260615");
  assert.equal(url.searchParams.get("location"), "Dance Hall, Main, New York, United States");
  assert.match(url.searchParams.get("details"), /Tickets: https:\/\/example.com\/tickets/);
});

test("calendarFileContent writes escaped ICS fields", () => {
  const content = calendarFileContent(sampleEvent, { now: new Date("2026-01-02T03:04:05.000Z") });

  assert.match(content, /DTSTAMP:20260102T030405Z/);
  assert.match(content, /DTSTART;VALUE=DATE:20260612/);
  assert.match(content, /DTEND;VALUE=DATE:20260615/);
  assert.match(content, /SUMMARY:Mambo Fest\\; NY/);
  assert.match(content, /LOCATION:Dance Hall\\, Main\\, New York\\, United States/);
  assert.match(content, /DESCRIPTION:Jun 12\\, 2026 - Jun 14\\, 2026\\nVenue: Dance Hall\\, Main/);
});

test("calendarFileContent strips unsafe control characters from ICS fields", () => {
  const content = calendarFileContent({
    ...sampleEvent,
    name: "Bad\u0007Name",
    notes: "Safe\u0000note"
  }, { now: new Date("2026-01-02T03:04:05.000Z") });

  assert.match(content, /SUMMARY:BadName/);
  assert.match(content, /Safenote/);
  assert.doesNotMatch(content.split("\r\n").find((line) => line.startsWith("SUMMARY:")), /[\u0000-\u0008\u000B-\u001F\u007F]/);
  assert.doesNotMatch(content.split("\r\n").find((line) => line.startsWith("DESCRIPTION:")), /[\u0000-\u0008\u000B-\u001F\u007F]/);
});

test("calendarFilename creates a stable slug", () => {
  assert.equal(calendarFilename(sampleEvent), "2026-06-12-mambo-fest-ny.ics");
});
