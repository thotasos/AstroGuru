import SwiftUI

struct PlanetTableView: View {
    @EnvironmentObject var chartVM: ChartViewModel

    var body: some View {
        VStack(spacing: 0) {
            // Header
            HStack(spacing: 0) {
                Text("Planet")
                    .frame(minWidth: 110, alignment: .leading)
                Spacer()
                Text("Sign")
                    .frame(width: 55, alignment: .leading)
                Text("Degree")
                    .frame(width: 65, alignment: .trailing)
                Text("House")
                    .frame(width: 35, alignment: .trailing)
                Text("Nakshatra")
                    .frame(width: 90, alignment: .trailing)
            }
            .font(.appCaption2)
            .fontWeight(.semibold)
            .foregroundColor(.appTextMuted)
            .textCase(.uppercase)
            .tracking(0.5)
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(Color.appSurface)

            AppDivider()

            // Ascendant row
            if let chart = chartVM.currentChart,
               let ascSign = Sign(rawValue: chart.ascendantSign) {
                HStack(spacing: 0) {
                    HStack(spacing: 8) {
                        ZStack {
                            Circle()
                                .fill(Color.appGold.opacity(0.15))
                                .frame(width: 24, height: 24)
                            Text("Asc")
                                .font(.system(size: 8, weight: .bold))
                                .foregroundColor(Color.appGold)
                        }
                        Text("Ascendant")
                            .font(.appBodyMedium)
                            .foregroundColor(Color.appGold)
                    }
                    .frame(minWidth: 110, alignment: .leading)

                    Spacer()

                    HStack(spacing: 4) {
                        Text(ascSign.symbol)
                            .font(.appBody)
                            .foregroundColor(.appTextSecondary)
                        Text(ascSign.shortName)
                            .font(.appMono)
                            .foregroundColor(.appTextPrimary)
                    }
                    .frame(width: 55, alignment: .leading)

                    Text(String(format: "%d°%02d'",
                                Int(chart.ascendantDegree),
                                Int((chart.ascendantDegree - Double(Int(chart.ascendantDegree))) * 60)
                    ))
                    .font(.appMono)
                    .foregroundColor(Color.appGold.opacity(0.85))
                    .frame(width: 65, alignment: .trailing)

                    Text("H1")
                        .font(.appMonoSmall)
                        .foregroundColor(.appTextMuted)
                        .frame(width: 35, alignment: .trailing)

                    Text("—")
                        .font(.appCaption)
                        .foregroundColor(.appTextMuted)
                        .frame(width: 90, alignment: .trailing)
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                .background(Color.appGold.opacity(0.04))

                AppDivider()
            }

            // Planet rows
            ForEach(Array(chartVM.sortedPlanets.enumerated()), id: \.element.id) { index, position in
                PlanetTableRow(position: position, isAlternate: index.isMultiple(of: 2))
                if index < chartVM.sortedPlanets.count - 1 {
                    AppDivider()
                }
            }
        }
        .background(Color.appSurface)
        .clipShape(RoundedRectangle(cornerRadius: AppRadius.lg))
        .overlay(
            RoundedRectangle(cornerRadius: AppRadius.lg)
                .strokeBorder(Color.appBorder, lineWidth: 0.5)
        )
    }
}
