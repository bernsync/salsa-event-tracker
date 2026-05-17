export const danceStyles = ["Salsa", "Bachata", "Kizomba", "Zouk"];

export function normalizeEventText(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

export function normalizeDanceStyles(value) {
  const raw = Array.isArray(value)
    ? value
    : String(value || "")
      .split(/[,\|/]+/)
      .map((item) => item.trim())
      .filter(Boolean);
  const normalized = new Set(raw.map((item) => normalizeEventText(item)));
  return danceStyles.filter((style) => normalized.has(normalizeEventText(style)));
}

export function eventStyles(event) {
  return normalizeDanceStyles(event?.styles || "");
}

export function formatStyles(event) {
  return eventStyles(event).join(", ");
}

export function isWatchlistEvent(event) {
  return event?.watchlist === true;
}

export function watchlistLabel(event) {
  return isWatchlistEvent(event) ? "Watchlist" : "";
}

export function formatEventSize(value) {
  const size = normalizeEventText(value);
  if (!size) return "";
  const labels = {
    small: "Small (under 200)",
    medium: "Medium (200-500)",
    large: "Large (500-999)",
    "extra large": "Extra large (1000+)",
    xl: "Extra large (1000+)"
  };
  return labels[size] || value;
}

export function cleanTripLabel(label) {
  return String(label || "").replace(/^trip\s+\d+\s*:\s*/i, "").trim();
}

export function isImportProvenanceNote(note) {
  return normalizeEventText(note).startsWith("imported from 2025-2026 trip spreadsheet screenshot");
}
