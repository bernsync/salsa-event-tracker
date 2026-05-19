import { normalizeText } from "./text-utils.js";

export function mapSupabaseEvents(rows) {
  return rows.flatMap((event) => {
    const editions = Array.isArray(event.event_editions) ? event.event_editions : [];
    return editions
      .filter((edition) => edition.visibility === "public")
      .map((edition) => ({
        id: edition.id,
        name: event.name || "",
        startDate: edition.start_date || "",
        endDate: edition.end_date || edition.start_date || "",
        city: edition.city || "",
        country: edition.country || "",
        venue: edition.venue || "",
        organizer: event.organizer || "",
        website: event.website || "",
        instagram: event.instagram || "",
        facebook: event.facebook || "",
        styles: event.styles || [],
        watchlist: Boolean(event.watchlist),
        tickets: edition.tickets || "",
        price: edition.price || "",
        currency: edition.currency || "",
        djs: edition.djs || "",
        artists: edition.artists || "",
        eventSize: edition.event_size || "",
        travel: edition.travel || "",
        addedOn: edition.added_on || "",
        notes: edition.notes || "",
        forceShowMonday: edition.force_show_monday || false,
        createdAt: edition.created_at || event.created_at || new Date().toISOString(),
        updatedAt: edition.updated_at || event.updated_at || edition.created_at || event.created_at || new Date().toISOString()
      }));
  });
}

export function mapSupabaseTrip(row) {
  const places = Array.isArray(row.personal_trip_places) ? row.personal_trip_places : [];
  const ptoDays = Array.isArray(row.personal_pto_days) ? row.personal_pto_days : [];
  return {
    id: row.id,
    ownerId: row.owner_id,
    label: row.label || "",
    startDate: row.start_date || "",
    endDate: row.end_date || row.start_date || "",
    notes: row.notes || "",
    createdAt: row.created_at || "",
    updatedAt: row.updated_at || "",
    places: deduplicateTripPlaces(places.map(mapSupabaseTripPlace))
      .sort((a, b) => a.sequence - b.sequence || a.startDate.localeCompare(b.startDate) || a.city.localeCompare(b.city)),
    ptoDays: ptoDays
      .map(mapSupabasePtoDay)
      .sort((a, b) => a.date.localeCompare(b.date))
  };
}

export function deduplicateTripPlaces(places) {
  const seen = new Set();
  return places.filter((place) => {
    const key = [
      place.tripId,
      place.eventId,
      place.startDate,
      place.endDate,
      normalizeText(place.city),
      normalizeText(place.country),
      normalizeText(place.role),
      normalizeText(place.notes)
    ].join("|");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function mapSupabaseTripPlace(row) {
  return {
    id: row.id,
    tripId: row.trip_id,
    eventId: row.event_edition_id || "",
    startDate: row.start_date || "",
    endDate: row.end_date || row.start_date || "",
    city: row.city || "",
    country: row.country || "",
    role: row.travel_role || "stay",
    sequence: Number(row.sequence || 0),
    notes: row.notes || ""
  };
}

export function mapSupabasePtoDay(row) {
  return {
    id: row.id,
    tripId: row.trip_id,
    date: row.pto_date || "",
    amount: Number(row.amount || 1),
    notes: row.notes || ""
  };
}

export function mapSupabaseReview(review) {
  return {
    id: review.id,
    eventId: review.event_edition_id,
    reviewedAt: review.reviewed_at || review.created_at || new Date().toISOString(),
    scores: {
      music: review.music_score,
      dancingLevel: review.dancing_level_score,
      stageImpact: review.stage_impact_score,
      floor: review.floor_score,
      vibe: review.vibe_score,
      eventCost: review.event_cost_score,
      servicesProvided: review.services_score,
      eventHours: review.event_hours_score,
      hostCity: review.host_city_score,
      eventSize: review.event_size_score,
      travelToEvent: review.travel_score
    },
    categoryComments: {
      music: review.music_comment,
      dancingLevel: review.dancing_level_comment,
      stageImpact: review.stage_impact_comment,
      floor: review.floor_comment,
      vibe: review.vibe_comment,
      eventCost: review.event_cost_comment,
      servicesProvided: review.services_comment,
      eventHours: review.event_hours_comment,
      hostCity: review.host_city_comment,
      eventSize: review.event_size_comment,
      travelToEvent: review.travel_comment
    },
    topReason: review.top_reason || "",
    notes: review.notes || "",
    isPublished: review.visibility === "public",
    sourceId: `supabase-${review.id}`
  };
}
