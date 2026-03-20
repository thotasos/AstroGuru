import SwiftUI

struct ShadbalaView: View {
    @EnvironmentObject var viewModel: ShadbalaViewModel
    let profile: BirthProfile

    var body: some View {
        VStack(spacing: 0) {
            if viewModel.isLoading {
                LoadingOverlay(message: "Calculating planetary strengths...")
            } else if let error = viewModel.error {
                ErrorBanner(message: error) {
                    viewModel.error = nil
                }
            } else if viewModel.shadbala.isEmpty {
                EmptyStateView(
                    icon: "scalemass",
                    title: "No Shadbala Data",
                    subtitle: "Unable to calculate planetary strengths",
                    actionTitle: "Retry"
                ) {
                    Task {
                        await viewModel.refresh(for: profile)
                    }
                }
            } else {
                shadbalaContent
            }
        }
        .onAppear {
            Task {
                await viewModel.loadShadbala(for: profile)
            }
        }
    }

    private var shadbalaContent: some View {
        ScrollView {
            VStack(spacing: AppSpacing.lg) {
                // Summary cards
                summarySection

                // Detailed breakdown
                detailsSection
            }
            .padding(AppSpacing.lg)
        }
    }

    private var summarySection: some View {
        HStack(spacing: AppSpacing.base) {
            if let strongest = viewModel.strongestPlanet {
                SummaryCard(
                    title: "Strongest",
                    value: strongest.planetName,
                    subtitle: "\(String(format: "%.1f", strongest.totalRupas)) R",
                    color: .appSuccess
                )
            }

            if let weakest = viewModel.weakestPlanet {
                SummaryCard(
                    title: "Weakest",
                    value: weakest.planetName,
                    subtitle: "\(String(format: "%.1f", weakest.totalRupas)) R",
                    color: .appWarning
                )
            }

            SummaryCard(
                title: "Total Planets",
                value: "\(viewModel.shadbala.count)",
                subtitle: "Analyzed",
                color: .appGold
            )
        }
    }

    private var detailsSection: some View {
        VStack(alignment: .leading, spacing: AppSpacing.base) {
            Text("Planetary Strength Breakdown")
                .font(.appTitle3)
                .foregroundColor(.appTextPrimary)

            ForEach(viewModel.sortedPlanets) { planet in
                ShadbalaPlanetCard(result: planet)
            }
        }
    }
}

// MARK: - Summary Card

struct SummaryCard: View {
    let title: String
    let value: String
    let subtitle: String
    let color: Color

    var body: some View {
        VStack(spacing: 4) {
            Text(title)
                .font(.appCaption)
                .foregroundColor(.appTextMuted)
            Text(value)
                .font(.system(size: 20, weight: .bold))
                .foregroundColor(color)
            Text(subtitle)
                .font(.appCaption2)
                .foregroundColor(.appTextSecondary)
        }
        .frame(maxWidth: .infinity)
        .padding(AppSpacing.base)
        .background(Color.appSurface)
        .clipShape(RoundedRectangle(cornerRadius: AppRadius.lg))
    }
}

// MARK: - Planet Card

struct ShadbalaPlanetCard: View {
    let result: ShadbalaResult

    private let components = ["Sthana", "Dig", "Kala", "Chesta", "Naisargika", "Drig"]

    var body: some View {
        VStack(alignment: .leading, spacing: AppSpacing.sm) {
            // Header
            HStack {
                if let planet = result.planetEnum {
                    PlanetBadge(planet: planet, size: 28)
                } else {
                    Text(result.planetName)
                        .font(.appBodyMedium)
                        .foregroundColor(.appTextPrimary)
                }

                Spacer()

                VStack(alignment: .trailing, spacing: 2) {
                    Text("\(String(format: "%.1f", result.totalRupas)) R")
                        .font(.system(size: 16, weight: .bold))
                        .foregroundColor(.appGold)
                    Text(result.strengthCategory)
                        .font(.appCaption)
                        .foregroundColor(strengthColor)
                }
            }

            // Progress bar for total
            GeometryReader { geometry in
                ZStack(alignment: .leading) {
                    Rectangle()
                        .fill(Color.appBorder)
                        .frame(height: 8)
                        .clipShape(RoundedRectangle(cornerRadius: 4))

                    Rectangle()
                        .fill(strengthColor)
                        .frame(width: geometry.size.width * CGFloat(min(result.totalRupas / 6.0, 1.0)), height: 8)
                        .clipShape(RoundedRectangle(cornerRadius: 4))
                }
            }
            .frame(height: 8)

            // Component breakdown
            HStack(spacing: AppSpacing.xs) {
                ComponentPill(label: "Sth", value: result.sthanabala)
                ComponentPill(label: "Dig", value: result.digbala)
                ComponentPill(label: "Kala", value: result.kalabala)
                ComponentPill(label: "Chest", value: result.chestabala)
                ComponentPill(label: "Nais", value: result.naisargikabala)
                ComponentPill(label: "Drig", value: result.drigbala)
            }
        }
        .padding(AppSpacing.base)
        .background(Color.appSurface)
        .clipShape(RoundedRectangle(cornerRadius: AppRadius.lg))
    }

    private var strengthColor: Color {
        switch result.strengthCategory {
        case "Strong": return .appSuccess
        case "Moderate": return .appGold
        default: return .appWarning
        }
    }
}

// MARK: - Component Pill

struct ComponentPill: View {
    let label: String
    let value: Double

    var body: some View {
        VStack(spacing: 2) {
            Text(label)
                .font(.system(size: 9, weight: .medium))
                .foregroundColor(.appTextMuted)
            Text("\(Int(value))")
                .font(.system(size: 11, weight: .semibold))
                .foregroundColor(.appTextSecondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 4)
        .background(Color.appBackground)
        .clipShape(RoundedRectangle(cornerRadius: 4))
    }
}
