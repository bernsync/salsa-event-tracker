export const authStorageKey = "salsa-festivals-auth-session-v1";

function decodeJwtPayload(accessToken, decoder = globalThis.atob) {
  if (!accessToken || typeof decoder !== "function") return {};
  try {
    const [, payload = ""] = accessToken.split(".");
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(payload.length / 4) * 4, "=");
    return JSON.parse(decoder(normalized));
  } catch {
    return {};
  }
}

export function normalizeAuthSession(payload, now = Date.now()) {
  if (!payload) return null;
  return {
    accessToken: payload.accessToken || payload.access_token || "",
    refreshToken: payload.refreshToken || payload.refresh_token || "",
    expiresAt: Number(payload.expiresAt || payload.expires_at || Math.floor(now / 1000) + (payload.expires_in || 3600)),
    tokenType: payload.tokenType || payload.token_type || "bearer"
  };
}

export function authSessionFromUrlHash(hash = globalThis.location?.hash || "") {
  const params = new URLSearchParams(String(hash).replace(/^#/, ""));
  const accessToken = params.get("access_token");
  if (!accessToken) return null;
  return normalizeAuthSession({
    access_token: accessToken,
    refresh_token: params.get("refresh_token") || "",
    expires_at: Number(params.get("expires_at") || 0),
    token_type: params.get("token_type") || "bearer"
  });
}

export function authSessionFromStorage(storage = globalThis.localStorage, now = Date.now()) {
  try {
    const saved = normalizeAuthSession(JSON.parse(storage.getItem(authStorageKey) || "null"), now);
    if (saved?.accessToken && (!saved.expiresAt || saved.expiresAt * 1000 > now)) return saved;
  } catch {
    // Ignore malformed local auth state.
  }
  storage?.removeItem?.(authStorageKey);
  return null;
}

export function saveAuthSession(session, storage = globalThis.localStorage) {
  storage?.setItem?.(authStorageKey, JSON.stringify(normalizeAuthSession(session)));
}

export function clearAuthSession(storage = globalThis.localStorage) {
  storage?.removeItem?.(authStorageKey);
}

export function currentUserId(session, decoder) {
  return decodeJwtPayload(session?.accessToken, decoder).sub || "";
}

export function currentUserEmail(session, decoder) {
  return decodeJwtPayload(session?.accessToken, decoder).email || "";
}
