// ios/SalsaEventTracker/Views/Trips/PTODayRow.swift
import SwiftUI

struct PTODayRow: View {
    @Binding var date: Date
    @Binding var amount: Double
    @Binding var notes: String
    var onRemove: () -> Void

    var body: some View {
        HStack {
            DatePicker("", selection: $date, displayedComponents: .date).labelsHidden()
            Picker("", selection: $amount) {
                Text("Full").tag(1.0)
                Text("Half").tag(0.5)
            }.pickerStyle(.segmented).frame(width: 120)
            TextField("Notes", text: $notes)
            Button(role: .destructive, action: onRemove) {
                Image(systemName: "minus.circle.fill").foregroundStyle(.red)
            }
        }
    }
}
