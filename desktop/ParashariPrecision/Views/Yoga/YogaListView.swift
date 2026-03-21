import SwiftUI

struct YogaListView: View {
    let profile: Profile
    @StateObject private var viewModel = YogaViewModel()

    var body: some View {
        Group {
            if viewModel.isCalculating {
                ProgressView("Calculating Yogas...")
            } else if let error = viewModel.errorMessage {
                ContentUnavailableView(
                    "Yoga Calculation Failed",
                    systemImage: "exclamationmark.triangle",
                    description: Text(error)
                )
            } else if viewModel.yogas.isEmpty {
                ContentUnavailableView(
                    "No Yogas Detected",
                    systemImage: "sparkles",
                    description: Text("No yoga formations were detected in this chart.")
                )
            } else {
                YogaListContentView(viewModel: viewModel)
            }
        }
        .task(id: profile.id) {
            await viewModel.calculateYogas(for: profile)
        }
    }
}

struct YogaListContentView: View {
    @ObservedObject var viewModel: YogaViewModel

    var body: some View {
        VStack(spacing: 0) {
            YogaFilterView(
                selectedCategory: $viewModel.selectedCategory,
                categories: viewModel.availableCategories,
                sortOption: $viewModel.sortOption
            )
            .padding(.horizontal)
            .padding(.vertical, 8)
            .background(Color(nsColor: .controlBackgroundColor))

            Divider()

            if viewModel.displayedYogas.isEmpty {
                ContentUnavailableView(
                    "No Matching Yogas",
                    systemImage: "line.3.horizontal.decrease.circle",
                    description: Text("Try changing the filter criteria")
                )
            } else {
                List {
                    ForEach(viewModel.displayedYogas, id: \.id) { yoga in
                        YogaRowView(yoga: yoga)
                    }
                }
                .listStyle(.sidebar)
            }
        }
        .navigationTitle("Planetary Yogas")
    }
}

struct YogaFilterView: View {
    @Binding var selectedCategory: String?
    let categories: [String]
    @Binding var sortOption: YogaSortOption

    var body: some View {
        HStack(spacing: 16) {
            Picker("Category", selection: $selectedCategory) {
                Text("All Categories").tag(nil as String?)
                ForEach(categories, id: \.self) { category in
                    Text(category).tag(category as String?)
                }
            }
            .pickerStyle(.menu)

            Spacer()

            Picker("Sort By", selection: $sortOption) {
                ForEach(YogaSortOption.allCases, id: \.self) { option in
                    Text(option.rawValue).tag(option)
                }
            }
            .pickerStyle(.menu)
        }
    }
}

struct YogaRowView: View {
    let yoga: YogaResult

    private var isRareYoga: Bool {
        yoga.strength >= 0.9 || yoga.category.lowercased().contains("rare")
    }

    private var isPowerfulYoga: Bool {
        yoga.strength >= 0.75 && yoga.strength < 0.9
    }

    private var strengthColor: Color {
        if yoga.strength >= 0.75 {
            return .green
        } else if yoga.strength >= 0.5 {
            return .orange
        } else {
            return .red
        }
    }

    private var strengthLabel: String {
        if yoga.strength >= 0.75 {
            return "Strong"
        } else if yoga.strength >= 0.5 {
            return "Moderate"
        } else {
            return "Weak"
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 4) {
                    HStack(spacing: 8) {
                        Text(yoga.name)
                            .font(.headline)
                            .fontWeight(.semibold)

                        if isRareYoga {
                            Text("Rare")
                                .font(.caption2)
                                .fontWeight(.bold)
                                .foregroundStyle(.white)
                                .padding(.horizontal, 6)
                                .padding(.vertical, 2)
                                .background(Color.purple)
                                .clipShape(Capsule())
                        } else if isPowerfulYoga {
                            Text("Powerful")
                                .font(.caption2)
                                .fontWeight(.semibold)
                                .foregroundStyle(.white)
                                .padding(.horizontal, 6)
                                .padding(.vertical, 2)
                                .background(Color.blue)
                                .clipShape(Capsule())
                        }
                    }

                    HStack(spacing: 4) {
                        Text(yoga.category)
                            .font(.subheadline)
                            .foregroundStyle(.secondary)

                        Text("•")
                            .foregroundStyle(.tertiary)

                        Text(yoga.planets.joined(separator: ", "))
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                }

                Spacer()

                VStack(alignment: .trailing, spacing: 4) {
                    YogaStrengthIndicator(strength: yoga.strength, label: strengthLabel)

                    Text("Houses: \(yoga.houses.map(String.init).joined(separator: ", "))")
                        .font(.caption2)
                        .foregroundStyle(.tertiary)
                }
            }

            Text(yoga.description)
                .font(.caption)
                .foregroundStyle(.secondary)
                .lineLimit(2)
        }
        .padding(.vertical, 6)
        .background(
            RoundedRectangle(cornerRadius: 6)
                .fill(isRareYoga ? Color.purple.opacity(0.1) : Color.clear)
        )
    }
}

struct YogaStrengthIndicator: View {
    let strength: Double
    let label: String

    private var color: Color {
        if strength >= 0.75 {
            return .green
        } else if strength >= 0.5 {
            return .orange
        } else {
            return .red
        }
    }

    var body: some View {
        HStack(spacing: 4) {
            Circle()
                .fill(color)
                .frame(width: 8, height: 8)

            Text("\(Int(strength * 100))%")
                .font(.caption)
                .fontWeight(.medium)
                .foregroundStyle(color)

            Text(label)
                .font(.caption2)
                .foregroundStyle(.tertiary)
        }
    }
}

#Preview {
    let sampleProfile = Profile(
        id: "preview",
        name: "Preview User",
        dobUTC: "1990-01-01T12:00:00Z",
        latitude: 28.6139,
        longitude: 77.2090,
        timezone: "Asia/Kolkata",
        utcOffset: 5.5,
        placeName: "New Delhi, India",
        ayanamsaId: 1
    )

    return YogaListView(profile: sampleProfile)
}
