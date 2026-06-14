// ios/SalsaEventTracker/Utils/DateUtils.swift
import Foundation

enum DateUtils {
    private static let isoFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        f.locale = Locale(identifier: "en_US_POSIX")
        // Use local timezone so "today" matches the device's calendar date
        f.timeZone = .current
        return f
    }()

    static func todayString() -> String {
        isoFormatter.string(from: Date())
    }

    static func date(from string: String) -> Date? {
        isoFormatter.date(from: string)
    }

    static func string(from date: Date) -> String {
        isoFormatter.string(from: date)
    }

    static func displayDate(_ isoString: String) -> String {
        guard let d = date(from: isoString) else { return isoString }
        let f = DateFormatter()
        f.dateStyle = .medium
        return f.string(from: d)
    }

    static func displayDateRange(start: String, end: String) -> String {
        guard let s = date(from: start), let e = date(from: end) else { return "\(start) – \(end)" }
        let f = DateFormatter()
        f.dateStyle = .medium
        if Calendar.current.isDate(s, equalTo: e, toGranularity: .month) {
            let sf = DateFormatter(); sf.dateFormat = "MMM d"
            let ef = DateFormatter(); ef.dateFormat = "d, yyyy"
            return "\(sf.string(from: s))–\(ef.string(from: e))"
        }
        return "\(f.string(from: s)) – \(f.string(from: e))"
    }

    static func monthLabel(_ isoYearMonth: String) -> String {
        // isoYearMonth: "2026-06"
        guard isoYearMonth.count == 7 else { return isoYearMonth }
        let padded = isoYearMonth + "-01"
        guard let d = date(from: padded) else { return isoYearMonth }
        let f = DateFormatter(); f.dateFormat = "MMMM yyyy"
        return f.string(from: d)
    }

    // Returns all calendar days for the month containing `yearMonth` ("YYYY-MM")
    // Padded with nil for days before Sunday-aligned start (matching web app Sun–Sat grid)
    static func calendarGrid(for yearMonth: String) -> [Date?] {
        guard let firstDay = date(from: yearMonth + "-01") else { return [] }
        var cal = Calendar(identifier: .gregorian)
        cal.locale = Locale(identifier: "en_US_POSIX")
        cal.firstWeekday = 1 // Sunday
        let range = cal.range(of: .day, in: .month, for: firstDay)!
        let firstWeekday = cal.component(.weekday, from: firstDay)
        // weekday: 1=Sun … 7=Sat; offset = days before first Sunday column
        let offset = (firstWeekday - 1 + 7) % 7
        var days: [Date?] = Array(repeating: nil, count: offset)
        for day in 1...range.count {
            var comps = cal.dateComponents([.year, .month], from: firstDay)
            comps.day = day
            days.append(cal.date(from: comps))
        }
        return days
    }
}
