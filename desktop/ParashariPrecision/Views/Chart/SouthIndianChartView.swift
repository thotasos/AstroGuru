import SwiftUI

// MARK: - South Indian Chart View

struct SouthIndianChartView: View {
    let chart: ChartData
    var size: CGFloat = 480
    var profileName: String = ""

    // Fixed South Indian layout (sign numbers, 0-indexed):
    // [Pi(11)] [Ar(0)]  [Ta(1)]  [Ge(2)]
    // [Aq(10)] [center] [center] [Ca(3)]
    // [Cp(9)]  [center] [center] [Le(4)]
    // [Sg(8)]  [Sc(7)]  [Li(6)]  [Vi(5)]

    private let signGrid: [[Int?]] = [
        [11, 0,  1,  2 ],
        [10, nil, nil, 3 ],
        [9,  nil, nil, 4 ],
        [8,  7,  6,  5 ]
    ]

    private let bgColor = Color(red: 0.110, green: 0.098, blue: 0.090)
    private let gridColor = Color.white.opacity(0.15)
    private let ascBorderColor = Color(red: 0.792, green: 0.541, blue: 0.016)
    private let textColor = Color.white.opacity(0.35)
    private let signLabelColor = Color.white.opacity(0.3)

    var body: some View {
        Canvas { context, canvasSize in
            let cellSize = canvasSize.width / 4

            // Background
            context.fill(
                Path(CGRect(origin: .zero, size: canvasSize)),
                with: .color(bgColor)
            )

            // Draw each cell
            for row in 0..<4 {
                for col in 0..<4 {
                    let signIndex = signGrid[row][col]
                    let rect = CGRect(
                        x: CGFloat(col) * cellSize,
                        y: CGFloat(row) * cellSize,
                        width: cellSize,
                        height: cellSize
                    )

                    if let signIdx = signIndex {
                        drawSignCell(
                            context: context,
                            rect: rect,
                            signIndex: signIdx,
                            cellSize: cellSize
                        )
                    } else {
                        // Center cell — draw with slightly different fill
                        drawCenterCell(
                            context: context,
                            rect: rect,
                            row: row,
                            col: col,
                            canvasSize: canvasSize,
                            cellSize: cellSize
                        )
                    }
                }
            }

            // Draw grid lines on top
            drawGridLines(context: context, canvasSize: canvasSize, cellSize: cellSize)
        }
        .frame(width: size, height: size)
        .background(bgColor)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .strokeBorder(Color.white.opacity(0.1), lineWidth: 0.5)
        )
    }

    // MARK: - Draw Sign Cell

    private func drawSignCell(
        context: GraphicsContext,
        rect: CGRect,
        signIndex: Int,
        cellSize: CGFloat
    ) {
        guard let sign = Sign(rawValue: signIndex) else { return }
        let isAsc = signIndex == chart.ascendantSign
        let planetsHere = chart.planetsInSign(signIndex)

        // Cell background
        if isAsc {
            context.fill(
                Path(rect),
                with: .color(Color(red: 0.792, green: 0.541, blue: 0.016).opacity(0.08))
            )
        }

        // Ascendant gold border (inner)
        if isAsc {
            var borderPath = Path()
            let inset: CGFloat = 2
            let innerRect = rect.insetBy(dx: inset, dy: inset)
            borderPath.addRect(innerRect)
            context.stroke(borderPath, with: .color(ascBorderColor.opacity(0.7)), lineWidth: 1.5)
        }

        // Sign number (top-left corner)
        let numberText = Text("\(sign.number)")
            .font(.system(size: cellSize * 0.14, weight: .medium, design: .rounded))
            .foregroundColor(isAsc ? Color(red: 0.792, green: 0.541, blue: 0.016).opacity(0.8) : signLabelColor)

        context.draw(
            numberText,
            at: CGPoint(x: rect.minX + cellSize * 0.1, y: rect.minY + cellSize * 0.12),
            anchor: .topLeading
        )

        // Sign short name (top-right corner)
        let signText = Text(sign.shortName)
            .font(.system(size: cellSize * 0.13, weight: .regular, design: .rounded))
            .foregroundColor(isAsc ? Color(red: 0.792, green: 0.541, blue: 0.016).opacity(0.7) : signLabelColor)

        context.draw(
            signText,
            at: CGPoint(x: rect.maxX - cellSize * 0.08, y: rect.minY + cellSize * 0.1),
            anchor: .topTrailing
        )

        // Place planets
        if !planetsHere.isEmpty {
            let sorted = planetsHere.sorted { a, b in
                let orderA = Planet.allCases.firstIndex { $0.name.lowercased() == a.planet.lowercased() } ?? 99
                let orderB = Planet.allCases.firstIndex { $0.name.lowercased() == b.planet.lowercased() } ?? 99
                return orderA < orderB
            }

            let lineHeight = cellSize * 0.195
            let startY = rect.midY - CGFloat(sorted.count - 1) * lineHeight * 0.5
            let centerX = rect.midX

            for (i, position) in sorted.enumerated() {
                let y = startY + CGFloat(i) * lineHeight
                let planetObj = Planet.allCases.first { $0.name.lowercased() == position.planet.lowercased() }
                let abbr = planetObj?.abbreviation ?? String(position.planet.prefix(2))
                let pColor = planetObj?.color ?? .white

                // Planet abbreviation
                let retroMark = position.isRetrograde ? "℞" : ""
                let planetText = Text("\(abbr)\(retroMark)")
                    .font(.system(size: cellSize * 0.14, weight: .bold, design: .monospaced))
                    .foregroundColor(pColor)

                context.draw(
                    planetText,
                    at: CGPoint(x: centerX, y: y),
                    anchor: .center
                )

                // Degree (smaller, below abbr)
                let degText = Text(position.degreeString)
                    .font(.system(size: cellSize * 0.095, design: .monospaced))
                    .foregroundColor(.white.opacity(0.35))

                context.draw(
                    degText,
                    at: CGPoint(x: centerX, y: y + cellSize * 0.13),
                    anchor: .center
                )
            }
        }
    }

    // MARK: - Draw Center Cell

    private func drawCenterCell(
        context: GraphicsContext,
        rect: CGRect,
        row: Int,
        col: Int,
        canvasSize: CGSize,
        cellSize: CGFloat
    ) {
        // The center is a 2×2 area
        // Only draw content once (for top-left center cell at row=1, col=1)
        guard row == 1 && col == 1 else { return }

        let centerRect = CGRect(
            x: cellSize,
            y: cellSize,
            width: cellSize * 2,
            height: cellSize * 2
        )

        // Center background
        context.fill(
            Path(centerRect),
            with: .color(Color(red: 0.08, green: 0.07, blue: 0.06))
        )

        // Om symbol
        let omText = Text("ॐ")
            .font(.system(size: cellSize * 0.55, weight: .thin))
            .foregroundColor(Color(red: 0.792, green: 0.541, blue: 0.016).opacity(0.25))

        context.draw(
            omText,
            at: CGPoint(x: centerRect.midX, y: centerRect.midY - cellSize * 0.12),
            anchor: .center
        )

        // Ayanamsa label
        let ayanLabel = Text("\(chart.ayanamsa)")
            .font(.system(size: cellSize * 0.09, weight: .medium))
            .foregroundColor(Color.appGold.opacity(0.55))

        context.draw(
            ayanLabel,
            at: CGPoint(x: centerRect.midX, y: centerRect.midY + cellSize * 0.28),
            anchor: .center
        )

        let ayanDeg = Text(String(format: "%.4f°", chart.ayanamsaDegree))
            .font(.system(size: cellSize * 0.08, design: .monospaced))
            .foregroundColor(.white.opacity(0.25))

        context.draw(
            ayanDeg,
            at: CGPoint(x: centerRect.midX, y: centerRect.midY + cellSize * 0.38),
            anchor: .center
        )
    }

    // MARK: - Draw Grid Lines

    private func drawGridLines(
        context: GraphicsContext,
        canvasSize: CGSize,
        cellSize: CGFloat
    ) {
        var gridPath = Path()

        // Horizontal lines
        for i in 0...4 {
            let y = CGFloat(i) * cellSize
            gridPath.move(to: CGPoint(x: 0, y: y))
            gridPath.addLine(to: CGPoint(x: canvasSize.width, y: y))
        }

        // Vertical lines
        for i in 0...4 {
            let x = CGFloat(i) * cellSize
            gridPath.move(to: CGPoint(x: x, y: 0))
            gridPath.addLine(to: CGPoint(x: x, y: canvasSize.height))
        }

        context.stroke(gridPath, with: .color(gridColor), lineWidth: 0.5)

        // Inner center square border (stronger)
        var centerBorderPath = Path()
        centerBorderPath.addRect(CGRect(x: cellSize, y: cellSize, width: cellSize * 2, height: cellSize * 2))
        context.stroke(centerBorderPath, with: .color(Color.white.opacity(0.2)), lineWidth: 0.75)
    }
}

// MARK: - Preview

#Preview {
    SouthIndianChartView(
        chart: ChartData(
            profileId: "test",
            varga: "D1",
            ayanamsa: "Lahiri",
            ayanamsaDegree: 23.8456,
            ascendantSign: 0,
            ascendantDegree: 15.3,
            planets: [
                PlanetPosition(
                    id: "1", planet: "Sun", longitude: 15.0, latitude: 0, speed: 1.0,
                    sign: 0, signLongitude: 15.0, nakshatra: "Ashwini", nakshatraPada: 2,
                    isRetrograde: false, house: 1
                ),
                PlanetPosition(
                    id: "2", planet: "Moon", longitude: 45.0, latitude: 0, speed: 13.0,
                    sign: 1, signLongitude: 15.0, nakshatra: "Rohini", nakshatraPada: 1,
                    isRetrograde: false, house: 2
                ),
                PlanetPosition(
                    id: "3", planet: "Jupiter", longitude: 240.0, latitude: 0, speed: 0.08,
                    sign: 8, signLongitude: 0.0, nakshatra: "Moola", nakshatraPada: 1,
                    isRetrograde: false, house: 9
                ),
            ],
            houses: [],
            calculatedAt: Date()
        )
    )
    .background(Color.black)
    .padding()
}
