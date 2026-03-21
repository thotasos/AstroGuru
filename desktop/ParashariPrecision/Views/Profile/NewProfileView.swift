import SwiftUI

struct NewProfileView: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject var profilesViewModel: ProfilesViewModel

    let onDismiss: () -> Void

    @State private var formState = FormState()
    @State private var showingValidationError = false
    @State private var validationErrorMessage = ""

    struct FormState {
        var name: String = ""
        var dob: Date = Date()
        var latitude: Double = 0.0
        var longitude: Double = 0.0
        var timezone: String = "UTC"
        var utcOffset: Double = 0.0
        var placeName: String = ""
        var ayanamsaId: Int = 1
        var notes: String = ""

        var isValid: Bool {
            !name.trimmingCharacters(in: .whitespaces).isEmpty &&
            latitude >= -90 && latitude <= 90 &&
            longitude >= -180 && longitude <= 180 &&
            !timezone.isEmpty
        }
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("Basic Information") {
                    TextField("Name", text: $formState.name)
                        .textFieldStyle(.roundedBorder)

                    DatePicker("Date of Birth", selection: $formState.dob, displayedComponents: [.date, .hourAndMinute])
                }

                Section("Location") {
                    TextField("Place Name", text: $formState.placeName)
                        .textFieldStyle(.roundedBorder)

                    HStack {
                        Text("Latitude")
                            .frame(width: 80, alignment: .leading)
                        TextField("Latitude", value: $formState.latitude, format: .number.precision(.fractionLength(4)))
                            .textFieldStyle(.roundedBorder)
                    }

                    HStack {
                        Text("Longitude")
                            .frame(width: 80, alignment: .leading)
                        TextField("Longitude", value: $formState.longitude, format: .number.precision(.fractionLength(4)))
                            .textFieldStyle(.roundedBorder)
                    }

                    Picker("Timezone", selection: $formState.timezone) {
                        ForEach(commonTimezones, id: \.self) { tz in
                            Text(tz).tag(tz)
                        }
                    }
                    .onChange(of: formState.timezone) { _, newTimezone in
                        formState.utcOffset = offsetFromTimezone(newTimezone)
                    }
                    .onAppear {
                        formState.utcOffset = offsetFromTimezone(formState.timezone)
                    }

                    HStack {
                        Text("UTC Offset")
                            .frame(width: 80, alignment: .leading)
                        Text(String(format: "%.1f hours", formState.utcOffset))
                            .foregroundStyle(.secondary)
                    }
                }

                Section("Calculation Settings") {
                    Picker("Ayanamsa", selection: $formState.ayanamsaId) {
                        Text("Raman").tag(1)
                        Text("Krishnamurti").tag(2)
                        Text("Yukteshwar").tag(3)
                        Text("Sriballav").tag(4)
                        Text("BN Bhasin").tag(5)
                        Text("JM Arya").tag(6)
                        Text("JM Sehgal").tag(7)
                    }
                }

                Section("Notes") {
                    TextEditor(text: $formState.notes)
                        .frame(minHeight: 80)
                }
            }
            .navigationTitle("New Profile")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                }

                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        saveProfile()
                    }
                    .disabled(!formState.isValid)
                }
            }
            .alert("Validation Error", isPresented: $showingValidationError) {
                Button("OK", role: .cancel) { }
            } message: {
                Text(validationErrorMessage)
            }
        }
    }

    private var commonTimezones: [String] {
        [
            "UTC",
            "America/New_York",
            "America/Chicago",
            "America/Denver",
            "America/Los_Angeles",
            "Europe/London",
            "Europe/Paris",
            "Europe/Berlin",
            "Asia/Kolkata",
            "Asia/Dubai",
            "Asia/Singapore",
            "Asia/Tokyo",
            "Australia/Sydney",
            "Pacific/Auckland"
        ]
    }

    private func offsetFromTimezone(_ timezone: String) -> Double {
        guard let tz = TimeZone(identifier: timezone) else { return 0.0 }
        let seconds = Double(tz.secondsFromGMT())
        return seconds / 3600.0
    }

    private func saveProfile() {
        guard formState.isValid else {
            validationErrorMessage = "Please fill in all required fields correctly."
            showingValidationError = true
            return
        }

        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime]
        formatter.timeZone = TimeZone(secondsFromGMT: 0)  // Always store as UTC

        let profile = Profile(
            name: formState.name.trimmingCharacters(in: .whitespaces),
            dobUTC: formatter.string(from: formState.dob),  // formatter handles timezone — no "Z" appended
            latitude: formState.latitude,
            longitude: formState.longitude,
            timezone: formState.timezone,
            utcOffset: formState.utcOffset,
            placeName: formState.placeName.isEmpty ? nil : formState.placeName,
            ayanamsaId: formState.ayanamsaId,
            notes: formState.notes.isEmpty ? nil : formState.notes
        )

        profilesViewModel.saveProfile(profile)
        onDismiss()
    }
}
