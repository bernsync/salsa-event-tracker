// ios/SalsaEventTracker/Views/RecentlyAdded/RecentlyAddedView.swift
import SwiftUI

struct RecentlyAddedView: View {
    @Environment(AppModel.self) private var model

    private var recentEditions: [FlatEvent] {
        let cutoff = Calendar.current.date(byAdding: .day, value: -7, to: Date())
            .map { DateUtils.string(from: $0) } ?? ""
        return model.flatEvents
            .filter { ($0.edition.addedOn ?? "") >= cutoff && !($0.edition.addedOn ?? "").isEmpty }
            .sorted {
                let a = $0.edition.addedOn ?? ""
                let b = $1.edition.addedOn ?? ""
                return a == b ? $0.edition.startDate < $1.edition.startDate : a > b
            }
    }

    var body: some View {
        NavigationStack {
            if recentEditions.isEmpty {
                ContentUnavailableView {
                    Label("Nothing Recent", systemImage: "clock")
                } description: {
                    Text("New festival editions added in the last 7 days will appear here.")
                }
            } else {
                ScrollView {
                    LazyVStack(spacing: 10) {
                        ForEach(recentEditions) { flat in
                            RecentlyAddedCard(flat: flat)
                        }
                    }
                    .padding()
                }
                .refreshable { await model.loadPublicData() }
            }
        }
        .navigationTitle("Recently Added")
    }
}

private struct RecentlyAddedCard: View {
    let flat: FlatEvent
    @State private var showDetail = false

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text(flat.event.name).font(.headline)
                Spacer()
                if let addedOn = flat.edition.addedOn {
                    Text("Added \(DateUtils.displayDate(addedOn))")
                        .font(.caption2).foregroundStyle(.secondary)
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
