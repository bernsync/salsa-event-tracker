// ios/SalsaEventTracker/Views/EventDetail/EventDetailSheet.swift
import SwiftUI

struct EventDetailSheet: View {
    let flat: FlatEvent
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        let websiteURL = flat.event.website.flatMap(URL.init)
        let instagramURL = flat.event.instagram.flatMap(URL.init)
        let facebookURL = flat.event.facebook.flatMap(URL.init)
        let ticketsURL = flat.edition.tickets.flatMap(URL.init)

        return NavigationStack {
            List {
                Section("Date & Location") {
                    LabeledContent("Dates", value: DateUtils.displayDateRange(
                        start: flat.edition.startDate, end: flat.edition.endDate))
                    LabeledContent("City", value: flat.edition.city)
                    LabeledContent("Country", value: flat.edition.country)
                    if let venue = flat.edition.venue { LabeledContent("Venue", value: venue) }
                }
                Section("Event") {
                    if let org = flat.event.organizer { LabeledContent("Organizer", value: org) }
                    if let size = flat.edition.eventSize { LabeledContent("Size", value: size.capitalized) }
                    if let price = flat.edition.price {
                        LabeledContent("Price", value: "\(price) \(flat.edition.currency ?? "")")
                    }
                    if !flat.event.styles.isEmpty {
                        LabeledContent("Styles", value: flat.event.styles.joined(separator: ", "))
                    }
                }
                if let djs = flat.edition.djs {
                    Section("DJs") { Text(djs) }
                }
                if let artists = flat.edition.artists {
                    Section("Artists") { Text(artists) }
                }
                if let travel = flat.edition.travel {
                    Section("Travel Notes") { Text(travel) }
                }
                if let notes = flat.edition.notes {
                    Section("Notes") { Text(notes) }
                }
                if websiteURL != nil || instagramURL != nil || facebookURL != nil || ticketsURL != nil {
                    Section("Links") {
                        if let url = websiteURL { Link("Website", destination: url) }
                        if let url = instagramURL { Link("Instagram", destination: url) }
                        if let url = facebookURL { Link("Facebook", destination: url) }
                        if let url = ticketsURL { Link("Tickets", destination: url) }
                    }
                }
            }
            .navigationTitle(flat.event.name)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }
}
