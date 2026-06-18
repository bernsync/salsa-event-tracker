// ios/SalsaEventTracker/Views/Trips/TripCard.swift
import SwiftUI

struct TripCard: View {
    let trip: Trip
    let schengenCountries: Set<String>
    let allTrips: [Trip]

    @State private var isExpanded = false

    private var stats: SchengenTripStats {
        SchengenCalculator.tripStats(trips: allTrips, trip: trip, schengenCountries: schengenCountries)
    }

    private var ptoTotal: Double {
        trip.ptoDays.reduce(0.0) { $0 + $1.amount }
    }

    private var sortedPlaces: [TripPlace] {
        trip.places.sorted {
            if $0.startDate != $1.startDate { return $0.startDate < $1.startDate }
            return ($0.sequence ?? Int.max) < ($1.sequence ?? Int.max)
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text(trip.label ?? "Untitled Trip").font(.headline)
                if stats.daysAdded > 0 {
                    Text("\(stats.daysAdded) Schengen")
                        .font(.caption2.bold())
                        .padding(.horizontal, 6).padding(.vertical, 2)
                        .background(.blue.opacity(0.15), in: Capsule())
                        .foregroundStyle(.blue)
                }
                Spacer()
            }

            Text(DateUtils.displayDateRange(start: trip.startDate, end: trip.endDate))
                .font(.subheadline).foregroundStyle(.secondary)

            ForEach(sortedPlaces) { place in
                HStack(alignment: .top) {
                    Image(systemName: "mappin")
                        .foregroundStyle(schengenCountries.contains(place.country) ? .blue : .secondary)
                        .font(.caption)
                    VStack(alignment: .leading, spacing: 1) {
                        Text("\(place.city), \(place.country)").font(.caption)
                        Text(DateUtils.displayDateRange(start: place.startDate, end: place.endDate))
                            .font(.caption2).foregroundStyle(.secondary)
                    }
                    Spacer()
                    let days = SchengenCalculator.placeDays(place, schengenCountries: schengenCountries)
                    if days > 0 {
                        Text("\(days)d")
                            .font(.caption2.bold())
                            .padding(.horizontal, 5).padding(.vertical, 2)
                            .background(.blue.opacity(0.12), in: Capsule())
                            .foregroundStyle(.blue)
                    }
                }
            }

            if ptoTotal > 0 {
                Text("\(ptoTotal, specifier: "%.4g") PTO days")
                    .font(.caption2).foregroundStyle(.orange)
            }

            if stats.daysAdded > 0 || !trip.ptoDays.isEmpty {
                DisclosureGroup(isExpanded: $isExpanded) {
                    VStack(alignment: .leading, spacing: 8) {
                        if stats.daysAdded > 0 {
                            HStack(spacing: 16) {
                                VStack(alignment: .leading, spacing: 2) {
                                    Text("Entry").font(.caption2).foregroundStyle(.secondary)
                                    Text("\(stats.entryUsed)/90").font(.caption.bold())
                                }
                                VStack(alignment: .leading, spacing: 2) {
                                    Text("Exit").font(.caption2).foregroundStyle(.secondary)
                                    Text("\(stats.exitUsed)/90").font(.caption.bold())
                                }
                                VStack(alignment: .leading, spacing: 2) {
                                    Text("Peak").font(.caption2).foregroundStyle(.secondary)
                                    Text("\(stats.maxUsed)/90")
                                        .font(.caption.bold())
                                        .foregroundStyle(stats.maxUsed > 80 ? .red : stats.maxUsed > 60 ? .orange : .primary)
                                }
                            }
                            .padding(.top, 4)
                        }

                        if !trip.ptoDays.isEmpty {
                            Divider()
                            ForEach(trip.ptoDays.sorted { $0.ptoDate < $1.ptoDate }) { pto in
                                HStack {
                                    Text(DateUtils.displayDate(pto.ptoDate)).font(.caption2)
                                    if let note = pto.notes, !note.isEmpty {
                                        Text(note).font(.caption2).foregroundStyle(.secondary)
                                    }
                                    Spacer()
                                    Text(pto.amount == 0.5 ? "½ day" : "\(Int(pto.amount)) day")
                                        .font(.caption2.bold()).foregroundStyle(.orange)
                                }
                            }
                        }
                    }
                } label: {
                    Text(isExpanded ? "Hide details" : "Show details")
                        .font(.caption).foregroundStyle(.secondary)
                }
                .padding(.top, 2)
            }
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(.background.secondary, in: RoundedRectangle(cornerRadius: 10))
    }
}
