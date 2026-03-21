import SwiftUI

struct MainView: View {
    @EnvironmentObject var profilesViewModel: ProfilesViewModel
    @State private var selectedProfile: Profile?
    @State private var selectedTab: MainTab = .chart

    enum MainTab {
        case chart, dasha, shadbala, ashtakavarga, yogas, predictions
    }

    var body: some View {
        NavigationSplitView {
            SidebarView(selectedProfile: $selectedProfile, selectedTab: $selectedTab)
        } detail: {
            if let profile = selectedProfile {
                DetailView(profile: profile, selectedTab: selectedTab)
            } else {
                ContentUnavailableView(
                    "Select a Profile",
                    systemImage: "person.crop.circle",
                    description: Text("Choose a profile from the sidebar to view their chart")
                )
            }
        }
    }
}

struct SidebarView: View {
    @Binding var selectedProfile: Profile?
    @Binding var selectedTab: MainView.MainTab
    @EnvironmentObject var profilesViewModel: ProfilesViewModel

    var body: some View {
        List(selection: $selectedProfile) {
            Section("Profiles") {
                ForEach(profilesViewModel.profiles) { profile in
                    NavigationLink(value: profile) {
                        VStack(alignment: .leading) {
                            Text(profile.name)
                                .font(.headline)
                            if let place = profile.placeName {
                                Text(place)
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                        }
                    }
                }
            }

            Section("Analysis") {
                Label("Chart", systemImage: "chart.bar")
                    .tag(MainView.MainTab.chart)
                Label("Dasha", systemImage: "timeline.selection")
                    .tag(MainView.MainTab.dasha)
                Label("Shadbala", systemImage: "scalemass")
                    .tag(MainView.MainTab.shadbala)
                Label("Ashtakavarga", systemImage: "square.grid.3x3")
                    .tag(MainView.MainTab.ashtakavarga)
                Label("Yogas", systemImage: "sparkles")
                    .tag(MainView.MainTab.yogas)
                Label("Predictions", systemImage: "crystal.ball")
                    .tag(MainView.MainTab.predictions)
            }
        }
        .navigationTitle("AstroGuru")
    }
}

struct DetailView: View {
    let profile: Profile
    let selectedTab: MainView.MainTab

    var body: some View {
        switch selectedTab {
        case .chart:
            ChartView(profile: profile)
        case .dasha:
            DashaView(profile: profile)
        case .shadbala:
            ShadbalaView(profile: profile)
        case .ashtakavarga:
            AshtakavargaView(profile: profile)
        case .yogas:
            YogaListView(profile: profile)
        case .predictions:
            PredictionsView(profile: profile)
        }
    }
}

// MARK: - Placeholder Views (to be implemented in later phases)

struct ChartView: View {
    let profile: Profile
    var body: some View { Text("Chart View - \(profile.name)") }
}

struct PredictionsView: View {
    let profile: Profile
    var body: some View { Text("Predictions View - \(profile.name)") }
}
