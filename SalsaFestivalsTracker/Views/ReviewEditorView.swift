import SwiftData
import SwiftUI

struct ReviewEditorView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.modelContext) private var modelContext

    let festival: Festival

    @State private var music = 5
    @State private var dancingLevel = 5
    @State private var stageImpact = 5
    @State private var floor = 5
    @State private var vibe = 5
    @State private var eventCost = 5
    @State private var servicesProvided = 5
    @State private var eventHours = 5
    @State private var hostCity = 5
    @State private var eventSize = 5
    @State private var travelToEvent = 5
    @State private var topReasonToAttend = ""
    @State private var notes = ""

    private var totalScore: Double {
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

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    HStack {
                        Text("Total Score")
                        Spacer()
                        Text(String(format: "%.1f", totalScore))
                            .font(.title3.bold())
                    }
                }

                Section("Scores") {
                    ScoreStepper(title: "Music", value: $music)
                    ScoreStepper(title: "Dancing Level", value: $dancingLevel)
                    ScoreStepper(title: "Stage Impact", value: $stageImpact)
                    ScoreStepper(title: "Floor", value: $floor)
                    ScoreStepper(title: "Vibe", value: $vibe)
                    ScoreStepper(title: "Event Cost", value: $eventCost)
                    ScoreStepper(title: "Services Provided", value: $servicesProvided)
                    ScoreStepper(title: "Event Hours", value: $eventHours)
                    ScoreStepper(title: "Host City", value: $hostCity)
                    ScoreStepper(title: "Event Size", value: $eventSize)
                    ScoreStepper(title: "Travel to Event", value: $travelToEvent)
                }

                Section("Notes") {
                    TextField("Top reason to attend", text: $topReasonToAttend, axis: .vertical)
                    TextField("Review notes", text: $notes, axis: .vertical)
                }
            }
            .navigationTitle("Review")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                }

                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        save()
                        dismiss()
                    }
                }
            }
        }
    }

    private func save() {
        let review = FestivalReview(
            festival: festival,
            music: music,
            dancingLevel: dancingLevel,
            stageImpact: stageImpact,
            floor: floor,
            vibe: vibe,
            eventCost: eventCost,
            servicesProvided: servicesProvided,
            eventHours: eventHours,
            hostCity: hostCity,
            eventSize: eventSize,
            travelToEvent: travelToEvent,
            topReasonToAttend: topReasonToAttend,
            notes: notes
        )
        modelContext.insert(review)
    }
}

private struct ScoreStepper: View {
    let title: String
    @Binding var value: Int

    var body: some View {
        Stepper(value: $value, in: 1...10) {
            HStack {
                Text(title)
                Spacer()
                Text("\(value)")
                    .foregroundStyle(.secondary)
            }
        }
    }
}
