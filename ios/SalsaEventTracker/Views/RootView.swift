// ios/SalsaEventTracker/Views/RootView.swift
import SwiftUI

struct RootView: View {
    @Environment(AppModel.self) private var model
    @State private var showLogin = false

    var body: some View {
        @Bindable var model = model
        TabView(selection: $model.selectedTab) {
            CalendarView()
                .tabItem { Label("Calendar", systemImage: "calendar") }
                .tag(Tab.calendar)

            EventListView()
                .tabItem { Label("Events", systemImage: "list.bullet") }
                .tag(Tab.eventList)

            FestivalListView()
                .tabItem { Label("Festivals", systemImage: "music.note.list") }
                .tag(Tab.festivalList)

            TripsView()
                .tabItem { Label("Trips", systemImage: "airplane") }
                .tag(Tab.trips)

            ReviewsView()
                .tabItem { Label("Reviews", systemImage: "star.fill") }
                .tag(Tab.reviews)
        }
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                if model.isSignedIn {
                    Button("Sign Out") { model.signOut() }
                } else {
                    Button("Sign In") { showLogin = true }
                }
            }
        }
        .sheet(isPresented: $showLogin) {
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
            Button("Retry") { Task { await model.loadPublicData() } }
            Button("Dismiss", role: .cancel) { model.appError = nil }
        } message: {
            Text(model.appError?.localizedDescription ?? "")
        }
    }
}
