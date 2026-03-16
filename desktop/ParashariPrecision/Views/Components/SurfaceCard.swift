import SwiftUI

// MARK: - Surface Card
// Note: AppDivider, SectionHeader, StatusBadge, EmptyStateView, LoadingView are in DesignSystem.swift

struct SurfaceCard<Content: View>: View {
    let content: Content
    var padding: CGFloat = 16
    var cornerRadius: CGFloat = 12
    var isHighlighted: Bool = false

    init(
        padding: CGFloat = 16,
        cornerRadius: CGFloat = 12,
        isHighlighted: Bool = false,
        @ViewBuilder content: () -> Content
    ) {
        self.content = content()
        self.padding = padding
        self.cornerRadius = cornerRadius
        self.isHighlighted = isHighlighted
    }

    var body: some View {
        content
            .padding(padding)
            .background(
                RoundedRectangle(cornerRadius: cornerRadius)
                    .fill(Color.appSurface)
                    .overlay(
                        RoundedRectangle(cornerRadius: cornerRadius)
                            .strokeBorder(
                                isHighlighted ? Color.appBorderGold : Color.appBorder,
                                lineWidth: isHighlighted ? 1 : 0.5
                            )
                    )
            )
    }
}

// MARK: - Elevated Surface Card

struct ElevatedCard<Content: View>: View {
    let content: Content
    var padding: CGFloat = 16

    init(padding: CGFloat = 16, @ViewBuilder content: () -> Content) {
        self.content = content()
        self.padding = padding
    }

    var body: some View {
        content
            .padding(padding)
            .background(
                RoundedRectangle(cornerRadius: AppRadius.lg)
                    .fill(Color.appSurfaceElevated)
                    .overlay(
                        RoundedRectangle(cornerRadius: AppRadius.lg)
                            .strokeBorder(Color.appBorder, lineWidth: 0.5)
                    )
            )
    }
}
