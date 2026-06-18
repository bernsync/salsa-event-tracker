// ios/SalsaEventTracker/Views/Reviews/ReviewsView.swift
import SwiftUI

struct ReviewsView: View {
    @Environment(AppModel.self) private var model

    private func eventName(for review: Review) -> String {
        model.flatEvents.first(where: { $0.id == review.eventEditionId })?.event.name ?? "Unknown Event"
    }

    var body: some View {
        NavigationStack {
            if !model.isSignedIn {
                ContentUnavailableView {
                    Label("Sign In Required", systemImage: "lock.fill")
                } description: {
                    Text("Sign in to view your reviews.")
                } actions: {
                    Button("Sign In") { model.showLogin = true }
                        .buttonStyle(.borderedProminent)
                }
            } else {
                List {
                    ForEach(model.reviews.sorted { ($0.reviewedAt ?? "") > ($1.reviewedAt ?? "") }) { review in
                        ReviewCard(
                            review: review,
                            eventName: eventName(for: review)
                        )
                        .listRowInsets(.init(top: 6, leading: 16, bottom: 6, trailing: 16))
                        .listRowBackground(Color.clear)
                        .listRowSeparator(.hidden)
                    }
                }
                .listStyle(.plain)
                .refreshable { await model.loadPrivateData() }
                .navigationTitle("Reviews")
                .toolbar {
                    ToolbarItem(placement: .topBarLeading) {
                        Button("Sign Out", role: .destructive) { model.signOut() }
                            .font(.subheadline)
                    }
                }
                .task { await model.loadPrivateData() }
            }
        }
    }
}
