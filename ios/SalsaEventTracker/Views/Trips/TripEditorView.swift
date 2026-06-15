// ios/SalsaEventTracker/Views/Trips/TripEditorView.swift
import SwiftUI

private struct PlaceDraft: Identifiable {
    let id = UUID()
    var city = ""; var country = ""; var startDate = Date(); var endDate = Date(); var role = "stay"
}

private struct PTODraft: Identifiable {
    let id = UUID()
    var date = Date(); var amount = 1.0; var notes = ""
}

struct TripEditorView: View {
    let trip: Trip?
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss

    @State private var label = ""
    @State private var startDate = Date()
    @State private var endDate = Date()
    @State private var notes = ""
    @State private var places: [PlaceDraft] = []
    @State private var ptoDays: [PTODraft] = []
    @State private var isSaving = false
    @State private var saveError: String?

    var body: some View {
        NavigationStack {
            Form {
                Section("Trip Details") {
                    TextField("Label", text: $label)
                    DatePicker("Start", selection: $startDate, displayedComponents: .date)
                    DatePicker("End", selection: $endDate, displayedComponents: .date)
                    TextField("Notes", text: $notes, axis: .vertical).lineLimit(3, reservesSpace: true)
                }
                Section {
                    ForEach($places) { $place in
                        TripPlaceRow(city: $place.city, country: $place.country,
                                     startDate: $place.startDate, endDate: $place.endDate,
                                     role: $place.role, onRemove: { places.removeAll { $0.id == place.id } })
                    }
                    Button { places.append(PlaceDraft()) } label: {
                        Label("Add Place", systemImage: "plus.circle")
                    }
                } header: { Text("Places") }
                Section {
                    ForEach($ptoDays) { $pto in
                        PTODayRow(date: $pto.date, amount: $pto.amount, notes: $pto.notes,
                                  onRemove: { ptoDays.removeAll { $0.id == pto.id } })
                    }
                    Button { ptoDays.append(PTODraft()) } label: {
                        Label("Add PTO Day", systemImage: "plus.circle")
                    }
                } header: { Text("PTO Days") }
                if let err = saveError {
                    Section { Text(err).foregroundStyle(.red) }
                }
            }
            .navigationTitle(trip == nil ? "New Trip" : "Edit Trip")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button(isSaving ? "Saving…" : "Save") {
                        Task { await save() }
                    }.disabled(label.isEmpty || isSaving)
                }
            }
        }
        .onAppear { populateFromTrip() }
    }

    private func populateFromTrip() {
        guard let t = trip else { return }
        label = t.label ?? ""
        startDate = DateUtils.date(from: t.startDate) ?? Date()
        endDate = DateUtils.date(from: t.endDate) ?? Date()
        notes = t.notes ?? ""
        places = t.places.sorted { ($0.sequence ?? 0) < ($1.sequence ?? 0) }.map {
            var d = PlaceDraft()
            d.city = $0.city; d.country = $0.country
            d.startDate = DateUtils.date(from: $0.startDate) ?? Date()
            d.endDate = DateUtils.date(from: $0.endDate) ?? Date()
            d.role = $0.travelRole ?? "stay"
            return d
        }
        ptoDays = t.ptoDays.map {
            var d = PTODraft()
            d.date = DateUtils.date(from: $0.ptoDate) ?? Date()
            d.amount = $0.amount
            d.notes = $0.notes ?? ""
            return d
        }
    }

    private func save() async {
        guard let token = model.authService.session?.accessToken,
              let userId = model.authService.session?.userId,
              let email = model.authService.session?.email else { return }
        isSaving = true
        saveError = nil
        let svc = model.supabase
        let tripBody: [String: Any] = [
            "owner_id": userId, "owner_email": email, "label": label,
            "start_date": DateUtils.string(from: startDate),
            "end_date": DateUtils.string(from: endDate),
            "notes": notes, "access_level": "owner"
        ]
        do {
            let savedTrip: Trip
            if let existing = trip {
                try await svc.updateTrip(id: existing.id, body: tripBody, token: token)
                savedTrip = existing
            } else {
                savedTrip = try await svc.createTrip(tripBody, token: token)
            }
            let placeBodies: [[String: Any]] = places.enumerated().map { idx, p in
                ["trip_id": savedTrip.id, "owner_id": userId, "owner_email": email,
                 "city": p.city, "country": p.country,
                 "start_date": DateUtils.string(from: p.startDate),
                 "end_date": DateUtils.string(from: p.endDate),
                 "travel_role": p.role, "sequence": idx, "access_level": "owner"]
            }
            let ptoBodies: [[String: Any]] = ptoDays.map { p in
                ["trip_id": savedTrip.id, "owner_id": userId, "owner_email": email,
                 "pto_date": DateUtils.string(from: p.date), "amount": p.amount,
                 "notes": p.notes, "access_level": "owner"]
            }
            try await svc.replaceTripPlaces(tripId: savedTrip.id, places: placeBodies, token: token)
            try await svc.replacePTODays(tripId: savedTrip.id, ptoDays: ptoBodies, token: token)
            await model.loadPrivateData()
            dismiss()
        } catch {
            saveError = error.localizedDescription
        }
        isSaving = false
    }
}
