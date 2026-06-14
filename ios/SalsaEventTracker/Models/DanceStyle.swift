// ios/SalsaEventTracker/Models/DanceStyle.swift
import Foundation

struct DanceStyle: Identifiable, Decodable {
    var id: String { slug }
    let name: String
    let slug: String
    let isActive: Bool
    let sortOrder: Int

    enum CodingKeys: String, CodingKey {
        case name, slug
        case isActive = "is_active"
        case sortOrder = "sort_order"
    }
}
