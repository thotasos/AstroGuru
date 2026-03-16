import SwiftUI

struct SidebarView: View {
    @EnvironmentObject private var profilesVM: ProfilesViewModel
    @EnvironmentObject private var syncService: SyncService
    @State private var searchText = ""

    private var filteredProfiles: [BirthProfile] {
        if searchText.isEmpty { return profilesVM.profiles }
        return profilesVM.profiles.filter {
            $0.name.localizedCaseInsensitiveContains(searchText) ||
            $0.placeName.localizedCaseInsensitiveContains(searchText)
        }
    }

    var body: some View {
        VStack(spacing: 0) {
            // Header
            HStack {
                Image(systemName: "moon.stars.fill")
                    .font(.system(size: 18, weight: .medium))
                    .foregroundColor(.appGold)
                Text("Parashari")
                    .font(.system(size: 16, weight: .bold))
                    .foregroundColor(.appTextPrimary)
                Spacer()
                Button(action: { profilesVM.showNewProfile = true }) {
                    Image(systemName: "plus")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(.appGold)
                }
                .buttonStyle(.plain)
                .help("New Profile (⌘N)")
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 12)

            AppDivider()

            // Search
            HStack(spacing: 6) {
                Image(systemName: "magnifyingglass")
                    .font(.appCaption)
                    .foregroundColor(.appTextMuted)
                TextField("Search profiles...", text: $searchText)
                    .textFieldStyle(.plain)
                    .font(.appBody)
                    .foregroundColor(.appTextPrimary)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(Color.appSurfaceElevated)

            AppDivider()

            if profilesVM.isLoading {
                LoadingView(message: "Loading profiles...")
                    .frame(maxHeight: .infinity)
            } else if filteredProfiles.isEmpty {
                EmptyStateView(
                    icon: "person.circle",
                    title: "No Profiles",
                    subtitle: searchText.isEmpty ? "Add a birth profile to begin" : "No results for \"\(searchText)\"",
                    actionTitle: searchText.isEmpty ? "Add Profile" : nil
                ) {
                    profilesVM.showNewProfile = true
                }
            } else {
                List(filteredProfiles, selection: $profilesVM.selectedProfile) { profile in
                    ProfileRowView(profile: profile)
                        .tag(profile)
                }
                .listStyle(.sidebar)
                .scrollContentBackground(.hidden)
                .background(Color.appBackground)
            }

            AppDivider()

            // Footer status
            HStack(spacing: 6) {
                Circle()
                    .fill(syncService.isServerOnline ? Color.appSuccess : Color.appWarning)
                    .frame(width: 6, height: 6)
                Text(syncService.statusDescription)
                    .font(.appCaption2)
                    .foregroundColor(.appTextMuted)
                Spacer()
                Text("\(profilesVM.profiles.count) profiles")
                    .font(.appCaption2)
                    .foregroundColor(.appTextMuted)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
        }
        .background(Color.appSurface)
    }
}

struct ProfileRowView: View {
    let profile: BirthProfile

    var body: some View {
        VStack(alignment: .leading, spacing: 3) {
            Text(profile.name)
                .font(.appBodyMedium)
                .foregroundColor(.appTextPrimary)
            Text(profile.localBirthTime)
                .font(.appCaption)
                .foregroundColor(.appTextSecondary)
            if !profile.placeName.isEmpty {
                Text(profile.placeName)
                    .font(.appCaption2)
                    .foregroundColor(.appTextMuted)
                    .lineLimit(1)
            }
        }
        .padding(.vertical, 4)
    }
}
