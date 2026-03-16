import SwiftUI

struct YogaListView: View {
    let profile: BirthProfile
    let chart: ChartData
    @State private var yogas: [YogaResult] = []
    @State private var isLoading: Bool = false
    @State private var error: String?
    @State private var searchText: String = ""
    @State private var selectedCategory: YogaCategory? = nil

    var filteredYogas: [YogaResult] {
        var result = yogas.filter { $0.isPresent }
        if let cat = selectedCategory {
            result = result.filter { $0.category == cat }
        }
        if !searchText.isEmpty {
            result = result.filter {
                $0.name.localizedCaseInsensitiveContains(searchText) ||
                $0.sanskritName.localizedCaseInsensitiveContains(searchText) ||
                $0.description.localizedCaseInsensitiveContains(searchText)
            }
        }
        return result.sorted { a, b in
            let order: [YogaStrength] = [.strong, .moderate, .partial, .weak, .cancelled]
            let ia = order.firstIndex(of: a.strength) ?? 99
            let ib = order.firstIndex(of: b.strength) ?? 99
            return ia < ib
        }
    }

    var groupedYogas: [(category: YogaCategory, yogas: [YogaResult])] {
        filteredYogas.grouped()
    }

    var totalPresent: Int { yogas.filter { $0.isPresent }.count }

    var body: some View {
        VStack(spacing: 0) {
            // Header
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Yoga Analysis")
                        .font(.appTitle3)
                        .foregroundColor(.appTextPrimary)
                    Text(profile.name)
                        .font(.appCaption)
                        .foregroundColor(.appGold.opacity(0.8))
                }
                Spacer()
                if !yogas.isEmpty {
                    StatusBadge(text: "\(totalPresent) Yogas", variant: .gold)
                }
                Button {
                    Task { await loadYogas() }
                } label: {
                    Image(systemName: "arrow.clockwise")
                        .font(.system(size: 12))
                }
                .buttonStyle(SecondaryButtonStyle())
                .padding(.leading, AppSpacing.sm)
            }
            .padding(.horizontal, AppSpacing.lg)
            .padding(.vertical, AppSpacing.base)
            .background(Color.appSurface)

            AppDivider()

            if isLoading {
                LoadingView(message: "Analyzing yogas...")
            } else if let error = error {
                VStack {
                    ErrorBanner(message: error)
                        .padding(AppSpacing.lg)
                    Spacer()
                }
            } else if yogas.isEmpty {
                EmptyStateView(
                    icon: "sparkles",
                    title: "No Yoga Data",
                    subtitle: "Yoga analysis requires the server to be running.",
                    actionTitle: "Analyze Yogas",
                    action: { Task { await loadYogas() } }
                )
            } else {
                VStack(spacing: 0) {
                    // Search + Filter bar
                    HStack(spacing: AppSpacing.sm) {
                        HStack(spacing: 6) {
                            Image(systemName: "magnifyingglass")
                                .font(.appCaption)
                                .foregroundColor(.appTextMuted)
                            TextField("Search yogas...", text: $searchText)
                                .textFieldStyle(.plain)
                                .font(.appBody)
                                .foregroundColor(.appTextPrimary)
                        }
                        .padding(.horizontal, 10)
                        .padding(.vertical, 7)
                        .background(Color.appSurface)
                        .clipShape(RoundedRectangle(cornerRadius: AppRadius.base))
                        .overlay(
                            RoundedRectangle(cornerRadius: AppRadius.base)
                                .strokeBorder(Color.appBorder, lineWidth: 0.5)
                        )

                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 6) {
                                FilterChip(
                                    label: "All",
                                    isSelected: selectedCategory == nil,
                                    action: { selectedCategory = nil }
                                )
                                ForEach(YogaCategory.allCases, id: \.self) { cat in
                                    if yogas.contains(where: { $0.category == cat && $0.isPresent }) {
                                        FilterChip(
                                            label: cat.displayName,
                                            isSelected: selectedCategory == cat,
                                            action: {
                                                selectedCategory = selectedCategory == cat ? nil : cat
                                            }
                                        )
                                    }
                                }
                            }
                        }
                    }
                    .padding(.horizontal, AppSpacing.lg)
                    .padding(.vertical, AppSpacing.md)
                    .background(Color.appBackground)

                    AppDivider()

                    ScrollView {
                        LazyVStack(alignment: .leading, spacing: AppSpacing.lg) {
                            ForEach(groupedYogas, id: \.category) { group in
                                YogaCategorySection(category: group.category, yogas: group.yogas)
                                    .padding(.horizontal, AppSpacing.lg)
                            }
                        }
                        .padding(.vertical, AppSpacing.base)
                        .padding(.bottom, AppSpacing.xl)
                    }
                }
            }
        }
        .background(Color.appBackground)
        .task {
            await loadYogas()
        }
    }

    private func loadYogas() async {
        isLoading = true
        error = nil
        do {
            yogas = try await APIService.shared.detectYogas(profileId: profile.id)
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }
}

// MARK: - Yoga Category Section

struct YogaCategorySection: View {
    let category: YogaCategory
    let yogas: [YogaResult]

    var body: some View {
        VStack(alignment: .leading, spacing: AppSpacing.sm) {
            HStack(spacing: AppSpacing.sm) {
                Image(systemName: category.icon)
                    .font(.system(size: 13))
                    .foregroundColor(.appGold)
                Text(category.displayName)
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundColor(.appTextPrimary)
                StatusBadge(text: "\(yogas.count)", variant: .gold)
            }

            VStack(spacing: 6) {
                ForEach(yogas) { yoga in
                    YogaCard(yoga: yoga)
                }
            }
        }
    }
}

// MARK: - Yoga Card

struct YogaCard: View {
    let yoga: YogaResult
    @State private var isExpanded: Bool = false

    var body: some View {
        SurfaceCard(padding: 0) {
            VStack(spacing: 0) {
                Button {
                    withAnimation(.easeInOut(duration: 0.2)) {
                        isExpanded.toggle()
                    }
                } label: {
                    HStack(spacing: AppSpacing.md) {
                        // Strength indicator bar
                        RoundedRectangle(cornerRadius: 2)
                            .fill(yoga.strengthColor)
                            .frame(width: 3)
                            .frame(maxHeight: .infinity)
                            .padding(.vertical, 2)

                        VStack(alignment: .leading, spacing: 3) {
                            HStack {
                                Text(yoga.name)
                                    .font(.appBodyMedium)
                                    .foregroundColor(.appTextPrimary)
                                Spacer()
                                StatusBadge(text: yoga.strength.displayName,
                                           variant: .gold)
                            }
                            if !yoga.sanskritName.isEmpty && yoga.sanskritName != yoga.name {
                                Text(yoga.sanskritName)
                                    .font(.appCaption)
                                    .foregroundColor(.appTextMuted)
                            }
                        }

                        Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                            .font(.system(size: 9, weight: .semibold))
                            .foregroundColor(.appTextMuted)
                    }
                    .padding(.horizontal, AppSpacing.md)
                    .padding(.vertical, AppSpacing.sm)
                }
                .buttonStyle(.plain)

                if isExpanded {
                    AppDivider()
                    VStack(alignment: .leading, spacing: AppSpacing.sm) {
                        Text(yoga.description)
                            .font(.appBody)
                            .foregroundColor(.appTextSecondary)
                            .fixedSize(horizontal: false, vertical: true)

                        if !yoga.effects.isEmpty {
                            Text("Effects: \(yoga.effects)")
                                .font(.appCaption)
                                .foregroundColor(.appGold.opacity(0.85))
                                .fixedSize(horizontal: false, vertical: true)
                        }

                        HStack(spacing: AppSpacing.lg) {
                            if !yoga.planetsInvolved.isEmpty {
                                LabelValuePair(label: "Planets", value: yoga.planetsDisplay)
                            }
                            if !yoga.housesInvolved.isEmpty {
                                LabelValuePair(label: "Houses", value: yoga.housesDisplay)
                            }
                        }
                    }
                    .padding(AppSpacing.md)
                }
            }
        }
    }
}

// MARK: - Filter Chip

struct FilterChip: View {
    let label: String
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(label)
                .font(.appCaption)
                .fontWeight(.medium)
                .foregroundColor(isSelected
                                 ? Color(red: 0.047, green: 0.039, blue: 0.035)
                                 : Color.appGold.opacity(0.85))
                .padding(.horizontal, 10)
                .padding(.vertical, 5)
                .background(
                    Capsule()
                        .fill(isSelected ? Color.appGold : Color.appGold.opacity(0.12))
                )
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Label Value Pair

struct LabelValuePair: View {
    let label: String
    let value: String

    var body: some View {
        VStack(alignment: .leading, spacing: 1) {
            Text(label)
                .font(.appCaption2)
                .fontWeight(.semibold)
                .foregroundColor(.appTextMuted)
                .textCase(.uppercase)
                .tracking(0.5)
            Text(value)
                .font(.appMonoSmall)
                .foregroundColor(.appTextSecondary)
        }
    }
}
