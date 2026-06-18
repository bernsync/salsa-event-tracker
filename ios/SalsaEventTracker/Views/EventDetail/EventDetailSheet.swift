// ios/SalsaEventTracker/Views/EventDetail/EventDetailSheet.swift
import SwiftUI

struct EventDetailSheet: View {
    let flat: FlatEvent
    @Environment(\.dismiss) private var dismiss
    @Environment(AppModel.self) private var model

    private var schengenLabel: String? {
        guard !model.schengenCountries.isEmpty else { return nil }
        return model.schengenCountries.contains(flat.edition.country) ? "Yes" : "No"
    }

    private var priorEdition: EventEdition? {
        flat.event.editions
            .filter { $0.startDate < flat.edition.startDate }
            .sorted { $0.startDate > $1.startDate }
            .first
    }

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
                    if let schengen = schengenLabel {
                        LabeledContent("Schengen", value: schengen)
                    }
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
                Section("Add to Calendar") {
                    CalendarExportLinks(flat: flat)
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
                if let prior = priorEdition {
                    Section("\(String(prior.startDate.prefix(4))) Edition (Prior)") {
                        LabeledContent("Dates", value: DateUtils.displayDateRange(
                            start: prior.startDate, end: prior.endDate))
                        LabeledContent("City", value: prior.city)
                        LabeledContent("Country", value: prior.country)
                        if let venue = prior.venue { LabeledContent("Venue", value: venue) }
                        if let size = prior.eventSize { LabeledContent("Size", value: size.capitalized) }
                        if let price = prior.price {
                            LabeledContent("Price", value: "\(price) \(prior.currency ?? "")")
                        }
                        if let djs = prior.djs { LabeledContent("DJs", value: djs) }
                        if let artists = prior.artists { LabeledContent("Artists", value: artists) }
                        if let notes = prior.notes { LabeledContent("Notes", value: notes) }
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

struct CalendarExportLinks: View {
    let flat: FlatEvent
    @State private var calendarFileURL: URL?

    var body: some View {
        Group {
            Link(destination: CalendarExportService.googleCalendarURL(for: flat)) {
                Label("Google Calendar", systemImage: "calendar.badge.plus")
            }
            if let calendarFileURL {
                ShareLink(item: calendarFileURL) {
                    Label("Phone calendar file", systemImage: "square.and.arrow.up")
                }
            } else {
                Label("Preparing phone calendar file", systemImage: "hourglass")
                    .foregroundStyle(.secondary)
            }
        }
        .task(id: flat.id) {
            calendarFileURL = try? CalendarExportService.writeCalendarFile(for: flat)
        }
    }
}

enum CalendarExportService {
    static func googleCalendarURL(for flat: FlatEvent) -> URL {
        var components = URLComponents(string: "https://calendar.google.com/calendar/render")!
        components.queryItems = [
            URLQueryItem(name: "action", value: "TEMPLATE"),
            URLQueryItem(name: "text", value: flat.event.name),
            URLQueryItem(name: "dates", value: "\(dateToken(flat.edition.startDate))/\(dateToken(exclusiveEndDate(flat.edition.endDate)))"),
            URLQueryItem(name: "details", value: calendarDescription(for: flat)),
            URLQueryItem(name: "location", value: [flat.edition.venue, flat.edition.city, flat.edition.country]
                .compactMap { $0 }
                .filter { !$0.isEmpty }
                .joined(separator: ", "))
        ]
        return components.url!
    }

    static func writeCalendarFile(for flat: FlatEvent) throws -> URL {
        let filename = calendarFilename(for: flat)
        let url = FileManager.default.temporaryDirectory.appendingPathComponent(filename)
        try calendarFileContent(for: flat).write(to: url, atomically: true, encoding: .utf8)
        return url
    }

    private static func calendarDescription(for flat: FlatEvent) -> String {
        [
            DateUtils.displayDateRange(start: flat.edition.startDate, end: flat.edition.endDate),
            flat.edition.venue.map { "Venue: \($0)" },
            flat.event.organizer.map { "Organizer: \($0)" },
            flat.event.website.map { "Website: \($0)" },
            flat.edition.tickets.map { "Tickets: \($0)" },
            flat.edition.notes.map { "Notes: \($0)" }
        ]
        .compactMap { $0 }
        .filter { !$0.isEmpty }
        .joined(separator: "\n")
    }

    private static func calendarFilename(for flat: FlatEvent) -> String {
        let slug = flat.event.name
            .lowercased()
            .components(separatedBy: CharacterSet.alphanumerics.inverted)
            .filter { !$0.isEmpty }
            .joined(separator: "-")
        return "\(flat.edition.startDate)-\(slug.isEmpty ? "event" : slug).ics"
    }

    private static func calendarFileContent(for flat: FlatEvent, now: Date = Date()) -> String {
        let lines = [
            "BEGIN:VCALENDAR",
            "VERSION:2.0",
            "PRODID:-//Salsa Events//EN",
            "CALSCALE:GREGORIAN",
            "METHOD:PUBLISH",
            "BEGIN:VEVENT",
            "UID:\(flat.edition.id)@salsa-events",
            "DTSTAMP:\(timestamp(now))",
            "DTSTART;VALUE=DATE:\(dateToken(flat.edition.startDate))",
            "DTEND;VALUE=DATE:\(dateToken(exclusiveEndDate(flat.edition.endDate)))",
            "SUMMARY:\(icsEscape(flat.event.name))",
            "LOCATION:\(icsEscape([flat.edition.venue, flat.edition.city, flat.edition.country].compactMap { $0 }.filter { !$0.isEmpty }.joined(separator: ", ")))",
            "DESCRIPTION:\(icsEscape(calendarDescription(for: flat)))",
            "END:VEVENT",
            "END:VCALENDAR"
        ]
        return lines.joined(separator: "\r\n") + "\r\n"
    }

    private static func exclusiveEndDate(_ isoDate: String) -> String {
        guard let date = DateUtils.date(from: isoDate),
              let next = Calendar.current.date(byAdding: .day, value: 1, to: date)
        else { return isoDate }
        return DateUtils.string(from: next)
    }

    private static func dateToken(_ isoDate: String) -> String {
        isoDate.replacingOccurrences(of: "-", with: "")
    }

    private static func timestamp(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = TimeZone(secondsFromGMT: 0)
        formatter.dateFormat = "yyyyMMdd'T'HHmmss'Z'"
        return formatter.string(from: date)
    }

    private static func icsEscape(_ value: String) -> String {
        value
            .filter { character in
                guard let scalar = character.unicodeScalars.first else { return false }
                let value = scalar.value
                return value == 9 || value == 10 || value == 13 || value >= 32
            }
            .replacingOccurrences(of: "\\", with: "\\\\")
            .replacingOccurrences(of: "\r\n", with: "\n")
            .replacingOccurrences(of: "\r", with: "\n")
            .replacingOccurrences(of: "\n", with: "\\n")
            .replacingOccurrences(of: ";", with: "\\;")
            .replacingOccurrences(of: ",", with: "\\,")
    }
}
