// ios/SalsaEventTracker/Views/EventList/EventListView.swift
import SwiftUI

struct EventListView: View {
    @Environment(AppModel.self) private var model

    private var availableYears: [String] {
        var seen = Set<String>()
        return model.flatEvents.compactMap { flat -> String? in
            let y = String(flat.edition.startDate.prefix(4))
            return seen.insert(y).inserted ? y : nil
        }.sorted()
    }

    private var availableCountries: [String] {
        var seen = Set<String>()
        return model.flatEvents
            .filter { flat in
                let matchesHistory = model.showHistoricalEvents || !flat.edition.isHistorical
                let matchesYear = model.filterYear.isEmpty || flat.edition.startDate.hasPrefix(model.filterYear)
                return matchesHistory && matchesYear
            }
            .compactMap { flat -> String? in
                let c = flat.edition.country
                return seen.insert(c).inserted ? c : nil
            }.sorted()
    }

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
            VStack(spacing: 0) {
                VStack(spacing: 8) {
                    ControlPanel("Filters", systemImage: "line.3.horizontal.decrease.circle", tint: .blue) {
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 10) {
                                Picker("Year", selection: $model.filterYear) {
                                    Text("All years").tag("")
                                    ForEach(availableYears, id: \.self) { y in Text(y).tag(y) }
                                }
                                .pickerStyle(.menu)
                                .buttonStyle(.bordered)

                                Picker("Month", selection: $model.filterMonth) {
                                    Text("All months").tag("")
                                    ForEach(Array(zip(monthNumbers, monthNames)), id: \.0) { num, name in
                                        Text(name).tag(num)
                                    }
                                }
                                .pickerStyle(.menu)
                                .buttonStyle(.bordered)

                                Picker("Country", selection: $model.filterCountry) {
                                    Text("All countries").tag("")
                                    ForEach(availableCountries, id: \.self) { c in Text(c).tag(c) }
                                }
                                .pickerStyle(.menu)
                                .buttonStyle(.bordered)

                                Picker("Size", selection: $model.filterSize) {
                                    Text("All sizes").tag("")
                                    ForEach(eventSizes, id: \.self) { s in Text(s.capitalized).tag(s) }
                                }
                                .pickerStyle(.menu)
                                .buttonStyle(.bordered)

                                Toggle("Show past", isOn: $model.showHistoricalEvents)
                                    .toggleStyle(.button)
                                    .font(.subheadline)
                            }
                        }
                    }

                    ControlPanel("Sort", systemImage: "arrow.up.arrow.down.circle", tint: .purple) {
                        Picker("Sort", selection: $model.eventSortOption) {
                            ForEach(EventSortOption.allCases, id: \.self) { opt in
                                Text(opt.rawValue).tag(opt)
                            }
                        }
                        .pickerStyle(.segmented)
                    }
                }
                .padding(.vertical, 8)

                Divider()

                ScrollView {
                    LazyVStack(spacing: 10) {
                        ForEach(filteredFlat) { flat in
                            EventCard(flat: flat)
                        }
                    }
                    .padding()
                }
                .refreshable { await model.loadPublicData() }
            }
            .navigationTitle(Tab.eventList.rawValue)
            .searchable(text: $model.searchQuery, prompt: "Search events…")
        }
    }

    private let monthNumbers = ["01","02","03","04","05","06","07","08","09","10","11","12"]
    private let monthNames   = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
    private let eventSizes   = ["small","medium","large","extra large"]
}
