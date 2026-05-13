import crypto from "node:crypto";
import fs from "node:fs";
import vm from "node:vm";

const context = { window: {} };
vm.createContext(context);

for (const file of ["web/seed-events.js", "web/event-links.js"]) {
  vm.runInContext(fs.readFileSync(file, "utf8"), context, { filename: file });
}

const canonicalEventNames = {
  "big 3 festival": "Big 3 Festival",
  "dancehub": "The Dance Hub",
  "dance hub": "The Dance Hub",
  "the dancehub": "The Dance Hub",
  "live 2 mambo first weekend": "Live 2 Mambo: Novotel",
  "live 2 mambo: first weekend": "Live 2 Mambo: Novotel",
  "live 2 mambo novotel": "Live 2 Mambo: Novotel",
  "live 2 mambo: novotel": "Live 2 Mambo: Novotel",
  "live 2 mambo carnival days": "Live 2 Mambo: Carnival Days",
  "live 2 mambo: carnival days": "Live 2 Mambo: Carnival Days",
  "live 2 mambo second weekend": "Live 2 Mambo: New York Palace",
  "live 2 mambo: second weekend": "Live 2 Mambo: New York Palace",
  "live 2 mambo new york palace": "Live 2 Mambo: New York Palace",
  "live 2 mambo: new york palace": "Live 2 Mambo: New York Palace",
  "live 2 mambo 2 weekends": "Live 2 Mambo: 2 Weekends",
  "live 2 mambo 2 weekend": "Live 2 Mambo: 2 Weekends",
  "live 2 mambo: 2 weekends": "Live 2 Mambo: 2 Weekends",
  "magic": "Magic Slovenian Salsa Festival",
  "magic slovenian salsa festival": "Magic Slovenian Salsa Festival",
  "cobeatparty salsa rave": "SalsaRave by CoBeatParty",
  "salsarave": "SalsaRave by CoBeatParty",
  "salsa rave": "SalsaRave by CoBeatParty",
  "salsarave by cobeatparty": "SalsaRave by CoBeatParty",
  "mambo city": "5Star Congress",
  "mambocity 5 star": "5Star Congress",
  "mambocity 5 star congress": "5Star Congress",
  "mambocity 5star congress": "5Star Congress",
  "mambo city 5 star": "5Star Congress",
  "mambo city 5 star congress": "5Star Congress",
  "mambo city 5star congress": "5Star Congress",
  "5 star congress": "5Star Congress",
  "5star congress": "5Star Congress",
  "amsterdam salsa weekender": "Amsterdam Salsa Weekend",
  "beat passion mambo": "Beats Passion Mambo",
  "beats passion mambo": "Beats Passion Mambo",
  "mambo marathon": "Mambo Marathonios",
  "m. mambo marathonios": "Mambo Marathonios"
};

const removedEventNames = new Set([
  "caldac",
  "cisc",
  "csbf",
  "chicago international salsa congress",
  "chicago salsa bachata festival",
  "reno latin dance festival",
  "orlando salsa congress",
  "sf sbk",
  "sfsbkz",
  "world salsa festival",
  "live 2 mambo: 2 weekends",
  "super mario birthday"
]);

const eventDateCorrections = {
  "prague salsa marathon|2026-05-09|2026-05-11": ["2026-05-07", "2026-05-11"],
  "smyrna mambo getaway|2026-05-22|2026-05-26": ["2026-05-21", "2026-05-24"],
  "mambo y nada mas|2026-05-29|2026-06-02": ["2026-05-29", "2026-05-31"],
  "porto salsa weekend|2025-10-02|2025-10-06": ["2025-10-02", "2025-10-05"],
  "porto salsa weekend|2026-10-02|2026-10-06": ["2026-10-02", "2026-10-04"],
  "pink marathon|2026-10-23|2026-10-26": ["2026-10-23", "2026-10-25"],
  "mambo marathonios|2027-04-23|2027-04-26": ["2027-04-21", "2027-04-26"],
  "zagreb salsa marathon|2026-04-23|2026-04-27": ["2026-04-24", "2026-04-26"],
  "zagreb salsa marathon|2026-04-24|2026-04-27": ["2026-04-24", "2026-04-26"],
  "zagreb salsa marathon|2026-04-30|2026-05-02": ["2026-04-24", "2026-04-26"],
  "5star congress|2026-05-01|2026-05-05": ["2026-05-01", "2026-05-04"],
  "5star congress|2026-05-08|2026-05-11": ["2026-05-01", "2026-05-04"],
  "berlin salsa congress|2026-08-28|2026-08-31": ["2026-08-27", "2026-08-30"],
  "brussels salsa marathon|2026-12-06|2026-12-09": ["2026-12-04", "2026-12-07"],
  "magic slovenian salsa festival|2026-01-16|2026-01-20": ["2026-01-15", "2026-01-18"],
  "agozar|2026-12-19|2026-12-21": ["2026-12-18", "2026-12-20"]
};

const sharedFields = ["organizer", "website", "instagram", "facebook"];
const editionFields = ["venue", "tickets", "price", "currency", "djs", "artists", "eventSize", "travel", "addedOn", "notes"];

function normalize(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function canonicalName(name) {
  return canonicalEventNames[normalize(name)] || name;
}

function correctedDates(event) {
  return eventDateCorrections[[event.name, event.startDate, event.endDate].map(normalize).join("|")]
    || [event.startDate, event.endDate];
}

function sql(value) {
  if (value === undefined || value === null || value === "") return "null";
  return `'${String(value).replaceAll("'", "''")}'`;
}

function eventDetails(name) {
  const canonical = canonicalName(name);
  return context.window.eventLinks?.[canonical] || context.window.eventLinks?.[name] || {};
}

function editionDetails(event) {
  const key = [canonicalName(event.name), event.startDate].map(normalize).join("|");
  return context.window.eventEditionDetails?.[key] || {};
}

function pick(source, fields) {
  return Object.fromEntries(fields.filter((field) => source?.[field]).map((field) => [field, source[field]]));
}

const eventIds = new Map();
const editions = [];
const editionKeys = new Set();

for (const seed of context.window.seedEvents || []) {
  const name = canonicalName(seed.name);
  const isRemovedEvent = removedEventNames.has(normalize(name));
  const isNonNewYorkUsEvent = normalize(seed.country) === "united states" && normalize(seed.city) !== "new york";
  if (isRemovedEvent || isNonNewYorkUsEvent) continue;

  const [startDate, endDate] = correctedDates({ ...seed, name });
  const shared = pick(eventDetails(name), sharedFields);
  const edition = pick(editionDetails({ ...seed, name, startDate, endDate }), editionFields);
  const event = { ...seed, name, startDate, endDate, ...shared, ...edition };
  const editionKey = [name, startDate, endDate, event.city, event.country].map(normalize).join("|");
  if (editionKeys.has(editionKey)) continue;
  editionKeys.add(editionKey);

  const familyKey = normalize(name);
  if (!eventIds.has(familyKey)) {
    eventIds.set(familyKey, {
      id: crypto.randomUUID(),
      name,
      organizer: shared.organizer || "",
      website: shared.website || "",
      instagram: shared.instagram || "",
      facebook: shared.facebook || ""
    });
  }
  editions.push({ id: crypto.randomUUID(), eventId: eventIds.get(familyKey).id, ...event });
}

const lines = [
  "-- Initial public event import for Salsa Festival Tracker.",
  "-- Run in Supabase SQL Editor after creating the base tables and RLS policies.",
  "-- This clears existing public event rows first, so only use it for initial import or a full refresh.",
  "delete from public.event_editions where visibility = 'public';",
  "delete from public.events where visibility = 'public';",
  ""
];

for (const event of eventIds.values()) {
  lines.push([
    "insert into public.events (id, name, organizer, website, instagram, facebook, visibility) values (",
    [sql(event.id), sql(event.name), sql(event.organizer), sql(event.website), sql(event.instagram), sql(event.facebook), "'public'"].join(", "),
    ");"
  ].join(""));
}

lines.push("");

for (const edition of editions) {
  lines.push([
    "insert into public.event_editions (id, event_id, start_date, end_date, city, country, venue, tickets, price, currency, djs, artists, event_size, travel, notes, added_on, visibility) values (",
    [
      sql(edition.id),
      sql(edition.eventId),
      sql(edition.startDate),
      sql(edition.endDate),
      sql(edition.city),
      sql(edition.country),
      sql(edition.venue),
      sql(edition.tickets),
      sql(edition.price),
      sql(edition.currency),
      sql(edition.djs),
      sql(edition.artists),
      sql(edition.eventSize),
      sql(edition.travel),
      sql(edition.notes),
      sql(edition.addedOn),
      "'public'"
    ].join(", "),
    ");"
  ].join(""));
}

console.log(lines.join("\n"));
