import { mapSupabaseEvents } from "./supabase-mappers.js";
import { authSessionFromStorage } from "./auth-session.js";

export const Api = {
  async request(path, { method = "GET", body, requiresAuth = false } = {}) {
    const config = window.supabaseConfig;
    if (!config?.url || !config?.publishableKey) {
      throw new Error("Supabase is not configured.");
    }

    const session = requiresAuth ? authSessionFromStorage() : null;
    const headers = {
      apikey: config.publishableKey,
      "Content-Type": "application/json",
      Authorization: requiresAuth 
        ? `Bearer ${session?.accessToken || ""}`
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

  async fetchDanceStyles() {
    return this.request("dance_styles?select=name,slug,is_active,sort_order&is_active=eq.true&order=sort_order.asc,name.asc");
  },

  async fetchPersonalTrips() {
    return this.request("personal_trips?select=*,personal_trip_places(*),personal_pto_days(*)&order=start_date.asc", { requiresAuth: true });
  },

  async deletePersonalTrip(tripId) {
    return this.request(`personal_trips?id=eq.${tripId}`, {
      method: "DELETE",
      requiresAuth: true
    });
  },

  async fetchReviews() {
    return this.request("reviews?select=*&order=reviewed_at.desc", { requiresAuth: true });
  },

  async createReview(review) {
    return this.request("reviews", {
      method: "POST",
      body: review,
      requiresAuth: true
    });
  },

  async updateReview(reviewId, review) {
    return this.request(`reviews?id=eq.${reviewId}`, {
      method: "PATCH",
      body: review,
      requiresAuth: true
    });
  },

  async deleteReview(reviewId) {
    return this.request(`reviews?id=eq.${reviewId}`, {
      method: "DELETE",
      requiresAuth: true
    });
  }
};

export { mapSupabaseEvents };
