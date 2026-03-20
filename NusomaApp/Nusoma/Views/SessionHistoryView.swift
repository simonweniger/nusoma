// SessionHistoryView.swift — Session history panel
// Phase 4 — Shows past Claude sessions with resume capability
//
// Displays a scrollable list of previous sessions for the current project.
// Users can click a session to resume it in the current tab.

import SwiftUI

struct SessionHistoryView: View {
    @Environment(AppState.self) private var appState
    @Environment(ThemeManager.self) private var theme
    @Environment(SessionHistoryService.self) private var historyService

    @State private var selectedSessionId: String?
    @State private var previewMessages: [SessionLoadMessage] = []
    @State private var isLoadingPreview: Bool = false

    private var projectPath: String {
        appState.activeTab?.workingDirectory ?? "~"
    }

    var body: some View {
        VStack(spacing: 0) {
            // Header
            HStack {
                Image(systemName: "clock.arrow.circlepath")
                    .font(.system(size: 12))
                    .foregroundStyle(theme.colors.accent)
                Text("Session History")
                    .font(.system(size: 12, weight: .semibold))
                Spacer()
                Button {
                    appState.historyOpen = false
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

            if historyService.isLoading {
                VStack(spacing: 8) {
                    ProgressView()
                        .controlSize(.small)
                    Text("Loading sessions...")
                        .font(.system(size: 11))
                        .foregroundStyle(theme.colors.textTertiary)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if historyService.sessions.isEmpty {
                VStack(spacing: 8) {
                    Image(systemName: "tray")
                        .font(.system(size: 24))
                        .foregroundStyle(theme.colors.textMuted)
                    Text("No sessions found")
                        .font(.system(size: 12))
                        .foregroundStyle(theme.colors.textTertiary)
                    Text("Start a conversation to see history here")
                        .font(.system(size: 10))
                        .foregroundStyle(theme.colors.textMuted)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                // Session list
                ScrollView {
                    LazyVStack(spacing: 2) {
                        ForEach(historyService.sessions) { session in
                            SessionRow(
                                session: session,
                                isSelected: selectedSessionId == session.sessionId,
                                onSelect: {
                                    selectSession(session)
                                },
                                onResume: {
                                    resumeSession(session)
                                }
                            )
                        }
                    }
                    .padding(.horizontal, 8)
                    .padding(.vertical, 6)
                }

                // Preview panel (when a session is selected)
                if selectedSessionId != nil {
                    Divider()
                        .foregroundStyle(theme.colors.containerBorder)

                    sessionPreview
                }
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .task {
            await historyService.listSessions(projectPath: projectPath)
        }
        .onChange(of: projectPath) { _, newPath in
            Task {
                selectedSessionId = nil
                previewMessages = []
                await historyService.listSessions(projectPath: newPath)
            }
        }
    }

    // MARK: - Preview Panel

    @ViewBuilder
    private var sessionPreview: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack {
                Text("Preview")
                    .font(.system(size: 10, weight: .medium))
                    .foregroundStyle(theme.colors.textTertiary)
                Spacer()
                if let sessionId = selectedSessionId {
                    Button("Resume") {
                        if let session = historyService.sessions.first(where: { $0.sessionId == sessionId }) {
                            resumeSession(session)
                        }
                    }
                    .font(.system(size: 10, weight: .medium))
                    .buttonStyle(.plain)
                    .foregroundStyle(theme.colors.accent)
                }
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)

            if isLoadingPreview {
                ProgressView()
                    .controlSize(.mini)
                    .frame(maxWidth: .infinity)
                    .padding(12)
            } else {
                ScrollView {
                    LazyVStack(alignment: .leading, spacing: 4) {
                        ForEach(Array(previewMessages.prefix(10).enumerated()), id: \.offset) { _, msg in
                            PreviewMessageRow(message: msg)
                        }

                        if previewMessages.count > 10 {
                            Text("+ \(previewMessages.count - 10) more messages...")
                                .font(.system(size: 9))
                                .foregroundStyle(theme.colors.textMuted)
                                .padding(.horizontal, 8)
                        }
                    }
                    .padding(.horizontal, 8)
                    .padding(.bottom, 8)
                }
                .frame(maxHeight: 150)
            }
        }
    }

    // MARK: - Actions

    private func selectSession(_ session: SessionMeta) {
        if selectedSessionId == session.sessionId {
            selectedSessionId = nil
            previewMessages = []
            return
        }

        selectedSessionId = session.sessionId
        isLoadingPreview = true

        Task {
            let messages = await historyService.loadSession(
                sessionId: session.sessionId,
                projectPath: projectPath
            )
            isLoadingPreview = false
            previewMessages = messages
        }
    }

    private func resumeSession(_ session: SessionMeta) {
        guard let tab = appState.activeTab else { return }

        // Set the session ID so the next message resumes this session
        tab.claudeSessionId = session.sessionId
        tab.title = session.slug ?? session.firstMessage ?? "Resumed Session"

        // Load messages into the tab for display
        Task {
            let messages = await historyService.loadSession(
                sessionId: session.sessionId,
                projectPath: projectPath
            )

            await MainActor.run {
                tab.messages = messages.compactMap { msg in
                    guard let role = MessageRole(rawValue: msg.role) else { return nil }
                    return ChatMessage(
                        role: role,
                        content: msg.content,
                        toolName: msg.toolName,
                        timestamp: msg.timestamp
                    )
                }
                tab.status = .completed
                appState.historyOpen = false
                appState.isExpanded = true
            }
        }
    }
}

// MARK: - Session Row

private struct SessionRow: View {
    @Environment(ThemeManager.self) private var theme
    let session: SessionMeta
    let isSelected: Bool
    let onSelect: () -> Void
    let onResume: () -> Void

    var body: some View {
        Button(action: onSelect) {
            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    // Title
                    Text(session.slug ?? session.firstMessage ?? "Untitled Session")
                        .font(.system(size: 11, weight: isSelected ? .semibold : .regular))
                        .lineLimit(1)
                        .foregroundStyle(isSelected ? theme.colors.accent : theme.colors.textPrimary)

                    Spacer()

                    // Timestamp
                    Text(relativeTime(session.lastTimestamp))
                        .font(.system(size: 9))
                        .foregroundStyle(theme.colors.textMuted)
                }

                // First message preview
                if let firstMsg = session.firstMessage, session.slug != nil {
                    Text(firstMsg)
                        .font(.system(size: 10))
                        .lineLimit(2)
                        .foregroundStyle(theme.colors.textTertiary)
                }

                // File size
                HStack(spacing: 8) {
                    Text(formatSize(session.size))
                        .font(.system(size: 9, design: .monospaced))
                        .foregroundStyle(theme.colors.textMuted)

                    if isSelected {
                        Spacer()
                        Button("Resume", action: onResume)
                            .font(.system(size: 10, weight: .medium))
                            .buttonStyle(.plain)
                            .foregroundStyle(theme.colors.accent)
                    }
                }
            }
            .padding(.horizontal, 10)
            .padding(.vertical, 8)
            .background(
                RoundedRectangle(cornerRadius: 8)
                    .fill(isSelected ? theme.colors.accentSoft : Color.clear)
            )
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }

    private func relativeTime(_ date: Date) -> String {
        let formatter = RelativeDateTimeFormatter()
        formatter.unitsStyle = .abbreviated
        return formatter.localizedString(for: date, relativeTo: Date())
    }

    private func formatSize(_ bytes: Int) -> String {
        if bytes < 1024 { return "\(bytes) B" }
        if bytes < 1024 * 1024 { return "\(bytes / 1024) KB" }
        return String(format: "%.1f MB", Double(bytes) / (1024 * 1024))
    }
}

// MARK: - Preview Message Row

private struct PreviewMessageRow: View {
    @Environment(ThemeManager.self) private var theme
    let message: SessionLoadMessage

    var body: some View {
        HStack(alignment: .top, spacing: 6) {
            // Role icon
            Image(systemName: roleIcon)
                .font(.system(size: 8))
                .foregroundStyle(roleColor)
                .frame(width: 12)
                .padding(.top, 2)

            // Content
            if message.role == "tool" {
                Text(message.toolName ?? "tool")
                    .font(.system(size: 10, design: .monospaced))
                    .foregroundStyle(theme.colors.textTertiary)
            } else {
                Text(message.content)
                    .font(.system(size: 10))
                    .lineLimit(3)
                    .foregroundStyle(theme.colors.textSecondary)
            }
        }
        .padding(.horizontal, 4)
        .padding(.vertical, 2)
    }

    private var roleIcon: String {
        switch message.role {
        case "user": return "person.fill"
        case "assistant": return "sparkles"
        case "tool": return "wrench"
        default: return "circle"
        }
    }

    private var roleColor: Color {
        switch message.role {
        case "user": return theme.colors.accent
        case "assistant": return theme.colors.statusComplete
        case "tool": return theme.colors.textTertiary
        default: return theme.colors.textMuted
        }
    }
}
