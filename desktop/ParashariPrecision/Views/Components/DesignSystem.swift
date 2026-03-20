import SwiftUI

// MARK: - Parashari Precision Design System
// Dark cosmic aesthetic: deep space black + gold accent

// MARK: - Color Palette

extension Color {
    // Backgrounds
    static let appBackground       = Color(red: 0.047, green: 0.039, blue: 0.035) // #0C0A09
    static let appSurface          = Color(red: 0.110, green: 0.098, blue: 0.090) // #1C1917
    static let appSurfaceElevated  = Color(red: 0.161, green: 0.145, blue: 0.141) // #292524
    static let appSurfaceDeep      = Color(red: 0.071, green: 0.063, blue: 0.059) // #120F0E

    // Borders
    static let appBorder           = Color(red: 0.267, green: 0.251, blue: 0.235) // #44403C
    static let appBorderGold       = Color(red: 0.792, green: 0.541, blue: 0.016).opacity(0.5)

    // Accent
    static let appGold             = Color(red: 0.792, green: 0.541, blue: 0.016) // #CA8A04
    static let appGoldLight        = Color(red: 0.922, green: 0.702, blue: 0.200) // lighter gold

    // Text
    static let appTextPrimary      = Color(red: 0.980, green: 0.980, blue: 0.976) // #FAFAF9
    static let appTextSecondary    = Color(red: 0.631, green: 0.612, blue: 0.588) // #A8A29E
    static let appTextMuted        = Color(red: 0.420, green: 0.400, blue: 0.376) // #6B6360

    // Status
    static let appSuccess          = Color(red: 0.212, green: 0.769, blue: 0.435) // green
    static let appWarning          = Color(red: 0.949, green: 0.718, blue: 0.200) // amber
    static let appError            = Color(red: 0.929, green: 0.298, blue: 0.298) // red
    static let appInfo             = Color(red: 0.373, green: 0.639, blue: 0.969) // blue
}

// MARK: - Typography Scale

extension Font {
    static let appLargeTitle  = Font.system(size: 32, weight: .bold,   design: .default)
    static let appTitle       = Font.system(size: 24, weight: .bold,   design: .default)
    static let appTitle2      = Font.system(size: 20, weight: .semibold, design: .default)
    static let appTitle3      = Font.system(size: 17, weight: .semibold, design: .default)
    static let appBody        = Font.system(size: 14, weight: .regular, design: .default)
    static let appBodyMedium  = Font.system(size: 14, weight: .medium,  design: .default)
    static let appBodySemibold = Font.system(size: 14, weight: .semibold, design: .default)
    static let appCaption     = Font.system(size: 12, weight: .regular, design: .default)
    static let appCaption2    = Font.system(size: 11, weight: .regular, design: .default)
    static let appMono        = Font.system(size: 13, weight: .regular, design: .monospaced)
    static let appMonoSmall   = Font.system(size: 11, weight: .regular, design: .monospaced)
}

// MARK: - Spacing

enum AppSpacing {
    static let xs: CGFloat  = 4
    static let sm: CGFloat  = 8
    static let md: CGFloat  = 12
    static let base: CGFloat = 16
    static let lg: CGFloat  = 24
    static let xl: CGFloat  = 32
    static let xxl: CGFloat = 48
}

// MARK: - Corner Radius

enum AppRadius {
    static let xs: CGFloat   = 4
    static let sm: CGFloat   = 6
    static let base: CGFloat = 8
    static let md: CGFloat   = 10
    static let lg: CGFloat   = 14
    static let xl: CGFloat   = 20
    static let full: CGFloat = 9999
}

// MARK: - GoldButton Style

struct GoldButtonStyle: ButtonStyle {
    var size: ButtonSize = .medium

    enum ButtonSize {
        case small, medium, large
        var horizontalPadding: CGFloat {
            switch self { case .small: return 12; case .medium: return 20; case .large: return 28 }
        }
        var verticalPadding: CGFloat {
            switch self { case .small: return 6; case .medium: return 10; case .large: return 14 }
        }
        var fontSize: CGFloat {
            switch self { case .small: return 12; case .medium: return 14; case .large: return 16 }
        }
    }

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: size.fontSize, weight: .semibold))
            .foregroundColor(Color(red: 0.047, green: 0.039, blue: 0.035))
            .padding(.horizontal, size.horizontalPadding)
            .padding(.vertical, size.verticalPadding)
            .background(
                RoundedRectangle(cornerRadius: AppRadius.md)
                    .fill(Color.appGold)
                    .opacity(configuration.isPressed ? 0.85 : 1.0)
            )
            .scaleEffect(configuration.isPressed ? 0.97 : 1.0)
            .animation(.easeInOut(duration: 0.15), value: configuration.isPressed)
    }
}

struct SecondaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.appBodyMedium)
            .foregroundColor(Color.appTextPrimary)
            .padding(.horizontal, 16)
            .padding(.vertical, 8)
            .background(
                RoundedRectangle(cornerRadius: AppRadius.md)
                    .stroke(Color.appBorder, lineWidth: 1)
                    .background(
                        RoundedRectangle(cornerRadius: AppRadius.md)
                            .fill(Color.appSurfaceElevated.opacity(configuration.isPressed ? 1.0 : 0.0))
                    )
            )
            .scaleEffect(configuration.isPressed ? 0.97 : 1.0)
            .animation(.easeInOut(duration: 0.15), value: configuration.isPressed)
    }
}

// MARK: - Shared UI Components

/// Section header with optional trailing content
struct SectionHeader: View {
    let title: String
    var subtitle: String? = nil
    var trailing: AnyView? = nil

    init(_ title: String, subtitle: String? = nil) {
        self.title = title
        self.subtitle = subtitle
        self.trailing = nil
    }

    init<T: View>(_ title: String, subtitle: String? = nil, @ViewBuilder trailing: () -> T) {
        self.title = title
        self.subtitle = subtitle
        self.trailing = AnyView(trailing())
    }

    var body: some View {
        HStack(alignment: .firstTextBaseline) {
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.appTitle3)
                    .foregroundColor(.appTextPrimary)
                if let sub = subtitle {
                    Text(sub)
                        .font(.appCaption)
                        .foregroundColor(.appTextSecondary)
                }
            }
            Spacer()
            trailing
        }
        .padding(.bottom, AppSpacing.sm)
    }
}

/// Thin divider in design system color
struct AppDivider: View {
    var color: Color = .appBorder
    var opacity: Double = 1.0

    var body: some View {
        Rectangle()
            .fill(color.opacity(opacity))
            .frame(height: 0.5)
    }
}

/// Status badge with color variants
struct StatusBadge: View {
    enum Variant {
        case active, inactive, warning, info, gold

        var color: Color {
            switch self {
            case .active:   return .appSuccess
            case .inactive: return .appTextMuted
            case .warning:  return .appWarning
            case .info:     return .appInfo
            case .gold:     return .appGold
            }
        }

        var bgColor: Color { color.opacity(0.12) }
    }

    let text: String
    var variant: Variant = .active

    var body: some View {
        Text(text)
            .font(.appCaption2)
            .fontWeight(.medium)
            .foregroundColor(variant.color)
            .padding(.horizontal, 8)
            .padding(.vertical, 3)
            .background(
                RoundedRectangle(cornerRadius: AppRadius.full)
                    .fill(variant.bgColor)
            )
    }
}

/// Varga info model used in VargaSelectorView
struct VargaInfo: Identifiable {
    let id: String
    let name: String
    let description: String

    static let all: [VargaInfo] = [
        VargaInfo(id: "D1",  name: "D1",  description: "Rashi – Body & Soul"),
        VargaInfo(id: "D2",  name: "D2",  description: "Hora – Wealth"),
        VargaInfo(id: "D3",  name: "D3",  description: "Drekkana – Siblings"),
        VargaInfo(id: "D4",  name: "D4",  description: "Chaturthamsha – Fortune"),
        VargaInfo(id: "D7",  name: "D7",  description: "Saptamsha – Children"),
        VargaInfo(id: "D9",  name: "D9",  description: "Navamsha – Spouse & Dharma"),
        VargaInfo(id: "D10", name: "D10", description: "Dashamsha – Career"),
        VargaInfo(id: "D12", name: "D12", description: "Dwadashamsha – Parents"),
        VargaInfo(id: "D16", name: "D16", description: "Shodashamsha – Vehicles"),
        VargaInfo(id: "D20", name: "D20", description: "Vimshamsha – Spirituality"),
        VargaInfo(id: "D24", name: "D24", description: "Siddhamsha – Education"),
        VargaInfo(id: "D27", name: "D27", description: "Bhamsha – Strength"),
        VargaInfo(id: "D30", name: "D30", description: "Trimshamsha – Misfortunes"),
        VargaInfo(id: "D40", name: "D40", description: "Khavedamsha – Auspicious Effects"),
        VargaInfo(id: "D45", name: "D45", description: "Akshavedamsha – All Matters"),
        VargaInfo(id: "D60", name: "D60", description: "Shashtiamsha – All Matters (finest)"),
    ]
}

// MARK: - Empty State View

struct EmptyStateView: View {
    let icon: String        // SF Symbol name
    let title: String
    let subtitle: String
    var actionTitle: String? = nil
    var action: (() -> Void)? = nil

    var body: some View {
        VStack(spacing: AppSpacing.base) {
            Image(systemName: icon)
                .font(.system(size: 44))
                .foregroundColor(.appTextMuted)
            Text(title)
                .font(.appTitle3)
                .foregroundColor(.appTextPrimary)
            Text(subtitle)
                .font(.appBody)
                .foregroundColor(.appTextSecondary)
                .multilineTextAlignment(.center)
            if let title = actionTitle, let action = action {
                Button(title, action: action)
                    .buttonStyle(GoldButtonStyle())
                    .padding(.top, AppSpacing.sm)
            }
        }
        .padding(AppSpacing.xl)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

// MARK: - Loading Overlay

struct LoadingOverlay: View {
    var message: String = "Calculating..."

    var body: some View {
        ZStack {
            Color.appBackground.opacity(0.7)
                .ignoresSafeArea()
            VStack(spacing: AppSpacing.base) {
                ProgressView()
                    .progressViewStyle(CircularProgressViewStyle(tint: .appGold))
                    .scaleEffect(1.5)
                Text(message)
                    .font(.appBody)
                    .foregroundColor(.appTextSecondary)
            }
            .padding(AppSpacing.xl)
            .background(
                RoundedRectangle(cornerRadius: AppRadius.lg)
                    .fill(Color.appSurfaceElevated)
                    .shadow(color: .black.opacity(0.4), radius: 20)
            )
        }
    }
}

// MARK: - Error Banner

struct ErrorBanner: View {
    let message: String
    var onDismiss: (() -> Void)? = nil

    var body: some View {
        HStack(spacing: AppSpacing.sm) {
            Image(systemName: "exclamationmark.triangle.fill")
                .foregroundColor(.appError)
            Text(message)
                .font(.appBody)
                .foregroundColor(.appTextPrimary)
            Spacer()
            if let dismiss = onDismiss {
                Button(action: dismiss) {
                    Image(systemName: "xmark")
                        .foregroundColor(.appTextSecondary)
                }
                .buttonStyle(.plain)
            }
        }
        .padding(AppSpacing.md)
        .background(
            RoundedRectangle(cornerRadius: AppRadius.sm)
                .fill(Color.appError.opacity(0.1))
                .overlay(
                    RoundedRectangle(cornerRadius: AppRadius.sm)
                        .stroke(Color.appError.opacity(0.3), lineWidth: 1)
                )
        )
    }
}

// MARK: - Cursor Extension (NSCursor wrapping)

extension View {
    @ViewBuilder
    func cursor(_ nsCursor: NSCursor) -> some View {
        if #available(macOS 13.0, *) {
            self.onHover { inside in
                if inside { nsCursor.push() } else { NSCursor.pop() }
            }
        } else {
            self
        }
    }
}

extension NSCursor {
    static var pointingHand: NSCursor { .pointingHand }
}

// MARK: - LoadingView (alias for LoadingOverlay)

typealias LoadingView = LoadingOverlay

// MARK: - Ghost Button Style (text-only, no background)

struct GhostButtonStyle: ButtonStyle {
    var foreground: Color = .appTextSecondary

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.appBodyMedium)
            .foregroundColor(configuration.isPressed ? foreground.opacity(0.6) : foreground)
            .padding(.horizontal, 12)
            .padding(.vertical, 7)
            .contentShape(Rectangle())
            .animation(.easeInOut(duration: 0.15), value: configuration.isPressed)
    }
}
