import SwiftUI

struct PredictionsView: View {
    let profile: Profile
    @StateObject private var viewModel = PredictionsViewModel()
    @State private var selectedTab = 0

    private let tabTitles = ["Overview", "Dasha", "Planets", "Yogas"]

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
                    TabContent(selectedTab: selectedTab, viewModel: viewModel)
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

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Dasha Timeline")
                .font(.headline)

            // Placeholder for timeline visualization
            HStack(spacing: 4) {
                ForEach(0..<12, id: \.self) { house in
                    Rectangle()
                        .fill(Color.gray.opacity(0.3))
                        .frame(height: 20)
                        .cornerRadius(2)
                }
            }

            Text("Visual timeline representation would appear here")
                .font(.caption)
                .foregroundStyle(.tertiary)
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
        let categories = ["Rajyoga", "Dhanayoga", "Rajayoga", "Lakshyayoga"]
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
                let fullRange = Range(uncheckedBounds: (lower: searchStart, upper: range.upperBound))
                result[fullRange].foregroundColor = color
                if isBold {
                    result[fullRange].font = .body.bold()
                }
                searchStart = range.upperBound
            } else {
                break
            }
        }
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
