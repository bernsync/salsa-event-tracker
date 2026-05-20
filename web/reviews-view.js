import { dateRange } from "./date-utils.js";
import { escapeHtml } from "./dom-utils.js";
import { eventLocation } from "./event-view-utils.js";
import { isHistorical } from "./event-date-utils.js";
import { scoreCategories, totalScore } from "./review-scoring.js";

export function createReviewsView({
  Api,
  state,
  elements,
  isSignedIn,
  currentUserId,
  loadSupabaseReviews,
  render,
  preserveScrollWhile,
  switchView,
  emptyState,
  cardCollapseButton,
  collapsibleCardBody
}) {
  function renderReviews() {
    elements.reviewList.innerHTML = "";
    if (!isSignedIn()) {
      return;
    }

    const reviews = [...state.reviews].sort((a, b) => b.reviewedAt.localeCompare(a.reviewedAt));

    if (!reviews.length) {
      elements.reviewList.append(emptyState("No reviews yet", "Your private reviews will show here once they are added to Supabase."));
      return;
    }

    reviews.forEach((review) => {
      const event = state.events.find((item) => item.id === review.eventId);
      const reviewDate = new Date(review.reviewedAt).toLocaleDateString();
      const collapseId = review.id;
      const card = document.createElement("article");
      card.className = "review-card";
      card.innerHTML = `
        <div class="event-card-header">
          <div>
            <h3>${escapeHtml(event?.name || "Deleted event")}</h3>
            <p class="muted">
              ${event ? `Edition: ${escapeHtml(dateRange(event))}${eventLocation(event) ? ` | ${escapeHtml(eventLocation(event))}` : ""}` : "Edition: deleted event"}
            </p>
            <p class="muted">Review date: ${escapeHtml(reviewDate)}</p>
          </div>
          <div class="card-header-actions">
            <span class="pill score-pill">${totalScore(review).toFixed(1)}</span>
            ${cardCollapseButton("reviews", collapseId)}
          </div>
        </div>
        ${collapsibleCardBody("reviews", collapseId, `
          ${review.topReason ? `<p><strong>Top reason:</strong> ${escapeHtml(review.topReason)}</p>` : ""}
          ${review.notes ? `<p class="muted">${escapeHtml(review.notes)}</p>` : ""}
          ${renderCategoryComments(review)}
        `)}
      `;
      elements.reviewList.append(card);
    });
  }

  function renderCategoryComments(review) {
    const comments = review.categoryComments || {};
    const rows = scoreCategories
      .map(([key, label]) => `
        <div class="review-comment">
          <div class="review-category-header">
            <strong>${escapeHtml(label)}</strong>
            <span class="review-score-badge">${escapeHtml(review.scores?.[key] ?? "")}/10</span>
          </div>
          ${comments[key] ? `<p>${escapeHtml(comments[key])}</p>` : ""}
        </div>
      `)
      .join("");

    return rows ? `<div class="review-comments">${rows}</div>` : "";
  }

  function buildScoreFields() {
    elements.scoreFields.replaceChildren();
    scoreCategories.forEach(([key, label]) => {
      const row = document.createElement("label");
      row.className = "score-row";

      const labelText = document.createElement("span");
      labelText.textContent = label;

      const value = document.createElement("span");
      value.className = "score-value";
      value.id = `${key}Value`;
      value.textContent = "5";

      const input = document.createElement("input");
      input.dataset.score = key;
      input.type = "range";
      input.min = "1";
      input.max = "10";
      input.value = "5";

      const textarea = document.createElement("textarea");
      textarea.dataset.comment = key;
      textarea.rows = 2;
      textarea.placeholder = `${label} comments`;

      row.append(labelText, value, input, textarea);
      elements.scoreFields.append(row);
    });
  }

  function setScoreFieldValues(scores) {
    document.querySelectorAll("[data-score]").forEach((input) => {
      const value = scores?.[input.dataset.score] || 5;
      input.value = value;
    });
    updateLiveScore();
  }

  function setCommentFieldValues(comments = {}) {
    document.querySelectorAll("[data-comment]").forEach((textarea) => {
      textarea.value = comments[textarea.dataset.comment] || "";
    });
  }

  function updateLiveScore() {
    const values = [...document.querySelectorAll("[data-score]")].map((input) => Number(input.value));
    const total = values.reduce((sum, value) => sum + value, 0) / values.length;
    elements.liveScore.textContent = total.toFixed(1);
    document.querySelectorAll("[data-score]").forEach((input) => {
      document.querySelector(`#${input.dataset.score}Value`).textContent = input.value;
    });
  }

  function openReviewDialog(eventId) {
    const event = state.events.find((item) => item.id === eventId);
    if (!event) return;
    if (!isHistorical(event)) {
      window.alert("Reviews can only be added after an event has happened. Upcoming editions show prior-edition reviews when available.");
      return;
    }
    elements.reviewEventName.textContent = event.name;
    elements.reviewEventId.value = event.id;
    elements.reviewId.value = "";
    elements.topReason.value = "";
    elements.reviewNotes.value = "";
    buildScoreFields();
    setScoreFieldValues();
    setCommentFieldValues();
    elements.saveReviewBtn.textContent = "Save review";
    elements.reviewDialog.showModal();
  }

  function openReviewEditor(reviewId) {
    const review = state.reviews.find((item) => item.id === reviewId);
    if (!review) return;
    const event = state.events.find((item) => item.id === review.eventId);
    elements.reviewEventName.textContent = event?.name || "Festival review";
    elements.reviewEventId.value = review.eventId;
    elements.reviewId.value = review.id;
    elements.topReason.value = review.topReason || "";
    elements.reviewNotes.value = review.notes || "";
    buildScoreFields();
    setScoreFieldValues(review.scores);
    setCommentFieldValues(review.categoryComments);
    elements.saveReviewBtn.textContent = "Update review";
    elements.reviewDialog.showModal();
  }

  function reviewPayloadFromForm(scores, categoryComments, existing = null) {
    return {
      ...(existing ? {} : { id: crypto.randomUUID() }),
      user_id: currentUserId(),
      event_edition_id: elements.reviewEventId.value,
      reviewed_at: existing?.reviewedAt || new Date().toISOString(),
      music_score: scores.music,
      dancing_level_score: scores.dancingLevel,
      stage_impact_score: scores.stageImpact,
      floor_score: scores.floor,
      vibe_score: scores.vibe,
      event_cost_score: scores.eventCost,
      services_score: scores.servicesProvided,
      event_hours_score: scores.eventHours,
      host_city_score: scores.hostCity,
      event_size_score: scores.eventSize,
      travel_score: scores.travelToEvent,
      music_comment: categoryComments.music || "",
      dancing_level_comment: categoryComments.dancingLevel || "",
      stage_impact_comment: categoryComments.stageImpact || "",
      floor_comment: categoryComments.floor || "",
      vibe_comment: categoryComments.vibe || "",
      event_cost_comment: categoryComments.eventCost || "",
      services_comment: categoryComments.servicesProvided || "",
      event_hours_comment: categoryComments.eventHours || "",
      host_city_comment: categoryComments.hostCity || "",
      event_size_comment: categoryComments.eventSize || "",
      travel_comment: categoryComments.travelToEvent || "",
      top_reason: elements.topReason.value.trim(),
      notes: elements.reviewNotes.value.trim(),
      visibility: "owner"
    };
  }

  async function saveReview() {
    if (!isSignedIn()) return;
    const scores = {};
    document.querySelectorAll("[data-score]").forEach((input) => {
      scores[input.dataset.score] = Number(input.value);
    });
    const categoryComments = {};
    document.querySelectorAll("[data-comment]").forEach((textarea) => {
      const value = textarea.value.trim();
      if (value) {
        categoryComments[textarea.dataset.comment] = value;
      }
    });

    const reviewId = elements.reviewId.value;
    const existing = state.reviews.find((review) => review.id === reviewId);
    const payload = reviewPayloadFromForm(scores, categoryComments, existing);
    try {
      if (existing) {
        await Api.updateReview(reviewId, payload);
      } else {
        await Api.createReview(payload);
      }
      state.reviews = await loadSupabaseReviews();
      elements.reviewDialog.close();
      preserveScrollWhile(render);
      switchView("reviews");
    } catch (error) {
      window.alert(error.message);
    }
  }

  async function deleteReview(reviewId) {
    if (!isSignedIn()) return;
    const review = state.reviews.find((item) => item.id === reviewId);
    if (!review) return;
    const event = state.events.find((item) => item.id === review.eventId);
    const confirmed = window.confirm(`Delete review for ${event?.name || "this event"}?`);
    if (!confirmed) return;
    try {
      await Api.deleteReview(reviewId);
      state.reviews = await loadSupabaseReviews();
      preserveScrollWhile(render);
    } catch (error) {
      window.alert(error.message);
    }
  }

  function bindEvents() {
    elements.saveReviewBtn?.addEventListener("click", saveReview);
    elements.scoreFields?.addEventListener("input", updateLiveScore);
  }

  return {
    bindEvents,
    renderReviews,
    openReviewDialog,
    openReviewEditor,
    deleteReview
  };
}
