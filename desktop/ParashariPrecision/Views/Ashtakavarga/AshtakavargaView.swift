import SwiftUI

struct AshtakavargaView: View {
    @EnvironmentObject var viewModel: AshtakavargaViewModel
    let profile: BirthProfile

    @State private var selectedTab: AVTab = .bav

    enum AVTab: String, CaseIterable {
        case bav = "Bindu (BAV)"
        case sav = "Sarva (SAV)"
        case planet = "Planet BAV"
    }

    var body: some View {
        VStack(spacing: 0) {
            if viewModel.isLoading {
                LoadingOverlay(message: "Calculating Ashtakavarga...")
            } else if let error = viewModel.error {
                ErrorBanner(message: error) {
                    viewModel.error = nil
                }
            } else if viewModel.ashtakavarga == nil {
                EmptyStateView(
                    icon: "square.grid.3x3",
                    title: "No Ashtakavarga Data",
                    subtitle: "Unable to calculate Ashtakavarga",
                    actionTitle: "Retry"
                ) {
                    Task {
                        await viewModel.refresh(for: profile)
                    }
                }
            } else {
                tabSelector
                AppDivider()
                tabContent
            }
        }
        .onAppear {
            Task {
                await viewModel.loadAshtakavarga(for: profile)
            }
        }
    }

    private var tabSelector: some View {
        HStack(spacing: AppSpacing.sm) {
            ForEach(AVTab.allCases, id: \.self) { tab in
                Button {
                    selectedTab = tab
                } label: {
                    Text(tab.rawValue)
                        .font(.appBodyMedium)
                        .padding(.horizontal, AppSpacing.base)
                        .padding(.vertical, AppSpacing.sm)
                        .background(
                            RoundedRectangle(cornerRadius: AppRadius.md)
                                .fill(selectedTab == tab ? Color.appGold : Color.clear)
                        )
                        .foregroundColor(selectedTab == tab ? Color.appBackground : Color.appTextSecondary)
                }
                .buttonStyle(.plain)
            }
            Spacer()
        }
        .padding(AppSpacing.base)
        .background(Color.appSurface)
    }

    @ViewBuilder
    private var tabContent: some View {
        switch selectedTab {
        case .bav:
            BinduAVView(data: viewModel.ashtakavarga)
        case .sav:
            SarvaAVView(data: viewModel.ashtakavarga)
        case .planet:
            PlanetBAVView(data: viewModel.ashtakavarga)
        }
    }
}

// MARK: - Bindu AV View

struct BinduAVView: View {
    let data: AshtakavargaResult?

    var body: some View {
        ScrollView {
            VStack(spacing: AppSpacing.base) {
                Text("Bindu Ashtakavarga (Benefic Points per Sign)")
                    .font(.appTitle3)
                    .foregroundColor(.appTextPrimary)
                    .frame(maxWidth: .infinity, alignment: .leading)

                // SAV summary at top
                if let sav = data?.sav {
                    HStack(spacing: 4) {
                        ForEach(0..<12, id: \.self) { sign in
                            let count = sav[sign]
                            Text("\(count)")
                                .font(.system(size: 10, weight: .bold))
                                .foregroundColor(count >= 28 ? .appSuccess : (count >= 20 ? .appGold : .appWarning))
                                .frame(width: 24, height: 24)
                                .background(Color.appSurface)
                                .clipShape(RoundedRectangle(cornerRadius: 4))
                        }
                    }
                    .padding(AppSpacing.sm)
                    .background(Color.appBackground)
                    .clipShape(RoundedRectangle(cornerRadius: AppRadius.md))

                    Text("SAV Totals by Sign")
                        .font(.appCaption)
                        .foregroundColor(.appTextMuted)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }

                // BAV grid
                if let bav = data?.bav {
                    ForEach(Array(bav.keys.sorted()), id: \.self) { key in
                        if let counts = bav[key] {
                            PlanetBAVRow(
                                planetKey: key,
                                counts: counts,
                                total: counts.reduce(0, +)
                            )
                        }
                    }
                }
            }
            .padding(AppSpacing.lg)
        }
    }
}

// MARK: - Sarva AV View

struct SarvaAVView: View {
    let data: AshtakavargaResult?

    var body: some View {
        ScrollView {
            VStack(spacing: AppSpacing.base) {
                Text("Sarva Ashtakavarga (Total Benefic Points)")
                    .font(.appTitle3)
                    .foregroundColor(.appTextPrimary)
                    .frame(maxWidth: .infinity, alignment: .leading)

                if let sav = data?.sav {
                    // Bar chart
                    HStack(alignment: .bottom, spacing: 8) {
                        ForEach(0..<12, id: \.self) { sign in
                            VStack(spacing: 4) {
                                Text("\(sav[sign])")
                                    .font(.system(size: 10, weight: .bold))
                                    .foregroundColor(.appTextPrimary)

                                Rectangle()
                                    .fill(barColor(for: sign, value: sav[sign]))
                                    .frame(width: 28, height: CGFloat(sav[sign]) * 3)

                                Text(Sign(rawValue: sign)?.shortName ?? "")
                                    .font(.system(size: 9))
                                    .foregroundColor(.appTextMuted)
                            }
                        }
                    }
                    .frame(height: 200)
                    .padding(AppSpacing.base)
                    .background(Color.appSurface)
                    .clipShape(RoundedRectangle(cornerRadius: AppRadius.lg))

                    // Key insights
                    VStack(alignment: .leading, spacing: AppSpacing.sm) {
                        Text("Key Insights")
                            .font(.appBodyMedium)
                            .foregroundColor(.appTextPrimary)

                        let maxSign = sav.enumerated().max(by: { $0.element < $1.element })?.offset ?? 0
                        let minSign = sav.enumerated().min(by: { $0.element < $1.element })?.offset ?? 0

                        HStack {
                            Image(systemName: "arrow.up.circle.fill")
                                .foregroundColor(.appSuccess)
                            Text("\(Sign(rawValue: maxSign)?.name ?? "") has highest benefics (\(sav[maxSign]))")
                                .font(.appBody)
                                .foregroundColor(.appTextSecondary)
                        }

                        HStack {
                            Image(systemName: "arrow.down.circle.fill")
                                .foregroundColor(.appWarning)
                            Text("\(Sign(rawValue: minSign)?.name ?? "") has lowest benefics (\(sav[minSign]))")
                                .font(.appBody)
                                .foregroundColor(.appTextSecondary)
                        }
                    }
                    .padding(AppSpacing.base)
                    .background(Color.appSurface)
                    .clipShape(RoundedRectangle(cornerRadius: AppRadius.lg))
                }
            }
            .padding(AppSpacing.lg)
        }
    }

    private func barColor(for sign: Int, value: Int) -> Color {
        if value >= 28 { return .appSuccess }
        if value >= 20 { return .appGold }
        return .appWarning
    }
}

// MARK: - Planet BAV View

struct PlanetBAVView: View {
    let data: AshtakavargaResult?

    var body: some View {
        ScrollView {
            VStack(spacing: AppSpacing.base) {
                Text("Planet-wise Bindu Ashtakavarga")
                    .font(.appTitle3)
                    .foregroundColor(.appTextPrimary)
                    .frame(maxWidth: .infinity, alignment: .leading)

                if let planetBav = data?.planetBav {
                    ForEach(Array(planetBav.keys.sorted()), id: \.self) { key in
                        if let counts = planetBav[key] {
                            PlanetBAVRow(
                                planetKey: key,
                                counts: counts,
                                total: counts.reduce(0, +)
                            )
                        }
                    }
                }
            }
            .padding(AppSpacing.lg)
        }
    }
}

// MARK: - Planet BAV Row

struct PlanetBAVRow: View {
    let planetKey: Int
    let counts: [Int]
    let total: Int

    var planetName: String {
        if planetKey == 7 { return "Lagna" }
        return Planet(rawValue: planetKey)?.name ?? "Unknown"
    }

    var body: some View {
        VStack(alignment: .leading, spacing: AppSpacing.xs) {
            HStack {
                Text(planetName)
                    .font(.appBodyMedium)
                    .foregroundColor(.appTextPrimary)
                Spacer()
                Text("Total: \(total)")
                    .font(.appCaption)
                    .foregroundColor(.appTextSecondary)
            }

            HStack(spacing: 4) {
                ForEach(0..<12, id: \.self) { sign in
                    let count = sign < counts.count ? counts[sign] : 0
                    Text("\(count)")
                        .font(.system(size: 9, weight: count > 0 ? .bold : .regular))
                        .foregroundColor(count > 0 ? (count >= 4 ? .appSuccess : .appTextSecondary) : .appTextMuted.opacity(0.3))
                        .frame(width: 22, height: 22)
                        .background(count > 0 ? Color.appGold.opacity(count >= 4 ? 0.3 : 0.1) : Color.clear)
                        .clipShape(RoundedRectangle(cornerRadius: 3))
                }
            }

            // Sign labels
            HStack(spacing: 4) {
                ForEach(0..<12, id: \.self) { sign in
                    Text(Sign(rawValue: sign)?.abbreviation ?? "")
                        .font(.system(size: 8))
                        .foregroundColor(.appTextMuted)
                        .frame(width: 22)
                }
            }
        }
        .padding(AppSpacing.sm)
        .background(Color.appSurface)
        .clipShape(RoundedRectangle(cornerRadius: AppRadius.md))
    }
}

// MARK: - Sign Extension

extension Sign {
    var abbreviation: String {
        switch self {
        case .aries: return "Ar"
        case .taurus: return "Ta"
        case .gemini: return "Ge"
        case .cancer: return "Ca"
        case .leo: return "Le"
        case .virgo: return "Vi"
        case .libra: return "Li"
        case .scorpio: return "Sc"
        case .sagittarius: return "Sg"
        case .capricorn: return "Cp"
        case .aquarius: return "Aq"
        case .pisces: return "Pi"
        }
    }
}
