import fs from "node:fs";
import path from "node:path";
import { mapSupabaseEvents } from "../web/supabase-mappers.js";

const root = process.cwd();
const outputDir = process.env.OUTPUT_DIR || path.join(root, "audit");
const today = process.env.AUDIT_TODAY ? new Date(`${process.env.AUDIT_TODAY}T00:00:00Z`) : new Date();
const recentWindowStart = process.env.AUDIT_WINDOW_START
  ? new Date(`${process.env.AUDIT_WINDOW_START}T00:00:00Z`)
  : new Date(Date.UTC(today.getUTCFullYear(), 0, 1));
const upcomingUntil = new Date(today);
upcomingUntil.setUTCMonth(upcomingUntil.getUTCMonth() + 3);
const nearTermUntil = new Date(today);
nearTermUntil.setUTCDate(nearTermUntil.getUTCDate() + 30);

const sourceTimeoutMs = Number(process.env.SOURCE_TIMEOUT_MS || 12000);
const maxSourcesPerEvent = Number(process.env.MAX_SOURCES_PER_EVENT || 4);
const dateRangeSeparator = String.raw`\s*(?:-|\u2013|\u2014|to)\s*`;

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || "";
const officialSchengenSourceUrl = "https://home-affairs.ec.europa.eu/policies/schengen-borders-and-visa/schengen-area_en";
const officialSchengenCountries = [
  "Austria",
  "Belgium",
  "Bulgaria",
  "Croatia",
  "Czechia",
  "Denmark",
  "Estonia",
  "Finland",
  "France",
  "Germany",
  "Greece",
  "Hungary",
  "Iceland",
  "Italy",
  "Latvia",
  "Liechtenstein",
  "Lithuania",
  "Luxembourg",
  "Malta",
  "Netherlands",
  "Norway",
  "Poland",
  "Portugal",
  "Romania",
  "Slovakia",
  "Slovenia",
  "Spain",
  "Sweden",
  "Switzerland"
];
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
    .replace(/&ndash;|&#8211;|&#x2013;/gi, "-")
    .replace(/&mdash;|&#8212;|&#x2014;/gi, "-")
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

function eventLocation(event) {
  return [event.city, event.country].filter(Boolean).join(", ");
}

function sourceLinksFor(event) {
  const raw = [
    event.website,
    event.tickets,
    event.facebook,
    event.instagram?.startsWith("@") ? `https://www.instagram.com/${event.instagram.slice(1)}/` : event.instagram
  ].filter(Boolean);
  return [...new Set(raw)].slice(0, maxSourcesPerEvent);
}

async function loadSupabaseEvents() {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("SUPABASE_URL and a Supabase key are required.");
  }

  const endpoint = `${supabaseUrl.replace(/\/$/, "")}/rest/v1/events?select=*,event_editions(*)&visibility=eq.public&order=name.asc`;
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
  return mapSupabaseEvents(rows);
}

async function loadSupabaseSchengenCountries() {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("SUPABASE_URL and a Supabase key are required.");
  }

  const endpoint = `${supabaseUrl.replace(/\/$/, "")}/rest/v1/schengen_countries?select=country_name,is_schengen&order=country_name.asc`;
  const response = await fetch(endpoint, {
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`
    }
  });
  if (!response.ok) {
    throw new Error(`Supabase schengen_countries returned ${response.status}`);
  }
  return response.json();
}

async function loadAuditEvents() {
  const [supabaseEvents, schengenCountries] = await Promise.all([
    loadSupabaseEvents(),
    loadSupabaseSchengenCountries()
  ]);
  return { source: "Supabase", events: supabaseEvents, schengenCountries };
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
  // Keep range evidence local so sibling events on organizer pages do not
  // inherit each other's dates through nearby navigation labels.
  const start = Math.max(0, index - 80);
  const end = Math.min(text.length, index + length + 80);
  return text.slice(start, end);
}

function addRange(ranges, startDate, endDate, context = "", index = -1) {
  if (!startDate || !endDate || !isPlausibleEditionRange(startDate, endDate)) return;
  ranges.set(`${startDate}|${endDate}`, { startDate, endDate, context, index });
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

function extractDateCandidatesV2(text) {
  const found = new Set();
  const ranges = new Map();
  const currentYear = today.getUTCFullYear();
  const monthPattern = Object.keys(monthNames).join("|");

  function rememberRange(match, startDate, endDate) {
    found.add(startDate);
    found.add(endDate);
    addRange(ranges, startDate, endDate, contextAround(text, match.index, match[0].length), match.index);
  }

  for (const match of text.matchAll(/\b(20\d{2})[-/.](0?[1-9]|1[0-2])[-/.](0?[1-9]|[12]\d|3[01])\b/g)) {
    found.add(makeDate(match[1], match[2], match[3]));
  }

  for (const match of text.matchAll(/\b(0?[1-9]|[12]\d|3[01])[-/.](0?[1-9]|1[0-2])[-/.](20\d{2})\b/g)) {
    found.add(makeDate(match[3], match[2], match[1]));
  }

  const monthDay = new RegExp(`\\b(${monthPattern})\\s+(0?[1-9]|[12]\\d|3[01])(?:st|nd|rd|th)?(?:${dateRangeSeparator}(0?[1-9]|[12]\\d|3[01])(?:st|nd|rd|th)?)?,?\\s*(20\\d{2})\\b`, "gi");
  for (const match of text.matchAll(monthDay)) {
    const month = monthNames[match[1].toLowerCase()];
    const startDate = makeDate(match[4], month, match[2]);
    found.add(startDate);
    if (match[3]) rememberRange(match, startDate, rangeEndDate(startDate, match[3]));
  }

  const dayMonthRange = new RegExp(`\\b(0?[1-9]|[12]\\d|3[01])(?:st|nd|rd|th)?${dateRangeSeparator}(0?[1-9]|[12]\\d|3[01])(?:st|nd|rd|th)?\\s+(${monthPattern})\\s+(20\\d{2})\\b`, "gi");
  for (const match of text.matchAll(dayMonthRange)) {
    const startDate = makeDate(match[4], monthNames[match[3].toLowerCase()], match[1]);
    rememberRange(match, startDate, rangeEndDate(startDate, match[2]));
  }

  const crossMonthDayRange = new RegExp(`\\b(0?[1-9]|[12]\\d|3[01])(?:st|nd|rd|th)?\\s+(${monthPattern})${dateRangeSeparator}(0?[1-9]|[12]\\d|3[01])(?:st|nd|rd|th)?\\s+(${monthPattern})\\s+(20\\d{2})\\b`, "gi");
  for (const match of text.matchAll(crossMonthDayRange)) {
    const startDate = makeDate(match[5], monthNames[match[2].toLowerCase()], match[1]);
    const endDate = makeDate(match[5], monthNames[match[4].toLowerCase()], match[3]);
    rememberRange(match, startDate, endDate);
  }

  const crossMonthNameRange = new RegExp(`\\b(${monthPattern})\\s+(0?[1-9]|[12]\\d|3[01])(?:st|nd|rd|th)?${dateRangeSeparator}(${monthPattern})\\s+(0?[1-9]|[12]\\d|3[01])(?:st|nd|rd|th)?,?\\s*(20\\d{2})\\b`, "gi");
  for (const match of text.matchAll(crossMonthNameRange)) {
    const startDate = makeDate(match[5], monthNames[match[1].toLowerCase()], match[2]);
    const endDate = makeDate(match[5], monthNames[match[3].toLowerCase()], match[4]);
    rememberRange(match, startDate, endDate);
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
      return end >= recentWindowStart && end <= today;
    })
    .sort((a, b) => a.endDate.localeCompare(b.endDate));
}

function upcomingEvents(events) {
  return events
    .filter((event) => {
      const start = toDate(event.startDate);
      return start >= today && start <= upcomingUntil;
    })
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
}

function nearTermEvents(events) {
  return events
    .filter((event) => {
      const start = toDate(event.startDate);
      return start >= today && start <= nearTermUntil;
    })
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
}

function eventAliasGroups(event) {
  const name = normalize(event.name);

  if (name.includes("croatia summer salsa festival") || name.includes("croatian summer salsa festival")) {
    return [["croatiasummersalsafestival", "croatiansummersalsafestival", "crosalsafestival", "cssf"]];
  }

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

function sameHostname(left, right) {
  try {
    const leftHost = new URL(left).hostname.replace(/^www\./, "");
    const rightHost = new URL(right).hostname.replace(/^www\./, "");
    return leftHost === rightHost;
  } catch {
    return false;
  }
}

function sourceOpeningMatchesEvent(event, sourceUrl, sourceText) {
  const opening = compact(sourceText.slice(0, 5000));
  const compactUrl = compact(sourceUrl);
  const exactName = compact(event.name);
  if (opening.includes(exactName)) return true;

  return eventAliasGroups(event).every((group) => (
    group.some((alias) => opening.includes(alias) || compactUrl.includes(alias))
  ));
}

function rangeMatchesDedicatedPageIntro(event, sourceUrl, sourceText, range) {
  if (!event.website || !sameHostname(sourceUrl, event.website)) return false;
  if (!Number.isFinite(range.index) || range.index < 0 || range.index > 1200) return false;
  return sourceOpeningMatchesEvent(event, sourceUrl, sourceText);
}

async function auditEvent(events, event) {
  const sources = sourceLinksFor(event);
  const fetched = [];
  const dateHits = new Set();
  const rangeHits = new Map();
  let exactCurrentRangeSeen = false;

  for (const source of sources) {
    const result = await fetchText(source);
    fetched.push({
      url: result.url,
      ok: result.ok,
      status: result.status,
      error: result.error
    });
    if (!result.ok) continue;
    const candidates = extractDateCandidatesV2(result.text);
    candidates.dateHits
      .filter((date) => toDate(date) > today)
      .forEach((date) => dateHits.add(date));
    if (candidates.ranges.some((range) => range.startDate === event.startDate && range.endDate === event.endDate)) {
      exactCurrentRangeSeen = true;
    }
    candidates.ranges.filter((range) => (
      rangeMatchesEvent(events, event, range) ||
      rangeMatchesDedicatedPageIntro(event, result.url, result.text, range)
    )).forEach((range) => {
      rangeHits.set(`${range.startDate}|${range.endDate}`, range);
    });
  }

  const futureDates = [...dateHits].sort();
  const currentDateMentionsSeen = exactCurrentRangeSeen ||
    (futureDates.includes(event.startDate) && futureDates.includes(event.endDate));
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
    currentDateMentionsSeen,
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

async function auditSchengenCountries(rows) {
  const source = await fetchText(officialSchengenSourceUrl);
  const expected = new Set(officialSchengenCountries.map(normalize));
  const activeRows = rows.filter((row) => row.is_schengen === true);
  const active = new Map(activeRows.map((row) => [normalize(row.country_name), row.country_name]));
  const allRows = new Map(rows.map((row) => [normalize(row.country_name), row]));

  const missingActiveCountries = officialSchengenCountries.filter((country) => !active.has(normalize(country)));
  const inactiveOfficialCountries = officialSchengenCountries.filter((country) => {
    const row = allRows.get(normalize(country));
    return row && row.is_schengen !== true;
  });
  const unexpectedActiveCountries = activeRows
    .map((row) => row.country_name)
    .filter((country) => !expected.has(normalize(country)));

  const sourceText = source.ok ? source.text : "";
  const officialCountLooksCurrent = sourceText.includes("29 countries");
  const latestJoinLooksCurrent = sourceText.toLowerCase().includes("bulgaria and romania") && sourceText.includes("1 January 2025");
  const sourceWarning = source.ok && officialCountLooksCurrent && latestJoinLooksCurrent
    ? ""
    : "Official source wording changed or could not be fetched; manually re-check the Schengen country list.";

  return {
    sourceUrl: officialSchengenSourceUrl,
    sourceOk: source.ok,
    sourceStatus: source.status,
    expectedCount: officialSchengenCountries.length,
    databaseCount: activeRows.length,
    missingActiveCountries,
    inactiveOfficialCountries,
    unexpectedActiveCountries,
    sourceWarning,
    proposedSql: missingActiveCountries.map((country) => (
      `insert into schengen_countries (country_name, is_schengen) values ('${country.replaceAll("'", "''")}', true) on conflict (country_name) do update set is_schengen = excluded.is_schengen;`
    ))
  };
}

function hasActionableNextEdition(result) {
  return result.suggestedRanges.length > 0;
}

function hasSchengenAction(schengenAudit) {
  return Boolean(
    schengenAudit.missingActiveCountries.length ||
    schengenAudit.inactiveOfficialCountries.length ||
    schengenAudit.unexpectedActiveCountries.length ||
    schengenAudit.sourceWarning
  );
}

function failedSourcesFor(result) {
  return result.fetched.filter((source) => !source.ok);
}

function hasUpcomingAction(result) {
  return result.suggestedRanges.length > 0 || failedSourcesFor(result).length > 0;
}

function nearTermMissingFields(event) {
  const missing = [];
  if (!event.website) missing.push("website");
  if (!event.venue) missing.push("venue");
  if (!event.tickets) missing.push("tickets");
  if (!event.price || !event.currency) missing.push("price/currency");
  if (!event.eventSize) missing.push("event_size");
  if (!event.artists && !event.djs) missing.push("artists/djs");
  if (!event.instagram && !event.facebook) missing.push("social link");
  return missing;
}

function renderNextEditionMarkdown(results, source, schengenAudit) {
  const lines = [];
  lines.push("# Weekly Next-Edition Discovery");
  lines.push("");
  lines.push(`Run date: ${isoDate(today)}`);
  lines.push(`Data source: ${source}.`);
  lines.push(`Reviewing events that ended from ${isoDate(recentWindowStart)} through ${isoDate(today)}.`);
  lines.push("");
  lines.push("This report is intentionally conservative. It does not edit Supabase automatically; verify official sources before inserting or updating rows.");
  lines.push("Only actionable findings are shown here. Events with no verified non-duplicate date range are counted, not listed.");
  lines.push("");

  const actionableResults = results.filter(hasActionableNextEdition);
  const skippedMissingFuture = results.filter((result) => !result.alreadyTracked && !hasActionableNextEdition(result));
  const alreadyTracked = results.filter((result) => result.alreadyTracked);

  if (!actionableResults.length) {
    lines.push("## Next Editions");
    lines.push("");
    lines.push("No actionable next-edition candidates were found.");
    lines.push("");
  } else {
    lines.push("## Action Needed");
    lines.push("");
    for (const result of actionableResults) {
      lines.push(`### ${result.event.name} (${result.event.startDate} to ${result.event.endDate})`);
      lines.push("");
      lines.push(`- Location: ${result.location || "Unknown"}`);
      lines.push(`- Non-duplicate suggested ranges: ${result.suggestedRanges.length ? result.suggestedRanges.map((range) => `${range.startDate} to ${range.endDate}`).join(", ") : "none"}`);
      lines.push(`- Future date mentions seen in sources: ${result.futureDates.length ? result.futureDates.join(", ") : "none"}`);
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

  if (hasSchengenAction(schengenAudit)) {
    lines.push("## Schengen Country Actions");
    lines.push("");
    lines.push(`Official source: ${schengenAudit.sourceUrl}`);
    lines.push(`- Official source fetched: ${schengenAudit.sourceOk ? "yes" : `no (${schengenAudit.sourceStatus})`}`);
    lines.push(`- Expected active Schengen countries: ${schengenAudit.expectedCount}`);
    lines.push(`- Database active Schengen countries: ${schengenAudit.databaseCount}`);
    lines.push(`- Missing active countries: ${schengenAudit.missingActiveCountries.length ? schengenAudit.missingActiveCountries.join(", ") : "none"}`);
    lines.push(`- Official countries marked inactive: ${schengenAudit.inactiveOfficialCountries.length ? schengenAudit.inactiveOfficialCountries.join(", ") : "none"}`);
    lines.push(`- Unexpected active countries: ${schengenAudit.unexpectedActiveCountries.length ? schengenAudit.unexpectedActiveCountries.join(", ") : "none"}`);
    if (schengenAudit.sourceWarning) lines.push(`- Warning: ${schengenAudit.sourceWarning}`);
    if (schengenAudit.proposedSql.length) {
      lines.push("");
      lines.push("Candidate SQL, verify before using:");
      lines.push("");
      lines.push("```sql");
      lines.push(...schengenAudit.proposedSql);
      lines.push("```");
    }
    lines.push("");
  }

  lines.push("## No-Action Summary");
  lines.push("");
  lines.push(`- Already have a future edition: ${alreadyTracked.length}`);
  lines.push(`- Missing a future edition, but no verified non-duplicate range was found: ${skippedMissingFuture.length}`);
  lines.push(`- Schengen audit: ${hasSchengenAction(schengenAudit) ? "action listed above" : "no action needed"}`);
  lines.push("");
  return lines.join("\n");
}

function renderUpcomingMarkdown(results, source) {
  const lines = [];
  lines.push("# Upcoming Event Refresh");
  lines.push("");
  lines.push(`Run date: ${isoDate(today)}`);
  lines.push(`Data source: ${source}.`);
  lines.push(`Reviewing events starting from ${isoDate(today)} through ${isoDate(upcomingUntil)}.`);
  lines.push("");
  lines.push("This report is audit-only. It checks source pages for date mentions and fetch status, but does not update Supabase.");
  lines.push("Only actionable findings are shown here. Events with no fetch failures and no verified non-duplicate future range are counted, not listed.");
  lines.push("");

  if (!results.length) {
    lines.push("No upcoming events are tracked in the next three months.");
    lines.push("");
    return lines.join("\n");
  }

  const actionableResults = results.filter(hasUpcomingAction);
  const noActionCount = results.length - actionableResults.length;

  if (!actionableResults.length) {
    lines.push("## Action Needed");
    lines.push("");
    lines.push("No actionable upcoming-event refresh items were found.");
    lines.push("");
  } else {
    lines.push("## Action Needed");
    lines.push("");
    for (const result of actionableResults) {
      const failedSources = failedSourcesFor(result);
      lines.push(`### ${result.event.name} (${result.event.startDate} to ${result.event.endDate})`);
      lines.push("");
      lines.push(`- Location: ${result.location || "Unknown"}`);
      if (failedSources.length) {
        lines.push(`- Source fetch failures: ${failedSources.map((source) => `${source.url} (${source.status})`).join(", ")}`);
      }
      if (result.suggestedRanges.length) {
        lines.push(`- Non-duplicate suggested future ranges: ${result.suggestedRanges.map((range) => `${range.startDate} to ${range.endDate}`).join(", ")}`);
      }
      lines.push(`- Sources checked: ${result.sources.length ? result.sources.join(", ") : "none"}`);
      lines.push("");
    }
  }

  lines.push("## No-Action Summary");
  lines.push("");
  lines.push(`- Upcoming events checked with no action needed: ${noActionCount}`);
  lines.push("");

  return lines.join("\n");
}

function renderNearTermMarkdown(results, source) {
  const lines = [];
  lines.push("# 30-Day Event Detail Check");
  lines.push("");
  lines.push(`Run date: ${isoDate(today)}`);
  lines.push(`Data source: ${source}.`);
  lines.push(`Reviewing events starting from ${isoDate(today)} through ${isoDate(nearTermUntil)}.`);
  lines.push("");
  lines.push("This report is for manual verification of near-term event details. It does not edit Supabase automatically.");
  lines.push("");

  if (!results.length) {
    lines.push("No events are tracked in the next 30 days.");
    lines.push("");
    return lines.join("\n");
  }

  lines.push("## Recheck These Events");
  lines.push("");
  for (const result of results) {
    const failedSources = failedSourcesFor(result);
    const missingFields = nearTermMissingFields(result.event);
    lines.push(`### ${result.event.name} (${result.event.startDate} to ${result.event.endDate})`);
    lines.push("");
    lines.push(`- Location: ${result.location || "Unknown"}`);
    lines.push(`- Venue in DB: ${result.event.venue || "missing"}`);
    lines.push(`- Tickets in DB: ${result.event.tickets || "missing"}`);
    lines.push(`- Price in DB: ${result.event.price && result.event.currency ? `${result.event.price} ${result.event.currency}` : "missing"}`);
    lines.push(`- Missing detail fields: ${missingFields.length ? missingFields.join(", ") : "none"}`);
    lines.push(`- Current dates seen in fetched source text: ${result.currentDateMentionsSeen ? "yes" : "no"}`);
    lines.push(`- Source fetch failures: ${failedSources.length ? failedSources.map((source) => `${source.url} (${source.status})`).join(", ") : "none"}`);
    lines.push(`- Sources checked: ${result.sources.length ? result.sources.join(", ") : "none"}`);
    lines.push("");
  }

  return lines.join("\n");
}

fs.mkdirSync(outputDir, { recursive: true });
const { source, events, schengenCountries } = await loadAuditEvents();
const results = [];
for (const event of recentEvents(events)) {
  results.push(await auditEvent(events, event));
}
const upcomingResults = [];
for (const event of upcomingEvents(events)) {
  upcomingResults.push(await auditEvent(events, event));
}
const nearTermResults = [];
for (const event of nearTermEvents(events)) {
  nearTermResults.push(await auditEvent(events, event));
}
const schengenAudit = await auditSchengenCountries(schengenCountries);

const summary = {
  runDate: isoDate(today),
  dataSource: source,
  windowStart: isoDate(recentWindowStart),
  upcomingWindowEnd: isoDate(upcomingUntil),
  nearTermWindowEnd: isoDate(nearTermUntil),
  recentEventCount: results.length,
  upcomingEventCount: upcomingResults.length,
  nearTermEventCount: nearTermResults.length,
  needsReviewCount: results.filter(hasActionableNextEdition).length,
  upcomingActionCount: upcomingResults.filter(hasUpcomingAction).length,
  schengenAudit,
  results,
  upcomingResults,
  nearTermResults
};

fs.writeFileSync(path.join(outputDir, "event-edition-refresh.json"), `${JSON.stringify(summary, null, 2)}\n`);
fs.writeFileSync(path.join(outputDir, "event-edition-refresh.md"), renderNextEditionMarkdown(results, source, schengenAudit));
fs.writeFileSync(path.join(outputDir, "upcoming-event-refresh.md"), renderUpcomingMarkdown(upcomingResults, source));
fs.writeFileSync(path.join(outputDir, "near-term-event-detail-check.md"), renderNearTermMarkdown(nearTermResults, source));
console.log(`Checked ${summary.recentEventCount} current-year past events from ${source}; ${summary.needsReviewCount} have actionable next-edition candidates. Checked ${summary.upcomingEventCount} upcoming events; ${summary.upcomingActionCount} have actionable refresh items. Checked ${summary.nearTermEventCount} near-term events for detail review. Schengen database active count: ${schengenAudit.databaseCount}/${schengenAudit.expectedCount}.`);
