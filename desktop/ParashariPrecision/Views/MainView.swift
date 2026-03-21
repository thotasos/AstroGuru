import SwiftUI

struct MainView: View {
    @EnvironmentObject var profilesViewModel: ProfilesViewModel
    @State private var selectedProfile: Profile?

    enum MainTab: Hashable {
        case chart, dasha, shadbala, ashtakavarga, yogas, predictions
    }

    var body: some View {
        NavigationSplitView {
            SidebarView(selectedProfile: $selectedProfile)
        } detail: {
            if let profile = selectedProfile {
                DetailView(profile: profile)
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
        }
        .navigationTitle("AstroGuru")
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Button {
                    profilesViewModel.showingNewProfile = true
                } label: {
                    Label("New Profile", systemImage: "plus")
                }
            }
        }
        .sheet(isPresented: $profilesViewModel.showingNewProfile) {
            NewProfileView(onDismiss: {
                profilesViewModel.showingNewProfile = false
                profilesViewModel.loadProfiles()
            })
            .environmentObject(profilesViewModel)
        }
        .overlay {
            if profilesViewModel.profiles.isEmpty {
                ContentUnavailableView(
                    "No Profiles",
                    systemImage: "person.crop.circle.badge.plus",
                    description: Text("Create a profile to get started")
                )
            }
        }
    }
}

struct DetailView: View {
    let profile: Profile
    @State private var selectedTab: MainView.MainTab = .chart

    var body: some View {
        VStack(spacing: 0) {
            Picker("", selection: $selectedTab) {
                Text("Chart").tag(MainView.MainTab.chart)
                Text("Dasha").tag(MainView.MainTab.dasha)
                Text("Shadbala").tag(MainView.MainTab.shadbala)
                Text("Ashtakavarga").tag(MainView.MainTab.ashtakavarga)
                Text("Yogas").tag(MainView.MainTab.yogas)
                Text("Predictions").tag(MainView.MainTab.predictions)
            }
            .pickerStyle(.segmented)
            .padding(.horizontal)
            .padding(.vertical, 8)

            Divider()

            Group {
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
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
        .onChange(of: profile) { _, _ in
            selectedTab = .chart
        }
        .navigationTitle(profile.name)
    }
}
