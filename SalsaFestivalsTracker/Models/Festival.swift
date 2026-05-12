import Foundation
import SwiftData

@Model
final class Festival {
    var name: String
    var startDate: Date
    var endDate: Date
    var city: String
    var country: String
    var venue: String
    var websiteURL: String
    var instagramHandle: String
    var facebookURL: String
    var djs: String
    var artists: String
    var priceSummary: String
    var currency: String
    var notes: String
    var createdAt: Date
    var updatedAt: Date

    @Relationship(deleteRule: .cascade, inverse: \FestivalReview.festival)
    var reviews: [FestivalReview]

    init(
        name: String,
        startDate: Date,
        endDate: Date,
        city: String = "",
        country: String = "",
        venue: String = "",
        websiteURL: String = "",
        instagramHandle: String = "",
        facebookURL: String = "",
        djs: String = "",
        artists: String = "",
        priceSummary: String = "",
        currency: String = "EUR",
        notes: String = ""
    ) {
        self.name = name
        self.startDate = startDate
        self.endDate = endDate
        self.city = city
        self.country = country
        self.venue = venue
        self.websiteURL = websiteURL
        self.instagramHandle = instagramHandle
        self.facebookURL = facebookURL
        self.djs = djs
        self.artists = artists
        self.priceSummary = priceSummary
        self.currency = currency
        self.notes = notes
        self.createdAt = .now
        self.updatedAt = .now
        self.reviews = []
    }

    var dateRangeText: String {
        if Calendar.current.isDate(startDate, inSameDayAs: endDate) {
            return startDate.formatted(date: .abbreviated, time: .omitted)
        }

        return "\(startDate.formatted(date: .abbreviated, time: .omitted)) - \(endDate.formatted(date: .abbreviated, time: .omitted))"
    }

    var locationText: String {
        [city, country].filter { !$0.isEmpty }.joined(separator: ", ")
    }
}
