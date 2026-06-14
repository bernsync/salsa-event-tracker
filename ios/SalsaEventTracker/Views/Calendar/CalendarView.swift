// ios/SalsaEventTracker/Views/Calendar/CalendarView.swift
import SwiftUI

struct CalendarView: View {
    @Environment(AppModel.self) private var model
    private let weekdays = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]

    private var gridDays: [Date?] {
        DateUtils.calendarGrid(for: model.selectedYearMonth)
    }

    private func eventsOn(_ date: Date) -> [FlatEvent] {
        let dateStr = DateUtils.string(from: date)
        return model.flatEvents.filter {
            $0.edition.startDate <= dateStr && $0.edition.endDate >= dateStr
        }
    }

    var body: some View {
        @Bindable var model = model
        NavigationStack {
            VStack(spacing: 0) {
                // Month navigation
                HStack {
                    Button {
                        model.selectedYearMonth = previousMonth(model.selectedYearMonth)
                    } label: { Image(systemName: "chevron.left") }
                    Spacer()
                    Text(DateUtils.monthLabel(model.selectedYearMonth))
                        .font(.headline)
                    Spacer()
                    Button {
                        model.selectedYearMonth = nextMonth(model.selectedYearMonth)
                    } label: { Image(systemName: "chevron.right") }
                }
                .padding(.horizontal)
                .padding(.vertical, 8)

                // Weekday headers
                HStack {
                    ForEach(weekdays, id: \.self) { day in
                        Text(day).font(.caption).foregroundStyle(.secondary)
                            .frame(maxWidth: .infinity)
                    }
                }
                .padding(.horizontal, 8)

                // Calendar grid
                let columns = Array(repeating: GridItem(.flexible(), spacing: 4), count: 7)
                LazyVGrid(columns: columns, spacing: 4) {
                    ForEach(Array(gridDays.enumerated()), id: \.0) { _, date in
                        if let date {
                            let dateStr = DateUtils.string(from: date)
                            let events = eventsOn(date)
                            let isToday = dateStr == DateUtils.todayString()
                            let isSelected = dateStr == model.selectedCalendarDate
                            CalendarDayCell(date: date, events: events, isSelected: isSelected, isToday: isToday)
                                .onTapGesture {
                                    model.selectedCalendarDate = dateStr
                                }
                        } else {
                            Color.clear.frame(height: 44)
                        }
                    }
                }
                .padding(.horizontal, 8)

                Divider().padding(.top, 8)

                // Events on selected day
                let dayEvents = eventsOn(DateUtils.date(from: model.selectedCalendarDate) ?? Date())
                if dayEvents.isEmpty {
                    Spacer()
                    Text("No events on \(DateUtils.displayDate(model.selectedCalendarDate))")
                        .foregroundStyle(.secondary)
                    Spacer()
                } else {
                    ScrollView {
                        LazyVStack(spacing: 10) {
                            ForEach(dayEvents) { flat in
                                EventCard(flat: flat)
                            }
                        }
                        .padding()
                    }
                }
            }
            .navigationTitle("Calendar")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Today") {
                        let today = DateUtils.todayString()
                        model.selectedCalendarDate = today
                        model.selectedYearMonth = String(today.prefix(7))
                    }
                }
            }
        }
    }

    private func previousMonth(_ ym: String) -> String { adjustMonth(ym, by: -1) }
    private func nextMonth(_ ym: String) -> String { adjustMonth(ym, by: 1) }

    private func adjustMonth(_ ym: String, by delta: Int) -> String {
        guard let date = DateUtils.date(from: ym + "-01"),
              let adjusted = Calendar.current.date(byAdding: .month, value: delta, to: date)
        else { return ym }
        return String(DateUtils.string(from: adjusted).prefix(7))
    }
}
