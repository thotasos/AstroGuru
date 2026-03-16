import SwiftUI

struct ProfileDetailView: View {
    let profile: BirthProfile
    @StateObject private var chartVM = ChartViewModel()
    @StateObject private var dashaVM = DashaViewModel()
    @StateObject private var predictionsVM = PredictionsViewModel()
    @State private var selectedTab: Tab = .chart

    enum Tab: String, CaseIterable {
        case chart    = "Chart"
        case vargas   = "Vargas"
        case dashas   = "Dashas"
        case yogas    = "Yogas"
        case predictions = "Predictions"

        var icon: String {
            switch self {
            case .chart:  return "circle.grid.3x3"
            case .vargas: return "square.grid.4x3.fill"
            case .dashas: return "timeline.selection"
            case .yogas:  return "sparkles"
            case .predictions: return "brain.head.profile"
            }
        }
    }

    var body: some View {
        VStack(spacing: 0) {
            // Profile header
            profileHeader
            AppDivider()
            // Tab bar
            tabBar
            AppDivider()
            // Content
            tabContent
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
        .background(Color.appBackground)
        .onAppear {
            Task {
                await chartVM.loadChart(for: profile)
                await dashaVM.loadDashas(for: profile)
            }
        }
        .onChange(of: profile) { _, newProfile in
            Task {
                await chartVM.loadChart(for: newProfile)
                await dashaVM.loadDashas(for: newProfile)
                await predictionsVM.loadHourlyPredictions(for: newProfile)
            }
        }
    }

    private var profileHeader: some View {
        HStack(spacing: AppSpacing.base) {
            VStack(alignment: .leading, spacing: 4) {
                Text(profile.name)
                    .font(.appTitle2)
                    .foregroundColor(.appTextPrimary)
                HStack(spacing: AppSpacing.sm) {
                    Image(systemName: "calendar")
                        .font(.appCaption)
                        .foregroundColor(.appTextMuted)
                    Text(profile.localBirthTime)
                        .font(.appBody)
                        .foregroundColor(.appTextSecondary)
                    if !profile.placeName.isEmpty {
                        Text("·")
                            .foregroundColor(.appTextMuted)
                        Image(systemName: "mappin")
                            .font(.appCaption)
                            .foregroundColor(.appTextMuted)
                        Text(profile.placeName)
                            .font(.appBody)
                            .foregroundColor(.appTextSecondary)
                    }
                }
            }
            Spacer()
            if let currentDasha = dashaVM.currentMahadasha {
                VStack(alignment: .trailing, spacing: 3) {
                    Text("Current Dasha")
                        .font(.appCaption2)
                        .foregroundColor(.appTextMuted)
                    StatusBadge(text: "\(currentDasha.planet) MD", variant: .gold)
                    Text(currentDasha.dateRangeString)
                        .font(.appCaption2)
                        .foregroundColor(.appTextMuted)
                }
            }
        }
        .padding(.horizontal, AppSpacing.lg)
        .padding(.vertical, AppSpacing.base)
        .background(Color.appSurface)
    }

    private var tabBar: some View {
        HStack(spacing: 0) {
            ForEach(Tab.allCases, id: \.self) { tab in
                Button(action: { selectedTab = tab }) {
                    HStack(spacing: 6) {
                        Image(systemName: tab.icon)
                            .font(.system(size: 12))
                        Text(tab.rawValue)
                            .font(.appBodyMedium)
                    }
                    .foregroundColor(selectedTab == tab ? .appGold : .appTextSecondary)
                    .padding(.horizontal, AppSpacing.base)
                    .padding(.vertical, AppSpacing.sm)
                    .overlay(alignment: .bottom) {
                        if selectedTab == tab {
                            Rectangle()
                                .fill(Color.appGold)
                                .frame(height: 2)
                        }
                    }
                }
                .buttonStyle(.plain)
                .animation(.easeInOut(duration: 0.2), value: selectedTab)
            }
            Spacer()
        }
        .background(Color.appSurface)
    }

    @ViewBuilder
    private var tabContent: some View {
        switch selectedTab {
        case .chart:
            ScrollView {
                VStack(alignment: .leading, spacing: AppSpacing.lg) {
                    if chartVM.isLoading {
                        LoadingView(message: "Calculating chart...")
                            .frame(height: 400)
                    } else if let error = chartVM.error {
                        ErrorBanner(message: error)
                            .padding(AppSpacing.base)
                    } else if let chart = chartVM.chart {
                        HStack(alignment: .top, spacing: AppSpacing.lg) {
                            VStack(spacing: AppSpacing.base) {
                                VargaSelectorView(profile: profile)
                                    .environmentObject(chartVM)
                                SouthIndianChartView(chart: chart)
                            }
                            PlanetTableView()
                                .environmentObject(chartVM)
                        }
                        .padding(AppSpacing.lg)
                    }
                }
            }
        case .vargas:
            ScrollView {
                if chartVM.isLoading {
                    LoadingView()
                } else {
                    LazyVGrid(
                        columns: [GridItem(.adaptive(minimum: 260), spacing: 12)],
                        spacing: 12
                    ) {
                        ForEach(VargaInfo.all) { varga in
                            if let vargaChart = chartVM.vargas[varga.id] {
                                VStack(alignment: .leading, spacing: 8) {
                                    HStack {
                                        Text(varga.name)
                                            .font(.appTitle3)
                                            .foregroundColor(.appGold)
                                        Text(varga.description)
                                            .font(.appCaption)
                                            .foregroundColor(.appTextSecondary)
                                    }
                                    SouthIndianChartView(chart: vargaChart, size: 240)
                                }
                                .padding(AppSpacing.base)
                                .background(Color.appSurface)
                                .clipShape(RoundedRectangle(cornerRadius: AppRadius.lg))
                                .overlay(
                                    RoundedRectangle(cornerRadius: AppRadius.lg)
                                        .stroke(Color.appBorder, lineWidth: 0.5)
                                )
                            }
                        }
                    }
                    .padding(AppSpacing.lg)
                }
            }
        case .dashas:
            DashaView(profile: profile)
                .environmentObject(dashaVM)
        case .yogas:
            if let chart = chartVM.chart {
                YogaListView(profile: profile, chart: chart)
            } else {
                LoadingView()
            }
        case .predictions:
            PredictionsView(viewModel: predictionsVM, profile: profile)
        }
    }
}
