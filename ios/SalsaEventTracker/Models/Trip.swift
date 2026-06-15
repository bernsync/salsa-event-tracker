// ios/SalsaEventTracker/Models/Trip.swift
import Foundation

struct Trip: Identifiable, Decodable {
    let id: String
    let label: String?
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

extension Trip {
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(String.self, forKey: .id)
        label = try c.decodeIfPresent(String.self, forKey: .label)
        startDate = (try? c.decode(String.self, forKey: .startDate)) ?? ""
        endDate = (try? c.decode(String.self, forKey: .endDate)) ?? ""
        notes = try c.decodeIfPresent(String.self, forKey: .notes)
        places = (try? c.decode([TripPlace].self, forKey: .places)) ?? []
        ptoDays = (try? c.decode([PTODay].self, forKey: .ptoDays)) ?? []
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
    let travelRole: String?
    let sequence: Int?
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

extension TripPlace {
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(String.self, forKey: .id)
        tripId = try c.decode(String.self, forKey: .tripId)
        eventEditionId = try c.decodeIfPresent(String.self, forKey: .eventEditionId)
        startDate = (try? c.decode(String.self, forKey: .startDate)) ?? ""
        endDate = (try? c.decode(String.self, forKey: .endDate)) ?? ""
        city = (try? c.decode(String.self, forKey: .city)) ?? ""
        country = (try? c.decode(String.self, forKey: .country)) ?? ""
        travelRole = try c.decodeIfPresent(String.self, forKey: .travelRole)
        sequence = try c.decodeIfPresent(Int.self, forKey: .sequence)
        notes = try c.decodeIfPresent(String.self, forKey: .notes)
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

extension PTODay {
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(String.self, forKey: .id)
        tripId = try c.decode(String.self, forKey: .tripId)
        ptoDate = (try? c.decode(String.self, forKey: .ptoDate)) ?? ""
        amount = (try? c.decode(Double.self, forKey: .amount)) ?? 1.0
        notes = try c.decodeIfPresent(String.self, forKey: .notes)
    }
}
