// ios/SalsaEventTracker/Models/Review.swift
import Foundation

struct Review: Identifiable, Decodable {
    let id: String
    let userId: String
    let eventEditionId: String
    let reviewedAt: String?
    let musicScore: Int?
    let dancingLevelScore: Int?
    let stageImpactScore: Int?
    let floorScore: Int?
    let vibeScore: Int?
    let eventCostScore: Int?
    let servicesScore: Int?
    let eventHoursScore: Int?
    let hostCityScore: Int?
    let eventSizeScore: Int?
    let travelScore: Int?
    let musicComment: String?
    let dancingLevelComment: String?
    let stageImpactComment: String?
    let floorComment: String?
    let vibeComment: String?
    let eventCostComment: String?
    let servicesComment: String?
    let eventHoursComment: String?
    let hostCityComment: String?
    let eventSizeComment: String?
    let travelComment: String?
    let topReason: String?
    let notes: String?

    enum CodingKeys: String, CodingKey {
        case id, notes
        case userId = "user_id"
        case eventEditionId = "event_edition_id"
        case reviewedAt = "reviewed_at"
        case musicScore = "music_score"
        case dancingLevelScore = "dancing_level_score"
        case stageImpactScore = "stage_impact_score"
        case floorScore = "floor_score"
        case vibeScore = "vibe_score"
        case eventCostScore = "event_cost_score"
        case servicesScore = "services_score"
        case eventHoursScore = "event_hours_score"
        case hostCityScore = "host_city_score"
        case eventSizeScore = "event_size_score"
        case travelScore = "travel_score"
        case musicComment = "music_comment"
        case dancingLevelComment = "dancing_level_comment"
        case stageImpactComment = "stage_impact_comment"
        case floorComment = "floor_comment"
        case vibeComment = "vibe_comment"
        case eventCostComment = "event_cost_comment"
        case servicesComment = "services_comment"
        case eventHoursComment = "event_hours_comment"
        case hostCityComment = "host_city_comment"
        case eventSizeComment = "event_size_comment"
        case travelComment = "travel_comment"
        case topReason = "top_reason"
    }

    var totalScore: Double {
        let scores = [musicScore, dancingLevelScore, stageImpactScore, floorScore,
                      vibeScore, eventCostScore, servicesScore, eventHoursScore,
                      hostCityScore, eventSizeScore, travelScore]
        return Double(scores.reduce(0) { $0 + ($1 ?? 0) }) / Double(scores.count)
    }
}

enum ReviewCategory: String, CaseIterable {
    case music = "Music"
    case dancingLevel = "Dancing Level"
    case stageImpact = "Stage Impact"
    case floor = "Floor"
    case vibe = "Vibe"
    case eventCost = "Event Cost"
    case services = "Services Provided"
    case eventHours = "Event Hours"
    case hostCity = "Host City"
    case eventSize = "Event Size"
    case travel = "Travel to Event"
}
