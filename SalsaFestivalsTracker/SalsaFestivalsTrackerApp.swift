import SwiftData
import SwiftUI

@main
struct SalsaFestivalsTrackerApp: App {
    var body: some Scene {
        WindowGroup {
            RootTabView()
        }
        .modelContainer(for: [Festival.self, FestivalReview.self])
    }
}
