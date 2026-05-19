export function localDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatDate(value) {
  if (!value) return "";
  const date = new Date(`${value}T12:00:00`);
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

export function dateRange(item) {
  if (item.startDate === item.endDate) return formatDate(item.startDate);
  return `${formatDate(item.startDate)} - ${formatDate(item.endDate)}`;
}

export function monthOverlaps(item, month) {
  const start = item.startDate.slice(0, 7);
  const end = item.endDate.slice(0, 7);
  return start <= month && end >= month;
}
