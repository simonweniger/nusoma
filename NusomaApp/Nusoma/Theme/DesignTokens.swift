// DesignTokens.swift — Color palettes, spacing, animation curves
// Ported from src/renderer/theme.ts

import SwiftUI

// MARK: - Color Palette

struct NusomaColors {
    // Container (glass surfaces)
    let containerBg: Color
    let containerBgCollapsed: Color
    let containerBorder: Color

    // Text
    let textPrimary: Color
    let textSecondary: Color
    let textTertiary: Color
    let textMuted: Color

    // Accent — orange
    let accent: Color
    let accentLight: Color
    let accentSoft: Color

    // Status
    let statusIdle: Color
    let statusRunning: Color
    let statusComplete: Color
    let statusError: Color
    let statusDead: Color

    // User message bubble
    let userBubble: Color
    let userBubbleBorder: Color
    let userBubbleText: Color

    // Tool card
    let toolBg: Color
    let toolBorder: Color
    let toolRunningBorder: Color

    // Input
    let inputPillBg: Color

    // Buttons
    let sendBg: Color
    let sendHover: Color
    let stopBg: Color

    // Code block
    let codeBg: Color

    // Placeholder
    let placeholder: Color
}

// MARK: - Dark Theme

let darkPalette = NusomaColors(
    containerBg: Color(hex: "#242422"),
    containerBgCollapsed: Color(hex: "#21211e"),
    containerBorder: Color(hex: "#3b3b36"),
    textPrimary: Color(hex: "#ccc9c0"),
    textSecondary: Color(hex: "#c0bdb2"),
    textTertiary: Color(hex: "#76766e"),
    textMuted: Color(hex: "#353530"),
    accent: Color(hex: "#d97757"),
    accentLight: Color(hex: "#d97757").opacity(0.1),
    accentSoft: Color(hex: "#d97757").opacity(0.15),
    statusIdle: Color(hex: "#8a8a80"),
    statusRunning: Color(hex: "#d97757"),
    statusComplete: Color(hex: "#7aac8c"),
    statusError: Color(hex: "#c47060"),
    statusDead: Color(hex: "#c47060"),
    userBubble: Color(hex: "#353530"),
    userBubbleBorder: Color(hex: "#4a4a45"),
    userBubbleText: Color(hex: "#ccc9c0"),
    toolBg: Color(hex: "#353530"),
    toolBorder: Color(hex: "#4a4a45"),
    toolRunningBorder: Color(hex: "#d97757").opacity(0.3),
    inputPillBg: Color(hex: "#2a2a27"),
    sendBg: Color(hex: "#d97757"),
    sendHover: Color(hex: "#c96442"),
    stopBg: Color(hex: "#ef4444"),
    codeBg: Color(hex: "#1a1a18"),
    placeholder: Color(hex: "#6b6b60")
)

// MARK: - Light Theme

let lightPalette = NusomaColors(
    containerBg: Color(hex: "#f9f8f5"),
    containerBgCollapsed: Color(hex: "#f4f2ed"),
    containerBorder: Color(hex: "#dddad2"),
    textPrimary: Color(hex: "#3c3929"),
    textSecondary: Color(hex: "#5a5749"),
    textTertiary: Color(hex: "#8a8a80"),
    textMuted: Color(hex: "#dddad2"),
    accent: Color(hex: "#d97757"),
    accentLight: Color(hex: "#d97757").opacity(0.1),
    accentSoft: Color(hex: "#d97757").opacity(0.12),
    statusIdle: Color(hex: "#8a8a80"),
    statusRunning: Color(hex: "#d97757"),
    statusComplete: Color(hex: "#5a9e6f"),
    statusError: Color(hex: "#c47060"),
    statusDead: Color(hex: "#c47060"),
    userBubble: Color(hex: "#edeae0"),
    userBubbleBorder: Color(hex: "#dddad2"),
    userBubbleText: Color(hex: "#3c3929"),
    toolBg: Color(hex: "#edeae0"),
    toolBorder: Color(hex: "#dddad2"),
    toolRunningBorder: Color(hex: "#d97757").opacity(0.3),
    inputPillBg: Color.white,
    sendBg: Color(hex: "#d97757"),
    sendHover: Color(hex: "#c96442"),
    stopBg: Color(hex: "#ef4444"),
    codeBg: Color(hex: "#f0eee8"),
    placeholder: Color(hex: "#b0ada4")
)

// MARK: - Theme Manager

@Observable
class ThemeManager {
    enum ThemeMode: String, CaseIterable, Codable {
        case system, light, dark
    }

    var themeMode: ThemeMode {
        didSet { saveSettings(); resolveTheme() }
    }
    var soundEnabled: Bool {
        didSet { saveSettings() }
    }
    var expandedUI: Bool {
        didSet { saveSettings() }
    }
    var useLastFolder: Bool {
        didSet { saveSettings() }
    }

    // Resolved state
    var isDark: Bool = true

    var colors: NusomaColors {
        isDark ? darkPalette : lightPalette
    }

    init() {
        let defaults = UserDefaults.standard
        let mode = ThemeMode(rawValue: defaults.string(forKey: "nusoma-themeMode") ?? "dark") ?? .dark
        self.themeMode = mode
        self.soundEnabled = defaults.object(forKey: "nusoma-soundEnabled") as? Bool ?? true
        self.expandedUI = false // Always start compact
        self.useLastFolder = defaults.object(forKey: "nusoma-useLastFolder") as? Bool ?? true
        resolveTheme()
    }

    private func resolveTheme() {
        switch themeMode {
        case .dark: isDark = true
        case .light: isDark = false
        case .system:
            isDark = NSApp?.effectiveAppearance.bestMatch(from: [.darkAqua, .aqua]) == .darkAqua
        }
    }

    func systemAppearanceChanged() {
        if themeMode == .system {
            resolveTheme()
        }
    }

    private func saveSettings() {
        let defaults = UserDefaults.standard
        defaults.set(themeMode.rawValue, forKey: "nusoma-themeMode")
        defaults.set(soundEnabled, forKey: "nusoma-soundEnabled")
        defaults.set(expandedUI, forKey: "nusoma-expandedUI")
        defaults.set(useLastFolder, forKey: "nusoma-useLastFolder")
    }
}

// MARK: - Spacing Constants

enum Spacing {
    static let contentWidth: CGFloat = 460
    static let expandedContentWidth: CGFloat = 700
    static let containerRadius: CGFloat = 20
    static let containerPadding: CGFloat = 12
    static let tabHeight: CGFloat = 32
    static let inputMinHeight: CGFloat = 44
    static let inputMaxHeight: CGFloat = 160
    static let conversationMaxHeight: CGFloat = 400
    static let expandedMaxHeight: CGFloat = 520
    static let pillRadius: CGFloat = 9999
    static let circleSize: CGFloat = 36
    static let circleGap: CGFloat = 8
}

// MARK: - Animation Constants

enum NusomaAnimation {
    static let standard = Animation.timingCurve(0.4, 0, 0.1, 1, duration: 0.26)
    static let spring = Animation.spring(duration: 0.26, bounce: 0.15)
    static let quick = Animation.spring(duration: 0.15, bounce: 0.1)
}

// MARK: - Color Hex Extension

extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 6: // RGB
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: // ARGB
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (255, 0, 0, 0)
        }
        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue: Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}
