import { localDateString } from "./date-utils.js";

export function addDays(dateValue, offset) {
  const date = new Date(`${dateValue}T12:00:00`);
  date.setDate(date.getDate() + offset);
  return localDateString(date);
}

export function eachDate(startDate, endDate) {
  const dates = [];
  for (let date = startDate; date <= endDate; date = addDays(date, 1)) {
    dates.push(date);
  }
  return dates;
}

function dateForYearMonthDay(year, month, day) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function nthWeekdayOfMonth(year, month, weekday, occurrence) {
  const date = new Date(year, month - 1, 1, 12);
  const offset = (weekday - date.getDay() + 7) % 7;
  date.setDate(1 + offset + (occurrence - 1) * 7);
  return localDateString(date);
}

function lastWeekdayOfMonth(year, month, weekday) {
  const date = new Date(year, month, 0, 12);
  const offset = (date.getDay() - weekday + 7) % 7;
  date.setDate(date.getDate() - offset);
  return localDateString(date);
}

function observedFixedHoliday(year, month, day) {
  const actual = new Date(year, month - 1, day, 12);
  if (actual.getDay() === 0) return localDateString(new Date(year, month - 1, day + 1, 12));
  if (actual.getDay() === 6) return localDateString(new Date(year, month - 1, day - 1, 12));
  return localDateString(actual);
}

function federalHolidaysForYear(year) {
  const holidays = new Map();
  const addHoliday = (date, name) => holidays.set(date, name);
  const addFixedHoliday = (month, day, name) => {
    addHoliday(dateForYearMonthDay(year, month, day), name);
    const observed = observedFixedHoliday(year, month, day);
    if (observed !== dateForYearMonthDay(year, month, day)) {
      addHoliday(observed, `${name} observed`);
    }
  };

  addFixedHoliday(1, 1, "New Year's Day");
  addHoliday(lastWeekdayOfMonth(year, 5, 1), "Memorial Day");
  addFixedHoliday(6, 19, "Juneteenth");
  addFixedHoliday(7, 4, "July 4th");
  addHoliday(nthWeekdayOfMonth(year, 9, 1, 1), "Labor Day");
  addHoliday(nthWeekdayOfMonth(year, 11, 4, 4), "Thanksgiving");
  addFixedHoliday(12, 25, "Christmas");
  return holidays;
}

export function holidayForDate(dateValue) {
  const year = Number(dateValue.slice(0, 4));
  if (!year) return "";
  return federalHolidaysForYear(year).get(dateValue) || federalHolidaysForYear(year + 1).get(dateValue) || "";
}

export function ptoDayCount(ptoDay) {
  return holidayForDate(ptoDay.date) ? 0 : Number(ptoDay.amount || 0);
}

export function tripPtoStats(trip) {
  const ptoDays = trip.ptoDays || [];
  const holidays = ptoDays.filter((ptoDay) => holidayForDate(ptoDay.date));
  const requested = ptoDays.reduce((total, ptoDay) => total + Number(ptoDay.amount || 0), 0);
  const counted = ptoDays.reduce((total, ptoDay) => total + ptoDayCount(ptoDay), 0);
  return {
    requested,
    counted,
    holidays: holidays.length
  };
}

export function formatPtoAmount(amount) {
  const value = Number(amount || 0);
  return `${Number.isInteger(value) ? value : value.toFixed(1)} day${value === 1 ? "" : "s"}`;
}

export function ptoDaysForYear(personalTrips, year) {
  return personalTrips
    .flatMap((trip) => (trip.ptoDays || []).map((ptoDay) => ({ ...ptoDay, trip })))
    .filter((ptoDay) => ptoDay.date?.startsWith(`${year}-`))
    .sort((a, b) => a.date.localeCompare(b.date) || a.trip.label.localeCompare(b.trip.label));
}

export function ptoYearStats(personalTrips, year) {
  const ptoDays = ptoDaysForYear(personalTrips, year);
  const counted = ptoDays.reduce((total, ptoDay) => total + ptoDayCount(ptoDay), 0);
  const requested = ptoDays.reduce((total, ptoDay) => total + Number(ptoDay.amount || 0), 0);
  const holidays = ptoDays.filter((ptoDay) => holidayForDate(ptoDay.date));
  const halfDays = ptoDays.filter((ptoDay) => !holidayForDate(ptoDay.date) && Number(ptoDay.amount) === 0.5).length;
  const fullDays = ptoDays.filter((ptoDay) => !holidayForDate(ptoDay.date) && Number(ptoDay.amount) === 1).length;
  return {
    ptoDays,
    counted,
    requested,
    holidays,
    halfDays,
    fullDays
  };
}

export function tripYears(trip) {
  const years = new Set();
  eachDate(trip.startDate, trip.endDate).forEach((date) => years.add(date.slice(0, 4)));
  return [...years];
}

export function tripMonths(trip) {
  const months = new Set();
  eachDate(trip.startDate, trip.endDate).forEach((date) => months.add(date.slice(5, 7)));
  return [...months];
}

export function tripCountries(trip) {
  return [...new Set((trip.places || []).map((place) => place.country).filter(Boolean))];
}

export function tripHasSchengenImpact(trip, checkDate, schengenStatus) {
  const windowStart = addDays(checkDate, -180);
  return (trip.places || []).some((place) => {
    if (schengenStatus(place) !== true) return false;
    return eachDate(place.startDate, place.endDate).some((date) => date >= windowStart && date <= checkDate);
  });
}

export function schengenPlaceDays(place, schengenStatus, windowStart = "", windowEnd = "") {
  if (schengenStatus(place) !== true) return 0;
  return eachDate(place.startDate, place.endDate)
    .filter((date) => (!windowStart || date >= windowStart) && (!windowEnd || date <= windowEnd))
    .length;
}

function tripPlacesInSequence(trip) {
  return [...(trip.places || [])].sort((a, b) =>
    Number(a.sequence || 0) - Number(b.sequence || 0)
    || a.startDate.localeCompare(b.startDate)
    || a.endDate.localeCompare(b.endDate)
    || a.city.localeCompare(b.city)
  );
}

export function schengenTripSegmentDetails(trip, schengenStatus, windowStart = "", windowEnd = "") {
  const places = tripPlacesInSequence(trip);
  const countedDates = new Set();
  return places.map((place, index) => {
    const startDate = windowStart && place.startDate < windowStart ? windowStart : place.startDate;
    const endDate = windowEnd && place.endDate > windowEnd ? windowEnd : place.endDate;
    const dates = startDate <= endDate && schengenStatus(place) === true
      ? eachDate(place.startDate, place.endDate)
        .filter((date) => (!windowStart || date >= windowStart) && (!windowEnd || date <= windowEnd))
        .filter((date) => !countedDates.has(date))
      : [];
    dates.forEach((date) => countedDates.add(date));
    return {
      ...place,
      trip,
      startDate,
      endDate,
      days: dates.length
    };
  }).filter((place) => place.days > 0);
}

export function tripPlacesByDate(personalTrips) {
  const days = new Map();
  personalTrips.forEach((trip) => {
    trip.places.forEach((place) => {
      eachDate(place.startDate, place.endDate).forEach((date) => {
        if (!days.has(date)) days.set(date, []);
        days.get(date).push({ ...place, trip });
      });
    });
  });
  return days;
}

export function schengenDayDetails(personalTrips, schengenStatus) {
  const days = tripPlacesByDate(personalTrips);
  return [...days.entries()].map(([date, places]) => {
    const schengenPlaces = places.filter((place) => schengenStatus(place) === true);
    return {
      date,
      places,
      schengenPlaces,
      counts: schengenPlaces.length > 0
    };
  }).sort((a, b) => a.date.localeCompare(b.date));
}

export function schengenUsedOn(personalTrips, dateValue, schengenStatus) {
  const windowStart = addDays(dateValue, -180);
  return schengenDayDetails(personalTrips, schengenStatus)
    .filter((day) => day.counts && day.date >= windowStart && day.date <= dateValue)
    .length;
}

export function schengenWindowDetails(personalTrips, dateValue, schengenStatus) {
  const windowStart = addDays(dateValue, -180);
  const days = schengenDayDetails(personalTrips, schengenStatus)
    .filter((day) => day.counts && day.date >= windowStart && day.date <= dateValue);
  const segments = personalTrips
    .flatMap((trip) => schengenTripSegmentDetails(trip, schengenStatus, windowStart, dateValue))
    .filter((place) => place.days > 0)
    .sort((a, b) => a.startDate.localeCompare(b.startDate) || a.endDate.localeCompare(b.endDate) || a.trip.label.localeCompare(b.trip.label));
  return {
    windowStart,
    windowEnd: dateValue,
    days,
    segments,
    used: days.length
  };
}

export function schengenTripStats(personalTrips, trip, schengenStatus) {
  const dates = new Set();
  trip.places.forEach((place) => {
    if (schengenStatus(place) !== true) return;
    eachDate(place.startDate, place.endDate).forEach((date) => dates.add(date));
  });

  const sortedDates = [...dates].sort();
  const maxUsed = sortedDates.reduce((max, date) => Math.max(max, schengenUsedOn(personalTrips, date, schengenStatus)), 0);
  const firstSchengenDate = sortedDates[0] || "";
  const lastSchengenDate = sortedDates.at(-1) || "";
  return {
    daysAdded: sortedDates.length,
    entryUsed: firstSchengenDate ? schengenUsedOn(personalTrips, firstSchengenDate, schengenStatus) : 0,
    exitUsed: lastSchengenDate ? schengenUsedOn(personalTrips, lastSchengenDate, schengenStatus) : 0,
    entryDate: firstSchengenDate,
    exitDate: lastSchengenDate,
    maxUsed
  };
}
