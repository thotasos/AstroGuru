import SwiftUI

struct ShadbalaView: View {
    let profile: Profile
    @StateObject private var viewModel = ShadbalaViewModel()

    var body: some View {
        Group {
            if viewModel.isCalculating {
                ProgressView("Calculating Shadbala...")
            } else if let error = viewModel.errorMessage {
                ContentUnavailableView(
                    "Shadbala Calculation Failed",
                    systemImage: "exclamationmark.triangle",
                    description: Text(error)
                )
            } else if viewModel.shadbalaResults.isEmpty {
                ContentUnavailableView(
                    "No Shadbala Available",
                    systemImage: "chart.bar",
                    description: Text("Select a profile with valid birth data to calculate planetary strength")
                )
            } else {
                ShadbalaTableView(viewModel: viewModel)
            }
        }
        .task {
            await viewModel.calculateShadbala(for: profile)
        }
    }
}

struct ShadbalaTableView: View {
    @ObservedObject var viewModel: ShadbalaViewModel

    var body: some View {
        Table(viewModel.sortedResults) {
            TableColumn("Planet") { result in
                PlanetCell(result: result)
            }

            TableColumn("Sthana Bala") { result in
                StrengthCell(value: result.sthAnaBala)
            }

            TableColumn("Dig Bala") { result in
                StrengthCell(value: result.digBala)
            }

            TableColumn("Kala Bala") { result in
                StrengthCell(value: result.kalaBala)
            }

            TableColumn("Chestabala") { result in
                StrengthCell(value: result.chestabala)
            }

            TableColumn("Naisargika Bala") { result in
                StrengthCell(value: result.naisargikaBala)
            }

            TableColumn("Drig Bala") { result in
                StrengthCell(value: result.drigBala)
            }

            TableColumn("Total (Rupas)") { result in
                TotalStrengthCell(result: result)
            }
        }
        .navigationTitle("Shadbala - Planetary Strength")
    }
}

struct PlanetCell: View {
    let result: ShadbalaResult

    var body: some View {
        HStack(spacing: 6) {
            Text(result.planet)
                .fontWeight(.medium)

            if result.isExalted {
                Image(systemName: "arrow.up.circle.fill")
                    .foregroundStyle(.green)
                    .font(.caption)
            } else if result.isDebilitated {
                Image(systemName: "arrow.down.circle.fill")
                    .foregroundStyle(.red)
                    .font(.caption)
            }
        }
    }
}

struct StrengthCell: View {
    let value: Double

    var body: some View {
        Text(String(format: "%.1f", value))
            .monospacedDigit()
    }
}

struct TotalStrengthCell: View {
    let result: ShadbalaResult

    var body: some View {
        HStack(spacing: 4) {
            Text(String(format: "%.2f", result.total))
                .fontWeight(.semibold)
                .monospacedDigit()

            Text("(\(String(format: "%.0f", result.strengthInVirupas)) vp)")
                .font(.caption2)
                .foregroundStyle(.secondary)
                .monospacedDigit()
        }
        .foregroundStyle(strengthColor)
    }

    private var strengthColor: Color {
        if result.isExalted {
            return .green
        } else if result.isDebilitated {
            return .red
        } else {
            return .primary
        }
    }
}
