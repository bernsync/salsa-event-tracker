// ios/SalsaEventTracker/Utils/ReviewScoring.swift
import Foundation

enum ReviewScoring {
    static func totalScore(for review: Review) -> Double {
        review.totalScore  // already computed on the model
    }

    static func score(for category: ReviewCategory, in review: Review) -> Int {
        switch category {
        case .music: return review.musicScore
        case .dancingLevel: return review.dancingLevelScore
        case .stageImpact: return review.stageImpactScore
        case .floor: return review.floorScore
        case .vibe: return review.vibeScore
        case .eventCost: return review.eventCostScore
        case .services: return review.servicesScore
        case .eventHours: return review.eventHoursScore
        case .hostCity: return review.hostCityScore
        case .eventSize: return review.eventSizeScore
        case .travel: return review.travelScore
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
