import SwiftUI

struct DashaTimelineView: View {
    let dashas: [DashaPeriod]
    var minWidth: CGFloat = 800

    @State private var hoveredId: String? = nil

    var totalYears: Double {
        dashas.reduce(0) { $0 + $1.durationYears }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            SectionHeader("Vimshottari Dasha Timeline", subtitle: "120-year cycle")

            ScrollView(.horizontal, showsIndicators: true) {
                HStack(spacing: 0) {
                    ForEach(dashas) { dasha in
                        DashaTimelineBar(
                            dasha: dasha,
                            width: widthFor(dasha),
                            isHovered: hoveredId == dasha.id
                        )
                        .onHover { hovered in
                            hoveredId = hovered ? dasha.id : nil
                        }
                    }
                }
                .frame(height: 72)
                .frame(minWidth: max(minWidth, CGFloat(totalYears) * 55))
            }
            .background(Color.appSurface)
            .clipShape(RoundedRectangle(cornerRadius: 8))
            .overlay(
                RoundedRectangle(cornerRadius: 8)
                    .strokeBorder(Color.appBorder, lineWidth: 0.5)
            )

            // Current period indicator
            if let current = dashas.first(where: { $0.isCurrentPeriod }) {
                HStack(spacing: 8) {
                    Circle()
                        .fill(current.periodColor)
                        .frame(width: 6, height: 6)
                    Text("Current: \(current.planet) Mahadasha")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(current.periodColor)
                    Text("(\(current.dateRangeString))")
                        .font(.system(size: 11))
                        .foregroundColor(.white.opacity(0.4))
                }
            }
        }
    }

    private func widthFor(_ dasha: DashaPeriod) -> CGFloat {
        guard totalYears > 0 else { return 0 }
        let proportion = dasha.durationYears / totalYears
        let total = max(minWidth, CGFloat(totalYears) * 55)
        return CGFloat(proportion) * total
    }
}

// MARK: - Dasha Timeline Bar

struct DashaTimelineBar: View {
    let dasha: DashaPeriod
    let width: CGFloat
    let isHovered: Bool

    var body: some View {
        ZStack {
            // Background fill
            Rectangle()
                .fill(dasha.periodColor.opacity(dasha.isCurrentPeriod ? 0.3 : (isHovered ? 0.2 : 0.12)))

            // Current period: golden border
            if dasha.isCurrentPeriod {
                Rectangle()
                    .fill(Color.clear)
                    .overlay(
                        Rectangle()
                            .strokeBorder(Color.appGold, lineWidth: 2)
                    )
            }

            // Vertical divider
            HStack {
                Spacer()
                Rectangle()
                    .fill(Color.white.opacity(0.08))
                    .frame(width: 0.5)
            }

            // Content
            VStack(spacing: 4) {
                // Planet symbol
                Text(dasha.planetEnum?.symbol ?? "")
                    .font(.system(size: 18))
                    .foregroundColor(dasha.periodColor)

                // Planet name
                Text(dasha.planet)
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundColor(dasha.isCurrentPeriod ? .white : .white.opacity(0.8))
                    .lineLimit(1)

                // Duration
                Text(dasha.durationString)
                    .font(.system(size: 9, design: .monospaced))
                    .foregroundColor(.white.opacity(0.4))

                if isHovered || dasha.isCurrentPeriod {
                    Text(dasha.dateRangeString)
                        .font(.system(size: 8))
                        .foregroundColor(.white.opacity(0.45))
                        .lineLimit(1)
                }
            }
            .padding(.horizontal, 4)
        }
        .frame(width: max(width, 10), height: 72)
        .clipped()
    }
}

// MARK: - Dasha Tree View (Hierarchical)

struct DashaTreeView: View {
    let dashas: [DashaPeriod]
    @ObservedObject var dashaVM: DashaViewModel

    var body: some View {
        LazyVStack(spacing: 0) {
            ForEach(dashas) { mahadasha in
                DashaMahadashaRow(
                    dasha: mahadasha,
                    isExpanded: dashaVM.isExpanded(mahadasha.id),
                    onToggle: { dashaVM.toggleExpansion(for: mahadasha.id) }
                )

                if dashaVM.isExpanded(mahadasha.id),
                   let subPeriods = mahadasha.subPeriods {
                    ForEach(subPeriods) { antardasha in
                        DashaAnterdashaRow(dasha: antardasha)
                            .padding(.leading, 24)
                    }
                }
            }
        }
    }
}

// MARK: - Mahadasha Row

struct DashaMahadashaRow: View {
    let dasha: DashaPeriod
    let isExpanded: Bool
    let onToggle: () -> Void

    var body: some View {
        Button(action: onToggle) {
            HStack(spacing: 12) {
                // Planet indicator
                ZStack {
                    Circle()
                        .fill(dasha.periodColor.opacity(0.2))
                        .frame(width: 36, height: 36)
                    Text(dasha.planetEnum?.symbol ?? "")
                        .font(.system(size: 18))
                        .foregroundColor(dasha.periodColor)
                }

                VStack(alignment: .leading, spacing: 2) {
                    HStack {
                        Text(dasha.planet)
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundColor(dasha.isCurrentPeriod ? Color.appGold : .white.opacity(0.9))
                        if dasha.isCurrentPeriod {
                            StatusBadge(text: "CURRENT", variant: .gold)
                        }
                    }
                    Text(dasha.dateRangeString)
                        .font(.system(size: 11))
                        .foregroundColor(.white.opacity(0.45))
                }

                Spacer()

                Text(dasha.durationString)
                    .font(.system(size: 12, design: .monospaced))
                    .foregroundColor(.white.opacity(0.5))

                Image(systemName: isExpanded ? "chevron.down" : "chevron.right")
                    .font(.system(size: 10, weight: .semibold))
                    .foregroundColor(.white.opacity(0.35))
                    .frame(width: 16)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 10)
        }
        .buttonStyle(.plain)
        .background(
            dasha.isCurrentPeriod
            ? Color.appGold.opacity(0.05)
            : Color.clear
        )
        .overlay(
            dasha.isCurrentPeriod
            ? Rectangle()
                .fill(Color.appGold)
                .frame(width: 2)
                .frame(maxHeight: .infinity)
                .padding(.vertical, 2)
            : nil,
            alignment: .leading
        )

        AppDivider()
    }
}

// MARK: - Antardasha Row

struct DashaAnterdashaRow: View {
    let dasha: DashaPeriod

    var body: some View {
        HStack(spacing: 10) {
            // Indent line
            Rectangle()
                .fill(dasha.periodColor.opacity(0.25))
                .frame(width: 1.5)
                .padding(.vertical, 2)

            ZStack {
                Circle()
                    .fill(dasha.periodColor.opacity(0.15))
                    .frame(width: 26, height: 26)
                Text(dasha.planetEnum?.abbreviation ?? "")
                    .font(.system(size: 9, weight: .bold, design: .monospaced))
                    .foregroundColor(dasha.periodColor)
            }

            VStack(alignment: .leading, spacing: 1) {
                HStack(spacing: 6) {
                    Text(dasha.planet)
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(dasha.isCurrentPeriod ? Color.appGold : .white.opacity(0.75))
                    if dasha.isCurrentPeriod {
                        StatusBadge(text: "NOW", variant: .gold)
                    }
                }
                Text(dasha.dateRangeString)
                    .font(.system(size: 10))
                    .foregroundColor(.white.opacity(0.35))
            }

            Spacer()

            Text(dasha.durationString)
                .font(.system(size: 10, design: .monospaced))
                .foregroundColor(.white.opacity(0.4))
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 7)
        .background(dasha.isCurrentPeriod ? Color.appGold.opacity(0.04) : Color.clear)

        AppDivider()
    }
}
