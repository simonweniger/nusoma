// TabStripView.swift — Horizontal tab bar with status indicators
// Ported from src/renderer/components/TabStrip.tsx
//
// Features:
// - Click tab to select (or toggle expand if already active)
// - Cmd+T new tab, Cmd+W close tab
// - Status dot per tab (idle/running/complete/error)
// - Unread indicator

import SwiftUI

struct TabStripView: View {
    @Environment(AppState.self) private var appState
    @Environment(ThemeManager.self) private var theme

    var body: some View {
        HStack(spacing: 2) {
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 2) {
                    ForEach(appState.tabs) { tab in
                        TabButton(tab: tab)
                    }
                }
                .padding(.horizontal, 6)
            }

            Spacer(minLength: 0)

            // New tab button
            Button {
                appState.createTab()
            } label: {
                Image(systemName: "plus")
                    .font(.system(size: 11, weight: .medium))
                    .foregroundStyle(.secondary)
            }
            .buttonStyle(.plain)
            .frame(width: 24, height: 24)
            .padding(.trailing, 6)
        }
        .frame(height: Spacing.tabHeight)
    }
}

// MARK: - Tab Button

private struct TabButton: View {
    @Environment(AppState.self) private var appState
    @Environment(ThemeManager.self) private var theme
    let tab: TabState

    private var isActive: Bool {
        tab.id == appState.activeTabId
    }

    var body: some View {
        Button {
            appState.selectTab(tab.id)
        } label: {
            HStack(spacing: 5) {
                // Status dot
                statusDot
                    .frame(width: 6, height: 6)

                // Title
                Text(tab.title)
                    .font(.system(size: 11, weight: isActive ? .medium : .regular))
                    .lineLimit(1)
                    .foregroundStyle(isActive ? .primary : .secondary)

                // Unread indicator
                if tab.hasUnread {
                    Circle()
                        .fill(theme.colors.accent)
                        .frame(width: 5, height: 5)
                }

                // Pin indicator
                if tab.pinned {
                    Image(systemName: "pin.fill")
                        .font(.system(size: 8))
                        .foregroundStyle(.tertiary)
                }

                // Close button (not for pinned tabs)
                if isActive && !tab.pinned {
                    Button {
                        appState.closeTab(tab.id)
                    } label: {
                        Image(systemName: "xmark")
                            .font(.system(size: 8, weight: .semibold))
                            .foregroundStyle(.tertiary)
                    }
                    .buttonStyle(.plain)
                    .frame(width: 14, height: 14)
                }
            }
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(
                isActive
                    ? AnyShapeStyle(.ultraThinMaterial)
                    : AnyShapeStyle(.clear)
            )
            .clipShape(RoundedRectangle(cornerRadius: 6))
        }
        .buttonStyle(.plain)
        .contextMenu {
            if !tab.pinned {
                Button("Pin Tab") { appState.togglePin(tab.id) }
            } else {
                Button("Unpin Tab") { appState.togglePin(tab.id) }
            }
            Divider()
            Button("Close Tab") { appState.closeTab(tab.id) }
                .disabled(tab.pinned)
        }
    }

    @ViewBuilder
    private var statusDot: some View {
        let color: Color = switch tab.status {
        case .idle: theme.colors.statusIdle
        case .connecting, .running: theme.colors.statusRunning
        case .completed: theme.colors.statusComplete
        case .failed: theme.colors.statusError
        case .dead: theme.colors.statusDead
        }

        Circle()
            .fill(color)
            .overlay {
                if tab.status == .running || tab.status == .connecting {
                    Circle()
                        .fill(color.opacity(0.4))
                        .scaleEffect(1.8)
                        .opacity(0.5)
                        .animation(.easeInOut(duration: 1.2).repeatForever(autoreverses: true), value: tab.status)
                }
            }
    }
}
