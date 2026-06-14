// ios/SalsaEventTracker/Views/Reviews/ReviewsView.swift
import SwiftUI

struct ReviewsView: View {
    @Environment(AppModel.self) private var model
    @State private var showPicker = false
    @State private var editingReview: Review?
    @State private var selectedEdition: EventEdition?
    @State private var selectedEventName = ""

    private func eventName(for review: Review) -> String {
        model.flatEvents.first(where: { $0.id == review.eventEditionId })?.event.name ?? "Unknown Event"
    }

    private func edition(for review: Review) -> EventEdition? {
        model.flatEvents.first(where: { $0.id == review.eventEditionId })?.edition
    }

    var body: some View {
        NavigationStack {
            if !model.isSignedIn {
                ContentUnavailableView("Sign In Required",
                    systemImage: "lock.fill",
                    description: Text("Sign in to view and write reviews."))
            } else {
                List {
                    ForEach(model.reviews.sorted { $0.reviewedAt > $1.reviewedAt }) { review in
                        ReviewCard(
                            review: review,
                            eventName: eventName(for: review),
                            onEdit: {
                                editingReview = review
                                selectedEdition = edition(for: review)
                                selectedEventName = eventName(for: review)
                            },
                            onDelete: { Task { await deleteReview(review) } }
                        )
                        .listRowInsets(.init(top: 6, leading: 16, bottom: 6, trailing: 16))
                        .listRowBackground(Color.clear)
                        .listRowSeparator(.hidden)
                    }
                }
                .listStyle(.plain)
                .navigationTitle("Reviews")
                .toolbar {
                    ToolbarItem(placement: .topBarTrailing) {
                        Button { showPicker = true } label: { Image(systemName: "plus") }
                    }
                }
                .sheet(item: $selectedEdition) { ed in
                    ReviewEditorView(review: editingReview, edition: ed, eventName: selectedEventName)
                        .onDisappear { editingReview = nil }
                }
                .sheet(isPresented: $showPicker) {
                    EventPickerSheet { flat in
                        selectedEdition = flat.edition
                        selectedEventName = flat.event.name
                        editingReview = nil
                        showPicker = false
                    }
                }
                .task { await model.loadPrivateData() }
            }
        }
    }

    private func deleteReview(_ review: Review) async {
        guard let token = model.authService.session?.accessToken else { return }
        try? await SupabaseService().deleteReview(id: review.id, token: token)
        await model.loadPrivateData()
    }
}

struct EventPickerSheet: View {
    let onSelect: (FlatEvent) -> Void
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    @State private var query = ""

    private var pastEvents: [FlatEvent] {
        model.flatEvents
            .filter { $0.edition.isHistorical }
            .filter { TextUtils.matches(event: $0.event, edition: $0.edition, query: query) }
            .sorted { $0.edition.startDate > $1.edition.startDate }
    }

    var body: some View {
        NavigationStack {
            List(pastEvents) { flat in
                Button {
                    onSelect(flat)
                } label: {
                    VStack(alignment: .leading) {
                        Text(flat.event.name).font(.headline).foregroundStyle(.primary)
                        Text(DateUtils.displayDateRange(start: flat.edition.startDate, end: flat.edition.endDate))
                            .font(.caption).foregroundStyle(.secondary)
                        Text("\(flat.edition.city), \(flat.edition.country)")
                            .font(.caption2).foregroundStyle(.secondary)
                    }
                }
            }
            .searchable(text: $query, prompt: "Search past events…")
            .navigationTitle("Choose Event")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
            }
        }
    }
}
