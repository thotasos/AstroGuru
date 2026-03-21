import SwiftUI

struct ChartView: View {
    let profile: Profile
    @StateObject private var viewModel = ChartViewModel()

    var body: some View {
        Group {
            if viewModel.isCalculating {
                ProgressView("Calculating chart...")
            } else if let error = viewModel.errorMessage {
                ContentUnavailableView(
                    "Calculation Failed",
                    systemImage: "exclamationmark.triangle",
                    description: Text(error)
                )
            } else if let chartData = viewModel.chartData {
                VStack(spacing: 16) {
                    SouthIndianChartView(chartData: chartData)

                    // Planet positions summary
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Planet Positions")
                            .font(.headline)
                        ForEach(chartData.planets, id: \.planet) { position in
                            HStack {
                                Text(Planet(rawValue: position.planet)?.symbol ?? "?")
                                    .font(.system(size: 16, weight: .bold))
                                Text(position.planet)
                                    .font(.subheadline)
                                Spacer()
                                Text(Sign(rawValue: position.sign)?.name ?? "?")
                                    .foregroundStyle(.secondary)
                                Text("\(String(format: "%.1f", position.degreeInSign))°")
                                    .foregroundStyle(.secondary)
                            }
                        }
                    }
                    .padding()
                    .background(Color(nsColor: .controlBackgroundColor))
                    .cornerRadius(8)

                    Spacer()
                }
                .padding()
            } else {
                ContentUnavailableView(
                    "No Chart Data",
                    systemImage: "chart.bar",
                    description: Text("Select a profile to view their chart")
                )
            }
        }
        .task {
            await viewModel.calculateChart(for: profile)
        }
    }
}
