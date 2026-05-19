import test from "node:test";
import assert from "node:assert/strict";
import {
  authSessionFromStorage,
  authSessionFromUrlHash,
  authStorageKey,
  currentUserEmail,
  currentUserId,
  saveAuthSession
} from "../web/auth-session.js";

function storageMock() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) || null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key)
  };
}

function jwt(payload) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `header.${encoded}.signature`;
}

test("authSessionFromUrlHash normalizes Supabase hash tokens", () => {
  const session = authSessionFromUrlHash("#access_token=abc&refresh_token=def&expires_at=1770000000&token_type=bearer");
  assert.equal(session.accessToken, "abc");
  assert.equal(session.refreshToken, "def");
  assert.equal(session.expiresAt, 1770000000);
});

test("auth session storage drops expired sessions", () => {
  const storage = storageMock();
  saveAuthSession({ accessToken: "abc", expiresAt: 10 }, storage);
  assert.equal(authSessionFromStorage(storage, 20_000), null);
  assert.equal(storage.getItem(authStorageKey), null);
});

test("current user helpers decode JWT payloads", () => {
  const session = { accessToken: jwt({ sub: "user-1", email: "noam@example.com" }) };
  const decoder = (value) => Buffer.from(value, "base64").toString("utf8");
  assert.equal(currentUserId(session, decoder), "user-1");
  assert.equal(currentUserEmail(session, decoder), "noam@example.com");
});
