import Foundation
import SwiftData

@Model
final class FestivalReview {
    var festival: Festival?
    var music: Int
    var dancingLevel: Int
    var stageImpact: Int
    var floor: Int
    var vibe: Int
    var eventCost: Int
    var servicesProvided: Int
    var eventHours: Int
    var hostCity: Int
    var eventSize: Int
    var travelToEvent: Int
    var topReasonToAttend: String
    var notes: String
    var reviewedAt: Date

    init(
        festival: Festival? = nil,
        music: Int = 5,
        dancingLevel: Int = 5,
        stageImpact: Int = 5,
        floor: Int = 5,
        vibe: Int = 5,
        eventCost: Int = 5,
        servicesProvided: Int = 5,
        eventHours: Int = 5,
        hostCity: Int = 5,
        eventSize: Int = 5,
        travelToEvent: Int = 5,
        topReasonToAttend: String = "",
        notes: String = ""
    ) {
        self.festival = festival
        self.music = music
        self.dancingLevel = dancingLevel
        self.stageImpact = stageImpact
        self.floor = floor
        self.vibe = vibe
        self.eventCost = eventCost
        self.servicesProvided = servicesProvided
        self.eventHours = eventHours
        self.hostCity = hostCity
        self.eventSize = eventSize
        self.travelToEvent = travelToEvent
        self.topReasonToAttend = topReasonToAttend
        self.notes = notes
        self.reviewedAt = .now
    }

    var totalScore: Double {
        let scores = [
            music,
            dancingLevel,
            stageImpact,
            floor,
            vibe,
            eventCost,
            servicesProvided,
            eventHours,
            hostCity,
            eventSize,
            travelToEvent
        ]

        return Double(scores.reduce(0, +)) / Double(scores.count)
    }
}
