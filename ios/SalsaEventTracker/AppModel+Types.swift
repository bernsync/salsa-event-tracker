// ios/SalsaEventTracker/AppModel+Types.swift
import Foundation

enum Tab: String, CaseIterable {
    case calendar = "Event Calendar"
    case eventList = "Calendar List"
    case festivalList = "Event List"
    case recentlyAdded = "Recently Added"
    case trips = "Trips"
}

enum EventSortOption: String, CaseIterable {
    case date = "Date"
    case name = "Name"
    case country = "Country"
}

// Thrown by SupabaseService when the server returns 401; caught by AppModel.loadPrivateData
enum ServiceAuthError: Error { case tokenExpired }

// Surface errors to the user via AppModel.appError
enum AppError: LocalizedError, Equatable {
    case loadFailed(String)
    case saveFailed(String)
    case authExpired

    var errorDescription: String? {
        switch self {
        case .loadFailed(let msg): return "Load failed: \(msg)"
        case .saveFailed(let msg): return "Save failed: \(msg)"
        case .authExpired: return "Your session expired. Please sign in again."
        }
    }
}
