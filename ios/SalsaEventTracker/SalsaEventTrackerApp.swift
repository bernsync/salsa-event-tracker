// ios/SalsaEventTracker/SalsaEventTrackerApp.swift
import SwiftUI

@main
struct SalsaEventTrackerApp: App {
    @State private var model = AppModel()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(model)
                .task {
                    await model.loadPublicData()
                    // Private (trip) data is fetched only when authenticated. Load
                    // it at launch too, so a returning signed-in user gets attendance
                    // markers without first opening the Trips tab.
                    if model.isSignedIn { await model.loadPrivateData() }
                }
        }
    }
}
