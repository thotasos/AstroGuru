import Foundation
import Combine

// MARK: - Sync Service

@MainActor
class SyncService: ObservableObject {
    @Published var isServerOnline: Bool = false
    @Published var lastSyncDate: Date?
    @Published var syncError: String?

    private let dbPath: String
    private nonisolated(unsafe) var fileWatchTimer: Timer?
    private nonisolated(unsafe) var healthCheckTimer: Timer?
    private var lastKnownModDate: Date?

    static let databaseDidChange = Notification.Name("databaseDidChange")

    init() {
        let appSupport = FileManager.default
            .urls(for: .applicationSupportDirectory, in: .userDomainMask)
            .first!
            .appendingPathComponent("ParashariApp/astrology.sqlite")
        self.dbPath = appSupport.path
        startMonitoring()
    }

    deinit {
        // Use nonisolated(unsafe) lets us access from deinit
        fileWatchTimer?.invalidate()
        healthCheckTimer?.invalidate()
    }

    // MARK: - Start/Stop

    func startMonitoring() {
        startFileWatch()
        startHealthCheck()
        Task { await checkServerHealth() }
    }

    func stopMonitoring() {
        fileWatchTimer?.invalidate()
        fileWatchTimer = nil
        healthCheckTimer?.invalidate()
        healthCheckTimer = nil
    }

    // MARK: - File Watch (every 5 seconds)

    private func startFileWatch() {
        lastKnownModDate = fileModificationDate()
        fileWatchTimer = Timer.scheduledTimer(withTimeInterval: 5.0, repeats: true) { [weak self] _ in
            Task { @MainActor [weak self] in self?.checkFileModification() }
        }
    }

    private func checkFileModification() {
        let currentModDate = fileModificationDate()
        guard let current = currentModDate else { return }
        if let last = lastKnownModDate, current > last {
            lastKnownModDate = current
            lastSyncDate = Date()
            NotificationCenter.default.post(name: SyncService.databaseDidChange, object: nil)
        } else if lastKnownModDate == nil {
            lastKnownModDate = current
        }
    }

    private func fileModificationDate() -> Date? {
        guard FileManager.default.fileExists(atPath: dbPath) else { return nil }
        return (try? FileManager.default.attributesOfItem(atPath: dbPath))?[.modificationDate] as? Date
    }

    // MARK: - Health Check (every 30 seconds)

    private func startHealthCheck() {
        healthCheckTimer = Timer.scheduledTimer(withTimeInterval: 30.0, repeats: true) { [weak self] _ in
            Task { @MainActor [weak self] in await self?.checkServerHealth() }
        }
    }

    func checkServerHealth() async {
        let available = await APIService.shared.isServerAvailable()
        isServerOnline = available
    }

    func triggerManualSync() {
        NotificationCenter.default.post(name: SyncService.databaseDidChange, object: nil)
        Task { await checkServerHealth() }
    }

    var statusDescription: String { isServerOnline ? "Server online" : "Offline mode" }
    var statusColor: String { isServerOnline ? "green" : "orange" }
}
