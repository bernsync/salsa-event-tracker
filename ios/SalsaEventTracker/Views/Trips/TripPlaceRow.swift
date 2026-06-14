// ios/SalsaEventTracker/Views/Trips/TripPlaceRow.swift
import SwiftUI

struct TripPlaceRow: View {
    @Binding var city: String
    @Binding var country: String
    @Binding var startDate: Date
    @Binding var endDate: Date
    @Binding var role: String
    var onRemove: () -> Void

    let roles = ["stay", "organizer", "vendor"]

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                TextField("City", text: $city)
                TextField("Country", text: $country)
                Button(role: .destructive, action: onRemove) {
                    Image(systemName: "minus.circle.fill").foregroundStyle(.red)
                }
            }
            HStack {
                DatePicker("From", selection: $startDate, displayedComponents: .date).labelsHidden()
                Text("–")
                DatePicker("To", selection: $endDate, displayedComponents: .date).labelsHidden()
            }
            Picker("Role", selection: $role) {
                ForEach(roles, id: \.self) { Text($0.capitalized).tag($0) }
            }.pickerStyle(.segmented)
        }
        .padding(.vertical, 4)
    }
}
