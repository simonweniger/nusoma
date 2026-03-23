// StatusBarView.swift — Session info footer
// Phase 4 — adds session history button, links to full settings panel
//
// Shows: working directory, model, session cost, duration, history, settings.

import SwiftUI

struct StatusBarView: View {
    @Environment(AppState.self) private var appState
    @Environment(ThemeManager.self) private var theme

    private var tab: TabState? { appState.activeTab }

    var body: some View {
        HStack(spacing: 8) {
            // Working directory
            directoryButton

            Spacer()

            // Session metadata (when available)
            if let tab {
                // MCP servers count
                if !tab.sessionMcpServers.isEmpty {
                    HStack(spacing: 2) {
                        Image(systemName: "server.rack")
                            .font(.system(size: 8))
                        Text("\(tab.sessionMcpServers.count)")
                            .font(.system(size: 9, design: .monospaced))
                    }
                    .foregroundStyle(theme.colors.textMuted)
                    .help("MCP Servers: \(tab.sessionMcpServers.map(\.name).joined(separator: ", "))")
                }

                // Tools count
                if !tab.sessionTools.isEmpty {
                    HStack(spacing: 2) {
                        Image(systemName: "wrench")
                            .font(.system(size: 8))
                        Text("\(tab.sessionTools.count)")
                            .font(.system(size: 9, design: .monospaced))
                    }
                    .foregroundStyle(theme.colors.textMuted)
                }
            }

            // Model badge
            if let model = tab?.sessionModel ?? appState.preferredModel {
                Text(abbreviateModel(model))
                    .font(.system(size: 9, weight: .medium))
                    .foregroundStyle(theme.colors.textTertiary)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(theme.colors.textTertiary.opacity(0.08))
                    .clipShape(Capsule())
            }

            // Cost + Duration
            if let result = tab?.lastResult {
                HStack(spacing: 4) {
                    Text(formatCost(result.totalCostUsd))
                        .font(.system(size: 9, design: .monospaced))
                    Text("·")
                    Text(formatDuration(result.durationMs))
                        .font(.system(size: 9, design: .monospaced))
                }
                .foregroundStyle(theme.colors.textTertiary)
            }

            // Clear conversation
            if let tab, !tab.messages.isEmpty {
                Button {
                    appState.clearTab()
                } label: {
                    Image(systemName: "trash")
                        .font(.system(size: 9))
                        .foregroundStyle(theme.colors.textMuted)
                }
                .buttonStyle(.plain)
                .help("Clear conversation")
            }

            // Session history button
            Button {
                appState.historyOpen.toggle()
                if appState.historyOpen {
                    appState.settingsOpen = false
                }
            } label: {
                Image(systemName: "clock.arrow.circlepath")
                    .font(.system(size: 9))
                    .foregroundStyle(appState.historyOpen ? theme.colors.accent : theme.colors.textMuted)
            }
            .buttonStyle(.plain)
            .help("Session history")

            // Theme toggle
            Button {
                if theme.isDark {
                    theme.themeMode = .light
                } else {
                    theme.themeMode = .dark
                }
            } label: {
                Image(systemName: theme.isDark ? "sun.max" : "moon")
                    .font(.system(size: 9))
                    .foregroundStyle(theme.colors.textMuted)
            }
            .buttonStyle(.plain)
            .help("Toggle theme")

            // Settings button — opens full settings panel
            Button {
                appState.settingsOpen.toggle()
                if appState.settingsOpen {
                    appState.historyOpen = false
                }
            } label: {
                Image(systemName: "gearshape")
                    .font(.system(size: 10))
                    .foregroundStyle(appState.settingsOpen ? theme.colors.accent : theme.colors.textTertiary)
            }
            .buttonStyle(.plain)
            .help("Settings")
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 6)
    }

    // MARK: - Directory Button

    @ViewBuilder
    private var directoryButton: some View {
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
            .help(dir)

            // Additional dirs indicator
            if let addDirs = tab?.additionalDirs, !addDirs.isEmpty {
                Text("+\(addDirs.count)")
                    .font(.system(size: 9, design: .monospaced))
                    .foregroundStyle(theme.colors.accent)
                    .help("Additional dirs: \(addDirs.joined(separator: ", "))")
            }
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
        var display = path
        if display.hasPrefix(home) {
            display = "~" + display.dropFirst(home.count)
        }
        // Truncate if too long
        if display.count > 30 {
            let components = display.split(separator: "/")
            if components.count > 2 {
                return ".../" + components.suffix(2).joined(separator: "/")
            }
        }
        return display
    }

    private func abbreviateModel(_ model: String) -> String {
        if let known = availableModels.first(where: { $0.id == model }) {
            return known.label
        }
        return model.replacingOccurrences(of: "claude-", with: "")
    }

    private func formatCost(_ cost: Double) -> String {
        if cost < 0.01 {
            return String(format: "$%.4f", cost)
        }
        return String(format: "$%.2f", cost)
    }

    private func formatDuration(_ ms: Int) -> String {
        if ms < 1000 { return "\(ms)ms" }
        let seconds = Double(ms) / 1000
        if seconds < 60 { return String(format: "%.1fs", seconds) }
        let minutes = Int(seconds / 60)
        let secs = Int(seconds) % 60
        return "\(minutes)m \(secs)s"
    }
}

