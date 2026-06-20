// ios/SalsaEventTracker/Views/RootView.swift
import SwiftUI

struct RootView: View {
    @Environment(AppModel.self) private var model

    var body: some View {
        @Bindable var model = model
        TabView(selection: $model.selectedTab) {
            CalendarView()
                .tabItem { Label(Tab.calendar.tabTitle, systemImage: "calendar") }
                .tag(Tab.calendar)

            EventListView()
                .tabItem { Label(Tab.eventList.tabTitle, systemImage: "list.bullet") }
                .tag(Tab.eventList)

            FestivalListView()
                .tabItem { Label(Tab.festivalList.tabTitle, systemImage: "music.note.list") }
                .tag(Tab.festivalList)

            RecentlyAddedView()
                .tabItem { Label(Tab.recentlyAdded.tabTitle, systemImage: "sparkles") }
                .tag(Tab.recentlyAdded)

            TripsView()
                .tabItem { Label(Tab.trips.tabTitle, systemImage: "airplane") }
                .tag(Tab.trips)

        }
        .sheet(isPresented: $model.showLogin) {
            LoginView()
        }
        .overlay {
            if model.isLoading {
                ProgressView("Loading…")
                    .padding()
                    .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 12))
            }
        }
        .alert("Error", isPresented: Binding(
            get: { model.appError != nil },
            set: { if !$0 { model.appError = nil } }
        )) {
            Button("Retry") {
                Task {
                    await model.loadPublicData()
                    await model.loadPrivateData()
                }
            }
            Button("Dismiss", role: .cancel) { model.appError = nil }
        } message: {
            Text(model.appError?.localizedDescription ?? "")
        }
    }
}

struct ControlPanel<Content: View>: View {
    let title: String
    let systemImage: String
    let tint: Color
    let content: Content

    init(_ title: String, systemImage: String, tint: Color = .accentColor, @ViewBuilder content: () -> Content) {
        self.title = title
        self.systemImage = systemImage
        self.tint = tint
        self.content = content()
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Label(title, systemImage: systemImage)
                .font(.caption.bold())
                .foregroundStyle(tint)
            content
        }
        .padding(10)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(tint.opacity(0.08), in: RoundedRectangle(cornerRadius: 10))
        .overlay(
            RoundedRectangle(cornerRadius: 10)
                .strokeBorder(tint.opacity(0.18), lineWidth: 1)
        )
        .padding(.horizontal)
    }
}
