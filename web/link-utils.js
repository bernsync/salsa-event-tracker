import { escapeHtml } from "./dom-utils.js";

const allowedProtocols = new Set(["http:", "https:"]);

export function normalizeExternalUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const withProtocol = raw.startsWith("@")
    ? `https://instagram.com/${raw.slice(1)}`
    : raw;

  try {
    const url = new URL(withProtocol);
    if (!allowedProtocols.has(url.protocol)) return "";
    if (url.protocol === "http:") url.protocol = "https:";
    return url.href;
  } catch {
    return "";
  }
}

export function sourceLink(label, value) {
  const href = normalizeExternalUrl(value);
  if (!href) return "";
  return `<a href="${escapeHtml(href)}" target="_blank" rel="noreferrer">${escapeHtml(label)}</a>`;
}
