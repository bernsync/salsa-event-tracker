// ios/SalsaEventTracker/Models/Trip.swift
import Foundation

struct Trip: Identifiable, Decodable {
    let id: String
    let label: String
    let startDate: String
    let endDate: String
    let notes: String?
    let places: [TripPlace]
    let ptoDays: [PTODay]

    enum CodingKeys: String, CodingKey {
        case id, label, notes
        case startDate = "start_date"
        case endDate = "end_date"
        case places = "personal_trip_places"
        case ptoDays = "personal_pto_days"
    }
}

struct TripPlace: Identifiable, Decodable {
    let id: String
    let tripId: String
    let eventEditionId: String?
    let startDate: String
    let endDate: String
    let city: String
    let country: String
    let travelRole: String   // "stay"|"organizer"|"vendor"
    let sequence: Int
    let notes: String?

    enum CodingKeys: String, CodingKey {
        case id, city, country, sequence, notes
        case tripId = "trip_id"
        case eventEditionId = "event_edition_id"
        case startDate = "start_date"
        case endDate = "end_date"
        case travelRole = "travel_role"
    }
}

struct PTODay: Identifiable, Decodable {
    let id: String
    let tripId: String
    let ptoDate: String
    let amount: Double   // 0.5 or 1.0
    let notes: String?

    enum CodingKeys: String, CodingKey {
        case id, amount, notes
        case tripId = "trip_id"
        case ptoDate = "pto_date"
    }
}
