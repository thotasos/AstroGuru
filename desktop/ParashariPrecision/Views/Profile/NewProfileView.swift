import SwiftUI

struct NewProfileView: View {
    @EnvironmentObject var profilesVM: ProfilesViewModel
    @Environment(\.dismiss) var dismiss

    @State private var name: String = ""
    @State private var birthDate: Date = Date()
    @State private var latitude: String = ""
    @State private var longitude: String = ""
    @State private var timezone: String = "Asia/Kolkata"
    @State private var placeName: String = ""
    @State private var notes: String = ""
    @State private var isSubmitting: Bool = false
    @State private var error: String?

    @FocusState private var focusedField: Field?

    enum Field: Hashable {
        case name, lat, lon, timezone, place, notes
    }

    var isValid: Bool {
        !name.trimmingCharacters(in: .whitespaces).isEmpty &&
        Double(latitude) != nil &&
        Double(longitude) != nil &&
        !timezone.isEmpty
    }

    var body: some View {
        VStack(spacing: 0) {
            // Header
            HStack {
                Text("New Birth Profile")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundColor(.white)
                Spacer()
                Button("Cancel") { dismiss() }
                    .buttonStyle(GhostButtonStyle())
            }
            .padding(.horizontal, 24)
            .padding(.vertical, 18)
            .background(Color.appSurface)

            AppDivider()

            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    // Name
                    FormField(label: "Full Name", isRequired: true) {
                        AppTextField("e.g. Adi Shankaracharya", text: $name)
                            .focused($focusedField, equals: .name)
                    }

                    // Birth Date & Time
                    FormField(label: "Date & Time of Birth (UTC)", isRequired: true) {
                        DatePicker("", selection: $birthDate, displayedComponents: [.date, .hourAndMinute])
                            .labelsHidden()
                            .colorScheme(.dark)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 8)
                            .background(Color.appSurface)
                            .clipShape(RoundedRectangle(cornerRadius: 8))
                            .overlay(
                                RoundedRectangle(cornerRadius: 8)
                                    .strokeBorder(Color.appBorder, lineWidth: 0.5)
                            )
                    }

                    // Coordinates
                    HStack(spacing: 12) {
                        FormField(label: "Latitude", isRequired: true) {
                            AppTextField("e.g. 18.9667", text: $latitude)
                                .focused($focusedField, equals: .lat)
                        }
                        FormField(label: "Longitude", isRequired: true) {
                            AppTextField("e.g. 72.8333", text: $longitude)
                                .focused($focusedField, equals: .lon)
                        }
                    }

                    // Place Name
                    FormField(label: "Place Name") {
                        AppTextField("e.g. Mumbai, Maharashtra, India", text: $placeName)
                            .focused($focusedField, equals: .place)
                    }

                    // Timezone
                    FormField(label: "Timezone", isRequired: true) {
                        TimezonePickerView(selected: $timezone)
                    }

                    // Notes
                    FormField(label: "Notes") {
                        ZStack(alignment: .topLeading) {
                            if notes.isEmpty {
                                Text("Optional notes...")
                                    .font(.system(size: 13))
                                    .foregroundColor(.white.opacity(0.25))
                                    .padding(.horizontal, 12)
                                    .padding(.vertical, 10)
                            }
                            TextEditor(text: $notes)
                                .font(.system(size: 13))
                                .foregroundColor(.white)
                                .scrollContentBackground(.hidden)
                                .frame(height: 72)
                                .padding(.horizontal, 8)
                                .padding(.vertical, 4)
                        }
                        .background(Color.appSurface)
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                        .overlay(
                            RoundedRectangle(cornerRadius: 8)
                                .strokeBorder(Color.appBorder, lineWidth: 0.5)
                        )
                    }

                    // Error
                    if let error = error {
                        HStack(spacing: 8) {
                            Image(systemName: "exclamationmark.triangle.fill")
                                .font(.system(size: 12))
                                .foregroundColor(.red)
                            Text(error)
                                .font(.system(size: 12))
                                .foregroundColor(.red.opacity(0.9))
                        }
                        .padding(10)
                        .background(Color.red.opacity(0.1))
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                    }
                }
                .padding(24)
            }

            AppDivider()

            // Footer
            HStack {
                Spacer()
                Button("Cancel") { dismiss() }
                    .buttonStyle(GhostButtonStyle())
                Button {
                    Task { await submit() }
                } label: {
                    HStack(spacing: 6) {
                        if isSubmitting {
                            ProgressView()
                                .progressViewStyle(CircularProgressViewStyle(tint: Color(red: 0.12, green: 0.08, blue: 0.04)))
                                .scaleEffect(0.7)
                        }
                        Text(isSubmitting ? "Creating..." : "Create Profile")
                    }
                }
                .buttonStyle(GoldButtonStyle())
                .disabled(!isValid || isSubmitting)
                .opacity(!isValid ? 0.5 : 1.0)
            }
            .padding(.horizontal, 24)
            .padding(.vertical, 16)
            .background(Color.appSurface)
        }
        .background(Color.appBackground)
        .frame(width: 520, height: 620)
    }

    private func submit() async {
        guard let lat = Double(latitude),
              let lon = Double(longitude) else {
            error = "Please enter valid numeric coordinates."
            return
        }

        isSubmitting = true
        error = nil

        // Calculate UTC offset for the given timezone at the birth date
        let utcOffsetHours: Double
        if let tz = TimeZone(identifier: timezone) {
            let offsetSeconds = tz.secondsFromGMT(for: birthDate)
            utcOffsetHours = Double(offsetSeconds) / 3600.0
        } else {
            utcOffsetHours = 0
        }

        let request = CreateProfileRequest(
            name: name.trimmingCharacters(in: .whitespaces),
            dobUTC: birthDate,
            lat: lat,
            lon: lon,
            timezone: timezone,
            utcOffsetHours: utcOffsetHours,
            placeName: placeName,
            notes: notes
        )

        do {
            try await profilesVM.createProfile(request)
            dismiss()
        } catch {
            self.error = error.localizedDescription
        }
        isSubmitting = false
    }
}

// MARK: - Form Field

struct FormField<Content: View>: View {
    let label: String
    var isRequired: Bool = false
    let content: Content

    init(label: String, isRequired: Bool = false, @ViewBuilder content: () -> Content) {
        self.label = label
        self.isRequired = isRequired
        self.content = content()
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 3) {
                Text(label)
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundColor(.white.opacity(0.5))
                    .textCase(.uppercase)
                    .tracking(0.5)
                if isRequired {
                    Text("*")
                        .font(.system(size: 11))
                        .foregroundColor(Color.appGold)
                }
            }
            content
        }
    }
}

// MARK: - App Text Field

struct AppTextField: View {
    let placeholder: String
    @Binding var text: String

    init(_ placeholder: String, text: Binding<String>) {
        self.placeholder = placeholder
        self._text = text
    }

    var body: some View {
        TextField(placeholder, text: $text)
            .textFieldStyle(.plain)
            .font(.system(size: 13))
            .foregroundColor(.white)
            .padding(.horizontal, 12)
            .padding(.vertical, 9)
            .background(Color.appSurface)
            .clipShape(RoundedRectangle(cornerRadius: 8))
            .overlay(
                RoundedRectangle(cornerRadius: 8)
                    .strokeBorder(Color.appBorder, lineWidth: 0.5)
            )
    }
}

// MARK: - Timezone Picker

struct TimezonePickerView: View {
    @Binding var selected: String

    private let commonTimezones = [
        "Asia/Kolkata",
        "Asia/Colombo",
        "Asia/Kathmandu",
        "Asia/Dhaka",
        "Asia/Karachi",
        "Asia/Kabul",
        "UTC",
        "America/New_York",
        "America/Chicago",
        "America/Los_Angeles",
        "America/Denver",
        "Europe/London",
        "Europe/Paris",
        "Europe/Berlin",
        "Asia/Tokyo",
        "Asia/Shanghai",
        "Asia/Dubai",
        "Australia/Sydney",
        "Pacific/Auckland",
    ]

    var body: some View {
        Picker("", selection: $selected) {
            ForEach(commonTimezones, id: \.self) { tz in
                Text(tz).tag(tz)
            }
            Divider()
            ForEach(TimeZone.knownTimeZoneIdentifiers.filter { !commonTimezones.contains($0) }.sorted(), id: \.self) { tz in
                Text(tz).tag(tz)
            }
        }
        .labelsHidden()
        .padding(.horizontal, 10)
        .padding(.vertical, 6)
        .background(Color.appSurface)
        .clipShape(RoundedRectangle(cornerRadius: 8))
        .overlay(
            RoundedRectangle(cornerRadius: 8)
                .strokeBorder(Color.appBorder, lineWidth: 0.5)
        )
    }
}
