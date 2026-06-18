// ios/SalsaEventTracker/Models/Event.swift
import Foundation

struct Event: Identifiable, Codable {
    let id: String
    let name: String
    let organizer: String?
    let website: String?
    let instagram: String?
    let facebook: String?
    let styles: [String]
    let watchlist: Bool?
    let createdAt: String
    let editions: [EventEdition]

    enum CodingKeys: String, CodingKey {
        case id, name, organizer, website, instagram, facebook, styles, watchlist
        case createdAt = "created_at"
        case editions = "event_editions"
    }
}

extension Event {
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(String.self, forKey: .id)
        name = try c.decode(String.self, forKey: .name)
        organizer = try c.decodeIfPresent(String.self, forKey: .organizer)
        website = try c.decodeIfPresent(String.self, forKey: .website)
        instagram = try c.decodeIfPresent(String.self, forKey: .instagram)
        facebook = try c.decodeIfPresent(String.self, forKey: .facebook)
        styles = (try? c.decode([String].self, forKey: .styles)) ?? []
        watchlist = try c.decodeIfPresent(Bool.self, forKey: .watchlist)
        createdAt = try c.decode(String.self, forKey: .createdAt)
        editions = try c.decode([EventEdition].self, forKey: .editions)
    }
}

struct EventEdition: Identifiable, Codable {
    let id: String
    let startDate: String       // "YYYY-MM-DD"
    let endDate: String
    let city: String
    let country: String
    let venue: String?
    let tickets: String?
    let price: String?
    let currency: String?
    let djs: String?
    let artists: String?
    let eventSize: String?      // "small"|"medium"|"large"|"extra large"
    let travel: String?
    let addedOn: String?
    let notes: String?
    let forceShowMonday: Bool?
    let visibility: String

    enum CodingKeys: String, CodingKey {
        case id, city, country, venue, tickets, price, currency, djs, artists, travel, notes, visibility
        case startDate = "start_date"
        case endDate = "end_date"
        case eventSize = "event_size"
        case addedOn = "added_on"
        case forceShowMonday = "force_show_monday"
    }

    var isHistorical: Bool {
        endDate < DateUtils.todayString()
    }

    static let placeholder = EventEdition(
        id: "", startDate: "", endDate: "", city: "", country: "",
        venue: nil, tickets: nil, price: nil, currency: nil,
        djs: nil, artists: nil, eventSize: nil, travel: nil,
        addedOn: nil, notes: nil, forceShowMonday: false, visibility: "public"
    )
}

extension EventEdition {
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(String.self, forKey: .id)
        startDate = (try? c.decode(String.self, forKey: .startDate)) ?? ""
        endDate = (try? c.decode(String.self, forKey: .endDate)) ?? ""
        city = (try? c.decode(String.self, forKey: .city)) ?? ""
        country = (try? c.decode(String.self, forKey: .country)) ?? ""
        venue = try c.decodeIfPresent(String.self, forKey: .venue)
        tickets = try c.decodeIfPresent(String.self, forKey: .tickets)
        price = try c.decodeIfPresent(String.self, forKey: .price)
        currency = try c.decodeIfPresent(String.self, forKey: .currency)
        djs = try c.decodeIfPresent(String.self, forKey: .djs)
        artists = try c.decodeIfPresent(String.self, forKey: .artists)
        eventSize = try c.decodeIfPresent(String.self, forKey: .eventSize)
        travel = try c.decodeIfPresent(String.self, forKey: .travel)
        addedOn = try c.decodeIfPresent(String.self, forKey: .addedOn)
        notes = try c.decodeIfPresent(String.self, forKey: .notes)
        forceShowMonday = try c.decodeIfPresent(Bool.self, forKey: .forceShowMonday)
        visibility = (try? c.decode(String.self, forKey: .visibility)) ?? "public"
    }
}

// Convenience: a flat edition with its parent event attached
struct FlatEvent: Identifiable {
    let id: String          // edition ID
    let event: Event
    let edition: EventEdition
}
