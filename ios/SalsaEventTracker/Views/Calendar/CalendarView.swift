// ios/SalsaEventTracker/Views/Calendar/CalendarView.swift
import SwiftUI

struct CalendarView: View {
    @Environment(AppModel.self) private var model
    // Match web app: Sun–Sat column order
    private let weekdays = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"]

    private var gridDays: [Date?] {
        DateUtils.calendarGrid(for: model.selectedYearMonth)
    }

    private func eventsOn(_ date: Date) -> [FlatEvent] {
        let dateStr = DateUtils.string(from: date)
        return model.flatEvents.filter {
            $0.edition.startDate <= dateStr && $0.edition.endDate >= dateStr
        }
    }

    // Months that have at least one event — used for the jump picker
    private var monthsWithEvents: [String] {
        var seen = Set<String>()
        return model.flatEvents.compactMap { flat -> String? in
            let ym = String(flat.edition.startDate.prefix(7))
            return seen.insert(ym).inserted ? ym : nil
        }.sorted()
    }

    var body: some View {
        @Bindable var model = model
        NavigationStack {
            VStack(spacing: 0) {
                // ── Month navigation row ───────────────────────────────────
                HStack(spacing: 12) {
                    Button {
                        model.selectedYearMonth = adjustMonth(model.selectedYearMonth, by: -1)
                    } label: {
                        Image(systemName: "chevron.left")
                            .font(.system(size: 16, weight: .semibold))
                    }

                    Text(DateUtils.monthLabel(model.selectedYearMonth))
                        .font(.headline)
                        .frame(maxWidth: .infinity)

                    Button {
                        model.selectedYearMonth = adjustMonth(model.selectedYearMonth, by: 1)
                    } label: {
                        Image(systemName: "chevron.right")
                            .font(.system(size: 16, weight: .semibold))
                    }
                }
                .padding(.horizontal)
                .padding(.vertical, 8)

                // ── Jump to month picker + filter toggles ──────────────────
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 12) {
                        // Month jump picker
                        if !monthsWithEvents.isEmpty {
                            Picker("Jump", selection: $model.selectedYearMonth) {
                                ForEach(monthsWithEvents, id: \.self) { ym in
                                    Text(DateUtils.monthLabel(ym)).tag(ym)
                                }
                            }
                            .pickerStyle(.menu)
                            .labelsHidden()
                            .buttonStyle(.bordered)
                        }

                        Toggle("Attended only", isOn: $model.calendarAttendedOnly)
                            .toggleStyle(.button)
                            .font(.subheadline)

                        Toggle("Hide duplicates", isOn: $model.calendarHideDuplicateAttended)
                            .toggleStyle(.button)
                            .font(.subheadline)
                    }
                    .padding(.horizontal)
                }
                .padding(.vertical, 6)

                // ── Weekday column headers ─────────────────────────────────
                HStack(spacing: 0) {
                    ForEach(weekdays, id: \.self) { day in
                        Text(day)
                            .font(.caption2)
                            .fontWeight(.medium)
                            .foregroundStyle(.secondary)
                            .frame(maxWidth: .infinity)
                    }
                }
                .padding(.horizontal, 8)
                .padding(.bottom, 4)

                // ── Calendar grid ──────────────────────────────────────────
                let columns = Array(repeating: GridItem(.flexible(), spacing: 2), count: 7)
                LazyVGrid(columns: columns, spacing: 2) {
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

                // ── Events on selected day ─────────────────────────────────
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

    private func adjustMonth(_ ym: String, by delta: Int) -> String {
        guard let date = DateUtils.date(from: ym + "-01"),
              let adjusted = Calendar.current.date(byAdding: .month, value: delta, to: date)
        else { return ym }
        return String(DateUtils.string(from: adjusted).prefix(7))
    }
}
