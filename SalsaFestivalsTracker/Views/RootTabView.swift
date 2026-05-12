import SwiftData
import SwiftUI

struct RootTabView: View {
    @Environment(\.modelContext) private var modelContext
    @Query(sort: \Festival.startDate) private var festivals: [Festival]

    var body: some View {
        TabView {
            CalendarView()
                .tabItem {
                    Label("Calendar", systemImage: "calendar")
                }

            FestivalListView()
                .tabItem {
                    Label("Events", systemImage: "list.bullet")
                }

            ReviewsView()
                .tabItem {
                    Label("Reviews", systemImage: "star.bubble")
                }
        }
        .task {
            SampleData.seedIfNeeded(modelContext: modelContext, festivals: festivals)
        }
    }
}
