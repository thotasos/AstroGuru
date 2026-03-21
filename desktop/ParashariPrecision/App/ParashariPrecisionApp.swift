import SwiftUI

@main
struct ParashariPrecisionApp: App {
    @State private var profilesViewModel = ProfilesViewModel()

    var body: some Scene {
        WindowGroup {
            MainView()
                .environmentObject(profilesViewModel)
                .onAppear {
                    profilesViewModel.initialize()
                }
        }
    }
}
