// MainView.swift — Root view: tab strip + conversation + input pill
// Ported from src/renderer/App.tsx
//
// Uses macOS 26 Liquid Glass design language throughout.
// Layout: vertical stack anchored to bottom of transparent panel.

import SwiftUI

struct MainView: View {
    @Environment(AppState.self) private var appState
    @Environment(ThemeManager.self) private var theme

    @State private var contentHeight: CGFloat = 160

    var body: some View {
        VStack(spacing: 0) {
            Spacer(minLength: 0)

            // Content column, centered
            VStack(spacing: 0) {
                // Marketplace panel (above chat shell)
                if appState.marketplaceOpen {
                    MarketplacePlaceholder()
                        .frame(maxWidth: 720)
                        .transition(.asymmetric(
                            insertion: .opacity.combined(with: .move(edge: .bottom)).combined(with: .scale(scale: 0.98)),
                            removal: .opacity.combined(with: .move(edge: .bottom)).combined(with: .scale(scale: 0.985))
                        ))
                        .padding(.bottom, 14)
                }

                // PM panel (above chat shell)
                if appState.pmOpen {
                    PMPlaceholder()
                        .frame(maxWidth: 720)
                        .transition(.asymmetric(
                            insertion: .opacity.combined(with: .move(edge: .bottom)).combined(with: .scale(scale: 0.98)),
                            removal: .opacity.combined(with: .move(edge: .bottom)).combined(with: .scale(scale: 0.985))
                        ))
                        .padding(.bottom, 14)
                }

                // Chat shell (tabs + conversation)
                chatShell
                    .padding(.bottom, appState.isExpanded ? 10 : -14)

                // Input row with action buttons
                inputRow
                    .padding(.bottom, 10)
            }
            .frame(width: theme.expandedUI ? Spacing.expandedContentWidth : Spacing.contentWidth)
            .animation(NusomaAnimation.standard, value: appState.isExpanded)
            .animation(NusomaAnimation.standard, value: appState.marketplaceOpen)
            .animation(NusomaAnimation.standard, value: appState.pmOpen)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color.clear)
        .background(
            GeometryReader { geo in
                Color.clear.preference(key: ContentHeightKey.self, value: geo.size.height)
            }
        )
        .onPreferenceChange(ContentHeightKey.self) { height in
            contentHeight = height
        }
    }

    // MARK: - Chat Shell

    private var chatShell: some View {
        let isExpanded = appState.isExpanded
        let contentWidth = theme.expandedUI ? Spacing.expandedContentWidth : Spacing.contentWidth
        let cardWidth: CGFloat = isExpanded
            ? (theme.expandedUI ? 700 : 460)
            : (theme.expandedUI ? 670 : 430)

        return VStack(spacing: 0) {
            // Tab strip (draggable area)
            TabStripView()

            // Conversation body — collapses to zero height when not expanded
            if isExpanded {
                VStack(spacing: 0) {
                    ConversationView()
                    StatusBarView()
                }
                .frame(maxHeight: theme.expandedUI ? Spacing.expandedMaxHeight : Spacing.conversationMaxHeight)
                .transition(.opacity.combined(with: .scale(scale: 0.98, anchor: .bottom)))
            }
        }
        .frame(width: cardWidth)
        .glassEffect(.regular.interactive)
        .clipShape(RoundedRectangle(cornerRadius: Spacing.containerRadius))
        .animation(NusomaAnimation.standard, value: isExpanded)
    }

    // MARK: - Input Row

    private var inputRow: some View {
        HStack(spacing: 12) {
            // Stacked action buttons (attach, screenshot, skills)
            actionButtons

            // Input pill
            InputBarView()
                .glassEffect(.regular.interactive)
                .clipShape(Capsule())
        }
        .frame(height: 50)
    }

    // MARK: - Action Buttons

    private var actionButtons: some View {
        HStack(spacing: 8) {
            // Attach file
            Button {
                // TODO: NSOpenPanel file picker
            } label: {
                Image(systemName: "paperclip")
                    .font(.system(size: 15))
            }
            .buttonStyle(GlassCircleButtonStyle())
            .disabled(appState.isRunning)

            // Screenshot
            Button {
                // TODO: Screenshot capture
            } label: {
                Image(systemName: "camera")
                    .font(.system(size: 15))
            }
            .buttonStyle(GlassCircleButtonStyle())
            .disabled(appState.isRunning)

            // Skills & Plugins
            Button {
                appState.toggleMarketplace()
            } label: {
                Image(systemName: "cpu")
                    .font(.system(size: 15))
            }
            .buttonStyle(GlassCircleButtonStyle())
            .disabled(appState.isRunning)
        }
    }
}

// MARK: - Glass Circle Button Style

struct GlassCircleButtonStyle: ButtonStyle {
    @Environment(\.isEnabled) private var isEnabled

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .frame(width: Spacing.circleSize, height: Spacing.circleSize)
            .glassEffect(.regular.interactive)
            .clipShape(Circle())
            .opacity(isEnabled ? (configuration.isPressed ? 0.7 : 1.0) : 0.4)
            .scaleEffect(configuration.isPressed ? 0.92 : 1.0)
            .animation(NusomaAnimation.quick, value: configuration.isPressed)
    }
}

// MARK: - Placeholders (to be replaced in later phases)

struct MarketplacePlaceholder: View {
    @Environment(AppState.self) private var appState

    var body: some View {
        VStack(spacing: 16) {
            HStack {
                Text("Skills & Plugins")
                    .font(.headline)
                Spacer()
                Button("Close") { appState.marketplaceOpen = false }
                    .buttonStyle(.plain)
            }
            Text("Marketplace coming in Phase 6")
                .foregroundStyle(.secondary)
        }
        .padding(20)
        .glassEffect(.regular)
        .clipShape(RoundedRectangle(cornerRadius: 24))
    }
}

struct PMPlaceholder: View {
    @Environment(AppState.self) private var appState

    var body: some View {
        VStack(spacing: 16) {
            HStack {
                Text("Project Management")
                    .font(.headline)
                Spacer()
                Button("Close") { appState.pmOpen = false }
                    .buttonStyle(.plain)
            }
            Text("PM panel coming in Phase 5")
                .foregroundStyle(.secondary)
        }
        .padding(20)
        .glassEffect(.regular)
        .clipShape(RoundedRectangle(cornerRadius: 24))
    }
}

// MARK: - Preference Key

struct ContentHeightKey: PreferenceKey {
    static var defaultValue: CGFloat = 160
    static func reduce(value: inout CGFloat, nextValue: () -> CGFloat) {
        value = max(value, nextValue())
    }
}
