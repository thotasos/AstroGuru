import Foundation
import Combine

@MainActor
class ProfilesViewModel: ObservableObject {
    @Published var profiles: [BirthProfile] = []
    @Published var selectedProfile: BirthProfile?
    @Published var isLoading: Bool = false
    @Published var error: String?
    @Published var showNewProfile: Bool = false
    @Published var searchText: String = ""

    private var cancellables = Set<AnyCancellable>()
    private var isServerOnline: Bool = false

    init() {
        setupNotificationObserver()
    }

    // MARK: - Notification Observer

    private func setupNotificationObserver() {
        NotificationCenter.default.publisher(for: SyncService.databaseDidChange)
            .receive(on: DispatchQueue.main)
            .sink { [weak self] _ in
                Task { @MainActor [weak self] in
                    await self?.loadProfiles(serverOnline: self?.isServerOnline ?? false)
                }
            }
            .store(in: &cancellables)
    }

    // MARK: - Load Profiles

    /// No-arg version: tries server first, falls back to offline
    func loadProfiles() {
        Task {
            await loadProfiles(serverOnline: isServerOnline)
        }
    }

    func loadProfiles(serverOnline: Bool) async {
        isLoading = true
        error = nil
        isServerOnline = serverOnline

        if serverOnline {
            do {
                profiles = try await APIService.shared.fetchProfiles()
                isLoading = false
                return
            } catch {
                // Fall through to offline mode
            }
        }

        // Offline: read from SQLite
        do {
            profiles = try await DatabaseService.shared.getProfiles()
        } catch let dbError as DatabaseError {
            if case .notFound = dbError {
                // No database yet — start with empty list
                profiles = []
            } else {
                self.error = dbError.localizedDescription
            }
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }

    // MARK: - Create Profile

    func createProfile(_ request: CreateProfileRequest) async throws {
        let newProfile = try await APIService.shared.createProfile(request)
        profiles.append(newProfile)
        profiles.sort { $0.name < $1.name }
        selectedProfile = newProfile
    }

    // MARK: - Delete Profile

    func deleteProfile(_ profile: BirthProfile) async {
        do {
            try await APIService.shared.deleteProfile(id: profile.id)
            profiles.removeAll { $0.id == profile.id }
            if selectedProfile?.id == profile.id {
                selectedProfile = profiles.first
            }
        } catch {
            self.error = error.localizedDescription
        }
    }

    // MARK: - Filtered Profiles

    var filteredProfiles: [BirthProfile] {
        if searchText.isEmpty {
            return profiles
        }
        return profiles.filter {
            $0.name.localizedCaseInsensitiveContains(searchText) ||
            $0.placeName.localizedCaseInsensitiveContains(searchText)
        }
    }

    // MARK: - Selection

    func selectProfile(_ profile: BirthProfile) {
        selectedProfile = profile
    }

    func clearError() {
        error = nil
    }
}
