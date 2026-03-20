// ConversationView.swift — Rich conversation timeline with message grouping
// Phase 2 rewrite — replaces Phase 1 basic rendering.
//
// Features:
// - User bubbles (right-aligned, glass)
// - Assistant markdown (full MarkdownRenderer with code blocks, tables, etc.)
// - Tool call cards (expandable, with input/output, file path context)
// - System messages (errors, rate limits, session status)
// - Permission request cards
// - Message grouping: consecutive tool calls collapse into a "tools" section
// - Auto-scroll to bottom with smart stick-to-bottom behavior
// - Animated entrance for new messages

import SwiftUI

struct ConversationView: View {
    @Environment(AppState.self) private var appState
    @Environment(ThemeManager.self) private var theme

    @State private var stickToBottom = true

    var body: some View {
        let messages = appState.activeTab?.messages ?? []
        let groups = MessageGrouper.group(messages)

        ScrollViewReader { proxy in
            ScrollView(.vertical, showsIndicators: true) {
                LazyVStack(alignment: .leading, spacing: 10) {
                    // Empty state
                    if messages.isEmpty {
                        emptyState
                    }

                    ForEach(Array(groups.enumerated()), id: \.element.id) { _, group in
                        MessageGroupView(group: group)
                            .transition(.opacity.combined(with: .offset(y: 8)))
                    }

                    // Permission cards
                    if let tab = appState.activeTab {
                        ForEach(tab.permissionQueue) { request in
                            PermissionCard(request: request)
                                .transition(.opacity.combined(with: .scale(scale: 0.96)))
                        }
                    }

                    // Scroll anchor
                    Color.clear
                        .frame(height: 1)
                        .id("bottom")
                }
                .padding(.horizontal, 14)
                .padding(.vertical, 10)
            }
            .onChange(of: messages.count) { _, _ in
                if stickToBottom {
                    withAnimation(NusomaAnimation.quick) {
                        proxy.scrollTo("bottom", anchor: .bottom)
                    }
                }
            }
            .onChange(of: messages.last?.content) { _, _ in
                // Also scroll when content of last message changes (streaming)
                if stickToBottom {
                    proxy.scrollTo("bottom", anchor: .bottom)
                }
            }
        }
    }

    // MARK: - Empty State

    private var emptyState: some View {
        VStack(spacing: 12) {
            Image(systemName: "bubble.left.and.text.bubble.right")
                .font(.system(size: 28))
                .foregroundStyle(theme.colors.textMuted)

            Text("Start a conversation")
                .font(.system(size: 13, weight: .medium))
                .foregroundStyle(theme.colors.textTertiary)

            if let tab = appState.activeTab, !tab.hasChosenDirectory {
                Text("Set a working directory first, or just start typing")
                    .font(.system(size: 11))
                    .foregroundStyle(theme.colors.textMuted)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 40)
    }
}

// MARK: - Message Grouping

/// Groups consecutive messages for visual coherence:
/// - Consecutive tool calls become a single "tool group"
/// - Everything else is its own group
struct MessageGrouper {
    enum MessageGroup: Identifiable {
        case single(ChatMessage)
        case toolGroup([ChatMessage])

        var id: String {
            switch self {
            case .single(let msg): return msg.id
            case .toolGroup(let msgs): return "tg-\(msgs.first?.id ?? "")"
            }
        }
    }

    static func group(_ messages: [ChatMessage]) -> [MessageGroup] {
        var groups: [MessageGroup] = []
        var toolBuffer: [ChatMessage] = []

        for msg in messages {
            if msg.role == .tool {
                toolBuffer.append(msg)
            } else {
                // Flush tool buffer
                if !toolBuffer.isEmpty {
                    groups.append(.toolGroup(toolBuffer))
                    toolBuffer = []
                }
                groups.append(.single(msg))
            }
        }
        // Flush remaining
        if !toolBuffer.isEmpty {
            groups.append(.toolGroup(toolBuffer))
        }

        return groups
    }
}

// MARK: - Message Group View

private struct MessageGroupView: View {
    @Environment(ThemeManager.self) private var theme
    let group: MessageGrouper.MessageGroup

    var body: some View {
        switch group {
        case .single(let message):
            SingleMessageView(message: message)

        case .toolGroup(let tools):
            ToolGroupView(tools: tools)
        }
    }
}

// MARK: - Single Message View

private struct SingleMessageView: View {
    @Environment(ThemeManager.self) private var theme
    let message: ChatMessage

    var body: some View {
        switch message.role {
        case .user:
            UserBubble(content: message.content)
        case .assistant:
            AssistantBubble(content: message.content)
        case .system:
            SystemMessage(content: message.content)
        case .tool:
            ToolCard(message: message)
        }
    }
}

// MARK: - User Bubble

private struct UserBubble: View {
    @Environment(ThemeManager.self) private var theme
    let content: String

    var body: some View {
        HStack {
            Spacer(minLength: 60)
            Text(content)
                .font(.system(size: 13))
                .foregroundStyle(theme.colors.userBubbleText)
                .textSelection(.enabled)
                .padding(.horizontal, 14)
                .padding(.vertical, 9)
                .background(theme.colors.userBubble)
                .clipShape(RoundedRectangle(cornerRadius: 16))
                .overlay(
                    RoundedRectangle(cornerRadius: 16)
                        .stroke(theme.colors.userBubbleBorder, lineWidth: 0.5)
                )
        }
    }
}

// MARK: - Assistant Bubble (Rich Markdown)

private struct AssistantBubble: View {
    @Environment(ThemeManager.self) private var theme
    let content: String

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            MarkdownContent(source: content)
                .foregroundStyle(theme.colors.textPrimary)
        }
        .padding(.horizontal, 4)
        .padding(.vertical, 4)
    }
}

// MARK: - Tool Group View (collapsed consecutive tools)

private struct ToolGroupView: View {
    @Environment(ThemeManager.self) private var theme
    let tools: [ChatMessage]

    @State private var isExpanded = false

    private var allCompleted: Bool {
        tools.allSatisfy { $0.toolStatus == .completed || $0.toolStatus == .error }
    }

    private var hasRunning: Bool {
        tools.contains { $0.toolStatus == .running }
    }

    private var summary: String {
        let names = Array(Set(tools.compactMap(\.toolName)))
        if names.count == 1 {
            return "\(tools.count) \(names[0]) calls"
        }
        return "\(tools.count) tool calls (\(names.prefix(3).joined(separator: ", "))\(names.count > 3 ? "..." : ""))"
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Header (always visible)
            Button {
                withAnimation(NusomaAnimation.quick) {
                    isExpanded.toggle()
                }
            } label: {
                HStack(spacing: 6) {
                    Image(systemName: isExpanded ? "chevron.down" : "chevron.right")
                        .font(.system(size: 9))
                        .foregroundStyle(theme.colors.textTertiary)
                        .frame(width: 12)

                    // Tool icons (stacked/overlapping)
                    toolIconStack

                    Text(summary)
                        .font(.system(size: 11, weight: .medium))
                        .foregroundStyle(theme.colors.textSecondary)

                    Spacer()

                    // Status
                    if hasRunning {
                        ProgressView()
                            .controlSize(.mini)
                    } else if allCompleted {
                        Image(systemName: "checkmark.circle.fill")
                            .font(.system(size: 11))
                            .foregroundStyle(theme.colors.statusComplete)
                    }
                }
                .padding(.horizontal, 10)
                .padding(.vertical, 7)
            }
            .buttonStyle(.plain)

            // Expanded: show individual cards
            if isExpanded {
                VStack(alignment: .leading, spacing: 4) {
                    ForEach(tools) { tool in
                        ToolCard(message: tool)
                    }
                }
                .padding(.horizontal, 8)
                .padding(.bottom, 8)
            }
        }
        .background(theme.colors.toolBg.opacity(0.5))
        .clipShape(RoundedRectangle(cornerRadius: 10))
        .overlay(
            RoundedRectangle(cornerRadius: 10)
                .stroke(
                    hasRunning ? theme.colors.toolRunningBorder : theme.colors.toolBorder,
                    lineWidth: 0.5
                )
        )
        // Auto-expand if there's a running tool
        .onAppear {
            if hasRunning { isExpanded = true }
        }
        .onChange(of: hasRunning) { _, running in
            if running && !isExpanded { isExpanded = true }
        }
    }

    // Stacked icons for the tool group header
    private var toolIconStack: some View {
        let uniqueNames = Array(Set(tools.compactMap(\.toolName))).prefix(3)
        return HStack(spacing: -4) {
            ForEach(Array(uniqueNames.enumerated()), id: \.offset) { _, name in
                toolIcon(for: name)
                    .font(.system(size: 10))
                    .foregroundStyle(theme.colors.textTertiary)
                    .frame(width: 18, height: 18)
                    .background(theme.colors.toolBg)
                    .clipShape(Circle())
                    .overlay(Circle().stroke(theme.colors.toolBorder, lineWidth: 0.5))
            }
        }
    }
}

// MARK: - Individual Tool Card

private struct ToolCard: View {
    @Environment(ThemeManager.self) private var theme
    let message: ChatMessage

    @State private var showInput = false
    @State private var showOutput = false

    private var isRunning: Bool { message.toolStatus == .running }
    private var isError: Bool { message.toolStatus == .error }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Tool header
            HStack(spacing: 6) {
                toolIcon(for: message.toolName ?? "")
                    .font(.system(size: 11))
                    .foregroundStyle(isRunning ? theme.colors.accent : theme.colors.textTertiary)

                Text(message.toolName ?? "Tool")
                    .font(.system(size: 11, weight: .medium))
                    .foregroundStyle(theme.colors.textSecondary)

                // File path hint (extracted from input)
                if let path = extractFilePath(from: message.toolInput) {
                    Text(abbreviatePath(path))
                        .font(.system(size: 10, design: .monospaced))
                        .foregroundStyle(theme.colors.textMuted)
                        .lineLimit(1)
                }

                Spacer()

                // Toggle buttons
                if message.toolInput != nil && !(message.toolInput?.isEmpty ?? true) {
                    Button {
                        withAnimation(NusomaAnimation.quick) { showInput.toggle() }
                    } label: {
                        Text("Input")
                            .font(.system(size: 9, weight: .medium))
                            .foregroundStyle(showInput ? theme.colors.accent : theme.colors.textMuted)
                    }
                    .buttonStyle(.plain)
                }

                if message.toolOutput != nil && !(message.toolOutput?.isEmpty ?? true) {
                    Button {
                        withAnimation(NusomaAnimation.quick) { showOutput.toggle() }
                    } label: {
                        Text("Output")
                            .font(.system(size: 9, weight: .medium))
                            .foregroundStyle(showOutput ? theme.colors.accent : theme.colors.textMuted)
                    }
                    .buttonStyle(.plain)
                }

                // Status indicator
                if isRunning {
                    ProgressView()
                        .controlSize(.mini)
                } else if isError {
                    Image(systemName: "xmark.circle.fill")
                        .font(.system(size: 10))
                        .foregroundStyle(theme.colors.statusError)
                } else {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 10))
                        .foregroundStyle(theme.colors.statusComplete)
                }
            }
            .padding(.horizontal, 8)
            .padding(.vertical, 6)

            // Tool input (collapsible)
            if showInput, let input = message.toolInput, !input.isEmpty {
                Divider().opacity(0.3)
                ScrollView(.vertical, showsIndicators: true) {
                    Text(input)
                        .font(.system(size: 11, design: .monospaced))
                        .foregroundStyle(theme.colors.textTertiary)
                        .textSelection(.enabled)
                        .padding(8)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
                .frame(maxHeight: 120)
            }

            // Tool output (collapsible)
            if showOutput, let output = message.toolOutput, !output.isEmpty {
                Divider().opacity(0.3)
                ScrollView(.vertical, showsIndicators: true) {
                    Text(output)
                        .font(.system(size: 11, design: .monospaced))
                        .foregroundStyle(theme.colors.textTertiary)
                        .textSelection(.enabled)
                        .padding(8)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
                .frame(maxHeight: 120)
            }
        }
        .background(
            isRunning
                ? theme.colors.accent.opacity(0.04)
                : theme.colors.toolBg
        )
        .clipShape(RoundedRectangle(cornerRadius: 8))
        .overlay(
            RoundedRectangle(cornerRadius: 8)
                .stroke(
                    isRunning ? theme.colors.toolRunningBorder
                        : isError ? theme.colors.statusError.opacity(0.3)
                        : theme.colors.toolBorder,
                    lineWidth: 0.5
                )
        )
    }

    private func extractFilePath(from input: String?) -> String? {
        guard let input else { return nil }
        // Try to extract a file_path or path from JSON-like input
        if let range = input.range(of: #"(?:"file_path"|"path")\s*:\s*"([^"]+)""#, options: .regularExpression) {
            let match = input[range]
            if let pathRange = match.range(of: #""([^"]+)"$"#, options: .regularExpression) {
                var path = String(match[pathRange])
                path = path.trimmingCharacters(in: CharacterSet(charactersIn: "\""))
                return path
            }
        }
        return nil
    }

    private func abbreviatePath(_ path: String) -> String {
        let components = path.split(separator: "/")
        if components.count > 2 {
            return ".../" + components.suffix(2).joined(separator: "/")
        }
        return path
    }
}

// MARK: - System Message

private struct SystemMessage: View {
    @Environment(ThemeManager.self) private var theme
    let content: String

    private var isError: Bool { content.hasPrefix("Error") }
    private var isSessionEnd: Bool { content.contains("Session ended") }

    var body: some View {
        HStack(alignment: .top, spacing: 6) {
            Image(systemName: icon)
                .font(.system(size: 11))
                .foregroundStyle(iconColor)

            Text(content)
                .font(.system(size: 11))
                .foregroundStyle(textColor)
                .textSelection(.enabled)
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 7)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(bgColor)
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }

    private var icon: String {
        if isError { return "exclamationmark.triangle.fill" }
        if isSessionEnd { return "power" }
        return "info.circle"
    }

    private var iconColor: Color {
        if isError { return theme.colors.statusError }
        if isSessionEnd { return theme.colors.statusDead }
        return theme.colors.textTertiary
    }

    private var textColor: Color {
        if isError { return theme.colors.statusError }
        return theme.colors.textTertiary
    }

    private var bgColor: Color {
        if isError { return theme.colors.statusError.opacity(0.06) }
        return Color.clear
    }
}

// MARK: - Permission Card

private struct PermissionCard: View {
    @Environment(AppState.self) private var appState
    @Environment(ThemeManager.self) private var theme
    let request: PermissionRequest

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            // Header
            HStack(spacing: 6) {
                Image(systemName: "lock.shield.fill")
                    .font(.system(size: 14))
                    .foregroundStyle(.orange)

                VStack(alignment: .leading, spacing: 1) {
                    Text("Permission Required")
                        .font(.system(size: 12, weight: .semibold))
                    Text(request.toolName)
                        .font(.system(size: 11, design: .monospaced))
                        .foregroundStyle(theme.colors.textSecondary)
                }

                Spacer()
            }

            if let desc = request.toolDescription {
                Text(desc)
                    .font(.system(size: 11))
                    .foregroundStyle(theme.colors.textSecondary)
                    .lineLimit(3)
            }

            // Action buttons
            HStack(spacing: 8) {
                ForEach(request.options, id: \.id) { option in
                    Button {
                        withAnimation(NusomaAnimation.quick) {
                            appState.respondPermission(
                                tabId: appState.activeTabId,
                                questionId: request.questionId,
                                optionId: option.id
                            )
                        }
                    } label: {
                        Text(option.label)
                            .font(.system(size: 11, weight: .medium))
                            .padding(.horizontal, 12)
                            .padding(.vertical, 6)
                    }
                    .buttonStyle(.plain)
                    .background(
                        option.kind == "deny"
                            ? theme.colors.statusError.opacity(0.12)
                            : theme.colors.statusComplete.opacity(0.12)
                    )
                    .foregroundStyle(
                        option.kind == "deny"
                            ? theme.colors.statusError
                            : theme.colors.statusComplete
                    )
                    .clipShape(Capsule())
                }
                Spacer()
            }
        }
        .padding(14)
        .background(.orange.opacity(0.05))
        .clipShape(RoundedRectangle(cornerRadius: 14))
        .overlay(
            RoundedRectangle(cornerRadius: 14)
                .stroke(.orange.opacity(0.25), lineWidth: 0.5)
        )
    }
}

// MARK: - Shared Tool Icon Helper

func toolIcon(for toolName: String) -> Image {
    switch toolName.lowercased() {
    case "read":
        return Image(systemName: "doc.text")
    case "glob":
        return Image(systemName: "doc.text.magnifyingglass")
    case "grep":
        return Image(systemName: "text.magnifyingglass")
    case "edit", "multiedit":
        return Image(systemName: "pencil.line")
    case "write":
        return Image(systemName: "doc.badge.plus")
    case "bash":
        return Image(systemName: "terminal")
    case "websearch":
        return Image(systemName: "globe")
    case "webfetch":
        return Image(systemName: "arrow.down.doc")
    case "agent", "task":
        return Image(systemName: "person.2")
    case "todoread", "todowrite":
        return Image(systemName: "checklist")
    case "ls":
        return Image(systemName: "folder")
    case "notebook":
        return Image(systemName: "book")
    default:
        return Image(systemName: "wrench.and.screwdriver")
    }
}
