// ios/SalsaEventTracker/Utils/SchengenCalculator.swift
import Foundation

struct SchengenTripStats {
    let daysAdded: Int
    let entryDate: String
    let exitDate: String
    let entryUsed: Int
    let exitUsed: Int
    let maxUsed: Int
}

enum SchengenCalculator {
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

    static func schengenStays(from places: [TripPlace], schengenCountries: Set<String>) -> [(start: String, end: String)] {
        places
            .filter { schengenCountries.contains($0.country) }
            .map { (start: $0.startDate, end: $0.endDate) }
    }

    static func placeDays(_ place: TripPlace, schengenCountries: Set<String>) -> Int {
        guard schengenCountries.contains(place.country) else { return 0 }
        guard let start = DateUtils.date(from: place.startDate),
              let end = DateUtils.date(from: place.endDate),
              start <= end else { return 0 }
        return Calendar.current.dateComponents([.day], from: start, to: end).day! + 1
    }

    // Whether any Schengen day in this trip falls within the 180-day window ending on checkDate
    static func hasSchengenImpact(trip: Trip, checkDate: String, schengenCountries: Set<String>) -> Bool {
        guard let check = DateUtils.date(from: checkDate),
              let windowStart = Calendar.current.date(byAdding: .day, value: -179, to: check) else { return false }
        let windowStartStr = DateUtils.string(from: windowStart)
        return trip.places.contains { place in
            schengenCountries.contains(place.country)
                && place.endDate >= windowStartStr
                && place.startDate <= checkDate
        }
    }

    // Per-trip Schengen stats: days this trip adds and entry/exit/max window usage
    static func tripStats(trips: [Trip], trip: Trip, schengenCountries: Set<String>) -> SchengenTripStats {
        var seen = Set<String>()
        for place in trip.places where schengenCountries.contains(place.country) {
            guard let start = DateUtils.date(from: place.startDate),
                  let end = DateUtils.date(from: place.endDate) else { continue }
            var cursor = start
            while cursor <= end {
                seen.insert(DateUtils.string(from: cursor))
                guard let next = Calendar.current.date(byAdding: .day, value: 1, to: cursor) else { break }
                cursor = next
            }
        }

        guard !seen.isEmpty else {
            return SchengenTripStats(daysAdded: 0, entryDate: "", exitDate: "",
                                     entryUsed: 0, exitUsed: 0, maxUsed: 0)
        }

        let sortedDates = seen.sorted()
        let allStays = trips.flatMap { schengenStays(from: $0.places, schengenCountries: schengenCountries) }
        let entryDate = sortedDates.first!
        let exitDate = sortedDates.last!

        return SchengenTripStats(
            daysAdded: sortedDates.count,
            entryDate: entryDate,
            exitDate: exitDate,
            entryUsed: daysUsed(stays: allStays, checkDate: entryDate),
            exitUsed: daysUsed(stays: allStays, checkDate: exitDate),
            maxUsed: sortedDates.reduce(0) { Swift.max($0, daysUsed(stays: allStays, checkDate: $1)) }
        )
    }
}
