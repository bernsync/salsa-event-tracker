import { isHistorical } from "./event-date-utils.js";

export const scoreCategories = [
  ["music", "Music"],
  ["dancingLevel", "Dancing Level"],
  ["stageImpact", "Stage Impact"],
  ["floor", "Floor"],
  ["vibe", "Vibe"],
  ["eventCost", "Event Cost"],
  ["servicesProvided", "Services Provided"],
  ["eventHours", "Event Hours"],
  ["hostCity", "Host City"],
  ["eventSize", "Event Size"],
  ["travelToEvent", "Travel to Event"]
];

export function totalScore(review) {
  const sum = scoreCategories.reduce((total, [key]) => total + Number(review.scores?.[key] || 0), 0);
  return sum / scoreCategories.length;
}

export function latestScoreForEvent(eventId, reviews) {
  const eventReviews = reviews
    .filter((review) => review.eventId === eventId)
    .sort((a, b) => b.reviewedAt.localeCompare(a.reviewedAt));
  return eventReviews.length ? totalScore(eventReviews[0]) : null;
}

export function reviewScoreForEvent(event, { events, reviews, eventFamilyKey, isHistoricalEvent = isHistorical }) {
  const relevantReviews = isHistoricalEvent(event)
    ? reviews.filter((review) => review.eventId === event.id)
    : reviews.filter((review) => {
      const reviewedEvent = events.find((item) => item.id === review.eventId);
      return reviewedEvent
        && eventFamilyKey(reviewedEvent) === eventFamilyKey(event)
        && reviewedEvent.endDate < event.startDate;
    });

  if (!relevantReviews.length) return null;

  return {
    average: relevantReviews.reduce((sum, review) => sum + totalScore(review), 0) / relevantReviews.length,
    count: relevantReviews.length,
    isPrior: !isHistoricalEvent(event)
  };
}
