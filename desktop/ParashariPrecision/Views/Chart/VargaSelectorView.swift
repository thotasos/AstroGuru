import SwiftUI

struct VargaSelectorView: View {
    let profile: BirthProfile
    @EnvironmentObject var chartVM: ChartViewModel

    private let columns = [
        GridItem(.adaptive(minimum: 110), spacing: 6)
    ]

    var body: some View {
        VStack(alignment: .leading, spacing: AppSpacing.sm) {
            SectionHeader("Varga Charts", subtitle: "Divisional charts")

            LazyVGrid(columns: columns, spacing: 6) {
                ForEach(VargaInfo.all) { varga in
                    VargaButton(
                        varga: varga,
                        isSelected: chartVM.selectedVarga == varga.id,
                        isLoading: chartVM.isLoadingVargas && chartVM.vargas[varga.id] == nil
                    ) {
                        Task {
                            await chartVM.selectVarga(varga.id, for: profile)
                        }
                    }
                }
            }
        }
        .padding(AppSpacing.md)
        .background(Color.appSurface)
        .clipShape(RoundedRectangle(cornerRadius: AppRadius.lg))
        .overlay(
            RoundedRectangle(cornerRadius: AppRadius.lg)
                .strokeBorder(Color.appBorder, lineWidth: 0.5)
        )
    }
}

// MARK: - Varga Button

struct VargaButton: View {
    let varga: VargaInfo
    let isSelected: Bool
    let isLoading: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: 3) {
                HStack {
                    Text(varga.id)
                        .font(.appMono)
                        .fontWeight(.bold)
                        .foregroundColor(isSelected
                                         ? Color(red: 0.047, green: 0.039, blue: 0.035)
                                         : Color.appGold)
                    Spacer()
                    if isLoading {
                        ProgressView()
                            .progressViewStyle(CircularProgressViewStyle(tint: Color.appGold))
                            .scaleEffect(0.6)
                    }
                }
                Text(varga.description)
                    .font(.appCaption2)
                    .foregroundColor(isSelected
                                     ? Color(red: 0.047, green: 0.039, blue: 0.035).opacity(0.75)
                                     : Color.appTextMuted)
                    .lineLimit(1)
            }
            .padding(.horizontal, 10)
            .padding(.vertical, 8)
            .background(
                RoundedRectangle(cornerRadius: AppRadius.base)
                    .fill(isSelected ? Color.appGold : Color.appSurfaceElevated)
                    .overlay(
                        RoundedRectangle(cornerRadius: AppRadius.base)
                            .strokeBorder(
                                isSelected ? Color.clear : Color.appGold.opacity(0.2),
                                lineWidth: 0.5
                            )
                    )
            )
        }
        .buttonStyle(.plain)
    }
}
