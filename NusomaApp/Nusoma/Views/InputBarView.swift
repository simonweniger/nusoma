// InputBarView.swift — Text input with send/stop/mic/model buttons
// Phase 2 — adds draft persistence, slash command trigger, model picker popover
//
// Renders inside a glass pill provided by MainView.

import SwiftUI

struct InputBarView: View {
    @Environment(AppState.self) private var appState
    @Environment(ThemeManager.self) private var theme

    @State private var input: String = ""
    @State private var showModelPicker: Bool = false
    @State private var showSlashMenu: Bool = false
    @FocusState private var isFocused: Bool

    private var tab: TabState? { appState.activeTab }
    private var isBusy: Bool { appState.isRunning }
    private var isConnecting: Bool { tab?.status == .connecting }
    private var hasContent: Bool { !input.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }
    private var canSend: Bool { tab != nil && !isConnecting && hasContent }

    var body: some View {
        VStack(spacing: 0) {
            // Attachment chips (above input when present)
            if let attachments = tab?.attachments, !attachments.isEmpty {
                AttachmentChipsView(attachments: attachments)
                    .padding(.horizontal, 8)
                    .padding(.top, 6)
            }

            // Input row
            HStack(alignment: .bottom, spacing: 8) {
                // Text input
                TextField("Message Claude...", text: $input, axis: .vertical)
                    .textFieldStyle(.plain)
                    .font(.system(size: 13))
                    .lineLimit(1...8)
                    .focused($isFocused)
                    .onKeyPress(.return) {
                        if NSEvent.modifierFlags.contains(.shift) {
                            return .ignored // Allow newline
                        }
                        sendMessage()
                        return .handled
                    }
                    .onChange(of: input) { _, newValue in
                        // Show slash menu when typing "/"
                        if newValue == "/" {
                            showSlashMenu = true
                        } else if showSlashMenu && !newValue.hasPrefix("/") {
                            showSlashMenu = false
                        }
                    }
                    .onChange(of: appState.activeTabId) { oldTab, newTab in
                        // Draft persistence: save draft when switching tabs
                        saveDraft(tabId: oldTab)
                        input = loadDraft(tabId: newTab)
                    }
                    .padding(.vertical, 8)

                // Right-side buttons
                HStack(spacing: 4) {
                    // Model picker
                    Button {
                        showModelPicker.toggle()
                    } label: {
                        let modelLabel = abbreviateModel(appState.preferredModel ?? tab?.sessionModel)
                        Text(modelLabel)
                            .font(.system(size: 9, weight: .medium, design: .monospaced))
                            .foregroundStyle(theme.colors.textTertiary)
                            .padding(.horizontal, 5)
                            .padding(.vertical, 2)
                            .background(theme.colors.textTertiary.opacity(0.08))
                            .clipShape(Capsule())
                    }
                    .buttonStyle(.plain)
                    .popover(isPresented: $showModelPicker, arrowEdge: .top) {
                        ModelPickerPopover(isPresented: $showModelPicker)
                    }
                    .disabled(isBusy)

                    // Mic button (Phase 4)
                    Button {
                        // TODO: Voice recording
                    } label: {
                        Image(systemName: "mic")
                            .font(.system(size: 14))
                            .foregroundStyle(theme.colors.textTertiary)
                    }
                    .buttonStyle(.plain)
                    .frame(width: 28, height: 28)
                    .disabled(isBusy)

                    // Send / Stop button
                    if isBusy {
                        Button {
                            if let tabId = tab?.id {
                                appState.controlPlane.cancelTab(tabId)
                            }
                        } label: {
                            Image(systemName: "stop.fill")
                                .font(.system(size: 12))
                                .foregroundStyle(.white)
                        }
                        .buttonStyle(.plain)
                        .frame(width: 32, height: 32)
                        .background(theme.colors.stopBg)
                        .clipShape(Circle())
                    } else {
                        Button {
                            sendMessage()
                        } label: {
                            Image(systemName: "arrow.up")
                                .font(.system(size: 14, weight: .semibold))
                                .foregroundStyle(.white)
                        }
                        .buttonStyle(.plain)
                        .frame(width: 32, height: 32)
                        .background(canSend ? theme.colors.sendBg : theme.colors.sendBg.opacity(0.3))
                        .clipShape(Circle())
                        .disabled(!canSend)
                    }
                }
                .padding(.trailing, 4)
                .padding(.bottom, 4)
            }
            .padding(.leading, 12)

            // Activity indicator
            if let activity = tab?.currentActivity, !activity.isEmpty {
                HStack(spacing: 4) {
                    if tab?.status == .running || tab?.status == .connecting {
                        ProgressView()
                            .controlSize(.mini)
                    }
                    Text(activity)
                        .font(.system(size: 10))
                        .foregroundStyle(theme.colors.textTertiary)
                    Spacer()

                    // Queued prompts count
                    if let queued = tab?.queuedPrompts.count, queued > 0 {
                        Text("\(queued) queued")
                            .font(.system(size: 9, design: .monospaced))
                            .foregroundStyle(theme.colors.accent)
                    }
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 6)
            }

            // Slash command menu
            if showSlashMenu {
                SlashCommandMenu(input: $input, isPresented: $showSlashMenu)
                    .padding(.horizontal, 8)
                    .padding(.bottom, 6)
                    .transition(.opacity.combined(with: .offset(y: 4)))
            }
        }
    }

    // MARK: - Send

    private func sendMessage() {
        let trimmed = input.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }

        // Expand UI on first message
        if !appState.isExpanded {
            appState.isExpanded = true
        }

        appState.sendMessage(trimmed)
        input = ""
        clearDraft(tabId: appState.activeTabId)
    }

    // MARK: - Draft Persistence

    private func saveDraft(tabId: String) {
        let trimmed = input.trimmingCharacters(in: .whitespacesAndNewlines)
        if trimmed.isEmpty {
            UserDefaults.standard.removeObject(forKey: "nusoma-draft-\(tabId)")
        } else {
            UserDefaults.standard.set(input, forKey: "nusoma-draft-\(tabId)")
        }
    }

    private func loadDraft(tabId: String) -> String {
        UserDefaults.standard.string(forKey: "nusoma-draft-\(tabId)") ?? ""
    }

    private func clearDraft(tabId: String) {
        UserDefaults.standard.removeObject(forKey: "nusoma-draft-\(tabId)")
    }

    // MARK: - Helpers

    private func abbreviateModel(_ model: String?) -> String {
        guard let model else { return "Sonnet" }
        if let known = availableModels.first(where: { $0.id == model }) {
            return known.label
        }
        return model.replacingOccurrences(of: "claude-", with: "")
    }
}

// MARK: - Model Picker Popover

struct ModelPickerPopover: View {
    @Environment(AppState.self) private var appState
    @Environment(ThemeManager.self) private var theme
    @Binding var isPresented: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text("Model")
                .font(.system(size: 10, weight: .semibold))
                .foregroundStyle(theme.colors.textTertiary)
                .padding(.horizontal, 8)
                .padding(.top, 6)

            ForEach(availableModels) { model in
                Button {
                    appState.setPreferredModel(model.id)
                    isPresented = false
                } label: {
                    HStack {
                        Text(model.label)
                            .font(.system(size: 12))
                        Spacer()
                        if appState.preferredModel == model.id {
                            Image(systemName: "checkmark")
                                .font(.system(size: 10, weight: .semibold))
                                .foregroundStyle(theme.colors.accent)
                        }
                    }
                    .padding(.horizontal, 8)
                    .padding(.vertical, 5)
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
            }
        }
        .padding(4)
        .frame(width: 160)
    }
}

// MARK: - Slash Command Menu

struct SlashCommandMenu: View {
    @Environment(ThemeManager.self) private var theme
    @Binding var input: String
    @Binding var isPresented: Bool

    private let commands = [
        ("clear", "Clear conversation"),
        ("compact", "Compact conversation into summary"),
        ("help", "Show available commands"),
        ("bug", "Report a bug to Claude"),
        ("review", "Review recent changes"),
        ("test", "Run project tests"),
    ]

    var body: some View {
        let query = String(input.dropFirst()).lowercased() // Drop the "/"
        let filtered = query.isEmpty
            ? commands
            : commands.filter { $0.0.hasPrefix(query) || $0.1.lowercased().contains(query) }

        VStack(alignment: .leading, spacing: 1) {
            ForEach(filtered, id: \.0) { cmd, desc in
                Button {
                    input = "/\(cmd) "
                    isPresented = false
                } label: {
                    HStack(spacing: 8) {
                        Text("/\(cmd)")
                            .font(.system(size: 11, weight: .medium, design: .monospaced))
                            .foregroundStyle(theme.colors.accent)
                        Text(desc)
                            .font(.system(size: 11))
                            .foregroundStyle(theme.colors.textTertiary)
                        Spacer()
                    }
                    .padding(.horizontal, 8)
                    .padding(.vertical, 5)
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
            }
        }
        .background(theme.colors.codeBg)
        .clipShape(RoundedRectangle(cornerRadius: 8))
        .overlay(
            RoundedRectangle(cornerRadius: 8)
                .stroke(theme.colors.containerBorder.opacity(0.5), lineWidth: 0.5)
        )
    }
}

// MARK: - Attachment Chips

struct AttachmentChipsView: View {
    @Environment(AppState.self) private var appState
    @Environment(ThemeManager.self) private var theme
    let attachments: [Attachment]

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 6) {
                ForEach(attachments) { attachment in
                    HStack(spacing: 4) {
                        Image(systemName: attachment.type == .image ? "photo" : "doc")
                            .font(.system(size: 10))
                        Text(attachment.name)
                            .font(.system(size: 10))
                            .lineLimit(1)

                        // File size
                        if let size = attachment.size {
                            Text(formatFileSize(size))
                                .font(.system(size: 9))
                                .foregroundStyle(theme.colors.textMuted)
                        }

                        Button {
                            appState.removeAttachment(attachment.id)
                        } label: {
                            Image(systemName: "xmark")
                                .font(.system(size: 8))
                        }
                        .buttonStyle(.plain)
                    }
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(.ultraThinMaterial)
                    .clipShape(Capsule())
                }
            }
        }
    }

    private func formatFileSize(_ bytes: Int) -> String {
        if bytes < 1024 { return "\(bytes) B" }
        if bytes < 1024 * 1024 { return "\(bytes / 1024) KB" }
        return String(format: "%.1f MB", Double(bytes) / (1024 * 1024))
    }
}
