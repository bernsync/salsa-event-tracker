import SwiftData
import SwiftUI

struct CalendarView: View {
    @Query(sort: \Festival.startDate) private var festivals: [Festival]
    @State private var selectedDate = Date()

    private var eventsForSelectedMonth: [Festival] {
        festivals.filter {
            Calendar.current.isDate($0.startDate, equalTo: selectedDate, toGranularity: .month)
                || Calendar.current.isDate($0.endDate, equalTo: selectedDate, toGranularity: .month)
        }
    }

    var body: some View {
        NavigationStack {
            List {
                Section {
                    DatePicker("Month", selection: $selectedDate, displayedComponents: [.date])
                        .datePickerStyle(.graphical)
                }

                Section("Festivals This Month") {
                    if eventsForSelectedMonth.isEmpty {
                        ContentUnavailableView(
                            "No Festivals",
                            systemImage: "calendar.badge.exclamationmark",
                            description: Text("Add festivals or choose a different month.")
                        )
                    } else {
                        ForEach(eventsForSelectedMonth) { festival in
                            NavigationLink {
                                FestivalDetailView(festival: festival)
                            } label: {
                                VStack(alignment: .leading, spacing: 5) {
                                    Text(festival.name)
                                        .font(.headline)
                                    Text(festival.dateRangeText)
                                        .font(.subheadline)
                                        .foregroundStyle(.secondary)
                                    if !festival.locationText.isEmpty {
                                        Text(festival.locationText)
                                            .font(.caption)
                                            .foregroundStyle(.secondary)
                                    }
                                }
                                .padding(.vertical, 4)
                            }
                        }
                    }
                }
            }
            .navigationTitle("Calendar")
        }
    }
}
