import SwiftUI

struct PredictionsView: View {
    let profile: Profile
    @StateObject private var viewModel = PredictionsViewModel()
    @State private var selectedTab = 0

    private let tabTitles = ["Overview", "Dasha", "Planets", "Yogas", "Day", "Month"]

    var body: some View {
        Group {
            if viewModel.isGenerating {
                ProgressView("Generating predictions...")
            } else if let error = viewModel.errorMessage {
                ContentUnavailableView(
                    "Prediction Generation Failed",
                    systemImage: "exclamationmark.triangle",
                    description: Text(error)
                )
            } else if viewModel.prediction.isEmpty {
                ContentUnavailableView(
                    "No Predictions Available",
                    systemImage: "sparkles",
                    description: Text("Select a profile with valid birth data to generate predictions")
                )
            } else {
                VStack(spacing: 0) {
                    // Tab selector
                    TabSelector(selectedTab: $selectedTab, titles: tabTitles)
                        .padding(.horizontal)
                        .padding(.vertical, 8)
                        .background(Color(nsColor: .controlBackgroundColor))

                    Divider()

                    // Tab content
                    TabContent(selectedTab: selectedTab, profile: profile, viewModel: viewModel)
                }
                .navigationTitle("Predictions")
            }
        }
        .task {
            await viewModel.generateAllPredictions(for: profile)
        }
    }
}

// MARK: - Tab Selector

struct TabSelector: View {
    @Binding var selectedTab: Int
    let titles: [String]

    var body: some View {
        HStack(spacing: 0) {
            ForEach(Array(titles.enumerated()), id: \.offset) { index, title in
                Button(action: {
                    selectedTab = index
                }) {
                    VStack(spacing: 4) {
                        Text(title)
                            .font(.subheadline)
                            .fontWeight(selectedTab == index ? .semibold : .regular)

                        Rectangle()
                            .fill(selectedTab == index ? Color.accentColor : Color.clear)
                            .frame(height: 2)
                    }
                }
                .buttonStyle(.plain)
                .padding(.horizontal, 16)
                .padding(.vertical, 8)
                .background(
                    selectedTab == index ?
                    Color(nsColor: .controlBackgroundColor).opacity(0.5) :
                    Color.clear
                )
                .cornerRadius(6)

                if index < titles.count - 1 {
                    Spacer()
                }
            }
        }
    }
}

// MARK: - Tab Content

struct TabContent: View {
    let selectedTab: Int
    let profile: Profile
    @ObservedObject var viewModel: PredictionsViewModel

    var body: some View {
        switch selectedTab {
        case 0:
            OverviewContentView(prediction: viewModel.prediction)
        case 1:
            DashaPredictionContentView(viewModel: viewModel)
        case 2:
            PlanetPredictionsContentView(viewModel: viewModel)
        case 3:
            YogaImpactContentView(viewModel: viewModel)
        case 4:
            DayPredictionTabView(profile: profile, viewModel: viewModel)
        case 5:
            MonthPredictionTabView(profile: profile, viewModel: viewModel)
        default:
            OverviewContentView(prediction: viewModel.prediction)
        }
    }
}

// MARK: - Overview Content

struct OverviewContentView: View {
    let prediction: String

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                HighlightedTextView(text: prediction)
            }
            .padding()
        }
    }
}

// MARK: - Dasha Content

struct DashaPredictionContentView: View {
    @ObservedObject var viewModel: PredictionsViewModel

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                if viewModel.dashaPrediction.isEmpty {
                    Text("No dasha prediction available")
                        .foregroundStyle(.secondary)
                } else {
                    HighlightedTextView(text: viewModel.dashaPrediction)

                    DashaTimelineView(viewModel: viewModel)
                }
            }
            .padding()
        }
    }
}

struct DashaTimelineView: View {
    @ObservedObject var viewModel: PredictionsViewModel

    private func colorForPlanet(_ planet: String) -> Color {
        switch planet {
        case "Sun": return .orange
        case "Moon": return Color(white: 0.6)
        case "Mars": return .red
        case "Mercury": return .green
        case "Jupiter": return .yellow
        case "Venus": return .pink
        case "Saturn": return .purple
        case "Rahu", "Ketu": return .indigo
        default: return .gray
        }
    }

    private var totalYears: Double {
        let dashas = viewModel.dashas
        guard !dashas.isEmpty else { return 1 }
        let first = dashas[0]
        let last = dashas[dashas.count - 1]
        let start = Double(first.startYear) + Double(first.startMonth) / 12.0
        let end = Double(last.endYear) + Double(last.endMonth) / 12.0
        let span = end - start
        return span > 0 ? span : 1
    }

    private func fraction(for dasha: DashaPeriod) -> Double {
        let start = Double(dasha.startYear) + Double(dasha.startMonth) / 12.0
        let end = Double(dasha.endYear) + Double(dasha.endMonth) / 12.0
        return max(0, (end - start) / totalYears)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Dasha Timeline")
                .font(.headline)

            if viewModel.dashas.isEmpty {
                Text("No dasha periods available")
                    .font(.caption)
                    .foregroundStyle(.tertiary)
            } else {
                GeometryReader { geo in
                    HStack(spacing: 2) {
                        ForEach(Array(viewModel.dashas.enumerated()), id: \.offset) { _, dasha in
                            let width = geo.size.width * fraction(for: dasha)
                            ZStack {
                                Rectangle()
                                    .fill(colorForPlanet(dasha.lord).opacity(0.75))
                                    .frame(width: max(width, 2), height: 28)
                                    .cornerRadius(3)

                                if width > 28 {
                                    Text(dasha.lord.prefix(3))
                                        .font(.system(size: 9, weight: .semibold))
                                        .foregroundStyle(.white)
                                        .lineLimit(1)
                                }
                            }
                            .frame(width: max(width, 2))
                        }
                    }
                }
                .frame(height: 28)

                // Year labels
                HStack {
                    if let first = viewModel.dashas.first {
                        Text("\(first.startYear)")
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                    }
                    Spacer()
                    if let last = viewModel.dashas.last {
                        Text("\(last.endYear)")
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                    }
                }

                // Legend
                let visibleDashas = viewModel.dashas.prefix(9)
                LazyVGrid(columns: Array(repeating: GridItem(.flexible(), alignment: .leading), count: 3), spacing: 4) {
                    ForEach(Array(visibleDashas.enumerated()), id: \.offset) { _, dasha in
                        HStack(spacing: 4) {
                            Circle()
                                .fill(colorForPlanet(dasha.lord))
                                .frame(width: 8, height: 8)
                            Text("\(dasha.lord) (\(dasha.startYear)–\(dasha.endYear))")
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                                .lineLimit(1)
                        }
                    }
                }
            }
        }
        .padding()
        .background(Color(nsColor: .controlBackgroundColor))
        .cornerRadius(8)
    }
}

// MARK: - Planet Predictions Content

struct PlanetPredictionsContentView: View {
    @ObservedObject var viewModel: PredictionsViewModel

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                if viewModel.planetPredictions.isEmpty {
                    Text("No planet predictions available")
                        .foregroundStyle(.secondary)
                } else {
                    ForEach(
                        Array(viewModel.planetPredictions.keys.sorted { planetOrder($0) < planetOrder($1) }),
                        id: \.self
                    ) { planet in
                        PlanetPredictionCard(
                            planet: planet,
                            prediction: viewModel.planetPredictions[planet] ?? ""
                        )
                    }
                }
            }
            .padding()
        }
    }

    private func planetOrder(_ planet: String) -> Int {
        let order = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"]
        return order.firstIndex(of: planet) ?? 99
    }
}

struct PlanetPredictionCard: View {
    let planet: String
    let prediction: String

    private var planetColor: Color {
        switch planet {
        case "Sun": return .orange
        case "Moon": return .silver
        case "Mars": return .red
        case "Mercury": return .green
        case "Jupiter": return .yellow
        case "Venus": return .pink
        case "Saturn": return .purple
        case "Rahu", "Ketu": return .indigo
        default: return .primary
        }
    }

    private var planetSymbol: String {
        switch planet {
        case "Sun": return "☀️"
        case "Moon": return "🌙"
        case "Mars": return "♂"
        case "Mercury": return "☿"
        case "Jupiter": return "♃"
        case "Venus": return "♀"
        case "Saturn": return "♄"
        case "Rahu": return "☊"
        case "Ketu": return "☋"
        default: return "⚪"
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 8) {
                Text(planetSymbol)
                    .font(.title2)

                Text(planet)
                    .font(.headline)
                    .foregroundStyle(planetColor)

                Spacer()
            }

            HighlightedTextView(text: prediction)
        }
        .padding()
        .background(Color(nsColor: .controlBackgroundColor))
        .cornerRadius(8)
    }
}

// MARK: - Yoga Impact Content

struct YogaImpactContentView: View {
    @ObservedObject var viewModel: PredictionsViewModel

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                if viewModel.yogaImpact.isEmpty {
                    Text("No yoga impact available")
                        .foregroundStyle(.secondary)
                } else {
                    HighlightedTextView(text: viewModel.yogaImpact)
                }
            }
            .padding()
        }
    }
}

// MARK: - Highlighted Text View

struct HighlightedTextView: View {
    let text: String

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(attributedString)
                .font(.body)
        }
    }

    private var attributedString: AttributedString {
        var result = AttributedString(text)

        // Highlight planets (bold orange)
        let planets = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"]
        for planet in planets {
            highlightText(planet, in: &result, color: .orange, isBold: true)
        }

        // Highlight signs (bold blue)
        let signs = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"]
        for sign in signs {
            highlightText(sign, in: &result, color: .blue, isBold: true)
        }

        // Highlight categories
        let categories = ["Rajyoga", "Dhanayoga", "Lakshyayoga"]
        for category in categories {
            highlightText(category, in: &result, color: .green, isBold: true)
        }

        return result
    }

    private func highlightText(_ searchText: String, in result: inout AttributedString, color: Color, isBold: Bool) {
        // Find and highlight all occurrences
        var searchStart = result.startIndex
        while searchStart < result.endIndex {
            let searchSubstring = result[searchStart..<result.endIndex]
            if let range = searchSubstring.range(of: searchText) {
                result[range].foregroundColor = color
                if isBold {
                    result[range].font = .body.bold()
                }
                searchStart = range.upperBound
            } else {
                break
            }
        }
    }
}

// MARK: - Shared Helpers

private func planetSymbol(_ planet: String) -> String {
    switch planet {
    case "Sun": return "☀️"
    case "Moon": return "🌙"
    case "Mars": return "♂"
    case "Mercury": return "☿"
    case "Jupiter": return "♃"
    case "Venus": return "♀"
    case "Saturn": return "♄"
    case "Rahu": return "☊"
    case "Ketu": return "☋"
    default: return "⚪"
    }
}

// MARK: - Trend Bar

struct TrendBar: View {
    let value: Double  // 0.0–1.0

    var body: some View {
        GeometryReader { geo in
            ZStack(alignment: .leading) {
                Capsule().fill(Color.gray.opacity(0.2))
                Capsule()
                    .fill(value >= 0.7 ? Color.green : value >= 0.5 ? Color.yellow : Color.red)
                    .frame(width: max(2, geo.size.width * value))
            }
        }
        .frame(height: 6)
    }
}

// MARK: - Day Prediction Tab

struct DayPredictionTabView: View {
    let profile: Profile
    @ObservedObject var viewModel: PredictionsViewModel
    @State private var selectedDay = Date()

    var body: some View {
        VStack(spacing: 0) {
            HStack {
                DatePicker("Date", selection: $selectedDay, displayedComponents: .date)
                    .labelsHidden()
                Spacer()
                if let dp = viewModel.dayPrediction {
                    Text("Day Lord: \(planetSymbol(dp.dayLord)) \(dp.dayLord)")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
            }
            .padding()
            .background(Color(nsColor: .controlBackgroundColor))

            Divider()

            if let dp = viewModel.dayPrediction {
                DayPredictionContentView(prediction: dp)
            } else {
                ProgressView("Generating day prediction…")
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
        }
        .task(id: selectedDay) {
            viewModel.selectedDay = selectedDay
            await viewModel.generateDayPrediction(for: profile)
        }
    }
}

struct DayPredictionContentView: View {
    let prediction: DayPrediction

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 12) {
                Text(prediction.summary)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .padding(.horizontal)

                if let best = prediction.bestHour, let worst = prediction.challengingHour {
                    HStack(spacing: 12) {
                        HourCalloutCard(title: "Best Hour", hour: best, tint: .green)
                        HourCalloutCard(title: "Challenging Hour", hour: worst, tint: .red)
                    }
                    .padding(.horizontal)
                }

                // Column headers
                HStack(spacing: 8) {
                    Text("Hour").frame(width: 90, alignment: .leading).font(.caption2).foregroundStyle(.secondary)
                    Text("Hora").frame(width: 44, alignment: .center).font(.caption2).foregroundStyle(.secondary)
                    ForEach(["Career", "Finance", "Health", "Rels.", "Spirit."], id: \.self) { col in
                        Text(col).frame(maxWidth: .infinity, alignment: .center).font(.caption2).foregroundStyle(.secondary)
                    }
                }
                .padding(.horizontal)
                .padding(.top, 4)

                Divider()

                LazyVStack(spacing: 0) {
                    ForEach(prediction.hours) { hour in
                        HourRow(hour: hour)
                        Divider()
                    }
                }
            }
            .padding(.vertical, 8)
        }
    }
}

struct HourCalloutCard: View {
    let title: String
    let hour: HourPrediction
    let tint: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title)
                .font(.caption2)
                .foregroundStyle(tint)
                .fontWeight(.semibold)
            Text(hour.hourRange)
                .font(.headline)
            Text(planetSymbol(hour.horaLord) + " " + hour.horaLord + " hora")
                .font(.caption)
                .foregroundStyle(.secondary)
            Text(String(format: "Overall: %.0f%%", hour.overallScore * 100))
                .font(.caption)
                .foregroundStyle(tint)
        }
        .padding(10)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(tint.opacity(0.1))
        .cornerRadius(8)
    }
}

struct HourRow: View {
    let hour: HourPrediction

    private var rowBackground: Color {
        hour.overallScore >= 0.7 ? Color.green.opacity(0.08) :
        hour.overallScore < 0.5  ? Color.red.opacity(0.08)   : Color.clear
    }

    var body: some View {
        HStack(spacing: 8) {
            Text(hour.hourRange)
                .font(.caption)
                .frame(width: 90, alignment: .leading)
            Text(planetSymbol(hour.horaLord))
                .font(.caption)
                .frame(width: 44, alignment: .center)
            TrendBar(value: hour.career)
            TrendBar(value: hour.finance)
            TrendBar(value: hour.health)
            TrendBar(value: hour.relationships)
            TrendBar(value: hour.spirituality)
        }
        .padding(.horizontal)
        .padding(.vertical, 6)
        .background(rowBackground)
    }
}

// MARK: - Month Prediction Tab

struct MonthPredictionTabView: View {
    let profile: Profile
    @ObservedObject var viewModel: PredictionsViewModel

    private var selectedMonthDate: Date {
        var comps = viewModel.selectedMonthYear
        comps.day = 1
        return Calendar.current.date(from: comps) ?? Date()
    }

    private var monthLabel: String {
        let df = DateFormatter()
        df.dateFormat = "MMMM yyyy"
        return df.string(from: selectedMonthDate)
    }

    private func adjustMonth(by delta: Int) {
        let year  = viewModel.selectedMonthYear.year  ?? Calendar.current.component(.year,  from: Date())
        let month = viewModel.selectedMonthYear.month ?? Calendar.current.component(.month, from: Date())
        var comps = DateComponents()
        comps.year = year; comps.month = month; comps.day = 1
        if let d  = Calendar.current.date(from: comps),
           let nd = Calendar.current.date(byAdding: .month, value: delta, to: d) {
            viewModel.selectedMonthYear = Calendar.current.dateComponents([.year, .month], from: nd)
        }
    }

    var body: some View {
        VStack(spacing: 0) {
            HStack {
                Button(action: { adjustMonth(by: -1) }) {
                    Image(systemName: "chevron.left")
                }
                .buttonStyle(.plain)

                Text(monthLabel)
                    .font(.headline)
                    .frame(minWidth: 160)

                Button(action: { adjustMonth(by: 1) }) {
                    Image(systemName: "chevron.right")
                }
                .buttonStyle(.plain)

                Spacer()

                if let mp = viewModel.monthPrediction {
                    Text("Dasha: \(mp.dashaLord)–\(mp.antardashaLord)")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
            .padding()
            .background(Color(nsColor: .controlBackgroundColor))

            Divider()

            if let mp = viewModel.monthPrediction {
                MonthPredictionContentView(prediction: mp)
            } else {
                ProgressView("Generating month prediction…")
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
        }
        .task(id: viewModel.selectedMonthYear) {
            await viewModel.generateMonthPrediction(for: profile)
        }
    }
}

struct MonthPredictionContentView: View {
    let prediction: MonthPrediction

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 8) {
                Text(prediction.summary)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .padding(.horizontal)

                // Column headers
                HStack(spacing: 8) {
                    Text("Day").frame(width: 40, alignment: .leading).font(.caption2).foregroundStyle(.secondary)
                    Text("Lord").frame(width: 36, alignment: .center).font(.caption2).foregroundStyle(.secondary)
                    ForEach(["Career", "Finance", "Health", "Rels.", "Spirit."], id: \.self) { col in
                        Text(col).frame(maxWidth: .infinity, alignment: .center).font(.caption2).foregroundStyle(.secondary)
                    }
                    Text("Overall").frame(width: 52, alignment: .trailing).font(.caption2).foregroundStyle(.secondary)
                }
                .padding(.horizontal)

                Divider()

                LazyVStack(spacing: 0) {
                    ForEach(prediction.days) { day in
                        DailyTrendRow(trend: day)
                        Divider()
                    }
                }
            }
            .padding(.vertical, 8)
        }
    }
}

struct DailyTrendRow: View {
    let trend: DailyTrend

    private var rowBackground: Color {
        trend.overallScore >= 0.7 ? Color.green.opacity(0.08) :
        trend.overallScore < 0.5  ? Color.red.opacity(0.08)   : Color.clear
    }

    private func weekdayAbbrev(_ date: Date) -> String {
        let df = DateFormatter(); df.dateFormat = "EEE"; return df.string(from: date)
    }

    var body: some View {
        HStack(spacing: 8) {
            VStack(alignment: .leading, spacing: 1) {
                Text(String(format: "%02d", trend.dayOfMonth))
                    .font(.caption.bold())
                Text(weekdayAbbrev(trend.date))
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
            .frame(width: 40, alignment: .leading)

            Text(planetSymbol(trend.dayLord))
                .font(.caption)
                .frame(width: 36, alignment: .center)

            TrendBar(value: trend.career)
            TrendBar(value: trend.finance)
            TrendBar(value: trend.health)
            TrendBar(value: trend.relationships)
            TrendBar(value: trend.spirituality)

            Text(String(format: "%.0f%%", trend.overallScore * 100))
                .font(.caption2.bold())
                .foregroundStyle(
                    trend.overallScore >= 0.7 ? Color.green :
                    trend.overallScore < 0.5  ? Color.red   : Color.orange
                )
                .frame(width: 52, alignment: .trailing)
        }
        .padding(.horizontal)
        .padding(.vertical, 5)
        .background(rowBackground)
    }
}

// MARK: - Color Extension

extension Color {
    static let silver: Color = Color(white: 0.7)
}

// MARK: - Preview

#Preview {
    PredictionsView(profile: Profile(
        id: "preview",
        name: "Preview User",
        dobUTC: "1990-01-01T12:00:00Z",
        latitude: 28.6139,
        longitude: 77.2090,
        timezone: "Asia/Kolkata",
        utcOffset: 5.5,
        placeName: "New Delhi, India",
        ayanamsaId: 1
    ))
}
