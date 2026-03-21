import Foundation
import Combine

@MainActor
final class ProfilesViewModel: ObservableObject {
    @Published var profiles: [Profile] = []
    @Published var isLoading = false
    @Published var errorMessage: String?

    private let database: DatabaseService

    init(database: DatabaseService? = nil) {
        self.database = database ?? (try? DatabaseService())!
    }

    func loadProfiles() async {
        isLoading = true
        errorMessage = nil
        do {
            profiles = try await database.fetchAllProfiles()
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    func saveProfile(_ profile: Profile) async {
        do {
            try await database.saveProfile(profile)
            await loadProfiles()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func deleteProfile(_ profile: Profile) async {
        do {
            try await database.deleteProfile(id: profile.id)
            await loadProfiles()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func createSampleProfiles() async {
        let samples = [
            Profile(
                name: "Mahatma Gandhi",
                dobUTC: "1869-10-02T04:50:00Z",
                latitude: 21.1702,
                longitude: 70.0577,
                timezone: "Asia/Kolkata",
                utcOffset: 5.5,
                placeName: "Porbandar, India",
                ayanamsaId: 1
            ),
            Profile(
                name: "Steve Jobs",
                dobUTC: "1955-02-24T10:15:00Z",
                latitude: 37.3230,
                longitude: -122.0322,
                timezone: "America/Los_Angeles",
                utcOffset: -8.0,
                placeName: "San Francisco, CA",
                ayanamsaId: 1
            ),
            Profile(
                name: "Test User",
                dobUTC: "2000-01-01T12:00:00Z",
                latitude: 28.6139,
                longitude: 77.2090,
                timezone: "Asia/Kolkata",
                utcOffset: 5.5,
                placeName: "New Delhi, India",
                ayanamsaId: 1
            )
        ]

        for profile in samples {
            try? await database.saveProfile(profile)
        }
        await loadProfiles()
    }
}