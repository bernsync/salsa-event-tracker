import SwiftData
import SwiftUI

struct FestivalListView: View {
    @Environment(\.modelContext) private var modelContext
    @Query(sort: \Festival.startDate) private var festivals: [Festival]
    @State private var searchText = ""
    @State private var isShowingNewFestival = false

    private var filteredFestivals: [Festival] {
        guard !searchText.isEmpty else { return festivals }

        return festivals.filter { festival in
            festival.name.localizedCaseInsensitiveContains(searchText)
                || festival.city.localizedCaseInsensitiveContains(searchText)
                || festival.country.localizedCaseInsensitiveContains(searchText)
        }
    }

    var body: some View {
        NavigationStack {
            List {
                ForEach(filteredFestivals) { festival in
                    NavigationLink {
                        FestivalDetailView(festival: festival)
                    } label: {
                        FestivalRow(festival: festival)
                    }
                }
                .onDelete(perform: deleteFestivals)
            }
            .navigationTitle("Salsa Festivals")
            .searchable(text: $searchText, prompt: "Search city, country, or event")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        isShowingNewFestival = true
                    } label: {
                        Image(systemName: "plus")
                    }
                    .accessibilityLabel("Add festival")
                }
            }
            .sheet(isPresented: $isShowingNewFestival) {
                FestivalEditorView()
            }
        }
    }

    private func deleteFestivals(at offsets: IndexSet) {
        offsets.map { filteredFestivals[$0] }.forEach(modelContext.delete)
    }
}

private struct FestivalRow: View {
    let festival: Festival

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(festival.name)
                .font(.headline)

            Text(festival.dateRangeText)
                .font(.subheadline)
                .foregroundStyle(.secondary)

            if !festival.locationText.isEmpty {
                Label(festival.locationText, systemImage: "mappin.and.ellipse")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(.vertical, 4)
    }
}
