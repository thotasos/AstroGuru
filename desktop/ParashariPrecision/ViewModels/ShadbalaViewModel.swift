import Foundation
import SwiftUI

@MainActor
class ShadbalaViewModel: ObservableObject {
    @Published var shadbala: [ShadbalaResult] = []
    @Published var isLoading: Bool = false
    @Published var error: String?

    private var currentProfile: BirthProfile?

    // MARK: - Load Shadbala

    func loadShadbala(for profile: BirthProfile) async {
        guard currentProfile?.id != profile.id || shadbala.isEmpty else { return }
        currentProfile = profile
        isLoading = true
        error = nil

        do {
            shadbala = try await APIService.shared.calculateShadbala(profileId: profile.id)
        } catch {
            self.error = error.localizedDescription
            shadbala = []
        }
        isLoading = false
    }

    func refresh(for profile: BirthProfile) async {
        currentProfile = nil
        await loadShadbala(for: profile)
    }

    // MARK: - Planet Info

    var sortedPlanets: [ShadbalaResult] {
        shadbala.sorted { a, b in a.totalRupas > b.totalRupas }
    }

    var strongestPlanet: ShadbalaResult? {
        shadbala.max { $0.totalRupas < $1.totalRupas }
    }

    var weakestPlanet: ShadbalaResult? {
        shadbala.min { $0.totalRupas < $1.totalRupas }
    }
}
