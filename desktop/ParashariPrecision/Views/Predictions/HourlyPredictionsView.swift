import SwiftUI

// MARK: - Hourly Predictions View

struct HourlyPredictionsView: View {
    let predictions: [HourlyPrediction]

    var body: some View {
        ScrollView {
            if predictions.isEmpty {
                EmptyStateView(
                    icon: "clock.badge.questionmark",
                    title: "No Predictions",
                    subtitle: "No hourly predictions available for this date.\nRun the prediction cache command to generate them."
                )
            } else {
                LazyVStack(spacing: AppSpacing.sm) {
                    ForEach(predictions) { prediction in
                        HourlyPredictionCard(prediction: prediction)
                    }
                }
                .padding(AppSpacing.base)
            }
        }
    }
}

// MARK: - Hourly Prediction Card

struct HourlyPredictionCard: View {
    let prediction: HourlyPrediction

    @State private var isExpanded: Bool = false

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Header
            Button {
                withAnimation(.easeInOut(duration: 0.2)) {
                    isExpanded.toggle()
                }
            } label: {
                HStack(spacing: AppSpacing.base) {
                    // Hour
                    Text(prediction.formattedHour)
                        .font(.appMono)
                        .foregroundColor(.appGold)
                        .frame(width: 50, alignment: .leading)

                    // Score
                    if let score = prediction.hourlyScore {
                        ScoreBadge(score: score)
                    } else {
                        Text("--")
                            .font(.appMono)
                            .foregroundColor(.appTextMuted)
                    }

                    // Dasha planets
                    HStack(spacing: AppSpacing.xs) {
                        if let planet = prediction.sookshmaPlanetName {
                            DashaBadge(planet: planet, level: "Sookshma")
                        }
                        if let planet = prediction.pranaPlanetName {
                            DashaBadge(planet: planet, level: "Prana")
                        }
                    }

                    Spacer()

                    // Moon position
                    if let nakshatra = prediction.moonNakshatra {
                        Text(NakshatraName.from(id: nakshatra))
                            .font(.appCaption)
                            .foregroundColor(.appTextSecondary)
                    }

                    Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                        .font(.system(size: 10, weight: .semibold))
                        .foregroundColor(.appTextMuted)
                }
                .padding(AppSpacing.md)
            }
            .buttonStyle(.plain)

            // Expanded content
            if isExpanded {
                AppDivider()
                VStack(alignment: .leading, spacing: AppSpacing.md) {
                    // Transit info
                    HStack(alignment: .top) {
                        VStack(alignment: .leading, spacing: AppSpacing.xs) {
                            Text("Transit Positions")
                                .font(.appBodySemibold)
                                .foregroundColor(.appTextPrimary)

                            HStack(spacing: AppSpacing.lg) {
                                VStack(alignment: .leading, spacing: 2) {
                                    Text("Moon Nakshatra")
                                        .font(.appCaption)
                                        .foregroundColor(.appTextMuted)
                                    Text(NakshatraName.from(id: prediction.moonNakshatra ?? 0))
                                        .font(.appBody)
                                        .foregroundColor(.appTextPrimary)
                                }

                                VStack(alignment: .leading, spacing: 2) {
                                    Text("Moon Sign")
                                        .font(.appCaption)
                                        .foregroundColor(.appTextMuted)
                                    if let sign = prediction.moonSign {
                                        Text(ZodiacName.from(id: sign))
                                            .font(.appBody)
                                            .foregroundColor(.appTextPrimary)
                                    } else {
                                        Text("--")
                                            .font(.appBody)
                                            .foregroundColor(.appTextMuted)
                                    }
                                }

                                if let degree = prediction.moonDegree {
                                    VStack(alignment: .leading, spacing: 2) {
                                        Text("Moon Degree")
                                            .font(.appCaption)
                                            .foregroundColor(.appTextMuted)
                                        Text(String(format: "%.2f°", degree))
                                            .font(.appMono)
                                            .foregroundColor(.appTextPrimary)
                                    }
                                }
                            }
                        }
                    }

                    // Dasha periods
                    if prediction.sookshmaDashaPlanet != nil || prediction.pranaDashaPlanet != nil {
                        VStack(alignment: .leading, spacing: AppSpacing.sm) {
                            Text("Dasha Periods")
                                .font(.appBodySemibold)
                                .foregroundColor(.appTextPrimary)

                            if let planet = prediction.sookshmaPlanetName,
                               let start = prediction.sookshmaDashaStart,
                               let end = prediction.sookshmaDashaEnd {
                                DashaPeriodRow(
                                    planet: planet,
                                    level: "Sookshma",
                                    start: start,
                                    end: end
                                )
                            }

                            if let planet = prediction.pranaPlanetName,
                               let start = prediction.pranaDashaStart,
                               let end = prediction.pranaDashaEnd {
                                DashaPeriodRow(
                                    planet: planet,
                                    level: "Prana",
                                    start: start,
                                    end: end
                                )
                            }
                        }
                    }

                    // Prediction text
                    if let text = prediction.predictionText, !text.isEmpty {
                        VStack(alignment: .leading, spacing: AppSpacing.xs) {
                            Text("Prediction")
                                .font(.appBodySemibold)
                                .foregroundColor(.appTextPrimary)

                            Text(text)
                                .font(.appBody)
                                .foregroundColor(.appTextSecondary)
                                .lineSpacing(4)
                        }
                    }
                }
                .padding(AppSpacing.md)
                .background(Color.appSurfaceElevated.opacity(0.5))
            }
        }
        .background(Color.appSurface)
        .cornerRadius(AppRadius.base)
    }
}

// MARK: - Score Badge

struct ScoreBadge: View {
    let score: Int

    var color: Color {
        switch score {
        case 75...: return .appSuccess
        case 50..<75: return .appWarning
        default: return .appError
        }
    }

    var body: some View {
        Text("\(score)")
            .font(.appMono)
            .fontWeight(.semibold)
            .foregroundColor(color)
            .frame(width: 32, height: 22)
            .background(
                RoundedRectangle(cornerRadius: AppRadius.xs)
                    .fill(color.opacity(0.15))
            )
    }
}

// MARK: - Dasha Badge

struct DashaBadge: View {
    let planet: String
    let level: String

    var body: some View {
        HStack(spacing: 3) {
            Text(planet)
                .font(.appCaption2)
            Text("(\(level.prefix(1)))")
                .font(.appCaption2)
                .foregroundColor(.appTextMuted)
        }
        .padding(.horizontal, 6)
        .padding(.vertical, 2)
        .background(
            RoundedRectangle(cornerRadius: AppRadius.xs)
                .fill(Color.appGold.opacity(0.15))
        )
        .foregroundColor(.appGold)
    }
}

// MARK: - Dasha Period Row

struct DashaPeriodRow: View {
    let planet: String
    let level: String
    let start: String
    let end: String

    var body: some View {
        HStack {
            Text(planet)
                .font(.appBodyMedium)
                .foregroundColor(.appTextPrimary)

            Text("(\(level))")
                .font(.appCaption)
                .foregroundColor(.appTextMuted)

            Spacer()

            Text("\(start) - \(end)")
                .font(.appMonoSmall)
                .foregroundColor(.appTextSecondary)
        }
        .padding(.vertical, AppSpacing.xs)
    }
}

// MARK: - Nakshatra Names

enum NakshatraName {
    static func from(id: Int) -> String {
        let names = [
            "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashirsha",
            "Ardra", "Punarvasu", "Pushya", "Ashlesha", "Magha",
            "Purva Phalguni", "Utara Phalguni", "Hasta", "Chitra", "Swati",
            "Vishakha", "Anuradha", "Jyeshtha", "Mula", "Purva Ashadha",
            "Utara Ashadha", "Shravana", "Dhanishta", "Shatabhisha", "Purva Bhadrapada",
            "Utara Bhadrapada", "Revati"
        ]
        return id < names.count ? names[id] : "Unknown"
    }
}

// MARK: - Zodiac Names

enum ZodiacName {
    static func from(id: Int) -> String {
        let signs = [
            "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
            "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
        ]
        return id < signs.count ? signs[id] : "Unknown"
    }
}
