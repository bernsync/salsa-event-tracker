// ios/SalsaEventTracker/Views/Reviews/ReviewCard.swift
import SwiftUI

struct ReviewCard: View {
    let review: Review
    let eventName: String
    var onEdit: () -> Void
    var onDelete: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text(eventName).font(.headline)
                Spacer()
                Menu {
                    Button("Edit", action: onEdit)
                    Button("Delete", role: .destructive, action: onDelete)
                } label: { Image(systemName: "ellipsis.circle") }
            }
            HStack {
                Image(systemName: "star.fill").foregroundStyle(.yellow)
                Text(String(format: "%.1f", review.totalScore)).font(.subheadline.bold())
                Text("/ 10").font(.caption).foregroundStyle(.secondary)
            }
            if let reason = review.topReason { Text(reason).font(.caption).foregroundStyle(.secondary) }
            Text(DateUtils.displayDate(String(review.reviewedAt.prefix(10)))).font(.caption2).foregroundStyle(.tertiary)
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(.background.secondary, in: RoundedRectangle(cornerRadius: 10))
    }
}
