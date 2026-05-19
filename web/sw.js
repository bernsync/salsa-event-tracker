const CACHE = "salsa-festival-tracker-static-v2";
function scopePath() {
  try {
    return new URL(self.registration.scope).pathname.replace(/\/?$/, "/");
  } catch {
    return "/";
  }
}

function isUnderScope(url) {
  const p = url.pathname;
  const base = scopePath();
  return p === base.slice(0, -1) || p.startsWith(base);
}

function isStaticAsset(url) {
  return /\.(?:css|js|json|svg|webmanifest)$/i.test(url.pathname);
}

self.addEventListener("install", (event) => {
  const root = new URL("./", self.location);
  const urls = [
    new URL("./index.html", root),
    new URL("./styles.css", root),
    new URL("./app.js", root),
    new URL("./api.js", root),
    new URL("./audit-review.js", root),
    new URL("./auth-session.js", root),
    new URL("./date-utils.js", root),
    new URL("./dom-utils.js", root),
    new URL("./event-metadata.js", root),
    new URL("./event-view-utils.js", root),
    new URL("./link-utils.js", root),
    new URL("./supabase-mappers.js", root),
    new URL("./text-utils.js", root),
    new URL("./trip-calculations.js", root),
    new URL("./trip-api.js", root),
    new URL("./upsert-payload.js", root),
    new URL("./manifest.json", root),
    new URL("./icons/app-icon.svg", root)
  ].map((u) => u.href);

  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => Promise.all(urls.map((href) => cache.add(href).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || !isUnderScope(url)) return;

  if (event.request.mode === "navigate") {
    const fallback = new URL("./index.html", self.location).href;
    event.respondWith(
      fetch(event.request).catch(() => caches.match(fallback).then((r) => r || fetch(fallback)))
    );
    return;
  }

  if (!isStaticAsset(url)) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
