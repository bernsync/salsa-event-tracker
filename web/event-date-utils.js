import { localDateString } from "./date-utils.js";

export const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
];

export function eventYear(event) {
  return event.startDate.slice(0, 4);
}

export function eventMonthIndex(event) {
  return Number(event.startDate.slice(5, 7)) - 1;
}

export function eventMonthValue(event) {
  return event.startDate.slice(5, 7);
}

export function monthOptions(allLabel = "All months") {
  return [
    { value: "", label: allLabel },
    ...monthNames.map((name, index) => ({
      value: String(index + 1).padStart(2, "0"),
      label: name
    }))
  ];
}

export function calendarDisplayEndDate(event) {
  const end = new Date(`${event.endDate}T12:00:00`);
  const endsMonday = end.getDay() === 1;
  const keepsMonday = event.forceShowMonday === true;

  if (endsMonday && event.startDate !== event.endDate && !keepsMonday) {
    end.setDate(end.getDate() - 1);
    return localDateString(end);
  }

  return event.endDate;
}

export function eventOccursOnDate(event, dateValue) {
  return event.startDate <= dateValue && calendarDisplayEndDate(event) >= dateValue;
}

export function isHistorical(event, today = localDateString(new Date())) {
  return event.endDate < today;
}
