import Foundation
import Combine
import SwiftUI

@MainActor
class DashaViewModel: ObservableObject {
    @Published var dashas: [DashaPeriod] = []
    @Published var isLoading: Bool = false
    @Published var error: String?
    @Published var expandedPeriods: Set<String> = []

    private var currentProfileId: String?

    // MARK: - Load Dashas

    func loadDashas(for profile: BirthProfile) async {
        guard currentProfileId != profile.id || dashas.isEmpty else { return }
        currentProfileId = profile.id
        isLoading = true
        error = nil

        do {
            dashas = try await APIService.shared.calculateDashas(profileId: profile.id)
            // Auto-expand current period
            if let current = currentMahadasha {
                expandedPeriods.insert(current.id)
            }
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }

    func loadDashasForced(for profile: BirthProfile) async {
        currentProfileId = nil
        await loadDashas(for: profile)
    }

    // MARK: - Current Period

    var currentMahadasha: DashaPeriod? {
        dashas.first { $0.isCurrentPeriod }
    }

    var currentAntardasha: DashaPeriod? {
        currentMahadasha?.subPeriods?.first { $0.isCurrentPeriod }
    }

    var currentPratyantardasha: DashaPeriod? {
        currentAntardasha?.subPeriods?.first { $0.isCurrentPeriod }
    }

    // MARK: - Toggle Expansion

    func toggleExpansion(for id: String) {
        if expandedPeriods.contains(id) {
            expandedPeriods.remove(id)
        } else {
            expandedPeriods.insert(id)
        }
    }

    func isExpanded(_ id: String) -> Bool {
        expandedPeriods.contains(id)
    }

    // MARK: - Timeline Data

    var timelineWidth: CGFloat {
        let totalYears = dashas.reduce(0.0) { $0 + $1.durationYears }
        return CGFloat(totalYears) * 60 // 60 points per year
    }

    func widthForDasha(_ dasha: DashaPeriod, containerWidth: CGFloat) -> CGFloat {
        let totalYears = dashas.reduce(0.0) { $0 + $1.durationYears }
        guard totalYears > 0 else { return 0 }
        let proportion = dasha.durationYears / totalYears
        return CGFloat(proportion) * max(containerWidth, CGFloat(totalYears) * 60)
    }

    // MARK: - Reset

    func reset() {
        dashas = []
        currentProfileId = nil
        expandedPeriods = []
        error = nil
    }
}
