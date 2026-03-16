import SwiftUI

struct DashaView: View {
    let profile: BirthProfile
    @EnvironmentObject var dashaVM: DashaViewModel

    var body: some View {
        VStack(spacing: 0) {
            // Header
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Vimshottari Dasha")
                        .font(.appTitle3)
                        .foregroundColor(.appTextPrimary)
                    Text(profile.name)
                        .font(.appCaption)
                        .foregroundColor(.appGold.opacity(0.8))
                }
                Spacer()
                Button {
                    Task { await dashaVM.loadDashasForced(for: profile) }
                } label: {
                    Image(systemName: "arrow.clockwise")
                        .font(.system(size: 12))
                }
                .buttonStyle(SecondaryButtonStyle())
            }
            .padding(.horizontal, AppSpacing.lg)
            .padding(.vertical, AppSpacing.base)
            .background(Color.appSurface)

            AppDivider()

            if dashaVM.isLoading {
                LoadingView(message: "Calculating Dasha periods...")
            } else if let error = dashaVM.error {
                ErrorBanner(message: error)
                    .padding(AppSpacing.lg)
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
            } else if dashaVM.dashas.isEmpty {
                EmptyStateView(
                    icon: "calendar",
                    title: "No Dasha Data",
                    subtitle: "Unable to load dasha periods for this profile.",
                    actionTitle: "Load Dashas",
                    action: { Task { await dashaVM.loadDashas(for: profile) } }
                )
            } else {
                ScrollView {
                    VStack(alignment: .leading, spacing: AppSpacing.lg) {
                        // Current period summary
                        CurrentPeriodSummary(dashaVM: dashaVM)
                            .padding(.horizontal, AppSpacing.lg)
                            .padding(.top, AppSpacing.base)

                        // Timeline
                        DashaTimelineView(dashas: dashaVM.dashas)
                            .padding(.horizontal, AppSpacing.lg)

                        // Tree
                        VStack(alignment: .leading, spacing: AppSpacing.sm) {
                            SectionHeader("Dasha Periods", subtitle: "Tap to expand antardashas")
                                .padding(.horizontal, AppSpacing.lg)

                            SurfaceCard(padding: 0) {
                                DashaTreeView(dashas: dashaVM.dashas, dashaVM: dashaVM)
                            }
                            .padding(.horizontal, AppSpacing.lg)
                        }
                    }
                    .padding(.bottom, AppSpacing.xl)
                }
            }
        }
        .background(Color.appBackground)
        .task {
            await dashaVM.loadDashas(for: profile)
        }
    }
}

// MARK: - Current Period Summary

struct CurrentPeriodSummary: View {
    @ObservedObject var dashaVM: DashaViewModel

    var body: some View {
        SurfaceCard(isHighlighted: true) {
            VStack(alignment: .leading, spacing: AppSpacing.md) {
                HStack {
                    Text("Current Dasha Periods")
                        .font(.appBodySemibold)
                        .foregroundColor(.appGold)
                    Spacer()
                    StatusBadge(text: "ACTIVE", variant: .gold)
                }

                HStack(spacing: AppSpacing.lg) {
                    if let maha = dashaVM.currentMahadasha {
                        PeriodItem(
                            label: "Mahadasha",
                            planet: maha.planet,
                            dates: maha.dateRangeString,
                            color: maha.periodColor
                        )
                    }

                    if let antar = dashaVM.currentAntardasha {
                        Image(systemName: "chevron.right")
                            .font(.system(size: 10))
                            .foregroundColor(.appTextMuted)

                        PeriodItem(
                            label: "Antardasha",
                            planet: antar.planet,
                            dates: antar.dateRangeString,
                            color: antar.periodColor
                        )
                    }

                    if let pratyantar = dashaVM.currentPratyantardasha {
                        Image(systemName: "chevron.right")
                            .font(.system(size: 10))
                            .foregroundColor(.appTextMuted)

                        PeriodItem(
                            label: "Pratyantardasha",
                            planet: pratyantar.planet,
                            dates: pratyantar.dateRangeString,
                            color: pratyantar.periodColor
                        )
                    }

                    Spacer()
                }
            }
        }
    }
}

// MARK: - Period Item

struct PeriodItem: View {
    let label: String
    let planet: String
    let dates: String
    let color: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label)
                .font(.appCaption2)
                .fontWeight(.semibold)
                .foregroundColor(.appTextMuted)
                .textCase(.uppercase)
                .tracking(0.5)

            Text(planet)
                .font(.appTitle3)
                .fontWeight(.bold)
                .foregroundColor(color)

            Text(dates)
                .font(.appCaption2)
                .foregroundColor(.appTextMuted)
        }
    }
}
