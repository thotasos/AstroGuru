import SwiftUI

struct AshtakavargaView: View {
    let profile: Profile
    @StateObject private var viewModel = AshtakavargaViewModel()

    var body: some View {
        Group {
            if viewModel.isCalculating {
                ProgressView("Calculating Ashtakavarga...")
            } else if let error = viewModel.errorMessage {
                ContentUnavailableView(
                    "Ashtakavarga Calculation Failed",
                    systemImage: "exclamationmark.triangle",
                    description: Text(error)
                )
            } else if let result = viewModel.ashtakavargaResult {
                AshtakavargaGridView(result: result, viewModel: viewModel)
            } else {
                ContentUnavailableView(
                    "No Ashtakavarga Data",
                    systemImage: "square.grid.3x3",
                    description: Text("Select a profile with valid birth data to calculate Ashtakavarga")
                )
            }
        }
        .task(id: profile.id) {
            await viewModel.calculateAshtakavarga(for: profile)
        }
    }
}

struct AshtakavargaGridView: View {
    let result: AshtakavargaResult
    @ObservedObject var viewModel: AshtakavargaViewModel

    private let cellSize: CGFloat = 40
    private let headerHeight: CGFloat = 30

    var body: some View {
        ScrollView([.horizontal, .vertical]) {
            VStack(alignment: .leading, spacing: 0) {
                // Header row with zodiac signs
                HStack(spacing: 0) {
                    // Empty corner cell
                    Text("Planet")
                        .font(.caption2)
                        .fontWeight(.semibold)
                        .frame(width: 70, height: headerHeight)
                        .background(Color.gray.opacity(0.2))

                    ForEach(Array(viewModel.zodiacSigns.enumerated()), id: \.offset) { index, sign in
                        Text(String(sign.prefix(3)))
                            .font(.caption2)
                            .fontWeight(.semibold)
                            .frame(width: cellSize, height: headerHeight)
                            .background(Color.gray.opacity(0.2))
                    }

                    // Total column header
                    Text("Total")
                        .font(.caption2)
                        .fontWeight(.semibold)
                        .frame(width: 50, height: headerHeight)
                        .background(Color.gray.opacity(0.3))
                }

                // Planet rows
                ForEach(viewModel.ashtakavargaPlanets, id: \.self) { planet in
                    HStack(spacing: 0) {
                        // Planet name
                        Text(planet)
                            .font(.caption)
                            .fontWeight(.medium)
                            .frame(width: 70, height: cellSize, alignment: .leading)
                            .padding(.leading, 4)
                            .background(Color.gray.opacity(0.1))

                        // Bindu cells for each sign
                        ForEach(0..<12, id: \.self) { signIndex in
                            BinduCell(
                                binduCount: result.bindu(for: planet, sign: signIndex),
                                intensity: viewModel.binduColorIntensity(for: result.bindu(for: planet, sign: signIndex))
                            )
                        }

                        // Planet total
                        Text("\(viewModel.planetTotalBindus(for: planet))")
                            .font(.caption)
                            .fontWeight(.bold)
                            .frame(width: 50, height: cellSize)
                            .background(Color.gray.opacity(0.2))
                    }
                }

                // SAV Total row
                HStack(spacing: 0) {
                    Text("SAV Total")
                        .font(.caption)
                        .fontWeight(.bold)
                        .frame(width: 70, height: cellSize, alignment: .leading)
                        .padding(.leading, 4)
                        .background(Color.gray.opacity(0.3))

                    ForEach(0..<12, id: \.self) { signIndex in
                        Text("\(result.savTotal(for: signIndex))")
                            .font(.caption)
                            .fontWeight(.semibold)
                            .frame(width: cellSize, height: cellSize)
                            .background(Color.gray.opacity(0.2))
                    }

                    Text("\(viewModel.savTotalBindus())")
                        .font(.caption)
                        .fontWeight(.bold)
                        .frame(width: 50, height: cellSize)
                        .background(Color.gray.opacity(0.4))
                }
            }
            .padding()
        }
        .navigationTitle("Sarva Ashtakavarga")
    }
}

struct BinduCell: View {
    let binduCount: Int
    let intensity: Double

    var body: some View {
        ZStack {
            Rectangle()
                .fill(Color.green.opacity(intensity))

            if binduCount > 0 {
                Text("\(binduCount)")
                    .font(.caption2)
                    .fontWeight(.medium)
                    .foregroundStyle(intensity > 0.5 ? Color.white : Color.black)
            }
        }
        .frame(width: 40, height: 40)
        .border(Color.gray.opacity(0.3), width: 0.5)
    }
}

#Preview {
    let sampleProfile = Profile(
        id: "test-id",
        name: "Test User",
        dobUTC: "1990-01-01T12:00:00Z",
        latitude: 28.6139,
        longitude: 77.2090,
        timezone: "Asia/Kolkata",
        utcOffset: 5.5,
        placeName: "New Delhi, India",
        ayanamsaId: 1
    )

    return AshtakavargaView(profile: sampleProfile)
}
