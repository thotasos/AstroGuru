import SwiftUI

// MARK: - Planet Badge

struct PlanetBadge: View {
    let planet: Planet
    var showName: Bool = true
    var size: CGFloat = 28

    var body: some View {
        HStack(spacing: 4) {
            ZStack {
                Circle()
                    .fill(planet.color.opacity(0.18))
                    .frame(width: size, height: size)
                Text(planet.symbol)
                    .font(.system(size: size * 0.55))
                    .foregroundColor(planet.color)
            }
            if showName {
                Text(planet.abbreviation)
                    .font(.system(size: 11, weight: .semibold, design: .monospaced))
                    .foregroundColor(planet.color)
            }
        }
    }
}

// MARK: - Planet Chip (inline, compact)

struct PlanetChip: View {
    let planet: Planet
    var degree: String? = nil
    var isRetrograde: Bool = false

    var body: some View {
        HStack(spacing: 3) {
            Text(planet.abbreviation)
                .font(.system(size: 11, weight: .bold, design: .monospaced))
                .foregroundColor(planet.color)
            if let deg = degree {
                Text(deg)
                    .font(.system(size: 9, design: .monospaced))
                    .foregroundColor(.white.opacity(0.5))
            }
            if isRetrograde {
                Text("℞")
                    .font(.system(size: 9))
                    .foregroundColor(.white.opacity(0.4))
            }
        }
        .padding(.horizontal, 5)
        .padding(.vertical, 2)
        .background(
            Capsule()
                .fill(planet.color.opacity(0.1))
                .overlay(
                    Capsule()
                        .strokeBorder(planet.color.opacity(0.3), lineWidth: 0.5)
                )
        )
    }
}

// MARK: - Planet Row for Table

struct PlanetTableRow: View {
    let position: PlanetPosition
    var isAlternate: Bool = false

    var body: some View {
        HStack(spacing: 0) {
            // Planet
            HStack(spacing: 8) {
                if let planet = position.planetEnum {
                    ZStack {
                        Circle()
                            .fill(planet.color.opacity(0.15))
                            .frame(width: 24, height: 24)
                        Text(planet.symbol)
                            .font(.system(size: 12))
                            .foregroundColor(planet.color)
                    }
                    Text(planet.name)
                        .font(.system(size: 13, weight: .medium))
                        .foregroundColor(.white.opacity(0.9))
                } else {
                    Text(position.planet)
                        .font(.system(size: 13))
                        .foregroundColor(.white.opacity(0.7))
                }
                if position.isRetrograde {
                    Text("℞")
                        .font(.system(size: 10))
                        .foregroundColor(.white.opacity(0.45))
                }
            }
            .frame(minWidth: 110, alignment: .leading)

            Spacer()

            // Sign
            if let sign = position.signEnum {
                HStack(spacing: 4) {
                    Text(sign.symbol)
                        .font(.system(size: 12))
                        .foregroundColor(.white.opacity(0.5))
                    Text(sign.shortName)
                        .font(.system(size: 12, design: .monospaced))
                        .foregroundColor(.white.opacity(0.75))
                }
                .frame(width: 55, alignment: .leading)
            }

            // Degree
            Text(position.degreeString)
                .font(.system(size: 12, design: .monospaced))
                .foregroundColor(Color.appGold.opacity(0.85))
                .frame(width: 65, alignment: .trailing)

            // House
            Text("H\(position.house)")
                .font(.system(size: 11, design: .monospaced))
                .foregroundColor(.white.opacity(0.4))
                .frame(width: 35, alignment: .trailing)

            // Nakshatra
            Text(position.nakshatra)
                .font(.system(size: 11))
                .foregroundColor(.white.opacity(0.5))
                .frame(width: 90, alignment: .trailing)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .background(isAlternate ? Color.white.opacity(0.025) : Color.clear)
    }
}
