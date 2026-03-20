import SwiftUI

struct ProfileListView: View {
    @EnvironmentObject var profilesVM: ProfilesViewModel
    @EnvironmentObject var syncService: SyncService

    var body: some View {
        VStack(spacing: 0) {
            if profilesVM.isLoading {
                LoadingView(message: "Loading profiles...")
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if profilesVM.filteredProfiles.isEmpty {
                profileEmptyState
            } else {
                List(profilesVM.filteredProfiles, selection: $profilesVM.selectedProfile) { profile in
                    ProfileListRow(profile: profile)
                        .tag(profile)
                        .contextMenu {
                            Button(role: .destructive) {
                                Task { await profilesVM.deleteProfile(profile) }
                            } label: {
                                Label("Delete Profile", systemImage: "trash")
                            }
                        }
                }
                .listStyle(.sidebar)
                .scrollContentBackground(.hidden)
                .background(Color.appBackground)
            }
        }
    }

    var profileEmptyState: some View {
        VStack(spacing: 12) {
            Image(systemName: "person.crop.circle.badge.plus")
                .font(.system(size: 36, weight: .thin))
                .foregroundColor(Color.appGold.opacity(0.5))
            Text("No Profiles")
                .font(.system(size: 13, weight: .medium))
                .foregroundColor(.white.opacity(0.5))
            Button("Add Profile") {
                profilesVM.showNewProfile = true
            }
            .buttonStyle(SecondaryButtonStyle())
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

// MARK: - Profile List Row

struct ProfileListRow: View {
    let profile: BirthProfile
    @State private var isHovered = false

    var body: some View {
        HStack(spacing: 10) {
            ZStack {
                Circle()
                    .fill(avatarColor(for: profile.name).opacity(0.2))
                    .frame(width: 36, height: 36)
                Text(profile.name.prefix(1).uppercased())
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundColor(avatarColor(for: profile.name))
            }

            VStack(alignment: .leading, spacing: 2) {
                Text(profile.name)
                    .font(.system(size: 13, weight: .medium))
                    .foregroundColor(.white.opacity(0.9))
                    .lineLimit(1)
                Text(profile.placeName.isEmpty ? profile.shortDOB : profile.placeName)
                    .font(.system(size: 11))
                    .foregroundColor(.white.opacity(0.4))
                    .lineLimit(1)
            }

            Spacer()

            ProfileStatusBadge(status: profile.status)

            Text(profile.shortDOB)
                .font(.system(size: 10, design: .monospaced))
                .foregroundColor(.white.opacity(0.3))
        }
        .padding(.vertical, 3)
    }

    private func avatarColor(for name: String) -> Color {
        let colors: [Color] = [
            Color.appGold, .blue, .purple, .green, .pink, .orange, .teal, .red
        ]
        let index = abs(name.hashValue) % colors.count
        return colors[index]
    }
}

// MARK: - Profile Status Badge

struct ProfileStatusBadge: View {
    let status: ProfileStatus

    var variant: StatusBadge.Variant {
        switch status {
        case .new: return .info
        case .processing: return .warning
        case .ready: return .active
        case .error: return .warning
        }
    }

    var displayText: String {
        switch status {
        case .new: return "New"
        case .processing: return "Processing"
        case .ready: return "Ready"
        case .error: return "Error"
        }
    }

    var body: some View {
        StatusBadge(text: displayText, variant: variant)
    }
}
