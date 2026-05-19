export function buildTripSavePayload({ tripId = "", label, startDate, endDate, notes = "", places = [], ptoDays = [], ownerId = "", ownerEmail = "", uuid = crypto.randomUUID } = {}) {
  const normalizedStart = startDate;
  const normalizedEnd = endDate < normalizedStart ? normalizedStart : endDate;
  const tripRow = {
    label: String(label || "").trim(),
    start_date: normalizedStart,
    end_date: normalizedEnd,
    notes: String(notes || "").trim(),
    access_level: "owner"
  };
  const savedTripId = tripId || uuid();

  return {
    tripId,
    savedTripId,
    tripRow: tripId ? tripRow : { id: savedTripId, owner_id: ownerId, owner_email: ownerEmail, ...tripRow },
    placeRows: places.map((place) => ({
      id: uuid(),
      trip_id: savedTripId,
      owner_id: ownerId,
      owner_email: ownerEmail,
      event_edition_id: place.eventId || null,
      start_date: place.startDate,
      end_date: place.endDate,
      city: place.city,
      country: place.country,
      travel_role: place.role,
      sequence: place.sequence,
      notes: place.notes,
      access_level: "owner"
    })),
    ptoRows: ptoDays.map((ptoDay) => ({
      id: uuid(),
      trip_id: savedTripId,
      owner_id: ownerId,
      owner_email: ownerEmail,
      pto_date: ptoDay.date,
      amount: ptoDay.amount,
      notes: ptoDay.notes,
      access_level: "owner"
    }))
  };
}

export async function savePersonalTrip(Api, payload) {
  let savedTrip;
  if (payload.tripId) {
    [savedTrip] = await Api.request(`personal_trips?id=eq.${payload.tripId}`, {
      method: "PATCH",
      body: payload.tripRow,
      requiresAuth: true
    });
    await Api.request(`personal_trip_places?trip_id=eq.${payload.tripId}`, {
      method: "DELETE",
      requiresAuth: true
    });
    await Api.request(`personal_pto_days?trip_id=eq.${payload.tripId}`, {
      method: "DELETE",
      requiresAuth: true
    });
  } else {
    [savedTrip] = await Api.request("personal_trips", {
      method: "POST",
      body: payload.tripRow,
      requiresAuth: true
    });
  }

  const tripId = savedTrip?.id || payload.savedTripId;
  const placeRows = payload.placeRows.map((row) => ({ ...row, trip_id: tripId }));
  const ptoRows = payload.ptoRows.map((row) => ({ ...row, trip_id: tripId }));

  await Api.request("personal_trip_places", {
    method: "POST",
    body: placeRows,
    requiresAuth: true
  });

  if (ptoRows.length) {
    await Api.request("personal_pto_days", {
      method: "POST",
      body: ptoRows,
      requiresAuth: true
    });
  }

  return savedTrip;
}

export async function deletePersonalTrip(Api, tripId) {
  return Api.request(`personal_trips?id=eq.${tripId}`, {
    method: "DELETE",
    requiresAuth: true
  });
}
