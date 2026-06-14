// ios/SalsaEventTracker/Views/Calendar/CalendarDayCell.swift
import SwiftUI

struct CalendarDayCell: View {
    let date: Date
    let events: [FlatEvent]
    let isSelected: Bool
    let isToday: Bool

    var body: some View {
        let day = Calendar.current.component(.day, from: date)
        VStack(spacing: 2) {
            Text("\(day)")
                .font(.callout)
                .fontWeight(isToday ? .bold : .regular)
                .foregroundStyle(isToday ? .white : .primary)
                .frame(width: 30, height: 30)
                .background(isToday ? Color.accentColor : isSelected ? Color.accentColor.opacity(0.2) : .clear,
                            in: Circle())
            HStack(spacing: 2) {
                ForEach(events.prefix(3)) { _ in
                    Circle().fill(Color.accentColor).frame(width: 4, height: 4)
                }
            }
            .frame(height: 6)
        }
    }
}
