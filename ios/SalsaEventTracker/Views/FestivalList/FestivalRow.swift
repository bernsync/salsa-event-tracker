// ios/SalsaEventTracker/Views/FestivalList/FestivalRow.swift
import SwiftUI

struct FestivalRow: View {
    let event: Event
    @State private var showDetail = false

    private var upcomingEditions: [EventEdition] {
        event.editions
            .filter { !$0.isHistorical }
            .sorted { $0.startDate < $1.startDate }
            .prefix(3)
            .map { $0 }
    }

    private var latestEdition: EventEdition? {
        event.editions.sorted { $0.startDate > $1.startDate }.first
    }

    var body: some View {
        Button {
            showDetail = true
        } label: {
            VStack(alignment: .leading, spacing: 4) {
                Text(event.name).font(.headline).foregroundStyle(.primary)
                if let ed = latestEdition {
                    Text("\(ed.city), \(ed.country)")
                        .font(.subheadline).foregroundStyle(.secondary)
                }
                if !upcomingEditions.isEmpty {
                    HStack {
                        ForEach(upcomingEditions, id: \.id) { ed in
                            Text(String(ed.startDate.prefix(4)))
                                .font(.caption).padding(.horizontal, 6).padding(.vertical, 2)
                                .background(Color.accentColor.opacity(0.15), in: Capsule())
                        }
                    }
                }
                if !event.styles.isEmpty {
                    Text(event.styles.joined(separator: " · "))
                        .font(.caption2).foregroundStyle(.secondary)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .contentShape(Rectangle())
        }
        .sheet(isPresented: $showDetail) {
            if let ed = latestEdition {
                EventDetailSheet(flat: FlatEvent(id: ed.id, event: event, edition: ed))
            }
        }
    }
}
