export function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export function compactText(value) {
  return normalizeText(value).replace(/[^a-z0-9]+/g, "");
}
