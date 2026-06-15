// ios/SalsaEventTracker/Views/Calendar/CalendarView.swift
import SwiftUI

struct CalendarView: View {
    @Environment(AppModel.self) private var model
    private let weekdays = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"]

    private var gridDays: [Date?] {
        DateUtils.calendarGrid(for: model.selectedYearMonth)
    }

    private func eventsOn(_ dateStr: String) -> [FlatEvent] {
        model.flatEvents.filter {
            $0.edition.startDate <= dateStr && $0.edition.endDate >= dateStr
        }
    }

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
                            let events = eventsOn(dateStr)
                            let tripPlaces = model.tripPlacesOn(dateStr)
                            let ptoDays = model.ptoDaysOn(dateStr)
                            let isToday = dateStr == DateUtils.todayString()
                            let isSelected = dateStr == model.selectedCalendarDate
                            CalendarDayCell(
                                date: date,
                                events: events,
                                tripPlaces: tripPlaces,
                                ptoDays: ptoDays,
                                isSelected: isSelected,
                                isToday: isToday
                            )
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

                // ── Events + trips on selected day ─────────────────────────
                let selectedStr = model.selectedCalendarDate
                let dayEvents = eventsOn(selectedStr)
                let dayTrips = model.tripPlacesOn(selectedStr)
                let dayPTO = model.ptoDaysOn(selectedStr)

                if dayEvents.isEmpty && dayTrips.isEmpty && dayPTO.isEmpty {
                    Spacer()
                    Text("No events on \(DateUtils.displayDate(selectedStr))")
                        .foregroundStyle(.secondary)
                    Spacer()
                } else {
                    ScrollView {
                        LazyVStack(spacing: 10) {
                            ForEach(dayEvents) { flat in
                                EventCard(flat: flat)
                            }
                            ForEach(dayTrips, id: \.place.id) { item in
                                CalendarTripChip(place: item.place, trip: item.trip)
                            }
                            ForEach(dayPTO, id: \.ptoDay.id) { item in
                                CalendarPTOChip(ptoDay: item.ptoDay, trip: item.trip)
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

private struct CalendarTripChip: View {
    let place: TripPlace
    let trip: Trip

    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: "airplane")
                .font(.caption).foregroundStyle(.white)
                .frame(width: 28, height: 28)
                .background(Color.indigo, in: Circle())
            VStack(alignment: .leading, spacing: 2) {
                Text([place.city, place.country].filter { !$0.isEmpty }.joined(separator: ", "))
                    .font(.subheadline).fontWeight(.medium)
                if let label = trip.label, !label.isEmpty {
                    Text(label).font(.caption).foregroundStyle(.secondary)
                }
            }
            Spacer()
            Text(DateUtils.displayDateRange(start: place.startDate, end: place.endDate))
                .font(.caption2).foregroundStyle(.secondary)
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.indigo.opacity(0.1), in: RoundedRectangle(cornerRadius: 10))
    }
}

private struct CalendarPTOChip: View {
    let ptoDay: PTODay
    let trip: Trip

    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: "sun.max.fill")
                .font(.caption).foregroundStyle(.white)
                .frame(width: 28, height: 28)
                .background(Color.orange, in: Circle())
            VStack(alignment: .leading, spacing: 2) {
                Text(ptoDay.amount < 1 ? "Half PTO Day" : "PTO Day")
                    .font(.subheadline).fontWeight(.medium)
                if let label = trip.label, !label.isEmpty {
                    Text(label).font(.caption).foregroundStyle(.secondary)
                }
            }
            Spacer()
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.orange.opacity(0.1), in: RoundedRectangle(cornerRadius: 10))
    }
}
