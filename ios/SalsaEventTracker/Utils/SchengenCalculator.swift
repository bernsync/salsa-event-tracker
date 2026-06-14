// ios/SalsaEventTracker/Utils/SchengenCalculator.swift
import Foundation

enum SchengenCalculator {
    // Given a set of Schengen-area stays (as date-range pairs), calculate
    // how many days have been spent in the Schengen area in the 180-day
    // rolling window ending on `checkDate`.
    static func daysUsed(
        stays: [(start: String, end: String)],
        checkDate: String
    ) -> Int {
        guard let check = DateUtils.date(from: checkDate) else { return 0 }
        guard let windowStart = Calendar.current.date(byAdding: .day, value: -179, to: check) else { return 0 }

        var total = 0
        for stay in stays {
            guard let s = DateUtils.date(from: stay.start),
                  let e = DateUtils.date(from: stay.end) else { continue }
            let clampedStart = max(s, windowStart)
            let clampedEnd = min(e, check)
            if clampedStart <= clampedEnd {
                total += Calendar.current.dateComponents([.day], from: clampedStart, to: clampedEnd).day! + 1
            }
        }
        return min(total, 90)
    }

    // Returns Schengen-impacting stays from a list of trip places
    static func schengenStays(from places: [TripPlace], schengenCountries: Set<String>) -> [(start: String, end: String)] {
        places
            .filter { schengenCountries.contains($0.country) }
            .map { (start: $0.startDate, end: $0.endDate) }
    }
}
