import SwiftUI

struct SouthIndianChartView: View {
    let chartData: ChartData

    private let cellSize: CGFloat = 112
    private let gap: CGFloat = 2

    // 4×4 signGrid (0-based)
    private let signGrid: [[Int]] = [
        [8,  9,  10, 11],
        [7,  -1, -1,  0],
        [6,  -1, -1,  1],
        [5,   4,  3,  2]
    ]

    private func isCenterCell(row: Int, col: Int) -> Bool {
        (row == 1 || row == 2) && (col == 1 || col == 2)
    }

    var body: some View {
        ZStack(alignment: .topLeading) {
            VStack(spacing: gap) {
                ForEach(0..<4, id: \.self) { row in
                    HStack(spacing: gap) {
                        ForEach(0..<4, id: \.self) { col in
                            if isCenterCell(row: row, col: col) {
                                Color.clear.frame(width: cellSize, height: cellSize)
                            } else {
                                let sign = signGrid[row][col]
                                let cell = gridCells.first { $0.sign == sign }
                                ChartCell(gridCell: cell)
                                    .frame(width: cellSize, height: cellSize)
                            }
                        }
                    }
                }
            }
            CenterChartCell(chartData: chartData)
                .frame(width: cellSize * 2 + gap, height: cellSize * 2 + gap)
                .offset(x: cellSize + gap, y: cellSize + gap)
        }
        .frame(width: cellSize * 4 + gap * 3, height: cellSize * 4 + gap * 3)
        .background(Color.primary.opacity(0.1))
    }

    private var gridCells: [GridCell] {
        Self.createGridCells(from: chartData)
    }

    static func createGridCells(from chartData: ChartData) -> [GridCell] {
        // Build planet positions by sign
        var planetsBySign: [Int: [String]] = [:]
        for position in chartData.planets {
            let sign = position.sign
            let symbol = Planet(rawValue: position.planet)?.symbol ?? position.planet
            if planetsBySign[sign] != nil {
                planetsBySign[sign]?.append(symbol)
            } else {
                planetsBySign[sign] = [symbol]
            }
        }

        // Determine lagna sign from ascendant degree
        let lagnaSign = signFromLongitude(chartData.ascendant)

        var cells: [GridCell] = []

        // Add 12 sign cells
        let signGrid: [[Int]] = [
            [8,  9,  10, 11],
            [7,  -1, -1,  0],
            [6,  -1, -1,  1],
            [5,   4,  3,  2]
        ]

        for (row, rowSigns) in signGrid.enumerated() {
            for (col, sign) in rowSigns.enumerated() {
                if sign == -1 {
                    // Center cell
                    cells.append(GridCell(
                        row: row,
                        col: col,
                        sign: -1,
                        isCenter: true,
                        planets: [],
                        lagnaSign: nil
                    ))
                } else {
                    cells.append(GridCell(
                        row: row,
                        col: col,
                        sign: sign,
                        isCenter: false,
                        planets: planetsBySign[sign] ?? [],
                        lagnaSign: sign == lagnaSign ? lagnaSign : nil
                    ))
                }
            }
        }

        return cells
    }

    private static func signFromLongitude(_ longitude: Double) -> Int {
        let normalized = longitude.truncatingRemainder(dividingBy: 360)
        let positive = normalized < 0 ? normalized + 360 : normalized
        return Int(positive / 30)
    }
}

// MARK: - Chart Cell

struct ChartCell: View {
    let gridCell: GridCell?

    var body: some View {
        ZStack {
            Rectangle()
                .fill(Color(nsColor: .controlBackgroundColor))
                .overlay(
                    Rectangle()
                        .stroke(Color.secondary.opacity(0.5), lineWidth: 1)
                )

            if let cell = gridCell {
                VStack(spacing: 2) {
                    // Sign symbol
                    Text(Sign(rawValue: cell.sign)?.symbol ?? "?")
                        .font(.system(size: 24))

                    // Planets
                    if !cell.planets.isEmpty {
                        Text(cell.planets.joined())
                            .font(.system(size: 12, weight: .bold))
                    }

                    // Lagna marker
                    if cell.lagnaSign != nil {
                        Text("L")
                            .font(.system(size: 10, weight: .bold))
                            .foregroundColor(.red)
                    }
                }
            }
        }
        .frame(width: 115, height: 115)
    }
}

// MARK: - Center Chart Cell

struct CenterChartCell: View {
    let chartData: ChartData

    var body: some View {
        ZStack {
            Rectangle()
                .fill(Color(nsColor: .controlBackgroundColor))
                .overlay(
                    Rectangle()
                        .stroke(Color.secondary.opacity(0.5), lineWidth: 1)
                )

            VStack(spacing: 4) {
                // Ascendant
                Text("Asc: \(ascendantText)")
                    .font(.system(size: 12, weight: .bold))

                Divider()
                    .frame(width: 60)

                // MC
                Text("MC: \(mcText)")
                    .font(.system(size: 12, weight: .bold))
            }
        }
        .frame(width: 115, height: 115)
    }

    private var ascendantText: String {
        let degrees = Int(chartData.ascendant.truncatingRemainder(dividingBy: 30))
        let minutes = Int((chartData.ascendant.truncatingRemainder(dividingBy: 1)) * 60)
        return "\(degrees)°\(minutes)'"
    }

    private var mcText: String {
        let degrees = Int(chartData.mc.truncatingRemainder(dividingBy: 30))
        let minutes = Int((chartData.mc.truncatingRemainder(dividingBy: 1)) * 60)
        return "\(degrees)°\(minutes)'"
    }
}

#Preview {
    let sampleData = ChartData(
        ascendant: 120.5,
        planets: [
            PlanetPosition(planet: "Sun", sign: 4, degreeInSign: 14.5, longitude: 134.5, nakshatra: 12, pada: 3, isRetrograde: false),
            PlanetPosition(planet: "Moon", sign: 10, degreeInSign: 22.3, longitude: 292.3, nakshatra: 22, pada: 1, isRetrograde: false)
        ],
        houses: [
            House(number: 1, sign: .leo, degreeOnCusp: 120),
            House(number: 2, sign: .virgo, degreeOnCusp: 150),
            House(number: 3, sign: .libra, degreeOnCusp: 180),
            House(number: 4, sign: .scorpio, degreeOnCusp: 210),
            House(number: 5, sign: .sagittarius, degreeOnCusp: 240),
            House(number: 6, sign: .capricorn, degreeOnCusp: 270),
            House(number: 7, sign: .aquarius, degreeOnCusp: 300),
            House(number: 8, sign: .pisces, degreeOnCusp: 330),
            House(number: 9, sign: .aries, degreeOnCusp: 0),
            House(number: 10, sign: .taurus, degreeOnCusp: 30),
            House(number: 11, sign: .gemini, degreeOnCusp: 60),
            House(number: 12, sign: .cancer, degreeOnCusp: 90)
        ],
        julianDay: 2451545.0,
        ayanamsaValue: 23.85,
        ayanamsaType: 1,
        mc: 245.0
    )

    SouthIndianChartView(chartData: sampleData)
        .padding()
}
