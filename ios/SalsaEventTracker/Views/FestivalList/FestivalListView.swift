// ios/SalsaEventTracker/Views/FestivalList/FestivalListView.swift
import SwiftUI

struct FestivalListView: View {
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
                model.festivalFilterYear.isEmpty || flat.edition.startDate.hasPrefix(model.festivalFilterYear)
            }
            .compactMap { flat -> String? in
                let c = flat.edition.country
                return seen.insert(c).inserted ? c : nil
            }.sorted()
    }

    // An event passes if any of its editions matches all active filters
    private var filteredEvents: [Event] {
        model.events.filter { event in
            guard model.searchQuery.isEmpty ||
                  event.editions.contains(where: { TextUtils.matches(event: event, edition: $0, query: model.searchQuery) })
            else { return false }
            // At least one edition must satisfy all active filters
            return event.editions.contains { ed in
                if !model.festivalFilterYear.isEmpty && !ed.startDate.hasPrefix(model.festivalFilterYear) { return false }
                if !model.festivalFilterMonth.isEmpty {
                    let mm = String(ed.startDate.dropFirst(5).prefix(2))
                    if mm != model.festivalFilterMonth { return false }
                }
                if !model.festivalFilterCountry.isEmpty && ed.country != model.festivalFilterCountry { return false }
                if !model.festivalFilterSize.isEmpty && (ed.eventSize ?? "") != model.festivalFilterSize { return false }
                return true
            }
        }
        .sorted { $0.name < $1.name }
    }

    var body: some View {
        @Bindable var model = model
        NavigationStack {
            VStack(spacing: 0) {
                // ── Filter bar ──────────────────────────────────────────────
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 10) {
                        Picker("Year", selection: $model.festivalFilterYear) {
                            Text("All years").tag("")
                            ForEach(availableYears, id: \.self) { y in Text(y).tag(y) }
                        }
                        .pickerStyle(.menu)
                        .buttonStyle(.bordered)
                        .onChange(of: model.festivalFilterYear) { model.festivalFilterCountry = "" }

                        Picker("Month", selection: $model.festivalFilterMonth) {
                            Text("All months").tag("")
                            ForEach(Array(zip(monthNumbers, monthNames)), id: \.0) { num, name in
                                Text(name).tag(num)
                            }
                        }
                        .pickerStyle(.menu)
                        .buttonStyle(.bordered)

                        Picker("Country", selection: $model.festivalFilterCountry) {
                            Text("All countries").tag("")
                            ForEach(availableCountries, id: \.self) { c in Text(c).tag(c) }
                        }
                        .pickerStyle(.menu)
                        .buttonStyle(.bordered)

                        Picker("Size", selection: $model.festivalFilterSize) {
                            Text("All sizes").tag("")
                            ForEach(eventSizes, id: \.self) { s in Text(s.capitalized).tag(s) }
                        }
                        .pickerStyle(.menu)
                        .buttonStyle(.bordered)
                    }
                    .padding(.horizontal)
                }
                .padding(.vertical, 6)

                Divider()

                List {
                    let sevenDaysAgo = Calendar.current.date(byAdding: .day, value: -7, to: Date())
                        .map { DateUtils.string(from: $0) } ?? ""
                    let recentFlats = model.flatEvents.filter {
                        ($0.edition.addedOn ?? "") >= sevenDaysAgo && !$0.edition.isHistorical
                    }
                    if !recentFlats.isEmpty
                        && model.festivalFilterYear.isEmpty
                        && model.festivalFilterMonth.isEmpty
                        && model.festivalFilterCountry.isEmpty
                        && model.festivalFilterSize.isEmpty {
                        Section("Recently Added") {
                            ForEach(recentFlats.prefix(5)) { flat in
                                FestivalRow(event: flat.event)
                            }
                        }
                    }
                    Section("All Festivals") {
                        ForEach(filteredEvents) { event in
                            FestivalRow(event: event)
                        }
                    }
                }
                .refreshable { await model.loadPublicData() }
            }
            .navigationTitle("Festivals")
            .searchable(text: $model.searchQuery, prompt: "Search festivals…")
        }
    }

    private let monthNumbers = ["01","02","03","04","05","06","07","08","09","10","11","12"]
    private let monthNames   = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
    private let eventSizes   = ["small","medium","large","extra large"]
}
