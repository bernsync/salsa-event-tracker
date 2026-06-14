// ios/SalsaEventTracker/Views/EventList/EventListView.swift
import SwiftUI

struct EventListView: View {
    @Environment(AppModel.self) private var model

    private var filteredFlat: [FlatEvent] {
        model.flatEvents
            .filter { flat in
                guard TextUtils.matches(event: flat.event, edition: flat.edition, query: model.searchQuery) else { return false }
                if !model.showHistoricalEvents && flat.edition.isHistorical { return false }
                if !model.filterYear.isEmpty && !flat.edition.startDate.hasPrefix(model.filterYear) { return false }
                if !model.filterMonth.isEmpty {
                    let mm = String(flat.edition.startDate.dropFirst(5).prefix(2))
                    if mm != model.filterMonth { return false }
                }
                if !model.filterCountry.isEmpty && flat.edition.country != model.filterCountry { return false }
                if !model.filterSize.isEmpty && (flat.edition.eventSize ?? "") != model.filterSize { return false }
                return true
            }
            .sorted {
                switch model.eventSortOption {
                case .date: return $0.edition.startDate < $1.edition.startDate
                case .name: return $0.event.name < $1.event.name
                case .country: return $0.edition.country < $1.edition.country
                }
            }
    }

    var body: some View {
        @Bindable var model = model
        NavigationStack {
            ScrollView {
                LazyVStack(spacing: 10) {
                    ForEach(filteredFlat) { flat in
                        EventCard(flat: flat)
                    }
                }
                .padding()
            }
            .navigationTitle("Events")
            .searchable(text: $model.searchQuery, prompt: "Search events…")
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Menu {
                        Toggle("Show Past Events", isOn: $model.showHistoricalEvents)
                        Picker("Sort", selection: $model.eventSortOption) {
                            ForEach(EventSortOption.allCases, id: \.self) { opt in
                                Text(opt.rawValue).tag(opt)
                            }
                        }
                    } label: {
                        Image(systemName: "line.3.horizontal.decrease.circle")
                    }
                }
            }
        }
    }
}
