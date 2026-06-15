// ios/SalsaEventTracker/Views/FestivalList/FestivalRow.swift
import SwiftUI

struct FestivalRow: View {
    let event: Event
    @Environment(AppModel.self) private var model
    @State private var showDetail = false

    private var sortedEditions: [EventEdition] {
        event.editions.sorted { $0.startDate > $1.startDate }
    }

    private var latestEdition: EventEdition? { sortedEditions.first }

    private var nextEdition: EventEdition? {
        event.editions
            .filter { !$0.isHistorical }
            .sorted { $0.startDate < $1.startDate }
            .first
    }

    // Show current year + up to 2 prior years, matching web "edition history blocks"
    private var historyEditions: [EventEdition] {
        let anchor = nextEdition ?? latestEdition
        guard let anchor else { return [] }
        let startYear = Int(anchor.startDate.prefix(4)) ?? 0
        let years = [startYear, startYear - 1, startYear - 2]
        return years.compactMap { year in
            event.editions
                .filter { Int($0.startDate.prefix(4)) == year }
                .sorted { $0.startDate > $1.startDate }
                .first
        }
    }

    private var isAttending: Bool {
        event.editions.contains { model.isAttending(editionId: $0.id) }
    }

    private var isWatchlist: Bool { event.watchlist == true && !isAttending }

    var body: some View {
        Button { showDetail = true } label: {
            VStack(alignment: .leading, spacing: 6) {
                HStack {
                    Text(event.name).font(.headline).foregroundStyle(.primary)
                    Spacer()
                    if isAttending || isWatchlist {
                        HStack(spacing: 4) {
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
                        }
                    }
                }
                if let ed = latestEdition {
                    Text("\(ed.city), \(ed.country)")
                        .font(.subheadline).foregroundStyle(.secondary)
                }
                if !event.styles.isEmpty {
                    Text(event.styles.joined(separator: " · "))
                        .font(.caption2).foregroundStyle(.secondary)
                }
                // Edition history blocks (current + 2 prior years)
                if !historyEditions.isEmpty {
                    VStack(alignment: .leading, spacing: 4) {
                        ForEach(historyEditions, id: \.id) { ed in
                            EditionHistoryBlock(edition: ed)
                        }
                    }
                    .padding(.top, 4)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .contentShape(Rectangle())
        }
        .sheet(isPresented: $showDetail) {
            if let ed = nextEdition ?? latestEdition {
                EventDetailSheet(flat: FlatEvent(id: ed.id, event: event, edition: ed))
            }
        }
    }
}

private struct EditionHistoryBlock: View {
    let edition: EventEdition

    var body: some View {
        let year = String(edition.startDate.prefix(4))
        HStack(alignment: .top, spacing: 8) {
            Text(year)
                .font(.caption2).fontWeight(.semibold)
                .foregroundStyle(.white)
                .padding(.horizontal, 6).padding(.vertical, 2)
                .background(edition.isHistorical ? Color.secondary : Color.accentColor, in: Capsule())
            VStack(alignment: .leading, spacing: 1) {
                Text(DateUtils.displayDateRange(start: edition.startDate, end: edition.endDate))
                    .font(.caption2)
                Text("\(edition.city), \(edition.country)")
                    .font(.caption2).foregroundStyle(.secondary)
                if let size = edition.eventSize {
                    Text(size.capitalized)
                        .font(.caption2).foregroundStyle(.tertiary)
                }
            }
        }
    }
}
