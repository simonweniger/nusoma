// SettingsView.swift — Full settings panel
// Phase 4 — Expanded settings with model selection, permissions, shortcuts, about info
//
// Replaces the minimal SettingsPopover with a complete settings experience.
// Shown as a panel above the chat shell, similar to Marketplace/PM panels.

import SwiftUI

struct SettingsView: View {
    @Environment(AppState.self) private var appState
    @Environment(ThemeManager.self) private var theme

    @State private var selectedSection: SettingsSection = .general

    var body: some View {
        VStack(spacing: 0) {
            // Header
            HStack {
                Image(systemName: "gearshape.fill")
                    .font(.system(size: 12))
                    .foregroundStyle(theme.colors.accent)
                Text("Settings")
                    .font(.system(size: 12, weight: .semibold))
                Spacer()
                Button {
                    appState.settingsOpen = false
                } label: {
                    Image(systemName: "xmark")
                        .font(.system(size: 10, weight: .medium))
                        .foregroundStyle(theme.colors.textTertiary)
                }
                .buttonStyle(.plain)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)

            Divider()
                .foregroundStyle(theme.colors.containerBorder)

            // Section tabs
            HStack(spacing: 0) {
                ForEach(SettingsSection.allCases, id: \.self) { section in
                    Button {
                        withAnimation(NusomaAnimation.quick) {
                            selectedSection = section
                        }
                    } label: {
                        Text(section.title)
                            .font(.system(size: 10, weight: selectedSection == section ? .semibold : .regular))
                            .foregroundStyle(selectedSection == section ? theme.colors.accent : theme.colors.textTertiary)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 6)
                            .background(
                                selectedSection == section
                                    ? theme.colors.accentSoft
                                    : Color.clear
                            )
                            .clipShape(Capsule())
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)

            Divider()
                .foregroundStyle(theme.colors.containerBorder)

            // Content
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    switch selectedSection {
                    case .general:
                        generalSection
                    case .model:
                        modelSection
                    case .permissions:
                        permissionsSection
                    case .shortcuts:
                        shortcutsSection
                    case .about:
                        aboutSection
                    }
                }
                .padding(16)
            }
        }
    }

    // MARK: - General Section

    @ViewBuilder
    private var generalSection: some View {
        SettingsGroup(title: "Appearance") {
            HStack {
                Text("Theme")
                    .font(.system(size: 11))
                Spacer()
                Picker("", selection: Bindable(theme).themeMode) {
                    ForEach(ThemeManager.ThemeMode.allCases, id: \.self) { mode in
                        Text(mode.rawValue.capitalized).tag(mode)
                    }
                }
                .pickerStyle(.segmented)
                .frame(width: 180)
            }

            Toggle("Expanded UI layout", isOn: Bindable(theme).expandedUI)
                .font(.system(size: 11))
                .toggleStyle(.switch)
                .controlSize(.small)
        }

        SettingsGroup(title: "Behavior") {
            Toggle("Notification sound", isOn: Bindable(theme).soundEnabled)
                .font(.system(size: 11))
                .toggleStyle(.switch)
                .controlSize(.small)

            Toggle("Remember last folder", isOn: Bindable(theme).useLastFolder)
                .font(.system(size: 11))
                .toggleStyle(.switch)
                .controlSize(.small)
        }
    }

    // MARK: - Model Section

    @ViewBuilder
    private var modelSection: some View {
        SettingsGroup(title: "Default Model") {
            ForEach(availableModels) { model in
                Button {
                    appState.setPreferredModel(model.id)
                } label: {
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(model.label)
                                .font(.system(size: 11, weight: .medium))
                            Text(model.id)
                                .font(.system(size: 9, design: .monospaced))
                                .foregroundStyle(theme.colors.textMuted)
                        }
                        Spacer()
                        if appState.preferredModel == model.id {
                            Image(systemName: "checkmark.circle.fill")
                                .font(.system(size: 14))
                                .foregroundStyle(theme.colors.accent)
                        }
                    }
                    .padding(.horizontal, 10)
                    .padding(.vertical, 8)
                    .background(
                        RoundedRectangle(cornerRadius: 8)
                            .fill(appState.preferredModel == model.id
                                  ? theme.colors.accentSoft
                                  : Color.clear)
                    )
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
            }
        }

        SettingsGroup(title: "Session Model") {
            if let sessionModel = appState.activeTab?.sessionModel {
                HStack {
                    Text("Current session")
                        .font(.system(size: 11))
                    Spacer()
                    Text(sessionModel)
                        .font(.system(size: 10, design: .monospaced))
                        .foregroundStyle(theme.colors.textTertiary)
                }
            } else {
                Text("No active session")
                    .font(.system(size: 11))
                    .foregroundStyle(theme.colors.textMuted)
            }
        }
    }

    // MARK: - Permissions Section

    @ViewBuilder
    private var permissionsSection: some View {
        SettingsGroup(title: "Permission Mode") {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Tool approval")
                        .font(.system(size: 11))
                    Text("Controls how Claude handles tool permission requests")
                        .font(.system(size: 9))
                        .foregroundStyle(theme.colors.textMuted)
                }
                Spacer()
                Picker("", selection: Binding(
                    get: { appState.permissionMode },
                    set: { appState.setPermissionMode($0) }
                )) {
                    Text("Ask").tag(PermissionMode.ask)
                    Text("Auto").tag(PermissionMode.auto)
                }
                .pickerStyle(.segmented)
                .frame(width: 120)
            }
        }

        SettingsGroup(title: "Mode Details") {
            VStack(alignment: .leading, spacing: 8) {
                HStack(alignment: .top, spacing: 8) {
                    Image(systemName: "hand.raised")
                        .font(.system(size: 12))
                        .foregroundStyle(theme.colors.accent)
                        .frame(width: 16)
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Ask Mode")
                            .font(.system(size: 11, weight: .medium))
                        Text("Prompts for approval before executing tools like Bash, Edit, Write. Recommended for safety.")
                            .font(.system(size: 10))
                            .foregroundStyle(theme.colors.textTertiary)
                    }
                }

                HStack(alignment: .top, spacing: 8) {
                    Image(systemName: "bolt")
                        .font(.system(size: 12))
                        .foregroundStyle(theme.colors.statusComplete)
                        .frame(width: 16)
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Auto Mode")
                            .font(.system(size: 11, weight: .medium))
                        Text("Automatically approves safe tool calls. Dangerous commands still require approval.")
                            .font(.system(size: 10))
                            .foregroundStyle(theme.colors.textTertiary)
                    }
                }
            }
        }
    }

    // MARK: - Shortcuts Section

    @ViewBuilder
    private var shortcutsSection: some View {
        SettingsGroup(title: "Global Shortcuts") {
            shortcutRow(
                label: "Toggle Nusoma",
                shortcut: appState.shortcutSettings.primaryShortcut ?? "Alt+Space"
            )
            shortcutRow(
                label: "Secondary toggle",
                shortcut: appState.shortcutSettings.secondaryShortcut ?? "Cmd+Shift+K"
            )
        }

        SettingsGroup(title: "In-App Shortcuts") {
            shortcutRow(label: "New tab", shortcut: "Cmd+T")
            shortcutRow(label: "Close tab", shortcut: "Cmd+W")
            shortcutRow(label: "Switch tab", shortcut: "Cmd+1-9")
            shortcutRow(label: "Send message", shortcut: "Return")
            shortcutRow(label: "New line", shortcut: "Shift+Return")
        }
    }

    private func shortcutRow(label: String, shortcut: String) -> some View {
        HStack {
            Text(label)
                .font(.system(size: 11))
            Spacer()
            Text(shortcut)
                .font(.system(size: 10, design: .monospaced))
                .foregroundStyle(theme.colors.textTertiary)
                .padding(.horizontal, 6)
                .padding(.vertical, 2)
                .background(theme.colors.codeBg)
                .clipShape(RoundedRectangle(cornerRadius: 4))
        }
    }

    // MARK: - About Section

    @ViewBuilder
    private var aboutSection: some View {
        SettingsGroup(title: "Nusoma") {
            if let info = appState.staticInfo {
                infoRow(label: "Claude CLI", value: "v\(info.version)")
                if let email = info.email {
                    infoRow(label: "Account", value: email)
                }
                if let sub = info.subscriptionType {
                    infoRow(label: "Plan", value: sub)
                }
                infoRow(label: "Project", value: abbreviatePath(info.projectPath))
            } else {
                Text("CLI info not available")
                    .font(.system(size: 11))
                    .foregroundStyle(theme.colors.textMuted)
            }
        }

        SettingsGroup(title: "Session Info") {
            if let tab = appState.activeTab {
                if let model = tab.sessionModel {
                    infoRow(label: "Model", value: model)
                }
                if !tab.sessionTools.isEmpty {
                    infoRow(label: "Tools", value: "\(tab.sessionTools.count) available")
                }
                if !tab.sessionMcpServers.isEmpty {
                    infoRow(label: "MCP Servers", value: tab.sessionMcpServers.map(\.name).joined(separator: ", "))
                }
                if let version = tab.sessionVersion {
                    infoRow(label: "Version", value: version)
                }
                if let result = tab.lastResult {
                    infoRow(label: "Last cost", value: String(format: "$%.4f", result.totalCostUsd))
                    infoRow(label: "Turns", value: "\(result.numTurns)")
                }
            } else {
                Text("No active session")
                    .font(.system(size: 11))
                    .foregroundStyle(theme.colors.textMuted)
            }
        }
    }

    private func infoRow(label: String, value: String) -> some View {
        HStack {
            Text(label)
                .font(.system(size: 11))
                .foregroundStyle(theme.colors.textTertiary)
            Spacer()
            Text(value)
                .font(.system(size: 11))
                .foregroundStyle(theme.colors.textPrimary)
                .lineLimit(1)
        }
    }

    private func abbreviatePath(_ path: String) -> String {
        let home = FileManager.default.homeDirectoryForCurrentUser.path
        if path.hasPrefix(home) {
            return "~" + path.dropFirst(home.count)
        }
        return path
    }
}

// MARK: - Settings Section Enum

enum SettingsSection: String, CaseIterable {
    case general
    case model
    case permissions
    case shortcuts
    case about

    var title: String {
        rawValue.capitalized
    }
}

// MARK: - Settings Group

private struct SettingsGroup<Content: View>: View {
    @Environment(ThemeManager.self) private var theme
    let title: String
    @ViewBuilder let content: () -> Content

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.system(size: 10, weight: .semibold))
                .foregroundStyle(theme.colors.textTertiary)
                .textCase(.uppercase)

            VStack(alignment: .leading, spacing: 6) {
                content()
            }
            .padding(12)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(theme.colors.codeBg.opacity(0.5))
            .clipShape(RoundedRectangle(cornerRadius: 10))
        }
    }
}
