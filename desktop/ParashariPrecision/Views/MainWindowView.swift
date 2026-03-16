import SwiftUI

struct MainWindowView: View {
    @EnvironmentObject private var profilesVM: ProfilesViewModel
    @EnvironmentObject private var syncService: SyncService
    @State private var showNewProfile = false

    var body: some View {
        NavigationSplitView(columnVisibility: .constant(.all)) {
            SidebarView()
                .navigationSplitViewColumnWidth(min: 220, ideal: 240, max: 280)
        } detail: {
            if let selected = profilesVM.selectedProfile {
                ProfileDetailView(profile: selected)
            } else {
                EmptyStateView(
                    icon: "person.crop.circle.badge.plus",
                    title: "No Profile Selected",
                    subtitle: "Select a profile from the sidebar\nor create a new one to begin.",
                    actionTitle: "New Profile"
                ) {
                    showNewProfile = true
                }
            }
        }
        .background(Color.appBackground)
        .sheet(isPresented: $showNewProfile) {
            NewProfileView()
                .environmentObject(profilesVM)
        }
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Button {
                    profilesVM.loadProfiles()
                } label: {
                    Image(systemName: "arrow.clockwise")
                }
                .help("Load Profiles")
            }
            ToolbarItem(placement: .status) {
                HStack(spacing: 6) {
                    Circle()
                        .fill(syncService.isServerOnline ? Color.appSuccess : Color.appWarning)
                        .frame(width: 7, height: 7)
                    Text(syncService.statusDescription)
                        .font(.appCaption)
                        .foregroundColor(.appTextSecondary)
                }
            }
        }
    }
}
