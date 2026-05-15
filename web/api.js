/**
 * API Module for Salsa Festivals Tracker
 * Handles all communication with Supabase
 */

export const Api = {
  async request(path, { method = "GET", body, requiresAuth = false } = {}) {
    const config = window.supabaseConfig;
    if (!config?.url || !config?.publishableKey) {
      throw new Error("Supabase is not configured.");
    }

    const headers = {
      apikey: config.publishableKey,
      "Content-Type": "application/json",
      Authorization: requiresAuth 
        ? `Bearer ${JSON.parse(localStorage.getItem("salsa-festivals-auth-session-v1"))?.accessToken}`
        : `Bearer ${config.publishableKey}`
    };

    const response = await fetch(`${config.url}/rest/v1/${path}`, {
      method,
      headers: {
        ...headers,
        Prefer: method === "POST" || method === "PATCH" ? "return=representation" : "return=minimal"
      },
      body: body ? JSON.stringify(body) : undefined
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Supabase returned ${response.status}${text ? `: ${text}` : ""}`);
    }
    return response.status === 204 ? null : response.json();
  },

  async signIn(email, password) {
    const config = window.supabaseConfig;
    const response = await fetch(`${config.url}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { apikey: config.publishableKey, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    if (!response.ok) {
      const payload = await response.json();
      throw new Error(payload.msg || payload.message || "Sign in failed");
    }

    const data = await response.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: Math.floor(Date.now() / 1000) + data.expires_in,
      tokenType: data.token_type
    };
  },

  async fetchPublicEvents() {
    const config = window.supabaseConfig;
    const endpoint = `events?select=*,event_editions(*)&visibility=eq.public&order=name.asc`;
    return this.request(endpoint);
  },

  async fetchSchengenCountries() {
    return this.request("schengen_countries?select=country_name,is_schengen");
  },

  async fetchPersonalTrips() {
    return this.request("personal_trips?select=*,personal_trip_places(*),personal_pto_days(*)&order=start_date.asc", { requiresAuth: true });
  },

  async fetchReviews() {
    return this.request("reviews?select=*&order=reviewed_at.desc", { requiresAuth: true });
  }
};

export function mapSupabaseEvents(rows, canonicalizer) {
  return rows.flatMap((event) => {
    const editions = Array.isArray(event.event_editions) ? event.event_editions : [];
    return editions
      .filter((edition) => edition.visibility === "public")
      .map((edition) => ({
        id: edition.id,
        name: canonicalizer(event.name, edition.start_date || ""),
        startDate: edition.start_date || "",
        endDate: edition.end_date || edition.start_date || "",
        city: edition.city || "",
        country: edition.country || "",
        venue: edition.venue || "",
        organizer: event.organizer || "",
        website: event.website || "",
        instagram: event.instagram || "",
        facebook: event.facebook || "",
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
        createdAt: edition.created_at || event.created_at,
        updatedAt: edition.updated_at || event.updated_at
      }));
  });
}