import SwiftUI

// MARK: - Additional Button Styles
// Note: GoldButtonStyle, SecondaryButtonStyle, GhostButtonStyle are in DesignSystem.swift

// MARK: - Destructive Button Style

struct DestructiveButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 13, weight: .medium))
            .foregroundColor(.red.opacity(0.9))
            .padding(.horizontal, 14)
            .padding(.vertical, 7)
            .background(
                RoundedRectangle(cornerRadius: AppRadius.base)
                    .fill(Color.red.opacity(configuration.isPressed ? 0.2 : 0.1))
                    .overlay(
                        RoundedRectangle(cornerRadius: AppRadius.base)
                            .strokeBorder(Color.red.opacity(0.4), lineWidth: 1)
                    )
            )
            .scaleEffect(configuration.isPressed ? 0.97 : 1.0)
            .animation(.easeInOut(duration: 0.1), value: configuration.isPressed)
    }
}

// MARK: - Convenience color extensions (supplemental, not duplicates)

extension Color {
    static let appGoldMuted = Color.appGold.opacity(0.2)
}
