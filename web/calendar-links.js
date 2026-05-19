import { dateRange } from "./date-utils.js";
import { addDays } from "./trip-calculations.js";
import { normalizeText } from "./text-utils.js";

function calendarDateToken(dateValue) {
  return String(dateValue || "").replaceAll("-", "");
}

export function calendarEventDescription(event) {
  return [
    dateRange(event),
    event.venue ? `Venue: ${event.venue}` : "",
    event.organizer ? `Organizer: ${event.organizer}` : "",
    event.website ? `Website: ${event.website}` : "",
    event.tickets ? `Tickets: ${event.tickets}` : "",
    event.notes ? `Notes: ${event.notes}` : ""
  ].filter(Boolean).join("\n");
}

export function googleCalendarUrl(event) {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.name,
    dates: `${calendarDateToken(event.startDate)}/${calendarDateToken(addDays(event.endDate, 1))}`,
    details: calendarEventDescription(event),
    location: [event.venue, event.city, event.country].filter(Boolean).join(", ")
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function icsEscape(value) {
  return String(value || "")
    .replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, "")
    .replaceAll("\\", "\\\\")
    .replaceAll("\r\n", "\n")
    .replaceAll("\r", "\n")
    .replaceAll("\n", "\\n")
    .replaceAll(";", "\\;")
    .replaceAll(",", "\\,");
}

function icsTimestamp(date = new Date()) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

export function calendarFilename(event) {
  const slug = normalizeText(event.name).replaceAll(" ", "-").replace(/[^a-z0-9-]/g, "");
  return `${event.startDate}-${slug || "event"}.ics`;
}

export function calendarFileContent(event, { now = new Date() } = {}) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Salsa Festival Tracker//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${event.id}@salsa-festival-tracker`,
    `DTSTAMP:${icsTimestamp(now)}`,
    `DTSTART;VALUE=DATE:${calendarDateToken(event.startDate)}`,
    `DTEND;VALUE=DATE:${calendarDateToken(addDays(event.endDate, 1))}`,
    `SUMMARY:${icsEscape(event.name)}`,
    `LOCATION:${icsEscape([event.venue, event.city, event.country].filter(Boolean).join(", "))}`,
    `DESCRIPTION:${icsEscape(calendarEventDescription(event))}`,
    "END:VEVENT",
    "END:VCALENDAR"
  ];
  return `${lines.join("\r\n")}\r\n`;
}

export function downloadCalendarFile(event) {
  const blob = new Blob([calendarFileContent(event)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = calendarFilename(event);
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
