import { escapeHtml } from "./dom-utils.js";
import { parseAndValidateEventUpsertPayload } from "./upsert-payload.js";

const statusLabels = {
  loaded: "Loaded",
  error: "Error",
  "not-configured": "Not configured",
  "signed-out": "Signed out"
};

export function tableStatusItems(status = {}) {
  return Object.entries(status).map(([table, value]) => ({
    table,
    status: value.status,
    count: value.count || 0,
    label: statusLabels[value.status] || value.status
  }));
}

export function hasLoadWarnings(status = {}) {
  return tableStatusItems(status).some((item) => item.status === "error" || item.status === "not-configured");
}

export function auditReviewItems(summary) {
  if (Array.isArray(summary?.issues)) {
    return summary.issues.map((issue) => ({ ...issue, type: "quality" }));
  }
  const results = Array.isArray(summary?.results) ? summary.results : [];
  return results.filter((result) => {
    const proposedRows = Array.isArray(result.proposedSeedRows) ? result.proposedSeedRows : [];
    return proposedRows.length || !result.alreadyTracked;
  });
}

export function upsertPayloadFromAuditItem(item) {
  const rows = Array.isArray(item?.proposedSeedRows) ? item.proposedSeedRows : [];
  if (!rows.length) return "";
  const first = rows[0];
  return JSON.stringify({
    events: [
      {
        name: first.name || item.event?.name || "",
        editions: rows.map((row) => ({
          start_date: row.startDate || row.start_date || "",
          end_date: row.endDate || row.end_date || row.startDate || row.start_date || "",
          city: row.city || "",
          country: row.country || "",
          notes: "Candidate from weekly audit; verify official source before upsert."
        }))
      }
    ]
  }, null, 2);
}

export function renderAuditReviewMarkup(summary) {
  const items = auditReviewItems(summary);
  if (!summary) {
    return '<div class="empty-state"><strong>No audit loaded</strong><p>Paste the weekly audit JSON artifact to review candidate updates.</p></div>';
  }
  if (!items.length) {
    return '<div class="empty-state"><strong>No candidate updates</strong><p>The loaded audit has no next-edition candidates needing review.</p></div>';
  }

  return items.map((item, index) => {
    if (item.type === "quality") {
      const event = item.event || {};
      return `
        <article class="event-card audit-card">
          <div class="event-card-header">
            <div>
              <h3>${escapeHtml(event.name || "Unknown event")}</h3>
              <p class="muted">${escapeHtml([event.startDate, event.endDate].filter(Boolean).join(" to ") || "No dates")} ${[event.city, event.country].filter(Boolean).length ? `- ${escapeHtml([event.city, event.country].filter(Boolean).join(", "))}` : ""}</p>
            </div>
            <span class="pill warning-pill">Quality</span>
          </div>
          <div class="event-detail">
            <p><strong>Finding:</strong> ${escapeHtml(item.issue || "Review event details")}</p>
          </div>
        </article>
      `;
    }
    const event = item.event || {};
    const payload = upsertPayloadFromAuditItem(item);
    const validation = payload ? parseAndValidateEventUpsertPayload(payload) : { errors: ["No candidate payload available."] };
    return `
      <article class="event-card audit-card">
        <div class="event-card-header">
          <div>
            <h3>${escapeHtml(event.name || "Unknown event")}</h3>
            <p class="muted">${escapeHtml([event.startDate, event.endDate].filter(Boolean).join(" to ") || "No dates")} ${item.location ? `- ${escapeHtml(item.location)}` : ""}</p>
          </div>
          <span class="pill ${validation.errors.length ? "warning-pill" : "success-pill"}">${validation.errors.length ? "Review" : "Payload OK"}</span>
        </div>
        <div class="event-detail">
          ${item.futureDates?.length ? `<p><strong>Future date mentions:</strong> ${escapeHtml(item.futureDates.join(", "))}</p>` : ""}
          ${item.suggestedRanges?.length ? `<p><strong>Suggested ranges:</strong> ${escapeHtml(item.suggestedRanges.map((range) => `${range.startDate} to ${range.endDate}`).join(", "))}</p>` : ""}
          ${item.sources?.length ? `<p><strong>Sources:</strong> ${item.sources.map((source) => `<a href="${escapeHtml(source)}" target="_blank" rel="noreferrer">${escapeHtml(source)}</a>`).join(" ")}</p>` : ""}
          ${validation.errors.length ? `<p class="muted"><strong>Payload notes:</strong> ${escapeHtml(validation.errors.join(" "))}</p>` : ""}
          <textarea class="audit-payload" readonly aria-label="Candidate upsert payload ${index + 1}">${escapeHtml(payload || "No candidate payload generated.")}</textarea>
        </div>
      </article>
    `;
  }).join("");
}
