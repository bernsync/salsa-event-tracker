import SwiftData
import SwiftUI

struct FestivalEditorView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.modelContext) private var modelContext

    private let existingFestival: Festival?

    @State private var name: String
    @State private var startDate: Date
    @State private var endDate: Date
    @State private var city: String
    @State private var country: String
    @State private var venue: String
    @State private var websiteURL: String
    @State private var instagramHandle: String
    @State private var facebookURL: String
    @State private var djs: String
    @State private var artists: String
    @State private var priceSummary: String
    @State private var currency: String
    @State private var notes: String

    init(festival: Festival? = nil) {
        self.existingFestival = festival
        _name = State(initialValue: festival?.name ?? "")
        _startDate = State(initialValue: festival?.startDate ?? .now)
        _endDate = State(initialValue: festival?.endDate ?? .now)
        _city = State(initialValue: festival?.city ?? "")
        _country = State(initialValue: festival?.country ?? "")
        _venue = State(initialValue: festival?.venue ?? "")
        _websiteURL = State(initialValue: festival?.websiteURL ?? "")
        _instagramHandle = State(initialValue: festival?.instagramHandle ?? "")
        _facebookURL = State(initialValue: festival?.facebookURL ?? "")
        _djs = State(initialValue: festival?.djs ?? "")
        _artists = State(initialValue: festival?.artists ?? "")
        _priceSummary = State(initialValue: festival?.priceSummary ?? "")
        _currency = State(initialValue: festival?.currency ?? "EUR")
        _notes = State(initialValue: festival?.notes ?? "")
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("Basics") {
                    TextField("Festival name", text: $name)
                    DatePicker("Start", selection: $startDate, displayedComponents: [.date])
                    DatePicker("End", selection: $endDate, displayedComponents: [.date])
                    TextField("City", text: $city)
                    TextField("Country", text: $country)
                    TextField("Venue", text: $venue)
                }

                Section("Sources") {
                    TextField("Website", text: $websiteURL)
                        .textInputAutocapitalization(.never)
                        .keyboardType(.URL)
                    TextField("Instagram handle", text: $instagramHandle)
                        .textInputAutocapitalization(.never)
                    TextField("Facebook URL", text: $facebookURL)
                        .textInputAutocapitalization(.never)
                        .keyboardType(.URL)
                }

                Section("Details") {
                    TextField("DJs", text: $djs, axis: .vertical)
                    TextField("Artists / instructors", text: $artists, axis: .vertical)
                    TextField("Cost summary", text: $priceSummary, axis: .vertical)
                    TextField("Currency", text: $currency)
                    TextField("Notes", text: $notes, axis: .vertical)
                }
            }
            .navigationTitle(existingFestival == nil ? "New Festival" : "Edit Festival")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                }

                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        save()
                        dismiss()
                    }
                    .disabled(name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }
            }
        }
    }

    private func save() {
        if let existingFestival {
            existingFestival.name = name
            existingFestival.startDate = startDate
            existingFestival.endDate = endDate
            existingFestival.city = city
            existingFestival.country = country
            existingFestival.venue = venue
            existingFestival.websiteURL = websiteURL
            existingFestival.instagramHandle = instagramHandle
            existingFestival.facebookURL = facebookURL
            existingFestival.djs = djs
            existingFestival.artists = artists
            existingFestival.priceSummary = priceSummary
            existingFestival.currency = currency
            existingFestival.notes = notes
            existingFestival.updatedAt = .now
        } else {
            let festival = Festival(
                name: name,
                startDate: startDate,
                endDate: endDate,
                city: city,
                country: country,
                venue: venue,
                websiteURL: websiteURL,
                instagramHandle: instagramHandle,
                facebookURL: facebookURL,
                djs: djs,
                artists: artists,
                priceSummary: priceSummary,
                currency: currency,
                notes: notes
            )
            modelContext.insert(festival)
        }
    }
}
