// ios/SalsaEventTracker/Views/Trips/TripCard.swift
import SwiftUI

struct TripCard: View {
    let trip: Trip
    let schengenCountries: Set<String>
    var onEdit: () -> Void
    var onDelete: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text(trip.label).font(.headline)
                Spacer()
                Menu {
                    Button("Edit", action: onEdit)
                    Button("Delete", role: .destructive, action: onDelete)
                } label: {
                    Image(systemName: "ellipsis.circle")
                }
            }
            Text(DateUtils.displayDateRange(start: trip.startDate, end: trip.endDate))
                .font(.subheadline).foregroundStyle(.secondary)
            ForEach(trip.places) { place in
                HStack {
                    Image(systemName: "mappin")
                        .foregroundStyle(schengenCountries.contains(place.country) ? .blue : .secondary)
                        .font(.caption)
                    Text("\(place.city), \(place.country)")
                        .font(.caption)
                    Spacer()
                    Text(DateUtils.displayDateRange(start: place.startDate, end: place.endDate))
                        .font(.caption2).foregroundStyle(.secondary)
                }
            }
            if !trip.ptoDays.isEmpty {
                let total = trip.ptoDays.reduce(0.0) { $0 + $1.amount }
                Text("\(total, specifier: "%.1f") PTO days").font(.caption2).foregroundStyle(.orange)
            }
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(.background.secondary, in: RoundedRectangle(cornerRadius: 10))
    }
}
