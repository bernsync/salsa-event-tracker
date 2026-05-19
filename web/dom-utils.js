export function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function setSelectOptions(select, options, selectedValue) {
  if (!select) return;
  const markup = options
    .map((option) => `<option value="${escapeHtml(option.value)}">${escapeHtml(option.label)}</option>`)
    .join("");
  if (select.innerHTML !== markup) {
    select.innerHTML = markup;
  }
  select.value = selectedValue;
}
