// ios/SalsaEventTracker/Views/Calendar/CalendarDayCell.swift
import SwiftUI

struct CalendarDayCell: View {
    let date: Date
    let events: [FlatEvent]
    let tripPlaces: [(place: TripPlace, trip: Trip)]
    let ptoDays: [(ptoDay: PTODay, trip: Trip)]
    let isSelected: Bool
    let isToday: Bool

    var body: some View {
        let day = Calendar.current.component(.day, from: date)
        VStack(spacing: 2) {
            Text("\(day)")
                .font(.callout)
                .fontWeight(isToday ? .bold : .regular)
                .foregroundStyle(isToday ? .white : (isSelected ? Color.accentColor : .primary))
                .frame(width: 30, height: 30)
                .background(isToday ? Color.accentColor : .clear, in: Circle())
                .overlay(
                    Circle()
                        .strokeBorder(Color.accentColor, lineWidth: 2)
                        .opacity(isSelected ? 1 : 0)
                )
            // Event dots
            if !events.isEmpty {
                HStack(spacing: 2) {
                    ForEach(events.prefix(3)) { _ in
                        Circle().fill(Color.accentColor).frame(width: 4, height: 4)
                    }
                }
                .frame(height: 5)
            }
            // Trip chip
            if !tripPlaces.isEmpty {
                let place = tripPlaces[0].place
                let label = place.city.isEmpty ? (tripPlaces[0].trip.label ?? "Trip") : place.city
                Text(label)
                    .font(.system(size: 8, weight: .medium))
                    .foregroundStyle(.white)
                    .lineLimit(1)
                    .padding(.horizontal, 4).padding(.vertical, 1)
                    .background(Color.indigo, in: Capsule())
                    .frame(maxWidth: .infinity)
            }
            // PTO chip
            if !ptoDays.isEmpty {
                let amount = ptoDays[0].ptoDay.amount
                Text(amount < 1 ? "½ PTO" : "PTO")
                    .font(.system(size: 8, weight: .medium))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 4).padding(.vertical, 1)
                    .background(Color.orange, in: Capsule())
                    .frame(maxWidth: .infinity)
            }
        }
    }
}
