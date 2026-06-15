// ios/SalsaEventTracker/Views/Trips/TripsView.swift
import SwiftUI

private struct MonthOption: Identifiable {
    let id: String
    let name: String
}

private let monthOptions: [MonthOption] = [
    .init(id: "01", name: "Jan"), .init(id: "02", name: "Feb"),
    .init(id: "03", name: "Mar"), .init(id: "04", name: "Apr"),
    .init(id: "05", name: "May"), .init(id: "06", name: "Jun"),
    .init(id: "07", name: "Jul"), .init(id: "08", name: "Aug"),
    .init(id: "09", name: "Sep"), .init(id: "10", name: "Oct"),
    .init(id: "11", name: "Nov"), .init(id: "12", name: "Dec")
]

struct TripsView: View {
    @Environment(AppModel.self) private var model
    @State private var showEditor = false
    @State private var editingTrip: Trip?
    @State private var showDeleteConfirm = false
    @State private var tripToDelete: Trip?

    private var currentYear: String {
        String(Calendar.current.component(.year, from: Date()))
    }

    private var schengenDaysUsed: Int {
        let allStays = model.trips.flatMap {
            SchengenCalculator.schengenStays(from: $0.places, schengenCountries: model.schengenCountries)
        }
        return SchengenCalculator.daysUsed(stays: allStays, checkDate: model.schengenCheckDate)
    }

    private var availableYears: [String] {
        var years = Set<String>()
        for trip in model.trips {
            years.insert(String(trip.startDate.prefix(4)))
            years.insert(String(trip.endDate.prefix(4)))
        }
        return years.sorted().reversed()
    }

    private var availableCountries: [String] {
        var countries = Set<String>()
        for trip in model.trips {
            for place in trip.places where !place.country.isEmpty {
                countries.insert(place.country)
            }
        }
        return countries.sorted()
    }

    private var currentYearPTO: (total: Double, full: Int, half: Int) {
        let ptoDays = model.trips.flatMap { $0.ptoDays }
            .filter { $0.ptoDate.hasPrefix(currentYear) }
        let total = ptoDays.reduce(0.0) { $0 + $1.amount }
        let full = ptoDays.filter { $0.amount >= 1.0 }.count
        let half = ptoDays.filter { $0.amount > 0 && $0.amount < 1.0 }.count
        return (total, full, half)
    }

    private var filteredTrips: [Trip] {
        model.trips.filter { trip in
            if !model.showHistoricalTrips && trip.endDate < DateUtils.todayString() { return false }
            if model.showSchengenImpactingTrips {
                guard SchengenCalculator.hasSchengenImpact(
                    trip: trip, checkDate: model.schengenCheckDate,
                    schengenCountries: model.schengenCountries
                ) else { return false }
            }
            if !model.tripFilterCountry.isEmpty {
                guard trip.places.contains(where: { $0.country == model.tripFilterCountry }) else { return false }
            }
            if !model.tripFilterYear.isEmpty {
                let tripStartYear = String(trip.startDate.prefix(4))
                let tripEndYear = String(trip.endDate.prefix(4))
                guard tripStartYear <= model.tripFilterYear && tripEndYear >= model.tripFilterYear else { return false }
            }
            if !model.tripFilterMonth.isEmpty {
                let startM = String(trip.startDate.dropFirst(5).prefix(2))
                let endM = String(trip.endDate.dropFirst(5).prefix(2))
                let startY = String(trip.startDate.prefix(4))
                let endY = String(trip.endDate.prefix(4))
                if startY == endY {
                    guard startM <= model.tripFilterMonth && endM >= model.tripFilterMonth else { return false }
                }
                // multi-year trips contain every month, so they pass
            }
            return true
        }
        .sorted { $0.startDate < $1.startDate }
    }

    var body: some View {
        @Bindable var model = model
        NavigationStack {
            if !model.isSignedIn {
                ContentUnavailableView {
                    Label("Sign In Required", systemImage: "lock.fill")
                } description: {
                    Text("Sign in to view and manage your trips.")
                } actions: {
                    Button("Sign In") { model.showLogin = true }
                        .buttonStyle(.borderedProminent)
                }
            } else {
                ScrollView {
                    VStack(spacing: 16) {
                        // Schengen counter
                        VStack(spacing: 4) {
                            HStack {
                                Text("Schengen Days Used")
                                    .font(.subheadline).foregroundStyle(.secondary)
                                Spacer()
                                DatePicker("As of", selection: Binding(
                                    get: { DateUtils.date(from: model.schengenCheckDate) ?? Date() },
                                    set: { model.schengenCheckDate = DateUtils.string(from: $0) }
                                ), displayedComponents: .date)
                                .labelsHidden()
                            }
                            HStack {
                                Text("\(schengenDaysUsed) / 90")
                                    .font(.title2.bold())
                                    .foregroundStyle(schengenDaysUsed > 80 ? .red : schengenDaysUsed > 60 ? .orange : .primary)
                                Spacer()
                                Text("\(90 - schengenDaysUsed) remaining")
                                    .font(.caption).foregroundStyle(.secondary)
                            }
                            ProgressView(value: Double(schengenDaysUsed), total: 90)
                                .tint(schengenDaysUsed > 80 ? .red : .accentColor)
                        }
                        .padding()
                        .background(.background.secondary, in: RoundedRectangle(cornerRadius: 12))
                        .padding(.horizontal)

                        // PTO year summary
                        let pto = currentYearPTO
                        if pto.total > 0 {
                            VStack(alignment: .leading, spacing: 6) {
                                Text("\(currentYear) PTO")
                                    .font(.subheadline.bold())
                                HStack(spacing: 20) {
                                    VStack(alignment: .leading, spacing: 2) {
                                        Text("\(pto.total, specifier: "%.4g")").font(.title3.bold()).foregroundStyle(.orange)
                                        Text("days used").font(.caption2).foregroundStyle(.secondary)
                                    }
                                    if pto.full > 0 {
                                        VStack(alignment: .leading, spacing: 2) {
                                            Text("\(pto.full)").font(.title3.bold())
                                            Text("full days").font(.caption2).foregroundStyle(.secondary)
                                        }
                                    }
                                    if pto.half > 0 {
                                        VStack(alignment: .leading, spacing: 2) {
                                            Text("\(pto.half)").font(.title3.bold())
                                            Text("half days").font(.caption2).foregroundStyle(.secondary)
                                        }
                                    }
                                }
                            }
                            .padding()
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(.background.secondary, in: RoundedRectangle(cornerRadius: 12))
                            .padding(.horizontal)
                        }

                        // Filters
                        VStack(alignment: .leading, spacing: 10) {
                            HStack(spacing: 10) {
                                Toggle("Past Trips", isOn: $model.showHistoricalTrips)
                                    .toggleStyle(.button)
                                    .font(.caption)
                                Toggle("Schengen Only", isOn: $model.showSchengenImpactingTrips)
                                    .toggleStyle(.button)
                                    .font(.caption)
                                Spacer()
                            }
                            HStack(spacing: 8) {
                                Menu {
                                    Button("All Years") { model.tripFilterYear = "" }
                                    ForEach(availableYears, id: \.self) { year in
                                        Button(year) { model.tripFilterYear = year }
                                    }
                                } label: {
                                    Label(model.tripFilterYear.isEmpty ? "Year" : model.tripFilterYear, systemImage: "calendar")
                                        .font(.caption)
                                        .padding(.horizontal, 8).padding(.vertical, 5)
                                        .background(model.tripFilterYear.isEmpty ? .clear : .accentColor.opacity(0.15),
                                                    in: RoundedRectangle(cornerRadius: 7))
                                }
                                Menu {
                                    Button("All Months") { model.tripFilterMonth = "" }
                                    ForEach(monthOptions) { m in
                                        Button(m.name) { model.tripFilterMonth = m.id }
                                    }
                                } label: {
                                    let monthName = monthOptions.first(where: { $0.id == model.tripFilterMonth })?.name
                                    Label(monthName ?? "Month", systemImage: "calendar.badge.clock")
                                        .font(.caption)
                                        .padding(.horizontal, 8).padding(.vertical, 5)
                                        .background(model.tripFilterMonth.isEmpty ? .clear : .accentColor.opacity(0.15),
                                                    in: RoundedRectangle(cornerRadius: 7))
                                }
                                if !availableCountries.isEmpty {
                                    Menu {
                                        Button("All Countries") { model.tripFilterCountry = "" }
                                        ForEach(availableCountries, id: \.self) { country in
                                            Button(country) { model.tripFilterCountry = country }
                                        }
                                    } label: {
                                        Label(model.tripFilterCountry.isEmpty ? "Country" : model.tripFilterCountry, systemImage: "globe")
                                            .font(.caption)
                                            .padding(.horizontal, 8).padding(.vertical, 5)
                                            .background(model.tripFilterCountry.isEmpty ? .clear : .accentColor.opacity(0.15),
                                                        in: RoundedRectangle(cornerRadius: 7))
                                    }
                                }
                            }
                        }
                        .padding(.horizontal)

                        LazyVStack(spacing: 10) {
                            ForEach(filteredTrips) { trip in
                                TripCard(
                                    trip: trip,
                                    schengenCountries: model.schengenCountries,
                                    allTrips: model.trips,
                                    onEdit: { editingTrip = trip; showEditor = true },
                                    onDelete: { tripToDelete = trip; showDeleteConfirm = true }
                                )
                            }
                        }
                        .padding(.horizontal)
                    }
                    .padding(.vertical)
                }
                .refreshable { await model.loadPrivateData() }
                .navigationTitle("Trips")
                .toolbar {
                    ToolbarItem(placement: .topBarLeading) {
                        Button("Sign Out", role: .destructive) { model.signOut() }
                            .font(.subheadline)
                    }
                    ToolbarItem(placement: .topBarTrailing) {
                        Button { editingTrip = nil; showEditor = true } label: {
                            Image(systemName: "plus")
                        }
                    }
                }
                .sheet(isPresented: $showEditor) {
                    TripEditorView(trip: editingTrip)
                }
                .confirmationDialog("Delete Trip?", isPresented: $showDeleteConfirm, titleVisibility: .visible) {
                    Button("Delete", role: .destructive) {
                        if let trip = tripToDelete {
                            Task { await deleteTrip(trip) }
                        }
                    }
                }
                .task { await model.loadPrivateData() }
            }
        }
    }

    private func deleteTrip(_ trip: Trip) async {
        guard let token = model.authService.session?.accessToken else { return }
        try? await model.supabase.deleteTrip(id: trip.id, token: token)
        await model.loadPrivateData()
    }
}
