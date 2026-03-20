import Foundation
import SwiftUI
import Combine

// MARK: - Predictions ViewModel

@MainActor
class PredictionsViewModel: ObservableObject {
    @Published var hourlyPredictions: [HourlyPrediction] = []
    @Published var monthlyPrediction: MonthlyPrediction?
    @Published var isLoading: Bool = false
    @Published var error: String?

    @Published var selectedDate: Date = Date()
    @Published var selectedYear: Int = Calendar.current.component(.year, from: Date())
    @Published var selectedMonth: Int = Calendar.current.component(.month, from: Date())

    private var currentProfile: BirthProfile?

    // MARK: - Date Helpers

    var selectedDateString: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.string(from: selectedDate)
    }

    var formattedMonthYear: String {
        var components = DateComponents()
        components.month = selectedMonth
        components.year = selectedYear
        let calendar = Calendar.current
        if let date = calendar.date(from: components) {
            let formatter = DateFormatter()
            formatter.dateFormat = "MMMM yyyy"
            return formatter.string(from: date)
        }
        return "\(selectedMonth)/\(selectedYear)"
    }

    // MARK: - Load Hourly Predictions

    func loadHourlyPredictions(for profile: BirthProfile) async {
        guard currentProfile?.id != profile.id || hourlyPredictions.isEmpty else { return }
        currentProfile = profile
        await loadHourly(for: profile, date: selectedDateString)
    }

    func loadHourly(for profile: BirthProfile, date: String) async {
        isLoading = true
        error = nil

        // Try API first
        if await APIService.shared.isServerAvailable() {
            do {
                hourlyPredictions = try await APIService.shared.getHourlyPredictions(profileId: profile.id, date: date)
                isLoading = false
                return
            } catch {
                // Fall through to local fallback
            }
        }

        // Fallback to local calculation
        do {
            let formatter = DateFormatter()
            formatter.dateFormat = "yyyy-MM-dd"
            let parsedDate = formatter.date(from: date) ?? Date()
            hourlyPredictions = try await CalculationService.shared.getHourlyPredictions(for: profile, date: parsedDate)
        } catch {
            self.error = "Predictions unavailable: \(error.localizedDescription). Make sure the CLI server is running on port 5199, or rebuild with local calculations enabled."
            hourlyPredictions = []
        }
        isLoading = false
    }

    func refreshHourly(for profile: BirthProfile) async {
        await loadHourly(for: profile, date: selectedDateString)
    }

    // MARK: - Load Monthly Predictions

    func loadMonthlyPredictions(for profile: BirthProfile) async {
        guard currentProfile?.id != profile.id || monthlyPrediction == nil else { return }
        currentProfile = profile
        await loadMonthly(for: profile, year: selectedYear, month: selectedMonth)
    }

    func loadMonthly(for profile: BirthProfile, year: Int, month: Int) async {
        isLoading = true
        error = nil

        // Try API first
        if await APIService.shared.isServerAvailable() {
            do {
                monthlyPrediction = try await APIService.shared.getMonthlyPredictions(profileId: profile.id, year: year, month: month)
                isLoading = false
                return
            } catch {
                // Fall through to local fallback
            }
        }

        // Fallback to local calculation
        do {
            monthlyPrediction = try await CalculationService.shared.getMonthlyPredictions(for: profile, year: year, month: month)
        } catch {
            self.error = "Monthly predictions unavailable: \(error.localizedDescription). Make sure the CLI server is running on port 5199, or rebuild with local calculations enabled."
            monthlyPrediction = nil
        }
        isLoading = false
    }

    func refreshMonthly(for profile: BirthProfile) async {
        await loadMonthly(for: profile, year: selectedYear, month: selectedMonth)
    }

    // MARK: - Clear Cache

    func clearCache(for profile: BirthProfile) async {
        isLoading = true
        do {
            _ = try await APIService.shared.clearPredictionCache(profileId: profile.id)
            hourlyPredictions = []
            monthlyPrediction = nil
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }

    // MARK: - Date Navigation

    func previousDay() {
        if let newDate = Calendar.current.date(byAdding: .day, value: -1, to: selectedDate) {
            selectedDate = newDate
            selectedYear = Calendar.current.component(.year, from: newDate)
            selectedMonth = Calendar.current.component(.month, from: newDate)
        }
    }

    func nextDay() {
        if let newDate = Calendar.current.date(byAdding: .day, value: 1, to: selectedDate) {
            selectedDate = newDate
            selectedYear = Calendar.current.component(.year, from: newDate)
            selectedMonth = Calendar.current.component(.month, from: newDate)
        }
    }

    func previousMonth() {
        if selectedMonth == 1 {
            selectedMonth = 12
            selectedYear -= 1
        } else {
            selectedMonth -= 1
        }
    }

    func nextMonth() {
        if selectedMonth == 12 {
            selectedMonth = 1
            selectedYear += 1
        } else {
            selectedMonth += 1
        }
    }

    func goToToday() {
        selectedDate = Date()
        selectedYear = Calendar.current.component(.year, from: Date())
        selectedMonth = Calendar.current.component(.month, from: Date())
    }
}
