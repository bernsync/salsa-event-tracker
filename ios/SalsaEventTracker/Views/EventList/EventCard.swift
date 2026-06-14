// ios/SalsaEventTracker/Views/EventList/EventCard.swift
import SwiftUI

struct EventCard: View {
    let flat: FlatEvent
    @State private var showDetail = false

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
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(.background.secondary, in: RoundedRectangle(cornerRadius: 10))
        .contentShape(Rectangle())
        .onTapGesture { showDetail = true }
        .sheet(isPresented: $showDetail) {
            EventDetailSheet(flat: flat)
        }
    }
}
