import Foundation
import SwiftUI
import Combine

// MARK: - Chart ViewModel

@MainActor
class ChartViewModel: ObservableObject {
    @Published var chart: ChartData?
    @Published var vargas: [String: ChartData] = [:]
    @Published var selectedVarga: String = "D1"
    @Published var isLoading: Bool = false
    @Published var error: String?
    @Published var isLoadingVargas: Bool = false

    private var currentProfile: BirthProfile?
    private var cancellables = Set<AnyCancellable>()

    var currentChart: ChartData? {
        if selectedVarga == "D1" {
            return chart
        }
        return vargas[selectedVarga]
    }

    // MARK: - Load Chart

    func loadChart(for profile: BirthProfile) async {
        guard currentProfile?.id != profile.id || chart == nil else { return }
        currentProfile = profile
        isLoading = true
        error = nil

        do {
            chart = try await APIService.shared.calculateChart(profileId: profile.id)
        } catch {
            // Try offline cache
            if let cached = try? await DatabaseService.shared.getCachedChart(profileId: profile.id) {
                chart = cached
            } else {
                self.error = error.localizedDescription
            }
        }
        isLoading = false
    }

    func loadChartForced(for profile: BirthProfile) async {
        currentProfile = nil
        await loadChart(for: profile)
    }

    // MARK: - Reprocess Profile

    func reprocessProfile(_ profile: BirthProfile) async {
        currentProfile = profile
        isLoading = true
        error = nil

        do {
            // Invalidate cache first
            try await APIService.shared.invalidateCache(profileId: profile.id)
            // Then recalculate everything via full calculation
            let full = try await APIService.shared.calculateFull(profileId: profile.id)
            chart = full.chart
            vargas = full.vargas
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }

    // MARK: - Load Vargas

    func loadVargas(for profile: BirthProfile) async {
        isLoadingVargas = true
        do {
            vargas = try await APIService.shared.calculateAllVargas(profileId: profile.id)
        } catch {
            // Use what we have
        }
        isLoadingVargas = false
    }

    func selectVarga(_ varga: String, for profile: BirthProfile) async {
        selectedVarga = varga
        if varga != "D1" && vargas[varga] == nil {
            do {
                let vargaChart = try await APIService.shared.calculateChart(
                    profileId: profile.id,
                    varga: varga
                )
                vargas[varga] = vargaChart
            } catch {
                // Cache miss
            }
        }
    }

    // MARK: - South Indian Layout

    struct GridCell {
        let signIndex: Int
        var planets: [PlanetPosition]
        var isAscendant: Bool
        var row: Int
        var col: Int
    }

    var southIndianLayout: [[GridCell]] {
        guard let chartData = currentChart else {
            return emptyGrid()
        }

        var grid: [[GridCell]] = (0..<4).map { row in
            (0..<4).map { col in
                GridCell(
                    signIndex: SouthIndianLayout.signGrid[row][col] ?? -1,
                    planets: [],
                    isAscendant: false,
                    row: row,
                    col: col
                )
            }
        }

        // Place planets
        for planet in chartData.planets {
            if let pos = SouthIndianLayout.position(for: planet.sign) {
                grid[pos.row][pos.col].planets.append(planet)
            }
        }

        // Mark ascendant
        if let pos = SouthIndianLayout.position(for: chartData.ascendantSign) {
            grid[pos.row][pos.col].isAscendant = true
        }

        return grid
    }

    private func emptyGrid() -> [[GridCell]] {
        (0..<4).map { row in
            (0..<4).map { col in
                GridCell(
                    signIndex: SouthIndianLayout.signGrid[row][col] ?? -1,
                    planets: [],
                    isAscendant: false,
                    row: row,
                    col: col
                )
            }
        }
    }

    // MARK: - Planet Table Data

    var sortedPlanets: [PlanetPosition] {
        guard let chartData = currentChart else { return [] }
        return chartData.planets.sorted { a, b in
            let orderA = Planet.allCases.firstIndex { $0.name.lowercased() == a.planet.lowercased() } ?? 99
            let orderB = Planet.allCases.firstIndex { $0.name.lowercased() == b.planet.lowercased() } ?? 99
            return orderA < orderB
        }
    }

    // MARK: - Reset

    func reset() {
        chart = nil
        vargas = [:]
        selectedVarga = "D1"
        currentProfile = nil
        error = nil
    }
}
