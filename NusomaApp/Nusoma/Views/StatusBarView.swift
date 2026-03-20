// StatusBarView.swift — Session info footer
// Ported from src/renderer/components/StatusBar.tsx
//
// Shows: working directory, model, session cost, and settings button.

import SwiftUI

struct StatusBarView: View {
    @Environment(AppState.self) private var appState
    @Environment(ThemeManager.self) private var theme

    private var tab: TabState? { appState.activeTab }

    var body: some View {
        HStack(spacing: 8) {
            // Working directory
            if let dir = tab?.workingDirectory, tab?.hasChosenDirectory == true {
                Button {
                    selectDirectory()
                } label: {
                    HStack(spacing: 3) {
                        Image(systemName: "folder")
                            .font(.system(size: 9))
                        Text(abbreviatePath(dir))
                            .font(.system(size: 10))
                    }
                    .foregroundStyle(theme.colors.textTertiary)
                }
                .buttonStyle(.plain)
            } else {
                Button {
                    selectDirectory()
                } label: {
                    HStack(spacing: 3) {
                        Image(systemName: "folder.badge.plus")
                            .font(.system(size: 9))
                        Text("Set directory")
                            .font(.system(size: 10))
                    }
                    .foregroundStyle(theme.colors.accent)
                }
                .buttonStyle(.plain)
            }

            Spacer()

            // Model badge
            if let model = tab?.sessionModel ?? appState.preferredModel {
                Text(abbreviateModel(model))
                    .font(.system(size: 9, weight: .medium))
                    .foregroundStyle(theme.colors.textTertiary)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(theme.colors.textTertiary.opacity(0.1))
                    .clipShape(Capsule())
            }

            // Cost
            if let result = tab?.lastResult {
                Text(formatCost(result.totalCostUsd))
                    .font(.system(size: 9, design: .monospaced))
                    .foregroundStyle(theme.colors.textTertiary)
            }

            // Settings button
            Button {
                // TODO: Settings popover (Phase 4)
            } label: {
                Image(systemName: "gearshape")
                    .font(.system(size: 10))
                    .foregroundStyle(theme.colors.textTertiary)
            }
            .buttonStyle(.plain)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 6)
    }

    // MARK: - Helpers

    private func selectDirectory() {
        let panel = NSOpenPanel()
        panel.canChooseDirectories = true
        panel.canChooseFiles = false
        panel.allowsMultipleSelection = false

        if panel.runModal() == .OK, let url = panel.url {
            appState.setBaseDirectory(url.path)
        }
    }

    private func abbreviatePath(_ path: String) -> String {
        let home = NSHomeDirectory()
        if path.hasPrefix(home) {
            return "~" + path.dropFirst(home.count)
        }
        // Show last 2 components
        let components = path.split(separator: "/")
        if components.count > 2 {
            return ".../" + components.suffix(2).joined(separator: "/")
        }
        return path
    }

    private func abbreviateModel(_ model: String) -> String {
        if let known = availableModels.first(where: { $0.id == model }) {
            return known.label
        }
        // Strip "claude-" prefix
        return model.replacingOccurrences(of: "claude-", with: "")
    }

    private func formatCost(_ cost: Double) -> String {
        if cost < 0.01 {
            return String(format: "$%.4f", cost)
        }
        return String(format: "$%.2f", cost)
    }
}
