import SwiftData
import SwiftUI

struct ReviewsView: View {
    @Query(sort: \FestivalReview.reviewedAt, order: .reverse) private var reviews: [FestivalReview]

    var body: some View {
        NavigationStack {
            List {
                if reviews.isEmpty {
                    ContentUnavailableView(
                        "No Reviews Yet",
                        systemImage: "star",
                        description: Text("Open an event and add your first festival review.")
                    )
                } else {
                    ForEach(reviews) { review in
                        VStack(alignment: .leading, spacing: 6) {
                            Text(review.festival?.name ?? "Festival Review")
                                .font(.headline)

                            HStack {
                                Label(String(format: "%.1f", review.totalScore), systemImage: "star.fill")
                                    .foregroundStyle(.yellow)

                                Spacer()

                                Text(review.reviewedAt.formatted(date: .abbreviated, time: .omitted))
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }

                            if !review.topReasonToAttend.isEmpty {
                                Text(review.topReasonToAttend)
                                    .font(.subheadline)
                                    .foregroundStyle(.secondary)
                            }
                        }
                        .padding(.vertical, 4)
                    }
                }
            }
            .navigationTitle("Reviews")
        }
    }
}
