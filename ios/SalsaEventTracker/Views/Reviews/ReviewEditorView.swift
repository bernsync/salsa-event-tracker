// ios/SalsaEventTracker/Views/Reviews/ReviewEditorView.swift
import SwiftUI

struct ReviewEditorView: View {
    let review: Review?
    let edition: EventEdition
    let eventName: String
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss

    @State private var scores: [ReviewCategory: Int] = {
        Dictionary(uniqueKeysWithValues: ReviewCategory.allCases.map { ($0, 5) })
    }()
    @State private var comments: [ReviewCategory: String] = {
        Dictionary(uniqueKeysWithValues: ReviewCategory.allCases.map { ($0, "") })
    }()
    @State private var topReason = ""
    @State private var notes = ""
    @State private var isSaving = false
    @State private var saveError: String?

    var body: some View {
        NavigationStack {
            Form {
                Section("Event") {
                    LabeledContent("Festival", value: eventName)
                    LabeledContent("Edition", value: DateUtils.displayDateRange(start: edition.startDate, end: edition.endDate))
                }
                ForEach(ReviewCategory.allCases, id: \.self) { cat in
                    Section(cat.rawValue) {
                        HStack {
                            Text("\(scores[cat, default: 5])")
                                .font(.headline).frame(width: 24)
                            Slider(value: Binding(
                                get: { Double(scores[cat, default: 5]) },
                                set: { scores[cat] = Int($0) }
                            ), in: 1...10, step: 1)
                        }
                        TextField("Comment (optional)", text: Binding(
                            get: { comments[cat, default: ""] },
                            set: { comments[cat] = $0 }
                        ), axis: .vertical).lineLimit(2, reservesSpace: true)
                    }
                }
                Section("Summary") {
                    TextField("Top Reason", text: $topReason)
                    TextField("Overall Notes", text: $notes, axis: .vertical).lineLimit(3, reservesSpace: true)
                }
                if let err = saveError { Section { Text(err).foregroundStyle(.red) } }
            }
            .navigationTitle(review == nil ? "Write Review" : "Edit Review")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button(isSaving ? "Saving…" : "Save") { Task { await save() } }.disabled(isSaving)
                }
            }
        }
        .onAppear { populateFromReview() }
    }

    private func populateFromReview() {
        guard let r = review else { return }
        scores = [
            .music: r.musicScore, .dancingLevel: r.dancingLevelScore, .stageImpact: r.stageImpactScore,
            .floor: r.floorScore, .vibe: r.vibeScore, .eventCost: r.eventCostScore,
            .services: r.servicesScore, .eventHours: r.eventHoursScore,
            .hostCity: r.hostCityScore, .eventSize: r.eventSizeScore, .travel: r.travelScore
        ]
        comments = [
            .music: r.musicComment ?? "", .dancingLevel: r.dancingLevelComment ?? "",
            .stageImpact: r.stageImpactComment ?? "", .floor: r.floorComment ?? "",
            .vibe: r.vibeComment ?? "", .eventCost: r.eventCostComment ?? "",
            .services: r.servicesComment ?? "", .eventHours: r.eventHoursComment ?? "",
            .hostCity: r.hostCityComment ?? "", .eventSize: r.eventSizeComment ?? "",
            .travel: r.travelComment ?? ""
        ]
        topReason = r.topReason ?? ""
        notes = r.notes ?? ""
    }

    private func save() async {
        guard let token = model.authService.session?.accessToken,
              let userId = model.authService.session?.userId else { return }
        isSaving = true; saveError = nil
        let body: [String: Any] = [
            "user_id": userId, "event_edition_id": edition.id,
            "reviewed_at": ISO8601DateFormatter().string(from: Date()),
            "music_score": scores[.music, default: 5],
            "dancing_level_score": scores[.dancingLevel, default: 5],
            "stage_impact_score": scores[.stageImpact, default: 5],
            "floor_score": scores[.floor, default: 5],
            "vibe_score": scores[.vibe, default: 5],
            "event_cost_score": scores[.eventCost, default: 5],
            "services_score": scores[.services, default: 5],
            "event_hours_score": scores[.eventHours, default: 5],
            "host_city_score": scores[.hostCity, default: 5],
            "event_size_score": scores[.eventSize, default: 5],
            "travel_score": scores[.travel, default: 5],
            "music_comment": comments[.music] ?? "",
            "dancing_level_comment": comments[.dancingLevel] ?? "",
            "stage_impact_comment": comments[.stageImpact] ?? "",
            "floor_comment": comments[.floor] ?? "",
            "vibe_comment": comments[.vibe] ?? "",
            "event_cost_comment": comments[.eventCost] ?? "",
            "services_comment": comments[.services] ?? "",
            "event_hours_comment": comments[.eventHours] ?? "",
            "host_city_comment": comments[.hostCity] ?? "",
            "event_size_comment": comments[.eventSize] ?? "",
            "travel_comment": comments[.travel] ?? "",
            "top_reason": topReason, "notes": notes, "visibility": "owner"
        ]
        do {
            let svc = SupabaseService()
            if let existing = review {
                try await svc.updateReview(id: existing.id, body: body, token: token)
            } else {
                _ = try await svc.createReview(body, token: token)
            }
            await model.loadPrivateData()
            dismiss()
        } catch { saveError = error.localizedDescription }
        isSaving = false
    }
}
