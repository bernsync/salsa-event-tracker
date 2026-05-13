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
for (const file of ["seed-events.js", "event-links.js"]) {
  const fullPath = path.join(root, "web", file);
  if (fs.existsSync(fullPath)) {
    vm.runInContext(fs.readFileSync(fullPath, "utf8"), context);
  }
}

const repoSeedEvents = Array.isArray(context.window.seedEvents) ? context.window.seedEvents : [];
const eventLinks = context.window.eventLinks || {};
const eventEditionDetails = context.window.eventEditionDetails || {};
const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || "";
const knownFutureNotAnnounced = new Set([
  "5star congress",
  "bucharest salsa revolution"
]);

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

function compact(value) {
  return normalize(value).replace(/[^a-z0-9]+/g, "");
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
    event.website,
    event.tickets,
    event.facebook,
    event.instagram?.startsWith("@") ? `https://www.instagram.com/${event.instagram.slice(1)}/` : event.instagram,
    links.website,
    edition.tickets,
    links.tickets,
    links.facebook,
    links.instagram?.startsWith("@") ? `https://www.instagram.com/${links.instagram.slice(1)}/` : links.instagram
  ].filter(Boolean);
  return [...new Set(raw)].slice(0, maxSourcesPerEvent);
}

async function loadSupabaseEvents() {
  if (!supabaseUrl || !supabaseKey) return [];

  const endpoint = `${supabaseUrl.replace(/\/$/, "")}/rest/v1/events?select=*,event_editions(*)&visibility=eq.public&order=name.asc`;
  try {
    const response = await fetch(endpoint, {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`
      }
    });
    if (!response.ok) {
      throw new Error(`Supabase returned ${response.status}`);
    }
    const rows = await response.json();
    return rows.flatMap((event) => {
      const editions = Array.isArray(event.event_editions) ? event.event_editions : [];
      return editions
        .filter((edition) => edition.visibility === "public")
        .map((edition) => ({
          name: event.name,
          startDate: edition.start_date || "",
          endDate: edition.end_date || edition.start_date || "",
          city: edition.city || "",
          country: edition.country || "",
          venue: edition.venue || "",
          website: event.website || "",
          instagram: event.instagram || "",
          facebook: event.facebook || "",
          tickets: edition.tickets || "",
          organizer: event.organizer || "",
          djs: edition.djs || "",
          artists: edition.artists || "",
          notes: edition.notes || ""
        }));
    });
  } catch (error) {
    console.warn(`Supabase event load failed; falling back to repo seed data. ${error.message}`);
    return [];
  }
}

async function loadAuditEvents() {
  const supabaseEvents = await loadSupabaseEvents();
  if (supabaseEvents.length) {
    return { source: "Supabase", events: supabaseEvents };
  }
  return { source: "repo seed files", events: repoSeedEvents };
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

function rangeEndDate(startDate, endDay) {
  const start = toDate(startDate);
  const end = new Date(start);
  end.setUTCDate(Number(endDay));
  if (end < start) end.setUTCMonth(end.getUTCMonth() + 1);
  return isoDate(end);
}

function daySpan(startDate, endDate) {
  return Math.round((toDate(endDate) - toDate(startDate)) / 86400000) + 1;
}

function isPlausibleEditionRange(startDate, endDate) {
  const days = daySpan(startDate, endDate);
  return days >= 2 && days <= 10 && toDate(startDate) > today;
}

function contextAround(text, index, length) {
  const start = Math.max(0, index - 180);
  const end = Math.min(text.length, index + length + 180);
  return text.slice(start, end);
}

function addRange(ranges, startDate, endDate, context = "") {
  if (!startDate || !endDate || !isPlausibleEditionRange(startDate, endDate)) return;
  ranges.set(`${startDate}|${endDate}`, { startDate, endDate, context });
}

function extractDateCandidates(text) {
  const found = new Set();
  const ranges = new Map();
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
    const startDate = makeDate(match[4], month, match[2]);
    found.add(startDate);
    if (match[3]) {
      const endDate = rangeEndDate(startDate, match[3]);
      found.add(endDate);
      addRange(ranges, startDate, endDate, contextAround(text, match.index, match[0].length));
    }
  }

  const dayMonthRange = new RegExp(`\\b(0?[1-9]|[12]\\d|3[01])(?:st|nd|rd|th)?\\s*[-–]\\s*(0?[1-9]|[12]\\d|3[01])(?:st|nd|rd|th)?\\s+(${monthPattern})\\s+(20\\d{2})\\b`, "gi");
  for (const match of text.matchAll(dayMonthRange)) {
    const startDate = makeDate(match[4], monthNames[match[3].toLowerCase()], match[1]);
    const endDate = rangeEndDate(startDate, match[2]);
    found.add(startDate);
    found.add(endDate);
    addRange(ranges, startDate, endDate, contextAround(text, match.index, match[0].length));
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

  return {
    dateHits: [...found].filter(Boolean).sort(),
    ranges: [...ranges.values()].sort((a, b) => a.startDate.localeCompare(b.startDate))
  };
}

function hasExistingFutureEdition(events, event) {
  return events
    .filter((candidate) => eventFamilyKey(candidate) === eventFamilyKey(event))
    .some((candidate) => toDate(candidate.startDate) > toDate(event.endDate));
}

function duplicateCandidate(events, event, startDate, endDate = startDate) {
  const candidateStart = toDate(startDate);
  const candidateEnd = toDate(endDate);
  return events.some((existing) => {
    if (eventFamilyKey(existing) !== eventFamilyKey(event)) return false;
    const existingStart = toDate(existing.startDate);
    const existingEnd = toDate(existing.endDate);
    return candidateStart <= existingEnd && candidateEnd >= existingStart;
  });
}

function overlapsOtherFamily(events, event, startDate, endDate) {
  const candidateStart = toDate(startDate);
  const candidateEnd = toDate(endDate);
  return events.some((existing) => {
    if (eventFamilyKey(existing) === eventFamilyKey(event)) return false;
    const existingStart = toDate(existing.startDate);
    const existingEnd = toDate(existing.endDate);
    return candidateStart <= existingEnd && candidateEnd >= existingStart;
  });
}

function recentEvents(events) {
  return events
    .filter((event) => {
      const end = toDate(event.endDate);
      return end >= since && end <= today;
    })
    .sort((a, b) => a.endDate.localeCompare(b.endDate));
}

function eventAliasGroups(event) {
  const name = normalize(event.name);

  if (name.startsWith("live 2 mambo")) {
    if (name.includes("novotel")) return [["live2mambo"], ["novotel"]];
    if (name.includes("carnival")) return [["live2mambo"], ["carnivaldays", "carnival"]];
    if (name.includes("new york palace")) return [["live2mambo"], ["newyorkpalace"]];
  }

  return [[compact(event.name)]];
}

function rangeMatchesEvent(events, event, range) {
  const context = compact(range.context);
  if (!context) return false;
  const matchesName = eventAliasGroups(event).every((group) => group.some((alias) => context.includes(alias)));
  if (!matchesName) return false;

  if (overlapsOtherFamily(events, event, range.startDate, range.endDate)) {
    return context.includes(compact(event.name));
  }

  return true;
}

async function auditEvent(events, event) {
  const sources = sourceLinksFor(event);
  const fetched = [];
  const dateHits = new Set();
  const rangeHits = new Map();

  for (const source of sources) {
    const result = await fetchText(source);
    fetched.push({
      url: result.url,
      ok: result.ok,
      status: result.status,
      error: result.error
    });
    if (!result.ok) continue;
    const candidates = extractDateCandidates(result.text);
    candidates.dateHits
      .filter((date) => toDate(date) > today)
      .forEach((date) => dateHits.add(date));
    candidates.ranges.filter((range) => rangeMatchesEvent(events, event, range)).forEach((range) => {
      rangeHits.set(`${range.startDate}|${range.endDate}`, range);
    });
  }

  const futureDates = [...dateHits].sort();
  const suggestedRanges = [...rangeHits.values()]
    .filter((range) => !duplicateCandidate(events, event, range.startDate, range.endDate))
    .sort((a, b) => a.startDate.localeCompare(b.startDate));

  return {
    event,
    location: eventLocation(event),
    alreadyTracked: hasExistingFutureEdition(events, event),
    sources,
    fetched,
    futureDates,
    suggestedRanges,
    proposedSeedRows: suggestedRanges.map((range) => ({
      city: event.city || "",
      country: event.country || "",
      name: event.name,
      startDate: range.startDate,
      endDate: range.endDate
    }))
  };
}

function renderMarkdown(results, source) {
  const lines = [];
  lines.push("# Weekly Event Edition Refresh");
  lines.push("");
  lines.push(`Run date: ${isoDate(today)}`);
  lines.push(`Data source: ${source}.`);
  lines.push(`Reviewing events that ended from ${isoDate(since)} through ${isoDate(today)}.`);
  lines.push("");
  lines.push("This report is intentionally conservative. It does not edit Supabase automatically; verify official sources before inserting or updating rows.");
  lines.push("");

  const needsReview = results.filter((result) => {
    const knownNotAnnounced = knownFutureNotAnnounced.has(eventFamilyKey(result.event));
    return result.suggestedRanges.length || (!result.alreadyTracked && !knownNotAnnounced);
  });
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
      lines.push(`- Future date mentions seen in sources: ${result.futureDates.length ? result.futureDates.join(", ") : "none"}`);
      lines.push(`- Non-duplicate suggested ranges: ${result.suggestedRanges.length ? result.suggestedRanges.map((range) => `${range.startDate} to ${range.endDate}`).join(", ") : "none"}`);
      lines.push(`- Sources checked: ${result.sources.length ? result.sources.join(", ") : "none"}`);
      if (result.proposedSeedRows.length) {
        lines.push("- Candidate Supabase edition rows, verify before using:");
        for (const row of result.proposedSeedRows) {
          lines.push(`  - event: "${row.name}", city: "${row.city}", country: "${row.country}", start_date: "${row.startDate}", end_date: "${row.endDate}"`);
        }
      }
      lines.push("");
    }
  }

  lines.push("## All Recent Events Checked");
  lines.push("");
  for (const result of results) {
    const knownNotAnnounced = knownFutureNotAnnounced.has(eventFamilyKey(result.event));
    const status = result.alreadyTracked
      ? "future edition already tracked"
      : knownNotAnnounced
        ? "future edition not announced yet"
        : "no future edition in tracker";
    lines.push(`- ${result.event.name} (${result.event.startDate} to ${result.event.endDate}) - ${status}`);
  }
  lines.push("");
  return lines.join("\n");
}

fs.mkdirSync(outputDir, { recursive: true });
const { source, events } = await loadAuditEvents();
const results = [];
for (const event of recentEvents(events)) {
  results.push(await auditEvent(events, event));
}

const summary = {
  runDate: isoDate(today),
  dataSource: source,
  windowStart: isoDate(since),
  recentEventCount: results.length,
  needsReviewCount: results.filter((result) => result.suggestedRanges.length || (!result.alreadyTracked && !knownFutureNotAnnounced.has(eventFamilyKey(result.event)))).length,
  results
};

fs.writeFileSync(path.join(outputDir, "event-edition-refresh.json"), `${JSON.stringify(summary, null, 2)}\n`);
fs.writeFileSync(path.join(outputDir, "event-edition-refresh.md"), renderMarkdown(results, source));
console.log(`Checked ${summary.recentEventCount} recent events from ${source}; ${summary.needsReviewCount} need review.`);
