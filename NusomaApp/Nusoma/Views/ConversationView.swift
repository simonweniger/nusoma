// ConversationView.swift — Message list with user/assistant/tool/system bubbles
// Ported from src/renderer/components/ConversationView.tsx
//
// Renders the conversation timeline with:
// - User message bubbles (right-aligned)
// - Assistant message bubbles with markdown rendering
// - Tool call cards (expandable)
// - System messages (errors, rate limits)

import SwiftUI

struct ConversationView: View {
    @Environment(AppState.self) private var appState
    @Environment(ThemeManager.self) private var theme

    var body: some View {
        let messages = appState.activeTab?.messages ?? []

        ScrollViewReader { proxy in
            ScrollView(.vertical, showsIndicators: true) {
                LazyVStack(alignment: .leading, spacing: 8) {
                    ForEach(Array(messages.enumerated()), id: \.element.id) { _, message in
                        MessageRow(message: message)
                    }

                    // Permission cards
                    if let tab = appState.activeTab {
                        ForEach(tab.permissionQueue) { request in
                            PermissionCardPlaceholder(request: request)
                        }
                    }

                    // Anchor for auto-scroll
                    Color.clear
                        .frame(height: 1)
                        .id("bottom")
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
            }
            .onChange(of: messages.count) { _, _ in
                withAnimation(NusomaAnimation.quick) {
                    proxy.scrollTo("bottom", anchor: .bottom)
                }
            }
        }
    }
}

// MARK: - Message Row

private struct MessageRow: View {
    @Environment(ThemeManager.self) private var theme
    let message: ChatMessage

    var body: some View {
        switch message.role {
        case .user:
            userBubble
        case .assistant:
            assistantBubble
        case .tool:
            toolCard
        case .system:
            systemMessage
        }
    }

    // MARK: - User Bubble

    private var userBubble: some View {
        HStack {
            Spacer(minLength: 60)
            Text(message.content)
                .font(.system(size: 13))
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                .background(theme.colors.userBubble)
                .clipShape(RoundedRectangle(cornerRadius: 14))
                .overlay(
                    RoundedRectangle(cornerRadius: 14)
                        .stroke(theme.colors.userBubbleBorder, lineWidth: 0.5)
                )
        }
    }

    // MARK: - Assistant Bubble

    private var assistantBubble: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Render markdown content
            Text(LocalizedStringKey(message.content))
                .font(.system(size: 13))
                .textSelection(.enabled)
                .foregroundStyle(theme.colors.textPrimary)
        }
        .padding(.horizontal, 4)
        .padding(.vertical, 4)
    }

    // MARK: - Tool Card

    private var toolCard: some View {
        let isRunning = message.toolStatus == .running

        return DisclosureGroup {
            if let input = message.toolInput, !input.isEmpty {
                Text(input)
                    .font(.system(size: 11, design: .monospaced))
                    .foregroundStyle(theme.colors.textTertiary)
                    .lineLimit(10)
                    .padding(8)
            }
        } label: {
            HStack(spacing: 6) {
                // Tool icon
                toolIcon(for: message.toolName ?? "")
                    .font(.system(size: 11))
                    .foregroundStyle(theme.colors.textTertiary)

                Text(message.toolName ?? "Tool")
                    .font(.system(size: 11, weight: .medium))
                    .foregroundStyle(theme.colors.textSecondary)

                Spacer()

                // Status indicator
                if isRunning {
                    ProgressView()
                        .controlSize(.mini)
                } else {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 10))
                        .foregroundStyle(theme.colors.statusComplete)
                }
            }
        }
        .padding(8)
        .background(
            isRunning
                ? theme.colors.accent.opacity(0.05)
                : theme.colors.toolBg
        )
        .clipShape(RoundedRectangle(cornerRadius: 10))
        .overlay(
            RoundedRectangle(cornerRadius: 10)
                .stroke(isRunning ? theme.colors.toolRunningBorder : theme.colors.toolBorder, lineWidth: 0.5)
        )
    }

    // MARK: - System Message

    private var systemMessage: some View {
        HStack {
            Image(systemName: message.content.hasPrefix("Error") ? "exclamationmark.triangle" : "info.circle")
                .font(.system(size: 11))
                .foregroundStyle(message.content.hasPrefix("Error") ? theme.colors.statusError : theme.colors.textTertiary)

            Text(message.content)
                .font(.system(size: 11))
                .foregroundStyle(theme.colors.textTertiary)
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 6)
    }

    // MARK: - Tool Icons

    private func toolIcon(for toolName: String) -> Image {
        switch toolName.lowercased() {
        case "read", "glob", "grep":
            return Image(systemName: "doc.text")
        case "edit", "write", "multiedit":
            return Image(systemName: "pencil")
        case "bash":
            return Image(systemName: "terminal")
        case "websearch":
            return Image(systemName: "globe")
        case "webfetch":
            return Image(systemName: "arrow.down.doc")
        case "agent":
            return Image(systemName: "person.2")
        default:
            return Image(systemName: "wrench")
        }
    }
}

// MARK: - Permission Card Placeholder

private struct PermissionCardPlaceholder: View {
    @Environment(AppState.self) private var appState
    let request: PermissionRequest

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: "lock.shield")
                    .foregroundStyle(.orange)
                Text("Permission: \(request.toolName)")
                    .font(.system(size: 12, weight: .semibold))
            }

            if let desc = request.toolDescription {
                Text(desc)
                    .font(.system(size: 11))
                    .foregroundStyle(.secondary)
            }

            HStack(spacing: 8) {
                ForEach(request.options, id: \.id) { option in
                    Button(option.label) {
                        appState.respondPermission(
                            tabId: appState.activeTabId,
                            questionId: request.questionId,
                            optionId: option.id
                        )
                    }
                    .buttonStyle(.bordered)
                    .controlSize(.small)
                    .tint(option.kind == "deny" ? .red : .green)
                }
            }
        }
        .padding(12)
        .background(.orange.opacity(0.06))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(.orange.opacity(0.3), lineWidth: 0.5)
        )
    }
}
