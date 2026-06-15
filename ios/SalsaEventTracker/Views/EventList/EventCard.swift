// ios/SalsaEventTracker/Views/EventList/EventCard.swift
import SwiftUI

struct EventCard: View {
    let flat: FlatEvent
    @Environment(AppModel.self) private var model
    @State private var showDetail = false

    private var isAttending: Bool { model.isAttending(editionId: flat.edition.id) }
    private var isWatchlist: Bool { flat.event.watchlist == true && !isAttending }
    private var score: Double? { model.reviewScore(for: flat) }

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text(flat.event.name).font(.headline)
                Spacer()
                if flat.edition.isHistorical {
                    Text("Past").font(.caption).foregroundStyle(.secondary)
                        .padding(.horizontal, 6).padding(.vertical, 2)
                        .background(.secondary.opacity(0.15), in: Capsule())
                }
            }
            Text(DateUtils.displayDateRange(start: flat.edition.startDate, end: flat.edition.endDate))
                .font(.subheadline).foregroundStyle(.secondary)
            Text("\(flat.edition.city), \(flat.edition.country)")
                .font(.subheadline)
            if !flat.event.styles.isEmpty {
                Text(flat.event.styles.joined(separator: " · "))
                    .font(.caption).foregroundStyle(.secondary)
            }
            if isAttending || isWatchlist || score != nil {
                HStack(spacing: 6) {
                    if isAttending {
                        Text("Attending")
                            .font(.caption2).fontWeight(.semibold)
                            .foregroundStyle(.white)
                            .padding(.horizontal, 7).padding(.vertical, 3)
                            .background(Color.accentColor, in: Capsule())
                    }
                    if isWatchlist {
                        Text("Watchlist")
                            .font(.caption2).fontWeight(.semibold)
                            .foregroundStyle(.orange)
                            .padding(.horizontal, 7).padding(.vertical, 3)
                            .background(Color.orange.opacity(0.15), in: Capsule())
                    }
                    if let s = score {
                        Text(String(format: "%.1f★", s))
                            .font(.caption2).fontWeight(.semibold)
                            .foregroundStyle(.yellow)
                            .padding(.horizontal, 7).padding(.vertical, 3)
                            .background(Color.yellow.opacity(0.15), in: Capsule())
                    }
                }
            }
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(.background.secondary, in: RoundedRectangle(cornerRadius: 10))
        .overlay(
            RoundedRectangle(cornerRadius: 10)
                .strokeBorder(isAttending ? Color.accentColor.opacity(0.4) : .clear, lineWidth: 1.5)
        )
        .contentShape(Rectangle())
        .onTapGesture { showDetail = true }
        .sheet(isPresented: $showDetail) {
            EventDetailSheet(flat: flat)
        }
    }
}
