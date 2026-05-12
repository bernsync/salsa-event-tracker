import Foundation
import SwiftData

enum SampleData {
    static func seedIfNeeded(modelContext: ModelContext, festivals: [Festival]) {
        guard festivals.isEmpty else { return }

        let calendar = Calendar.current
        let samples = [
            Festival(
                name: "MamboCity 5 Star Congress",
                startDate: calendar.date(from: DateComponents(year: 2026, month: 5, day: 8)) ?? .now,
                endDate: calendar.date(from: DateComponents(year: 2026, month: 5, day: 11)) ?? .now,
                city: "London",
                country: "United Kingdom",
                websiteURL: "https://www.mambocity.co.uk",
                instagramHandle: "@mambocity",
                priceSummary: "Add pass details",
                notes: "Sample event. Replace with your confirmed details."
            ),
            Festival(
                name: "Berlin Salsa Congress",
                startDate: calendar.date(from: DateComponents(year: 2026, month: 9, day: 24)) ?? .now,
                endDate: calendar.date(from: DateComponents(year: 2026, month: 9, day: 28)) ?? .now,
                city: "Berlin",
                country: "Germany",
                websiteURL: "https://berlinsalsacongress.com",
                instagramHandle: "@berlinsalsacongress",
                priceSummary: "Add pass details",
                notes: "Sample event. Replace with your confirmed details."
            )
        ]

        samples.forEach(modelContext.insert)
    }
}
