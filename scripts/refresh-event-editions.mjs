import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const root = process.cwd();
const outputDir = process.env.OUTPUT_DIR || path.join(root, "audit");
const today = process.env.AUDIT_TODAY ? new Date(`${process.env.AUDIT_TODAY}T00:00:00Z`) : new Date();
const since = new Date(today);
since.setUTCMonth(since.getUTCMonth() - 6);

const sourceTimeoutMs = Number(process.env.SOURCE_TIMEOUT_MS || 12000);
const maxSourcesPerEvent = Number(process.env.MAX_SOURCES_PER_EVENT || 4);

const context = { window: {} };
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root, "web", "seed-events.js"), "utf8"), context);
vm.runInContext(fs.readFileSync(path.join(root, "web", "event-links.js"), "utf8"), context);

const seedEvents = Array.isArray(context.window.seedEvents) ? context.window.seedEvents : [];
const eventLinks = context.window.eventLinks || {};
const eventEditionDetails = context.window.eventEditionDetails || {};

const monthNames = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12,
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  sept: 9,
  oct: 10,
  nov: 11,
  dec: 12
};

function normalize(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function toDate(value) {
  return new Date(`${value}T00:00:00Z`);
}

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function stripHtml(html) {
  return String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function eventFamilyKey(event) {
  return normalize(event.name);
}

function editionKey(event) {
  return [eventFamilyKey(event), event.startDate, event.endDate, normalize(event.city), normalize(event.country)].join("|");
}

function editionDetailsKey(event) {
  return [eventFamilyKey(event), event.startDate].join("|");
}

function eventLocation(event) {
  return [event.city, event.country].filter(Boolean).join(", ");
}

function sourceLinksFor(event) {
  const links = eventLinks[event.name] || {};
  const edition = eventEditionDetails[editionDetailsKey(event)] || {};
  const raw = [
    links.website,
    edition.tickets,
    links.tickets,
    links.facebook,
    links.instagram?.startsWith("@") ? `https://www.instagram.com/${links.instagram.slice(1)}/` : links.instagram
  ].filter(Boolean);
  return [...new Set(raw)].slice(0, maxSourcesPerEvent);
}

async function fetchText(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), sourceTimeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "user-agent": "salsa-event-tracker-audit/1.0"
      }
    });
    if (!response.ok) {
      return { url, ok: false, status: response.status, text: "" };
    }
    const html = await response.text();
    return { url, ok: true, status: response.status, text: stripHtml(html).slice(0, 50000) };
  } catch (error) {
    return { url, ok: false, status: "error", error: error.message, text: "" };
  } finally {
    clearTimeout(timer);
  }
}

function makeDate(year, month, day) {
  if (!year || !month || !day) return null;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (Number.isNaN(date.getTime())) return null;
  return isoDate(date);
}

function extractDates(text) {
  const found = new Set();
  const currentYear = today.getUTCFullYear();

  for (const match of text.matchAll(/\b(20\d{2})[-/.](0?[1-9]|1[0-2])[-/.](0?[1-9]|[12]\d|3[01])\b/g)) {
    found.add(makeDate(match[1], match[2], match[3]));
  }

  for (const match of text.matchAll(/\b(0?[1-9]|[12]\d|3[01])[-/.](0?[1-9]|1[0-2])[-/.](20\d{2})\b/g)) {
    found.add(makeDate(match[3], match[2], match[1]));
  }

  const monthPattern = Object.keys(monthNames).join("|");
  const monthDay = new RegExp(`\\b(${monthPattern})\\s+(0?[1-9]|[12]\\d|3[01])(?:st|nd|rd|th)?(?:\\s*[-–]\\s*(0?[1-9]|[12]\\d|3[01])(?:st|nd|rd|th)?)?,?\\s*(20\\d{2})\\b`, "gi");
  for (const match of text.matchAll(monthDay)) {
    const month = monthNames[match[1].toLowerCase()];
    found.add(makeDate(match[4], month, match[2]));
    if (match[3]) found.add(makeDate(match[4], month, match[3]));
  }

  const dayMonth = new RegExp(`\\b(0?[1-9]|[12]\\d|3[01])(?:st|nd|rd|th)?\\s+(${monthPattern})\\s+(20\\d{2})\\b`, "gi");
  for (const match of text.matchAll(dayMonth)) {
    found.add(makeDate(match[3], monthNames[match[2].toLowerCase()], match[1]));
  }

  const shortDayMonth = new RegExp(`\\b(0?[1-9]|[12]\\d|3[01])(?:st|nd|rd|th)?\\s+(${monthPattern})\\b`, "gi");
  for (const match of text.matchAll(shortDayMonth)) {
    const candidate = makeDate(currentYear, monthNames[match[2].toLowerCase()], match[1]);
    if (candidate && toDate(candidate) > today) found.add(candidate);
    const nextYearCandidate = makeDate(currentYear + 1, monthNames[match[2].toLowerCase()], match[1]);
    if (nextYearCandidate && toDate(nextYearCandidate) > today) found.add(nextYearCandidate);
  }

  return [...found].filter(Boolean).sort();
}

function hasExistingFutureEdition(event) {
  return seedEvents
    .filter((candidate) => eventFamilyKey(candidate) === eventFamilyKey(event))
    .some((candidate) => toDate(candidate.startDate) > toDate(event.endDate));
}

function duplicateCandidate(event, startDate, endDate = startDate) {
  const candidateStart = toDate(startDate);
  const candidateEnd = toDate(endDate);
  return seedEvents.some((existing) => {
    if (eventFamilyKey(existing) !== eventFamilyKey(event)) return false;
    const existingStart = toDate(existing.startDate);
    const existingEnd = toDate(existing.endDate);
    return candidateStart <= existingEnd && candidateEnd >= existingStart;
  });
}

function recentEvents() {
  return seedEvents
    .filter((event) => {
      const end = toDate(event.endDate);
      return end >= since && end <= today;
    })
    .sort((a, b) => a.endDate.localeCompare(b.endDate));
}

async function auditEvent(event) {
  const sources = sourceLinksFor(event);
  const fetched = [];
  const dateHits = new Set();

  for (const source of sources) {
    const result = await fetchText(source);
    fetched.push({
      url: result.url,
      ok: result.ok,
      status: result.status,
      error: result.error
    });
    if (!result.ok) continue;
    extractDates(result.text)
      .filter((date) => toDate(date) > today)
      .forEach((date) => dateHits.add(date));
  }

  const futureDates = [...dateHits].sort();
  const nonDuplicateDates = futureDates.filter((date) => !duplicateCandidate(event, date));

  return {
    event,
    location: eventLocation(event),
    alreadyTracked: hasExistingFutureEdition(event),
    sources,
    fetched,
    futureDates,
    suggestedDates: nonDuplicateDates,
    proposedSeedRows: nonDuplicateDates.map((date) => ({
      city: event.city || "",
      country: event.country || "",
      name: event.name,
      startDate: date,
      endDate: date
    }))
  };
}

function renderMarkdown(results) {
  const lines = [];
  lines.push("# Weekly Event Edition Refresh");
  lines.push("");
  lines.push(`Run date: ${isoDate(today)}`);
  lines.push(`Reviewing events that ended from ${isoDate(since)} through ${isoDate(today)}.`);
  lines.push("");
  lines.push("This report is intentionally conservative. It does not edit app data automatically; verify official sources before adding rows.");
  lines.push("");

  const needsReview = results.filter((result) => !result.alreadyTracked || result.suggestedDates.length);
  if (!needsReview.length) {
    lines.push("No missing next-edition candidates were found.");
    lines.push("");
  } else {
    lines.push("## Needs Review");
    lines.push("");
    for (const result of needsReview) {
      lines.push(`### ${result.event.name} (${result.event.startDate} to ${result.event.endDate})`);
      lines.push("");
      lines.push(`- Location: ${result.location || "Unknown"}`);
      lines.push(`- Future edition already in tracker: ${result.alreadyTracked ? "yes" : "no"}`);
      lines.push(`- Future dates seen in sources: ${result.futureDates.length ? result.futureDates.join(", ") : "none"}`);
      lines.push(`- Non-duplicate suggested dates: ${result.suggestedDates.length ? result.suggestedDates.join(", ") : "none"}`);
      lines.push(`- Sources checked: ${result.sources.length ? result.sources.join(", ") : "none"}`);
      if (result.proposedSeedRows.length) {
        lines.push("- Candidate seed rows, verify before using:");
        for (const row of result.proposedSeedRows) {
          lines.push(`  - { city: "${row.city}", country: "${row.country}", name: "${row.name}", startDate: "${row.startDate}", endDate: "${row.endDate}" }`);
        }
      }
      lines.push("");
    }
  }

  lines.push("## All Recent Events Checked");
  lines.push("");
  for (const result of results) {
    lines.push(`- ${result.event.name} (${result.event.startDate} to ${result.event.endDate}) - ${result.alreadyTracked ? "future edition already tracked" : "no future edition in tracker"}`);
  }
  lines.push("");
  return lines.join("\n");
}

fs.mkdirSync(outputDir, { recursive: true });
const results = [];
for (const event of recentEvents()) {
  results.push(await auditEvent(event));
}

const summary = {
  runDate: isoDate(today),
  windowStart: isoDate(since),
  recentEventCount: results.length,
  needsReviewCount: results.filter((result) => !result.alreadyTracked || result.suggestedDates.length).length,
  results
};

fs.writeFileSync(path.join(outputDir, "event-edition-refresh.json"), `${JSON.stringify(summary, null, 2)}\n`);
fs.writeFileSync(path.join(outputDir, "event-edition-refresh.md"), renderMarkdown(results));
console.log(`Checked ${summary.recentEventCount} recent events; ${summary.needsReviewCount} need review.`);
