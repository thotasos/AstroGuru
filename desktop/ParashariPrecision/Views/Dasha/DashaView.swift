import SwiftUI

struct DashaView: View {
    let profile: Profile
    @StateObject private var viewModel = DashaViewModel()

    var body: some View {
        Group {
            if viewModel.isCalculating {
                ProgressView("Calculating Dashas...")
            } else if let error = viewModel.errorMessage {
                ContentUnavailableView(
                    "Dasha Calculation Failed",
                    systemImage: "exclamationmark.triangle",
                    description: Text(error)
                )
            } else if viewModel.dashaPeriods.isEmpty {
                ContentUnavailableView(
                    "No Dashas Available",
                    systemImage: "calendar.badge.clock",
                    description: Text("Select a profile with valid birth data to calculate Vimshottari Dasha")
                )
            } else {
                DashaListView(viewModel: viewModel)
            }
        }
        .task {
            await viewModel.calculateDashas(for: profile)
        }
    }
}

struct DashaListView: View {
    @ObservedObject var viewModel: DashaViewModel

    var body: some View {
        List {
            ForEach(viewModel.dashaPeriods, id: \.startDate) { dasha in
                DashaRowView(
                    dasha: dasha,
                    depth: 0,
                    isCurrent: isCurrentDasha(dasha),
                    selectedDasha: $viewModel.selectedDasha,
                    currentDasha: viewModel.currentDasha
                )
            }
        }
        .listStyle(.sidebar)
        .navigationTitle("Vimshottari Dasha")
    }

    private func isCurrentDasha(_ dasha: DashaPeriod) -> Bool {
        guard let current = viewModel.currentDasha else { return false }
        return current.lord == dasha.lord && current.startDate == dasha.startDate
    }
}

struct DashaRowView: View {
    let dasha: DashaPeriod
    let depth: Int
    let isCurrent: Bool
    @Binding var selectedDasha: DashaPeriod?
    let currentDasha: DashaPeriod?
    @State private var isExpanded = true

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                if !dasha.antardashas.isEmpty {
                    Button {
                        withAnimation {
                            isExpanded.toggle()
                        }
                    } label: {
                        Image(systemName: isExpanded ? "chevron.down" : "chevron.right")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    .buttonStyle(.plain)
                } else {
                    Spacer()
                        .frame(width: 16)
                }

                Text(dasha.lord)
                    .font(.headline)
                    .fontWeight(isCurrent ? .bold : .regular)
                    .foregroundStyle(isCurrent ? .blue : .primary)

                Spacer()

                Text("\(dasha.startYear)-\(String(format: "%02d", dasha.startMonth)) to \(dasha.endYear)-\(String(format: "%02d", dasha.endMonth))")
                    .font(.caption)
                    .foregroundStyle(.secondary)

                if isCurrent {
                    Text("Current")
                        .font(.caption2)
                        .fontWeight(.semibold)
                        .foregroundStyle(.white)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(Color.blue)
                        .clipShape(Capsule())
                }
            }
            .contentShape(Rectangle())
            .onTapGesture {
                if isCurrent {
                    selectedDasha = dasha
                }
            }

            if isCurrent {
                HStack {
                    Text("Sign: \(zodiacSign(dasha.sign))")
                    Spacer()
                    Text("Balance: \(String(format: "%.2f", dasha.balance)) years")
                }
                .font(.caption)
                .foregroundStyle(.secondary)
            }

            if isExpanded && !dasha.antardashas.isEmpty {
                ForEach(dasha.antardashas, id: \.startDate) { antardasha in
                    AntardashaRowView(
                        antardasha: antardasha,
                        depth: depth + 1,
                        isCurrent: isCurrentDasha(antardasha),
                        selectedDasha: $selectedDasha,
                        currentDasha: currentDasha
                    )
                }
            }
        }
        .padding(.vertical, 4)
    }

    private func zodiacSign(_ index: Int) -> String {
        let signs = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"]
        return signs[index % 12]
    }

    private func isCurrentDasha(_ dasha: DashaPeriod) -> Bool {
        guard let current = currentDasha else { return false }
        return current.lord == dasha.lord && current.startDate == dasha.startDate
    }
}

struct AntardashaRowView: View {
    let antardasha: DashaPeriod
    let depth: Int
    let isCurrent: Bool
    @Binding var selectedDasha: DashaPeriod?
    let currentDasha: DashaPeriod?
    @State private var isExpanded = true

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                if !antardasha.antardashas.isEmpty {
                    Button {
                        withAnimation {
                            isExpanded.toggle()
                        }
                    } label: {
                        Image(systemName: isExpanded ? "chevron.down" : "chevron.right")
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                    }
                    .buttonStyle(.plain)
                } else {
                    Spacer()
                        .frame(width: 12)
                }

                Text(antardasha.lord)
                    .font(.subheadline)
                    .fontWeight(isCurrent ? .semibold : .regular)
                    .foregroundStyle(isCurrent ? .blue : .secondary)

                Spacer()

                Text("\(antardasha.startYear)-\(String(format: "%02d", antardasha.startMonth)) to \(antardasha.endYear)-\(String(format: "%02d", antardasha.endMonth))")
                    .font(.caption2)
                    .foregroundStyle(.tertiary)

                if isCurrent {
                    Circle()
                        .fill(Color.blue)
                        .frame(width: 6, height: 6)
                }
            }
            .padding(.leading, CGFloat(depth * 16))
            .contentShape(Rectangle())
            .onTapGesture {
                if isCurrent {
                    selectedDasha = antardasha
                }
            }

            if isCurrent {
                HStack {
                    Text("Sign: \(zodiacSign(antardasha.sign))")
                    Spacer()
                    Text("Balance: \(String(format: "%.2f", antardasha.balance)) years")
                }
                .font(.caption2)
                .foregroundStyle(.secondary)
                .padding(.leading, CGFloat(depth * 16))
            }

            if isExpanded && !antardasha.antardashas.isEmpty {
                ForEach(antardasha.antardashas, id: \.startDate) { pratyantardasha in
                    PratyantardashaRowView(
                        pratyantardasha: pratyantardasha,
                        depth: depth + 1,
                        isCurrent: isCurrentDasha(pratyantardasha),
                        selectedDasha: $selectedDasha,
                        currentDasha: currentDasha
                    )
                }
            }
        }
        .padding(.vertical, 2)
    }

    private func zodiacSign(_ index: Int) -> String {
        let signs = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"]
        return signs[index % 12]
    }

    private func isCurrentDasha(_ dasha: DashaPeriod) -> Bool {
        guard let current = currentDasha else { return false }
        return current.lord == dasha.lord && current.startDate == dasha.startDate
    }
}

struct PratyantardashaRowView: View {
    let pratyantardasha: DashaPeriod
    let depth: Int
    let isCurrent: Bool
    @Binding var selectedDasha: DashaPeriod?
    let currentDasha: DashaPeriod?

    var body: some View {
        HStack {
            Spacer()
                .frame(width: 12)

            Text(pratyantardasha.lord)
                .font(.caption)
                .fontWeight(isCurrent ? .medium : .regular)
                .foregroundStyle(isCurrent ? Color.blue : Color.gray.opacity(0.6))

            Spacer()

            Text("\(pratyantardasha.startYear)-\(String(format: "%02d", pratyantardasha.startMonth)) to \(pratyantardasha.endYear)-\(String(format: "%02d", pratyantardasha.endMonth))")
                .font(.caption2)
                .foregroundStyle(Color.gray.opacity(0.4))

            if isCurrent {
                Circle()
                    .fill(Color.blue)
                    .frame(width: 4, height: 4)
            }
        }
        .padding(.leading, CGFloat(depth * 16))
        .padding(.vertical, 1)
        .contentShape(Rectangle())
        .onTapGesture {
            if isCurrent {
                selectedDasha = pratyantardasha
            }
        }
    }
}
