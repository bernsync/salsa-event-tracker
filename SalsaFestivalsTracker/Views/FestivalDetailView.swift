import SwiftData
import SwiftUI

struct FestivalDetailView: View {
    @Environment(\.modelContext) private var modelContext
    @Bindable var festival: Festival
    @State private var isEditing = false
    @State private var isReviewing = false

    var latestReview: FestivalReview? {
        festival.reviews.sorted { $0.reviewedAt > $1.reviewedAt }.first
    }

    var body: some View {
        List {
            Section {
                VStack(alignment: .leading, spacing: 10) {
                    Text(festival.name)
                        .font(.title2.bold())

                    Label(festival.dateRangeText, systemImage: "calendar")

                    if !festival.locationText.isEmpty {
                        Label(festival.locationText, systemImage: "mappin.and.ellipse")
                    }

                    if !festival.venue.isEmpty {
                        Label(festival.venue, systemImage: "building.2")
                    }
                }
                .padding(.vertical, 6)
            }

            Section("Sources") {
                LinkRow(title: "Website", value: festival.websiteURL)
                LinkRow(title: "Instagram", value: festival.instagramHandle)
                LinkRow(title: "Facebook", value: festival.facebookURL)
            }

            Section("Event Info") {
                DetailRow(title: "DJs", value: festival.djs)
                DetailRow(title: "Artists", value: festival.artists)
                DetailRow(title: "Cost", value: festival.priceSummary)
                DetailRow(title: "Currency", value: festival.currency)
                DetailRow(title: "Notes", value: festival.notes)
            }

            Section("Your Review") {
                if let latestReview {
                    HStack {
                        Text("Total Score")
                        Spacer()
                        Label(String(format: "%.1f", latestReview.totalScore), systemImage: "star.fill")
                            .foregroundStyle(.yellow)
                    }

                    if !latestReview.topReasonToAttend.isEmpty {
                        DetailRow(title: "Top Reason", value: latestReview.topReasonToAttend)
                    }
                } else {
                    Text("No review yet")
                        .foregroundStyle(.secondary)
                }

                Button {
                    isReviewing = true
                } label: {
                    Label(latestReview == nil ? "Add Review" : "Add Another Review", systemImage: "square.and.pencil")
                }
            }
        }
        .navigationTitle("Event")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button("Edit") {
                    isEditing = true
                }
            }
        }
        .sheet(isPresented: $isEditing) {
            FestivalEditorView(festival: festival)
        }
        .sheet(isPresented: $isReviewing) {
            ReviewEditorView(festival: festival)
        }
    }
}

private struct DetailRow: View {
    let title: String
    let value: String

    var body: some View {
        if !value.isEmpty {
            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                Text(value)
            }
        }
    }
}

private struct LinkRow: View {
    let title: String
    let value: String

    var body: some View {
        if !value.isEmpty {
            if let url = resolvedURL {
                Link(destination: url) {
                    HStack {
                        Text(title)
                        Spacer()
                        Text(value)
                            .foregroundStyle(.secondary)
                    }
                }
            } else {
                DetailRow(title: title, value: value)
            }
        }
    }

    private var resolvedURL: URL? {
        if value.hasPrefix("@") {
            return URL(string: "https://instagram.com/\(value.dropFirst())")
        }

        if value.hasPrefix("http") {
            return URL(string: value)
        }

        return nil
    }
}
