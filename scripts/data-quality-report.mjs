import fs from "node:fs";
import path from "node:path";
import { mapSupabaseEvents } from "../web/supabase-mappers.js";
import { normalizeExternalUrl } from "../web/link-utils.js";
import { normalizeText } from "../web/text-utils.js";

const root = process.cwd();
const outputDir = process.env.OUTPUT_DIR || path.join(root, "audit");
const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || "";

function fail(message) {
  console.error(message);
  process.exit(1);
}

async function supabaseRequest(pathname) {
  if (!supabaseUrl || !supabaseKey) {
    fail("SUPABASE_URL and a Supabase key are required.");
  }

  const response = await fetch(`${supabaseUrl.replace(/\/$/, "")}/rest/v1/${pathname}`, {
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`
    }
  });

  if (!response.ok) {
    const text = await response.text();
    fail(`Supabase returned ${response.status}${text ? `: ${text}` : ""}`);
  }

  return response.json();
}

function eventKey(event) {
  return [
    normalizeText(event.name),
    event.startDate,
    event.endDate,
    normalizeText(event.city),
    normalizeText(event.country)
  ].join("|");
}

function issueFor(event, issue) {
  return {
    event,
    issue,
    sortKey: `${event.startDate || "9999-99-99"} ${event.name}`
  };
}

function qualityIssues(events) {
  const issues = [];
  const seen = new Map();
  const today = new Date().toISOString().slice(0, 10);

  events.forEach((event) => {
    const key = eventKey(event);
    if (seen.has(key)) {
      issues.push(issueFor(event, `Possible duplicate of ${seen.get(key).name}`));
    } else {
      seen.set(key, event);
    }

    if (!event.website) issues.push(issueFor(event, "Missing website"));
    if (!event.tickets && event.endDate >= today) issues.push(issueFor(event, "Missing ticket link"));
    if (!event.venue && event.endDate >= today) issues.push(issueFor(event, "Missing venue"));
    if (!event.eventSize) issues.push(issueFor(event, "Missing event size"));
    if (!event.city || !event.country) issues.push(issueFor(event, "Missing city/country"));
    if (event.startDate && event.endDate && event.endDate < event.startDate) issues.push(issueFor(event, "End date is before start date"));
    if (event.website && !normalizeExternalUrl(event.website)) issues.push(issueFor(event, "Website is not a valid http(s) URL"));
    if (event.tickets && !normalizeExternalUrl(event.tickets)) issues.push(issueFor(event, "Ticket link is not a valid http(s) URL"));
    if (event.instagram && !normalizeExternalUrl(event.instagram)) issues.push(issueFor(event, "Instagram is not a valid URL or @handle"));
    if (event.facebook && !normalizeExternalUrl(event.facebook)) issues.push(issueFor(event, "Facebook is not a valid http(s) URL"));
  });

  return issues.sort((a, b) => a.sortKey.localeCompare(b.sortKey) || a.issue.localeCompare(b.issue));
}

function renderMarkdown(events, issues) {
  const lines = [
    "# Data Quality Report",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    `Tracked public editions: ${events.length}`,
    `Open quality findings: ${issues.length}`,
    ""
  ];

  if (!issues.length) {
    lines.push("No quality findings detected.");
    return `${lines.join("\n")}\n`;
  }

  lines.push("| Event | Dates | Location | Finding |");
  lines.push("| --- | --- | --- | --- |");
  issues.forEach(({ event, issue }) => {
    lines.push(`| ${event.name || "(unnamed)"} | ${event.startDate || "?"} to ${event.endDate || "?"} | ${[event.city, event.country].filter(Boolean).join(", ") || "?"} | ${issue} |`);
  });
  return `${lines.join("\n")}\n`;
}

const rows = await supabaseRequest("events?select=*,event_editions(*)&visibility=eq.public&order=name.asc");
const events = mapSupabaseEvents(rows);
const issues = qualityIssues(events);
fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(path.join(outputDir, "data-quality-report.md"), renderMarkdown(events, issues));

console.log(`Data quality report complete: ${issues.length} finding(s).`);
