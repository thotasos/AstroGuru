import SwiftUI

// MARK: - Monthly Predictions View

struct MonthlyPredictionsView: View {
    let prediction: MonthlyPrediction?

    private let columns = Array(repeating: GridItem(.flexible(), spacing: 4), count: 7)

    var body: some View {
        ScrollView {
            if let prediction = prediction {
                VStack(spacing: AppSpacing.lg) {
                    // Calendar header
                    Text(prediction.monthName)
                        .font(.appTitle2)
                        .foregroundColor(.appTextPrimary)

                    // Day headers
                    LazyVGrid(columns: columns, spacing: 4) {
                        ForEach(["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], id: \.self) { day in
                            Text(day)
                                .font(.appCaption)
                                .fontWeight(.semibold)
                                .foregroundColor(.appTextMuted)
                                .frame(height: 30)
                        }
                    }

                    // Calendar grid
                    calendarGrid(for: prediction)

                    // Summary
                    if !prediction.dailyPredictions.isEmpty {
                        summarySection(prediction)
                    }
                }
                .padding(AppSpacing.base)
            } else {
                EmptyStateView(
                    icon: "calendar.badge.exclamationmark",
                    title: "No Predictions",
                    subtitle: "No monthly predictions available.\nRun the prediction cache command to generate them."
                )
            }
        }
    }

    // MARK: - Calendar Grid

    private func calendarGrid(for prediction: MonthlyPrediction) -> some View {
        let daysInMonth = daysInMonth(year: prediction.year, month: prediction.month)
        let firstWeekday = firstWeekdayOfMonth(year: prediction.year, month: prediction.month)

        return LazyVGrid(columns: columns, spacing: 4) {
            // Empty cells for days before the first of the month
            ForEach(0..<firstWeekday, id: \.self) { _ in
                Color.clear
                    .frame(height: 60)
            }

            // Day cells
            ForEach(1...daysInMonth, id: \.self) { day in
                let dayStr = String(format: "%04d-%02d-%02d", prediction.year, prediction.month, day)
                let dayPrediction = prediction.dailyPredictions.first { $0.date == dayStr }

                DayCell(
                    day: day,
                    prediction: dayPrediction,
                    isToday: isToday(year: prediction.year, month: prediction.month, day: day)
                )
            }
        }
    }

    // MARK: - Summary Section

    private func summarySection(_ prediction: MonthlyPrediction) -> some View {
        let scores = prediction.dailyPredictions.compactMap { $0.score }
        let avgScore = scores.isEmpty ? 0 : scores.reduce(0, +) / scores.count

        let goodDays = prediction.dailyPredictions.filter { $0.score >= 65 }.count
        let neutralDays = prediction.dailyPredictions.filter { $0.score >= 40 && $0.score < 65 }.count
        let challengingDays = prediction.dailyPredictions.filter { $0.score < 40 }.count

        return VStack(alignment: .leading, spacing: AppSpacing.md) {
            SectionHeader("Monthly Overview")

            HStack(spacing: AppSpacing.lg) {
                SummaryItem(
                    label: "Average Score",
                    value: "\(avgScore)",
                    color: scoreColor(avgScore)
                )
                SummaryItem(
                    label: "Good Days",
                    value: "\(goodDays)",
                    color: .appSuccess
                )
                SummaryItem(
                    label: "Neutral Days",
                    value: "\(neutralDays)",
                    color: .appWarning
                )
                SummaryItem(
                    label: "Challenging",
                    value: "\(challengingDays)",
                    color: .appError
                )
            }
        }
        .padding(AppSpacing.base)
        .background(Color.appSurface)
        .cornerRadius(AppRadius.base)
    }

    // MARK: - Helpers

    private func daysInMonth(year: Int, month: Int) -> Int {
        return Calendar.current.range(of: .day, in: .month, for: DateComponents(year: year, month: month, day: 1).date!)!.count
    }

    private func firstWeekdayOfMonth(year: Int, month: Int) -> Int {
        var components = DateComponents()
        components.year = year
        components.month = month
        components.day = 1
        let date = Calendar.current.date(from: components)!
        return Calendar.current.component(.weekday, from: date) - 1
    }

    private func isToday(year: Int, month: Int, day: Int) -> Bool {
        let today = Date()
        return Calendar.current.component(.year, from: today) == year &&
               Calendar.current.component(.month, from: today) == month &&
               Calendar.current.component(.day, from: today) == day
    }

    private func scoreColor(_ score: Int) -> Color {
        switch score {
        case 75...: return .appSuccess
        case 50..<75: return .appWarning
        default: return .appError
        }
    }
}

// MARK: - Day Cell

struct DayCell: View {
    let day: Int
    let prediction: DailyPrediction?
    let isToday: Bool

    var body: some View {
        VStack(spacing: 2) {
            Text("\(day)")
                .font(.appBodyMedium)
                .foregroundColor(isToday ? .appGold : .appTextPrimary)

            if let prediction = prediction {
                // Score indicator
                Circle()
                    .fill(scoreColor(prediction.score))
                    .frame(width: 6, height: 6)

                // Categories
                if !prediction.categories.isEmpty {
                    HStack(spacing: 1) {
                        ForEach(prediction.categories.prefix(3), id: \.self) { _ in
                            Circle()
                                .fill(Color.appTextMuted.opacity(0.5))
                                .frame(width: 3, height: 3)
                        }
                    }
                }
            } else {
                Circle()
                    .fill(Color.appTextMuted.opacity(0.3))
                    .frame(width: 6, height: 6)
            }
        }
        .frame(height: 60)
        .frame(maxWidth: .infinity)
        .background(
            RoundedRectangle(cornerRadius: AppRadius.sm)
                .fill(isToday ? Color.appGold.opacity(0.1) : Color.appSurfaceElevated.opacity(0.3))
        )
        .overlay(
            RoundedRectangle(cornerRadius: AppRadius.sm)
                .stroke(isToday ? Color.appGold.opacity(0.5) : Color.clear, lineWidth: 1)
        )
    }

    private func scoreColor(_ score: Int) -> Color {
        switch score {
        case 75...: return .appSuccess
        case 50..<75: return .appWarning
        default: return .appError
        }
    }
}

// MARK: - Summary Item

struct SummaryItem: View {
    let label: String
    let value: String
    let color: Color

    var body: some View {
        VStack(spacing: AppSpacing.xs) {
            Text(value)
                .font(.appTitle)
                .foregroundColor(color)
            Text(label)
                .font(.appCaption)
                .foregroundColor(.appTextMuted)
        }
        .frame(maxWidth: .infinity)
    }
}
