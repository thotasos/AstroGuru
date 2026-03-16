import SwiftUI

@main
struct ParashariPrecisionApp: App {
    @StateObject private var profilesVM = ProfilesViewModel()
    @StateObject private var syncService = SyncService()

    var body: some Scene {
        WindowGroup {
            MainWindowView()
                .environmentObject(profilesVM)
                .environmentObject(syncService)
                .preferredColorScheme(.dark)
                .frame(minWidth: 1200, minHeight: 800)
        }
        .windowStyle(.titleBar)
        .commands {
            CommandGroup(replacing: .newItem) {
                Button("New Profile...") {
                    profilesVM.showNewProfile = true
                }
                .keyboardShortcut("n", modifiers: .command)
            }
        }
    }
}
