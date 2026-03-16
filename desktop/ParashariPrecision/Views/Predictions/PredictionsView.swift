import SwiftUI

// MARK: - Predictions View

enum PredictionPeriod: String, CaseIterable {
    case hourly = "Hourly"
    case monthly = "Monthly"

    var icon: String {
        switch self {
        case .hourly: return "clock"
        case .monthly: return "calendar"
        }
    }
}

struct PredictionsView: View {
    @ObservedObject var viewModel: PredictionsViewModel
    let profile: BirthProfile

    @State private var selectedPeriod: PredictionPeriod = .hourly

    var body: some View {
        VStack(spacing: 0) {
            // Period selector
            periodSelector
            AppDivider()

            // Content
            if viewModel.isLoading {
                LoadingOverlay(message: "Loading predictions...")
            } else if let error = viewModel.error {
                VStack(spacing: AppSpacing.base) {
                    ErrorBanner(message: error) {
                        viewModel.error = nil
                    }
                    Button("Retry") {
                        Task {
                            if selectedPeriod == .hourly {
                                await viewModel.refreshHourly(for: profile)
                            } else {
                                await viewModel.refreshMonthly(for: profile)
                            }
                        }
                    }
                    .buttonStyle(GoldButtonStyle(size: .small))
                }
                .padding(AppSpacing.lg)
            } else {
                contentView
            }
        }
        .onAppear {
            Task {
                await viewModel.loadHourlyPredictions(for: profile)
            }
        }
        .onChange(of: selectedPeriod) { _, newValue in
            Task {
                if newValue == .hourly && viewModel.hourlyPredictions.isEmpty {
                    await viewModel.loadHourlyPredictions(for: profile)
                } else if newValue == .monthly && viewModel.monthlyPrediction == nil {
                    await viewModel.loadMonthlyPredictions(for: profile)
                }
            }
        }
    }

    // MARK: - Period Selector

    private var periodSelector: some View {
        HStack(spacing: AppSpacing.md) {
            ForEach(PredictionPeriod.allCases, id: \.self) { period in
                Button {
                    selectedPeriod = period
                } label: {
                    HStack(spacing: AppSpacing.xs) {
                        Image(systemName: period.icon)
                            .font(.system(size: 13))
                        Text(period.rawValue)
                            .font(.appBodyMedium)
                    }
                    .padding(.horizontal, AppSpacing.base)
                    .padding(.vertical, AppSpacing.sm)
                    .background(
                        RoundedRectangle(cornerRadius: AppRadius.md)
                            .fill(selectedPeriod == period ? Color.appGold : Color.clear)
                    )
                    .foregroundColor(selectedPeriod == period ? Color.appBackground : Color.appTextSecondary)
                }
                .buttonStyle(.plain)
            }

            Spacer()

            // Date navigation
            if selectedPeriod == .hourly {
                HStack(spacing: AppSpacing.xs) {
                    Button {
                        viewModel.previousDay()
                        Task {
                            await viewModel.refreshHourly(for: profile)
                        }
                    } label: {
                        Image(systemName: "chevron.left")
                            .font(.system(size: 12, weight: .semibold))
                    }
                    .buttonStyle(GhostButtonStyle())

                    Text(viewModel.selectedDateString)
                        .font(.appBodyMedium)
                        .foregroundColor(.appTextPrimary)
                        .frame(minWidth: 100)

                    Button {
                        viewModel.nextDay()
                        Task {
                            await viewModel.refreshHourly(for: profile)
                        }
                    } label: {
                        Image(systemName: "chevron.right")
                            .font(.system(size: 12, weight: .semibold))
                    }
                    .buttonStyle(GhostButtonStyle())

                    Button("Today") {
                        viewModel.goToToday()
                        Task {
                            await viewModel.refreshHourly(for: profile)
                        }
                    }
                    .buttonStyle(GhostButtonStyle())
                }
            } else {
                HStack(spacing: AppSpacing.xs) {
                    Button {
                        viewModel.previousMonth()
                        Task {
                            await viewModel.refreshMonthly(for: profile)
                        }
                    } label: {
                        Image(systemName: "chevron.left")
                            .font(.system(size: 12, weight: .semibold))
                    }
                    .buttonStyle(GhostButtonStyle())

                    Text(viewModel.formattedMonthYear)
                        .font(.appBodyMedium)
                        .foregroundColor(.appTextPrimary)
                        .frame(minWidth: 120)

                    Button {
                        viewModel.nextMonth()
                        Task {
                            await viewModel.refreshMonthly(for: profile)
                        }
                    } label: {
                        Image(systemName: "chevron.right")
                            .font(.system(size: 12, weight: .semibold))
                    }
                    .buttonStyle(GhostButtonStyle())
                }
            }

            // Actions
            Menu {
                Button {
                    Task {
                        if selectedPeriod == .hourly {
                            await viewModel.refreshHourly(for: profile)
                        } else {
                            await viewModel.refreshMonthly(for: profile)
                        }
                    }
                } label: {
                    Label("Refresh", systemImage: "arrow.clockwise")
                }

                Button(role: .destructive) {
                    Task {
                        await viewModel.clearCache(for: profile)
                    }
                } label: {
                    Label("Clear Cache", systemImage: "trash")
                }
            } label: {
                Image(systemName: "ellipsis.circle")
                    .font(.system(size: 14))
                    .foregroundColor(.appTextSecondary)
            }
            .menuStyle(.borderlessButton)
            .frame(width: 30)
        }
        .padding(AppSpacing.base)
        .background(Color.appSurface)
    }

    // MARK: - Content View

    @ViewBuilder
    private var contentView: some View {
        switch selectedPeriod {
        case .hourly:
            HourlyPredictionsView(predictions: viewModel.hourlyPredictions)
        case .monthly:
            MonthlyPredictionsView(prediction: viewModel.monthlyPrediction)
        }
    }
}

// MARK: - Preview

#Preview {
    PredictionsView(
        viewModel: PredictionsViewModel(),
        profile: .preview
    )
    .frame(width: 800, height: 600)
}
