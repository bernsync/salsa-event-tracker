// ios/SalsaEventTracker/Views/FestivalList/FestivalListView.swift
import SwiftUI

struct FestivalListView: View {
    @Environment(AppModel.self) private var model

    private var filteredEvents: [Event] {
        model.events.filter { event in
            if !TextUtils.matches(event: event, edition: event.editions.first ?? EventEdition.placeholder,
                                  query: model.searchQuery) { return false }
            return true
        }
        .sorted { $0.name < $1.name }
    }

    var body: some View {
        @Bindable var model = model
        NavigationStack {
            List(filteredEvents) { event in
                FestivalRow(event: event)
            }
            .navigationTitle("Festivals")
            .searchable(text: $model.searchQuery, prompt: "Search festivals…")
        }
    }
}
