import Foundation
import SwiftUI

@MainActor
class AshtakavargaViewModel: ObservableObject {
    @Published var ashtakavarga: AshtakavargaResult?
    @Published var isLoading: Bool = false
    @Published var error: String?

    private var currentProfile: BirthProfile?

    // MARK: - Load Ashtakavarga

    func loadAshtakavarga(for profile: BirthProfile) async {
        guard currentProfile?.id != profile.id || ashtakavarga == nil else { return }
        currentProfile = profile
        isLoading = true
        error = nil

        do {
            ashtakavarga = try await APIService.shared.calculateAshtakavarga(profileId: profile.id)
        } catch {
            self.error = error.localizedDescription
            ashtakavarga = nil
        }
        isLoading = false
    }

    func refresh(for profile: BirthProfile) async {
        currentProfile = nil
        await loadAshtakavarga(for: profile)
    }

    // MARK: - BAV (Bindu Ashtakavarga) Helpers

    func binduCount(for key: Int) -> [Int] {
        ashtakavarga?.bav[key] ?? Array(repeating: 0, count: 12)
    }

    // MARK: - SAV (Sarva Ashtakavarga) Helpers

    var sarvaTotal: [Int] {
        ashtakavarga?.sav ?? Array(repeating: 0, count: 12)
    }

    var maxSavSign: Int {
        guard let sav = ashtakavarga?.sav else { return 0 }
        return sav.enumerated().max(by: { $0.element < $1.element })?.offset ?? 0
    }

    var minSavSign: Int {
        guard let sav = ashtakavarga?.sav else { return 0 }
        return sav.enumerated().min(by: { $0.element < $1.element })?.offset ?? 0
    }
}
