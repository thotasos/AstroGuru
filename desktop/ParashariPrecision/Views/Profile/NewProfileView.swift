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
    @State private var locationSearchText = ""
    @State private var searchResults: [MKMapItem] = []
    @State private var isSearching = false
    @State private var timezoneSearchText = ""

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
            .onAppear {
                if let profile = editingProfile {
                    formState.name = profile.name
                    if let dobDate = profile.dobDate {
                        formState.dob = dobDate
                    }
                    formState.latitude = profile.latitude
                    formState.longitude = profile.longitude
                    formState.timezone = profile.timezone
                    formState.utcOffset = profile.utcOffset
                    formState.placeName = profile.placeName ?? ""
                    formState.ayanamsaId = profile.ayanamsaId
                    formState.notes = profile.notes ?? ""
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

    private func saveProfile() {
        guard formState.isValid else {
            validationErrorMessage = "Please fill in all required fields correctly."
            showingValidationError = true
            return
        }

        // The DatePicker gives us a Date in the system timezone.
        // Reinterpret the displayed time as local time in the birth timezone.
        let systemCalendar = Calendar.current
        let localComponents = systemCalendar.dateComponents([.year, .month, .day, .hour, .minute], from: formState.dob)

        var birthCalendar = Calendar(identifier: .gregorian)
        birthCalendar.timeZone = TimeZone(identifier: formState.timezone) ?? TimeZone(secondsFromGMT: 0)!
        let dobInBirthTimezone = birthCalendar.date(from: localComponents) ?? formState.dob

        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime]
        formatter.timeZone = TimeZone(secondsFromGMT: 0)

        let profile: Profile
        if let existing = editingProfile {
            profile = Profile(
                id: existing.id,
                name: formState.name.trimmingCharacters(in: .whitespaces),
                dobUTC: formatter.string(from: dobInBirthTimezone),
                latitude: formState.latitude,
                longitude: formState.longitude,
                timezone: formState.timezone,
                utcOffset: formState.utcOffset,
                placeName: formState.placeName.isEmpty ? nil : formState.placeName,
                ayanamsaId: formState.ayanamsaId,
                notes: formState.notes.isEmpty ? nil : formState.notes,
                createdAt: existing.createdAt,
                updatedAt: ISO8601DateFormatter().string(from: Date())
            )
        } else {
            profile = Profile(
                name: formState.name.trimmingCharacters(in: .whitespaces),
                dobUTC: formatter.string(from: dobInBirthTimezone),
                latitude: formState.latitude,
                longitude: formState.longitude,
                timezone: formState.timezone,
                utcOffset: formState.utcOffset,
                placeName: formState.placeName.isEmpty ? nil : formState.placeName,
                ayanamsaId: formState.ayanamsaId,
                notes: formState.notes.isEmpty ? nil : formState.notes
            )
        }

        profilesViewModel.saveProfile(profile)
        onDismiss()
    }
}
