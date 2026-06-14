// ios/SalsaEventTracker/SalsaEventTrackerApp.swift
import SwiftUI

@main
struct SalsaEventTrackerApp: App {
    @State private var model = AppModel()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(model)
                .task { await model.loadPublicData() }
        }
    }
}
