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

extension DanceStyle {
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        name = try c.decode(String.self, forKey: .name)
        slug = try c.decode(String.self, forKey: .slug)
        isActive = (try? c.decode(Bool.self, forKey: .isActive)) ?? false
        sortOrder = (try? c.decode(Int.self, forKey: .sortOrder)) ?? 0
    }
}
