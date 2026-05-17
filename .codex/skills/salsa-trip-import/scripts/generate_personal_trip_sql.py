#!/usr/bin/env python3

import json
import re
import sys
from datetime import date, timedelta
from pathlib import Path

UUID_RE = re.compile(r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$")

def fail(message):
    print(message, file=sys.stderr)
    raise SystemExit(1)


def require_text(value, label):
    text = str(value or "").strip()
    if not text:
        fail(f"{label} is required.")
    return text


def require_date(value, label):
    text = str(value or "")
    if not re.match(r"^\d{4}-\d{2}-\d{2}$", text):
        fail(f"{label} must be YYYY-MM-DD. Got {text or '(empty)'}")
    return text


def date_value(value):
    return date.fromisoformat(require_date(value, "date"))


def clean_label(value):
    return re.sub(r"^trip\s+\d+\s*:\s*", "", str(value or "").strip(), flags=re.I)


def trip_label_for_group(places):
    explicit = next((clean_label(place.get("trip_label") or place.get("label")) for place in places if clean_label(place.get("trip_label") or place.get("label"))), "")
    if explicit:
        return explicit
    event_name = next((clean_label(place.get("event_name") or place.get("event")) for place in places if clean_label(place.get("event_name") or place.get("event"))), "")
    if event_name:
        return event_name
    cities = []
    for place in places:
        city = str(place.get("city") or "").strip()
        if city and city not in cities:
            cities.append(city)
    return " + ".join(cities) if cities else "Imported trip"


def place_dates(place):
    start_date = require_date(place.get("start_date") or place.get("date"), "place.start_date")
    end_date = require_date(place.get("end_date") or start_date, "place.end_date")
    return start_date, end_date


def build_continuous_trips(raw_places):
    places = []
    for index, place in enumerate(raw_places or []):
        start_date, end_date = place_dates(place)
        places.append({**place, "start_date": start_date, "end_date": end_date, "_source_index": index})
    places.sort(key=lambda place: (place["start_date"], place["end_date"], place["_source_index"]))

    groups = []
    for place in places:
        if not groups:
            groups.append([place])
            continue
        previous_end = max(date_value(item["end_date"]) for item in groups[-1])
        next_start = date_value(place["start_date"])
        if next_start <= previous_end + timedelta(days=1):
            groups[-1].append(place)
        else:
            groups.append([place])

    trips = []
    for group in groups:
        start_date = min(place["start_date"] for place in group)
        end_date = max(place["end_date"] for place in group)
        trips.append({
            "label": trip_label_for_group(group),
            "start_date": start_date,
            "end_date": end_date,
            "notes": str(next((place.get("trip_notes") for place in group if place.get("trip_notes")), "")),
            "places": [
                {
                    **{key: value for key, value in place.items() if not key.startswith("_")},
                    "sequence": index,
                }
                for index, place in enumerate(group)
            ],
        })
    return trips


def places_from_trip_rows(raw_trips):
    places = []
    for trip in raw_trips or []:
        trip_start = trip.get("start_date")
        trip_end = trip.get("end_date") or trip_start
        raw_places = trip.get("places")
        if isinstance(raw_places, list) and raw_places:
            for place in raw_places:
                places.append({
                    **place,
                    "trip_label": trip.get("label"),
                    "trip_notes": trip.get("notes"),
                    "start_date": place.get("start_date") or trip_start,
                    "end_date": place.get("end_date") or trip_end,
                })
        else:
            places.append({
                "city": trip.get("city"),
                "country": trip.get("country"),
                "start_date": trip_start,
                "end_date": trip_end,
                "event_edition_id": trip.get("event_edition_id"),
                "event_name": trip.get("event_name"),
                "notes": trip.get("place_notes") or "",
                "trip_label": trip.get("label"),
                "trip_notes": trip.get("notes"),
            })
    return places


def sql_text(value):
    if value is None or value == "":
        return "null"
    return "'" + str(value).replace("'", "''") + "'"


def sql_uuid(value):
    if not value:
        return "null::uuid"
    return f"{sql_text(value)}::uuid"


def sql_date(value):
    return f"{sql_text(value)}::date"


def values_list(rows):
    return ",\n".join("    (" + ", ".join(row) + ")" for row in rows)


def normalize(payload):
    owner_id = require_text(payload.get("owner_id"), "owner_id")
    owner_email = require_text(payload.get("owner_email"), "owner_email")
    if not UUID_RE.match(owner_id):
        fail("owner_id must be a real UUID from a private Supabase query, not the template placeholder.")
    if "<" in owner_email or ">" in owner_email or owner_email.endswith(".invalid"):
        fail("owner_email must be replaced with the private owner email before generating SQL.")
    default_notes = str(payload.get("default_notes") or "").strip()
    raw_trips = payload.get("trips")
    if payload.get("auto_group_continuous_trips"):
        source_places = payload.get("places") if isinstance(payload.get("places"), list) else places_from_trip_rows(raw_trips)
        raw_trips = build_continuous_trips(source_places)
    elif not isinstance(raw_trips, list) and isinstance(payload.get("places"), list):
        raw_trips = build_continuous_trips(payload.get("places"))

    if not isinstance(raw_trips, list):
        fail("trips must be an array.")

    trips = []
    for trip_index, trip in enumerate(raw_trips):
        label = require_text(clean_label(trip.get("label")), f"trips[{trip_index}].label")
        start_date = require_date(trip.get("start_date"), f"trips[{trip_index}].start_date")
        end_date = require_date(trip.get("end_date") or start_date, f"trips[{trip_index}].end_date")
        raw_places = trip.get("places")
        if not isinstance(raw_places, list) or not raw_places:
            raw_places = [{
                "city": trip.get("city"),
                "country": trip.get("country"),
                "start_date": start_date,
                "end_date": end_date,
                "event_edition_id": trip.get("event_edition_id"),
                "notes": trip.get("place_notes") or "",
            }]

        places = []
        for place_index, place in enumerate(raw_places):
            places.append({
                "city": require_text(place.get("city"), f"trips[{trip_index}].places[{place_index}].city"),
                "country": require_text(place.get("country"), f"trips[{trip_index}].places[{place_index}].country"),
                "start_date": require_date(place.get("start_date") or start_date, f"trips[{trip_index}].places[{place_index}].start_date"),
                "end_date": require_date(place.get("end_date") or place.get("start_date") or end_date, f"trips[{trip_index}].places[{place_index}].end_date"),
                "travel_role": str(place.get("travel_role") or place.get("role") or "stay"),
                "sequence": place.get("sequence") if isinstance(place.get("sequence"), int) else place_index,
                "event_edition_id": place.get("event_edition_id") or None,
                "notes": str(place.get("notes") or ""),
            })

        pto_days = []
        for pto_index, pto_day in enumerate(trip.get("pto_days") or []):
            pto_days.append({
                "date": require_date(pto_day.get("date") or pto_day.get("pto_date"), f"trips[{trip_index}].pto_days[{pto_index}].date"),
                "amount": float(pto_day.get("amount") or 1),
                "notes": str(pto_day.get("notes") or ""),
            })

        trips.append({
            "label": label,
            "start_date": start_date,
            "end_date": end_date,
            "notes": str(trip.get("notes") or default_notes),
            "places": places,
            "pto_days": pto_days,
        })

    return {
        "owner_id": owner_id,
        "owner_email": owner_email,
        "trips": trips,
    }


def build_sql(payload):
    trip_rows = [
        [sql_text(trip["label"]), sql_date(trip["start_date"]), sql_date(trip["end_date"]), sql_text(trip["notes"])]
        for trip in payload["trips"]
    ]
    place_rows = []
    pto_rows = []
    for trip in payload["trips"]:
        for place in trip["places"]:
            place_rows.append([
                sql_text(trip["label"]),
                sql_text(place["city"]),
                sql_text(place["country"]),
                sql_date(place["start_date"]),
                sql_date(place["end_date"]),
                sql_text(place["travel_role"]),
                str(place["sequence"]),
                sql_uuid(place["event_edition_id"]),
                sql_text(place["notes"]),
            ])
        for pto_day in trip["pto_days"]:
            amount = int(pto_day["amount"]) if pto_day["amount"].is_integer() else pto_day["amount"]
            pto_rows.append([sql_text(trip["label"]), sql_date(pto_day["date"]), str(amount), sql_text(pto_day["notes"])])

    lines = [
        "with owner_info as (",
        f"  select {sql_uuid(payload['owner_id'])} as owner_id, {sql_text(payload['owner_email'])}::text as owner_email",
        "),",
        "new_trips(label, start_date, end_date, notes) as (",
        "  values",
        values_list(trip_rows),
        "),",
        "inserted_trips as (",
        "  insert into personal_trips (",
        "    id, owner_id, owner_email, label, start_date, end_date, notes, access_level",
        "  )",
        "  select gen_random_uuid(), owner_info.owner_id, owner_info.owner_email,",
        "    new_trips.label, new_trips.start_date, new_trips.end_date, new_trips.notes, 'owner'",
        "  from new_trips",
        "  cross join owner_info",
        "  where not exists (",
        "    select 1 from personal_trips existing",
        "    where existing.owner_id = owner_info.owner_id",
        "      and existing.label = new_trips.label",
        "      and existing.start_date = new_trips.start_date",
        "  )",
        "  returning id, label, start_date",
        "),",
        "target_trips as (",
        "  select inserted_trips.id, inserted_trips.label, inserted_trips.start_date",
        "  from inserted_trips",
        "  union",
        "  select existing.id, existing.label, existing.start_date",
        "  from personal_trips existing",
        "  join new_trips on new_trips.label = existing.label and new_trips.start_date = existing.start_date",
        "  cross join owner_info",
        "  where existing.owner_id = owner_info.owner_id",
        "),",
        "trip_places(label, city, country, start_date, end_date, travel_role, sequence, event_edition_id, notes) as (",
        "  values",
        values_list(place_rows),
        "),",
        "inserted_places as (",
        "  insert into personal_trip_places (",
        "    id, trip_id, owner_id, owner_email, event_edition_id,",
        "    start_date, end_date, city, country, travel_role, sequence, notes, access_level",
        "  )",
        "  select gen_random_uuid(), target_trips.id, owner_info.owner_id, owner_info.owner_email,",
        "    trip_places.event_edition_id, trip_places.start_date, trip_places.end_date,",
        "    trip_places.city, trip_places.country, trip_places.travel_role,",
        "    trip_places.sequence, trip_places.notes, 'owner'",
        "  from trip_places",
        "  join target_trips using (label)",
        "  cross join owner_info",
        "  where not exists (",
        "    select 1 from personal_trip_places existing",
        "    where existing.trip_id = target_trips.id",
        "      and existing.start_date = trip_places.start_date",
        "      and existing.end_date = trip_places.end_date",
        "      and existing.city = trip_places.city",
        "      and existing.country = trip_places.country",
        "      and coalesce(existing.event_edition_id, '00000000-0000-0000-0000-000000000000'::uuid) =",
        "        coalesce(trip_places.event_edition_id, '00000000-0000-0000-0000-000000000000'::uuid)",
        "  )",
        "  returning id",
        ")",
    ]

    if pto_rows:
        lines.extend([
            ",",
            "trip_pto_days(label, pto_date, amount, notes) as (",
            "  values",
            values_list(pto_rows),
            ")",
            "insert into personal_pto_days (",
            "  id, trip_id, owner_id, owner_email, pto_date, amount, notes, access_level",
            ")",
            "select gen_random_uuid(), target_trips.id, owner_info.owner_id, owner_info.owner_email,",
            "  trip_pto_days.pto_date, trip_pto_days.amount, trip_pto_days.notes, 'owner'",
            "from trip_pto_days",
            "join target_trips using (label)",
            "cross join owner_info",
            "where not exists (",
            "  select 1 from personal_pto_days existing",
            "  where existing.trip_id = target_trips.id",
            "    and existing.pto_date = trip_pto_days.pto_date",
            ");",
        ])
    else:
        lines.extend([
            "select",
            "  (select count(*) from inserted_trips) as trips_inserted,",
            "  (select count(*) from inserted_places) as places_inserted;",
        ])

    return "\n".join(lines)


def main():
    if len(sys.argv) != 2:
        fail("Usage: python generate_personal_trip_sql.py <trip-import.json>")
    payload = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    print(build_sql(normalize(payload)))


if __name__ == "__main__":
    main()
