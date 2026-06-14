// ios/SalsaEventTracker/Views/Trips/TripsView.swift
import SwiftUI

struct TripsView: View {
    @Environment(AppModel.self) private var model
    @State private var showEditor = false
    @State private var editingTrip: Trip?
    @State private var showDeleteConfirm = false
    @State private var tripToDelete: Trip?

    private var schengenDaysUsed: Int {
        let allStays = model.trips.flatMap {
            SchengenCalculator.schengenStays(from: $0.places, schengenCountries: model.schengenCountries)
        }
        return SchengenCalculator.daysUsed(stays: allStays, checkDate: model.schengenCheckDate)
    }

    private var filteredTrips: [Trip] {
        model.trips.filter { trip in
            if !model.showHistoricalTrips && trip.endDate < DateUtils.todayString() { return false }
            if !model.tripFilterCountry.isEmpty {
                guard trip.places.contains(where: { $0.country == model.tripFilterCountry }) else { return false }
            }
            return true
        }
        .sorted { $0.startDate > $1.startDate }
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

                        Toggle("Show Past Trips", isOn: $model.showHistoricalTrips)
                            .padding(.horizontal)

                        LazyVStack(spacing: 10) {
                            ForEach(filteredTrips) { trip in
                                TripCard(
                                    trip: trip,
                                    schengenCountries: model.schengenCountries,
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
