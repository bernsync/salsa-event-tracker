export function eventLocation(event) {
  return [event.city, event.country].filter(Boolean).join(", ");
}

export function eventPrice(event) {
  return [event.price, event.currency].filter(Boolean).join(" ");
}
