// ios/SalsaEventTracker/Utils/TextUtils.swift
import Foundation

enum TextUtils {
    static func normalize(_ text: String) -> String {
        text.lowercased()
            .folding(options: .diacriticInsensitive, locale: .current)
    }

    // Returns true if any field in the event/edition contains the query
    static func matches(event: Event, edition: EventEdition, query: String) -> Bool {
        guard !query.isEmpty else { return true }
        let q = normalize(query)
        let fields = [event.name, edition.city, edition.country,
                      edition.venue ?? "", event.organizer ?? "",
                      edition.djs ?? "", edition.artists ?? "",
                      edition.notes ?? "", event.styles.joined(separator: " ")]
        return fields.contains { normalize($0).contains(q) }
    }
}
