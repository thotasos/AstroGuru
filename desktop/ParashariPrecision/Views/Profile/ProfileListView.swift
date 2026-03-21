import SwiftUI

struct ProfileListView: View {
    @EnvironmentObject var profilesViewModel: ProfilesViewModel
    @State private var selectedProfile: Profile?
    @State var showNewProfileView = false

    var body: some View {
        NavigationSplitView {
            List(selection: $selectedProfile) {
                ForEach(profilesViewModel.profiles) { profile in
                    NavigationLink(value: profile) {
                        ProfileRowView(profile: profile)
                    }
                }
                .onDelete { indexSet in
                    deleteProfiles(at: indexSet)
                }
            }
            .navigationTitle("Profiles")
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Button {
                        showNewProfileView = true
                    } label: {
                        Label("New Profile", systemImage: "plus")
                    }
                }
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
        } detail: {
            if let profile = selectedProfile {
                ProfileDetailView(profile: profile)
            } else {
                ContentUnavailableView(
                    "Select a Profile",
                    systemImage: "person.crop.circle",
                    description: Text("Choose a profile to view details")
                )
            }
        }
        .sheet(isPresented: $showNewProfileView) {
            NewProfileView(onDismiss: {
                showNewProfileView = false
                profilesViewModel.loadProfiles()
            })
        }
        .onAppear {
            profilesViewModel.loadProfiles()
        }
    }

    private func deleteProfiles(at offsets: IndexSet) {
        for index in offsets {
            let profile = profilesViewModel.profiles[index]
            profilesViewModel.deleteProfile(profile)
        }
        if let selected = selectedProfile,
           !profilesViewModel.profiles.contains(where: { $0.id == selected.id }) {
            selectedProfile = nil
        }
    }
}

struct ProfileRowView: View {
    let profile: Profile

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(profile.name)
                .font(.headline)
            HStack {
                if let place = profile.placeName {
                    Text(place)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                Spacer()
                if let dob = profile.dobDate {
                    Text(dob, format: .dateTime.year().month().day())
                        .font(.caption2)
                        .foregroundStyle(.tertiary)
                }
            }
        }
        .padding(.vertical, 4)
    }
}

struct ProfileDetailView: View {
    let profile: Profile

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                Group {
                    Text("Name")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    Text(profile.name)
                        .font(.title2)
                }

                Group {
                    Text("Date of Birth")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    if let dob = profile.dobDate {
                        Text(dob, format: .dateTime.year().month().day().hour().minute())
                    }
                }

                Group {
                    Text("Location")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    Text(profile.placeName ?? "Unknown")
                    Text(String(format: "%.4f, %.4f", profile.latitude, profile.longitude))
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                Group {
                    Text("Timezone")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    Text(profile.timezone)
                    Text("UTC offset: \(profile.utcOffset, specifier: "%.1f") hours")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                Group {
                    Text("Ayanamsa")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    Text(ayanamsaName(for: profile.ayanamsaId))
                }

                if let notes = profile.notes, !notes.isEmpty {
                    Group {
                        Text("Notes")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        Text(notes)
                    }
                }

                Spacer()
            }
            .padding()
            .navigationTitle(profile.name)
        }
    }

    private func ayanamsaName(for id: Int) -> String {
        switch id {
        case 1: return "Raman"
        case 2: return "Krishnamurti"
        case 3: return "Yukteshwar"
        case 4: return "Sriballav"
        case 5: return "BN Bhasin"
        case 6: return "JM Arya"
        case 7: return "JM Sehgal"
        default: return "Unknown"
        }
    }
}
