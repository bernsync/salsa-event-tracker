// TEMPORARY STUB: ios/SalsaEventTracker/Utils/DateUtils.swift
// This is a minimal stub to satisfy the DateUtils.todayString() reference in Event.swift.
// Replace with the full implementation in Task 3.
import Foundation

enum DateUtils {
    static func todayString() -> String {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        return f.string(from: Date())
    }
}
