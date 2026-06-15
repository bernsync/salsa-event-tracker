// ios/SalsaEventTracker/Utils/ReviewScoring.swift
import Foundation

enum ReviewScoring {
    static func totalScore(for review: Review) -> Double {
        review.totalScore  // already computed on the model
    }

    static func score(for category: ReviewCategory, in review: Review) -> Int {
        switch category {
        case .music: return review.musicScore ?? 0
        case .dancingLevel: return review.dancingLevelScore ?? 0
        case .stageImpact: return review.stageImpactScore ?? 0
        case .floor: return review.floorScore ?? 0
        case .vibe: return review.vibeScore ?? 0
        case .eventCost: return review.eventCostScore ?? 0
        case .services: return review.servicesScore ?? 0
        case .eventHours: return review.eventHoursScore ?? 0
        case .hostCity: return review.hostCityScore ?? 0
        case .eventSize: return review.eventSizeScore ?? 0
        case .travel: return review.travelScore ?? 0
        }
    }

    static func comment(for category: ReviewCategory, in review: Review) -> String? {
        switch category {
        case .music: return review.musicComment
        case .dancingLevel: return review.dancingLevelComment
        case .stageImpact: return review.stageImpactComment
        case .floor: return review.floorComment
        case .vibe: return review.vibeComment
        case .eventCost: return review.eventCostComment
        case .services: return review.servicesComment
        case .eventHours: return review.eventHoursComment
        case .hostCity: return review.hostCityComment
        case .eventSize: return review.eventSizeComment
        case .travel: return review.travelComment
        }
    }
}
