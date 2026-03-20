// InputBarView.swift — Text input with send/stop/mic buttons
// Ported from src/renderer/components/InputBar.tsx
//
// Renders inside a glass pill provided by MainView.
// Features: auto-expanding textarea, send/stop button, mic button (placeholder),
// attachment chips, slash command menu (placeholder).

import SwiftUI

struct InputBarView: View {
    @Environment(AppState.self) private var appState
    @Environment(ThemeManager.self) private var theme

    @State private var input: String = ""
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
                    .onSubmit {
                        if !NSEvent.modifierFlags.contains(.shift) {
                            sendMessage()
                        }
                    }
                    .onKeyPress(.return) {
                        if NSEvent.modifierFlags.contains(.shift) {
                            return .ignored // Allow newline
                        }
                        sendMessage()
                        return .handled
                    }
                    .padding(.vertical, 8)

                // Right-side buttons
                HStack(spacing: 4) {
                    // Mic button (placeholder for Phase 4)
                    Button {
                        // TODO: Voice recording
                    } label: {
                        Image(systemName: "mic")
                            .font(.system(size: 14))
                            .foregroundStyle(theme.colors.textTertiary)
                    }
                    .buttonStyle(.plain)
                    .frame(width: 32, height: 32)
                    .disabled(isBusy)

                    // Send / Stop button
                    if isBusy {
                        // Stop button
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
                        // Send button
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
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 6)
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
    }
}

// MARK: - Attachment Chips

struct AttachmentChipsView: View {
    @Environment(AppState.self) private var appState
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
}
