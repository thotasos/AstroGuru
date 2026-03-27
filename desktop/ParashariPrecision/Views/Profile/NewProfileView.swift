import SwiftUI
import MapKit

struct NewProfileView: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject var profilesViewModel: ProfilesViewModel

    let onDismiss: () -> Void
    var editingProfile: Profile?

    @State private var formState: FormState
    @State private var showingValidationError = false
    @State private var validationErrorMessage = ""
    @State private var showingRecalculationAlert = false
    @State private var locationSearchText = ""
    @State private var searchResults: [MKMapItem] = []
    @State private var isSearching = false
    @State private var timezoneSearchText = ""
    /// Original UTC date string from the profile - preserved to detect if user changed the date
    @State private var originalDobUTC: String?
    /// Original Date from DatePicker at load time - used to detect if user actually changed the date
    @State private var originalDatePickerDate: Date?
    /// Original birth timezone date components - preserved to avoid timezone conversion issues
    @State private var originalBirthDateComponents: DateComponents?

    struct FormState {
        var name: String = ""
        var dob: Date = Date()
        var latitude: Double = 0.0
        var longitude: Double = 0.0
        var timezone: String = "UTC"
        var utcOffset: Double = 0.0
        var useBirthTimezoneForPredictions: Bool = true  // true = use birth timezone, false = use custom prediction timezone
        var predictionTimezone: String = "UTC"  // Custom timezone for predictions (when useBirthTimezoneForPredictions is false)
        var placeName: String = ""
        var ayanamsaId: Int = 1
        var notes: String = ""

        var isValid: Bool {
            !name.trimmingCharacters(in: .whitespaces).isEmpty &&
            latitude >= -90 && latitude <= 90 &&
            longitude >= -180 && longitude <= 180 &&
            !timezone.isEmpty
        }

        init() {}
    }

    init(onDismiss: @escaping () -> Void, editingProfile: Profile? = nil) {
        self.onDismiss = onDismiss
        self.editingProfile = editingProfile
        let initialState = FormState()
        _formState = State(initialValue: initialState)
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
                        .onChange(of: formState.placeName) { _, newValue in
                            locationSearchText = newValue
                        }

                    if !searchResults.isEmpty {
                        ForEach(searchResults, id: \.self) { item in
                            Button {
                                selectLocation(item)
                            } label: {
                                VStack(alignment: .leading) {
                                    Text(item.name ?? "Unknown")
                                        .font(.subheadline)
                                    if let address = item.placemark.title {
                                        Text(address)
                                            .font(.caption)
                                            .foregroundStyle(.secondary)
                                    }
                                }
                            }
                            .buttonStyle(.plain)
                        }
                    }

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

                    VStack(alignment: .leading, spacing: 4) {
                        TextField("Search Timezone", text: $timezoneSearchText)
                            .textFieldStyle(.roundedBorder)

                        if !filteredTimezones.isEmpty && !timezoneSearchText.isEmpty {
                            ScrollView {
                                VStack(alignment: .leading, spacing: 2) {
                                    ForEach(filteredTimezones.prefix(20), id: \.self) { tz in
                                        Button {
                                            formState.timezone = tz
                                            formState.utcOffset = offsetFromTimezone(tz)
                                            timezoneSearchText = ""
                                        } label: {
                                            Text(tz)
                                                .font(.caption)
                                                .frame(maxWidth: .infinity, alignment: .leading)
                                        }
                                        .buttonStyle(.plain)
                                        .padding(.vertical, 4)
                                        .padding(.horizontal, 8)
                                        .background(Color(nsColor: .controlBackgroundColor))
                                        .cornerRadius(4)
                                    }
                                }
                            }
                            .frame(maxHeight: 150)
                        }
                    }

                    Picker("Timezone", selection: $formState.timezone) {
                        ForEach(sortedTimezones, id: \.self) { tz in
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

                Section("Predictions Timezone") {
                    Toggle("Use Birth Timezone", isOn: $formState.useBirthTimezoneForPredictions)

                    if !formState.useBirthTimezoneForPredictions {
                        Picker("Prediction Timezone", selection: $formState.predictionTimezone) {
                            ForEach(sortedTimezones, id: \.self) { tz in
                                Text(tz).tag(tz)
                            }
                        }

                        HStack {
                            Text("Current Time Here")
                                .foregroundStyle(.secondary)
                            Spacer()
                            Button("Set to Current Timezone") {
                                formState.predictionTimezone = TimeZone.current.identifier
                            }
                        }
                    } else {
                        Text("Day/month predictions will use birth timezone (\(formState.timezone))")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }

                Section("Notes") {
                    TextEditor(text: $formState.notes)
                        .frame(minHeight: 80)
                }
            }
            .navigationTitle(editingProfile == nil ? "New Profile" : "Edit Profile")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                }

                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        if editingProfile != nil {
                            showingRecalculationAlert = true
                        } else {
                            saveProfile()
                        }
                    }
                    .disabled(!formState.isValid)
                }
            }
            .alert("Validation Error", isPresented: $showingValidationError) {
                Button("OK", role: .cancel) { }
            } message: {
                Text(validationErrorMessage)
            }
            .alert("Recalculation Required", isPresented: $showingRecalculationAlert) {
                Button("Cancel", role: .cancel) { }
                Button("Save Anyway") {
                    saveProfile()
                }
            } message: {
                Text("Profile changes will trigger a full recalculation of all astrological data including Dasha periods and predictions. This may take a moment.")
            }
            .onAppear {
                if let profile = editingProfile {
                    formState.name = profile.name
                    formState.latitude = profile.latitude
                    formState.longitude = profile.longitude
                    formState.timezone = profile.timezone
                    formState.utcOffset = profile.utcOffset
                    formState.placeName = profile.placeName ?? ""
                    formState.ayanamsaId = profile.ayanamsaId
                    formState.notes = profile.notes ?? ""

                    // Load prediction timezone settings
                    if let predTz = profile.predictionTimezone {
                        formState.useBirthTimezoneForPredictions = false
                        formState.predictionTimezone = predTz
                    } else {
                        formState.useBirthTimezoneForPredictions = true
                        formState.predictionTimezone = profile.timezone
                    }

                    // Store original UTC string for preservation
                    originalDobUTC = profile.dobUTC

                    // Use dobDate and shift it so DatePicker displays correct birth timezone time
                    if let dobDate = profile.dobDate {
                        formState.dob = dateForBirthTimezonePicker(date: dobDate, birthTimezone: profile.timezone)
                        originalDatePickerDate = dobDate  // Store original UTC Date for comparison
                    } else {
                        formState.dob = Date()
                        originalDatePickerDate = Date()
                    }
                }
            }
            .onChange(of: locationSearchText) { _, newValue in
                searchLocations(query: newValue)
            }
        }
    }

    private var sortedTimezones: [String] {
        TimeZone.knownTimeZoneIdentifiers.sorted()
    }

    private var filteredTimezones: [String] {
        guard !timezoneSearchText.isEmpty else { return [] }
        let query = timezoneSearchText.lowercased()
        return sortedTimezones.filter { $0.lowercased().contains(query) }
    }

    private func searchLocations(query: String) {
        guard query.count >= 2 else {
            searchResults = []
            return
        }

        isSearching = true
        let request = MKLocalSearch.Request()
        request.naturalLanguageQuery = query

        let search = MKLocalSearch(request: request)
        search.start { response, error in
            isSearching = false
            if let error = error {
                print("Location search error: \(error.localizedDescription)")
                searchResults = []
                return
            }
            searchResults = response?.mapItems ?? []
        }
    }

    private func selectLocation(_ item: MKMapItem) {
        formState.placeName = item.name ?? ""
        if let coordinate = item.placemark.location?.coordinate {
            formState.latitude = coordinate.latitude
            formState.longitude = coordinate.longitude
        }
        searchResults = []
        locationSearchText = ""
    }

    private func offsetFromTimezone(_ timezone: String) -> Double {
        guard let tz = TimeZone(identifier: timezone) else { return 0.0 }
        let seconds = Double(tz.secondsFromGMT())
        return seconds / 3600.0
    }

    /// Converts a UTC Date so that DatePicker displays the correct birth timezone time.
    /// This is needed because DatePicker always displays in system timezone.
    /// We shift the Date so that when displayed in system TZ, it shows birth TZ time.
    /// E.g., UTC 5:30 AM with IST (UTC+5:30) → DatePicker shows 11:00 AM
    private func dateForBirthTimezonePicker(date: Date?, birthTimezone: String) -> Date {
        guard let date = date else { return Date() }
        let birthTz = TimeZone(identifier: birthTimezone) ?? .current
        let systemTz = TimeZone.current

        // Get offset difference
        let birthOffset = Double(birthTz.secondsFromGMT(for: date))
        let systemOffset = Double(systemTz.secondsFromGMT(for: date))
        let diff = birthOffset - systemOffset

        // Shift date so DatePicker (in system TZ) shows birth TZ time
        return date.addingTimeInterval(diff)
    }

    private func saveProfile() {
        guard formState.isValid else {
            validationErrorMessage = "Please fill in all required fields correctly."
            showingValidationError = true
            return
        }

        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime]
        formatter.timeZone = TimeZone(secondsFromGMT: 0)

        var finalDobUTC: String

        // Check if user actually changed the date by comparing with the original
        // Note: originalDatePickerDate is the original UTC Date, while formState.dob is the shifted Date
        // We need to compare by checking if the user changed the displayed values
        let userChangedDate: Bool
        if let original = originalDatePickerDate {
            // Get the display components (year, month, day, hour, minute) from both dates
            // Using birth calendar to extract display values
            var birthCalendar = Calendar(identifier: .gregorian)
            birthCalendar.timeZone = TimeZone(identifier: formState.timezone) ?? .current

            let originalDisplay = birthCalendar.dateComponents([.year, .month, .day, .hour, .minute], from: original)
            let currentDisplay = birthCalendar.dateComponents([.year, .month, .day, .hour, .minute], from: formState.dob)

            userChangedDate = originalDisplay != currentDisplay
        } else {
            userChangedDate = true
        }

        if let existingProfile = editingProfile, !userChangedDate {
            // User did NOT change the date - preserve original UTC string exactly
            finalDobUTC = existingProfile.dobUTC
        } else {
            // User DID change the date OR this is a new profile
            // Extract date components from DatePicker and interpret as birth timezone
            var birthCalendar = Calendar(identifier: .gregorian)
            birthCalendar.timeZone = TimeZone(identifier: formState.timezone) ?? TimeZone(secondsFromGMT: 0)!
            let birthComponents = birthCalendar.dateComponents([.year, .month, .day, .hour, .minute], from: formState.dob)
            let dobInBirthTz = birthCalendar.date(from: birthComponents) ?? formState.dob
            finalDobUTC = formatter.string(from: dobInBirthTz)
        }

        let profile: Profile

        // Determine prediction timezone: nil means use birth timezone
        let finalPredictionTimezone: String? = formState.useBirthTimezoneForPredictions ? nil : formState.predictionTimezone

        if let existing = editingProfile {
            profile = Profile(
                id: existing.id,
                name: formState.name.trimmingCharacters(in: .whitespaces),
                dobUTC: finalDobUTC,
                latitude: formState.latitude,
                longitude: formState.longitude,
                timezone: formState.timezone,
                utcOffset: formState.utcOffset,
                predictionTimezone: finalPredictionTimezone,
                placeName: formState.placeName.isEmpty ? nil : formState.placeName,
                ayanamsaId: formState.ayanamsaId,
                notes: formState.notes.isEmpty ? nil : formState.notes,
                createdAt: existing.createdAt,
                updatedAt: ISO8601DateFormatter().string(from: Date())
            )
        } else {
            profile = Profile(
                name: formState.name.trimmingCharacters(in: .whitespaces),
                dobUTC: finalDobUTC,
                latitude: formState.latitude,
                longitude: formState.longitude,
                timezone: formState.timezone,
                utcOffset: formState.utcOffset,
                predictionTimezone: finalPredictionTimezone,
                placeName: formState.placeName.isEmpty ? nil : formState.placeName,
                ayanamsaId: formState.ayanamsaId,
                notes: formState.notes.isEmpty ? nil : formState.notes
            )
        }

        profilesViewModel.saveProfile(profile)
        onDismiss()
    }
}
