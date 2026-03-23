// MainView.swift — Root view: tab strip + conversation + input pill
// Phase 4 — adds session history panel, settings panel, voice input
//
// Uses macOS 26 Liquid Glass design language throughout.
// Layout: vertical stack anchored to bottom of transparent panel.

import SwiftUI
import UniformTypeIdentifiers

struct MainView: View {
    @Environment(AppState.self) private var appState
    @Environment(ThemeManager.self) private var theme

    @State private var contentHeight: CGFloat = 160
    @State private var conversationHeight: CGFloat = 400
    @State private var isDraggingResize: Bool = false
    @State private var isDropTargeted: Bool = false
    @State private var buttonsVisible: Bool = false

    private var anyPanelOpen: Bool {
        appState.marketplaceOpen || appState.pmOpen || appState.historyOpen || appState.settingsOpen
    }

    private var cardWidth: CGFloat {
        let isExpanded = appState.isExpanded
        return isExpanded
            ? (theme.expandedUI ? 700 : 460)
            : (theme.expandedUI ? 670 : 430)
    }

    /// Total width of melting buttons row (4 buttons × circleSize + 3 gaps × spacing)
    private var meltingButtonsWidth: CGFloat {
        4 * Spacing.circleSize + 3 * 8
    }

    var body: some View {
        VStack(spacing: 0) {
            Spacer(minLength: 0)

            HStack(alignment: .bottom, spacing: 10) {
                unifiedCard
                meltingActionButtons
                    .padding(.bottom, 8)
            }
            .padding(.bottom, 10)
            .background(
                GeometryReader { geo in
                    Color.clear.preference(key: ContentHeightKey.self, value: geo.size.height)
                }
            )
            .animation(NusomaAnimation.standard, value: appState.isExpanded)
            .animation(NusomaAnimation.standard, value: appState.marketplaceOpen)
            .animation(NusomaAnimation.standard, value: appState.pmOpen)
            .animation(NusomaAnimation.standard, value: appState.historyOpen)
            .animation(NusomaAnimation.standard, value: appState.settingsOpen)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color.clear)
        .onPreferenceChange(ContentHeightKey.self) { height in
            contentHeight = height
            // Drive window height from content
            if let window = NSApp.windows.first(where: { $0 is NusomaPanel }) as? NusomaPanel {
                window.updateHeight(height + 30) // 30 = bottom padding + margin
            }
        }
        // Drag-and-drop overlay for files
        .onDrop(of: [.fileURL, .image], isTargeted: $isDropTargeted) { providers in
            handleDrop(providers)
            return true
        }
        .overlay {
            if isDropTargeted {
                dropOverlay
            }
        }
    }

    // MARK: - Unified Card (Spotlight-style, reversed)

    private var unifiedCard: some View {
        VStack(spacing: 0) {
            // Panels (expand upward above conversation)
            if appState.marketplaceOpen {
                MarketplaceView()
                    .transition(.opacity.combined(with: .move(edge: .top)))
            }

            if appState.pmOpen {
                PMPanelView()
                    .transition(.opacity.combined(with: .move(edge: .top)))
            }

            if appState.historyOpen {
                SessionHistoryView()
                    .frame(maxHeight: 400)
                    .transition(.opacity.combined(with: .move(edge: .top)))
            }

            if appState.settingsOpen {
                SettingsView()
                    .frame(maxHeight: 420)
                    .transition(.opacity.combined(with: .move(edge: .top)))
            }

            // Conversation (when expanded)
            if appState.isExpanded {
                ResizeHandle(height: $conversationHeight, isDragging: $isDraggingResize)

                ConversationView()
                    .frame(height: conversationHeight)

                StatusBarView()
            }

            // Divider between content and bottom controls
            if appState.isExpanded || anyPanelOpen {
                Divider().opacity(0.3)
            }

            // Tab strip
            TabStripView()

            // Input bar (always visible, at bottom of card)
            InputBarView()
                .padding(.horizontal, 4)
                .padding(.bottom, 4)
        }
        .frame(width: cardWidth)
        .clipShape(RoundedRectangle(cornerRadius: Spacing.containerRadius))
        .glassEffect(.regular.interactive(), in: RoundedRectangle(cornerRadius: Spacing.containerRadius))
        .animation(NusomaAnimation.standard, value: appState.isExpanded)
        .onAppear {
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                buttonsVisible = true
            }
        }
    }

    // MARK: - Melting Action Buttons

    private var meltingActionButtons: some View {
        let buttons: [(icon: String, action: () -> Void)] = [
            ("paperclip", { openFilePicker() }),
            ("camera", { captureScreenshot() }),
            ("list.bullet.rectangle", { appState.togglePM() }),
            ("cpu", { appState.toggleMarketplace() }),
        ]

        return HStack(spacing: 8) {
            ForEach(Array(buttons.enumerated()), id: \.offset) { index, def in
                Button {
                    def.action()
                } label: {
                    Image(systemName: def.icon)
                        .font(.system(size: 15))
                }
                .buttonStyle(GlassCircleButtonStyle())
                .disabled(appState.isRunning)
                .opacity(buttonsVisible ? 1 : 0)
                .scaleEffect(buttonsVisible ? 1 : 0.6)
                // Each button slides further out — first button barely moves, last one travels most
                .offset(x: buttonsVisible ? 0 : -(CGFloat(index + 1) * 15))
                .animation(
                    .spring(response: 0.5, dampingFraction: 0.7)
                    .delay(0.15 + Double(index) * 0.08),
                    value: buttonsVisible
                )
            }
        }
    }

    // MARK: - File Picker

    private func openFilePicker() {
        let panel = NSOpenPanel()
        panel.canChooseFiles = true
        panel.canChooseDirectories = false
        panel.allowsMultipleSelection = true
        panel.allowedContentTypes = [
            .image, .text, .sourceCode, .json, .yaml,
            .plainText, .pdf, .html, .xml,
        ]

        guard panel.runModal() == .OK else { return }

        let attachments = panel.urls.compactMap { url -> Attachment? in
            let name = url.lastPathComponent
            let ext = url.pathExtension.lowercased()
            let isImage = ["png", "jpg", "jpeg", "gif", "webp", "svg", "heic"].contains(ext)

            return Attachment(
                type: isImage ? .image : .file,
                name: name,
                path: url.path,
                mimeType: isImage ? "image/\(ext)" : nil,
                size: (try? FileManager.default.attributesOfItem(atPath: url.path)[.size] as? Int)
            )
        }

        appState.addAttachments(attachments)
    }

    // MARK: - Screenshot

    private func captureScreenshot() {
        // Use screencapture CLI for interactive selection
        let tempPath = NSTemporaryDirectory() + "nusoma-screenshot-\(UUID().uuidString).png"

        let process = Process()
        process.executableURL = URL(fileURLWithPath: "/usr/sbin/screencapture")
        process.arguments = ["-i", "-s", tempPath] // Interactive selection

        do {
            try process.run()
            process.waitUntilExit()

            if FileManager.default.fileExists(atPath: tempPath) {
                let attachment = Attachment(
                    type: .image,
                    name: "screenshot.png",
                    path: tempPath,
                    mimeType: "image/png"
                )
                appState.addAttachments([attachment])
            }
        } catch {
            // silently ignore — user cancelled
        }
    }

    // MARK: - Drag & Drop

    private func handleDrop(_ providers: [NSItemProvider]) {
        for provider in providers {
            provider.loadItem(forTypeIdentifier: UTType.fileURL.identifier, options: nil) { data, _ in
                guard let data = data as? Data,
                      let url = URL(dataRepresentation: data, relativeTo: nil) else { return }

                let name = url.lastPathComponent
                let ext = url.pathExtension.lowercased()
                let isImage = ["png", "jpg", "jpeg", "gif", "webp", "svg", "heic"].contains(ext)

                let attachment = Attachment(
                    type: isImage ? .image : .file,
                    name: name,
                    path: url.path,
                    mimeType: isImage ? "image/\(ext)" : nil
                )

                DispatchQueue.main.async {
                    appState.addAttachments([attachment])
                }
            }
        }
    }

    private var dropOverlay: some View {
        RoundedRectangle(cornerRadius: Spacing.containerRadius)
            .fill(.ultraThinMaterial)
            .overlay {
                VStack(spacing: 8) {
                    Image(systemName: "arrow.down.doc")
                        .font(.system(size: 28))
                    Text("Drop files to attach")
                        .font(.system(size: 13, weight: .medium))
                }
                .foregroundStyle(.secondary)
            }
            .overlay(
                RoundedRectangle(cornerRadius: Spacing.containerRadius)
                    .stroke(style: StrokeStyle(lineWidth: 2, dash: [8, 4]))
                    .foregroundStyle(.secondary.opacity(0.5))
            )
            .padding(4)
            .transition(.opacity)
    }
}

// MARK: - Resize Handle

struct ResizeHandle: View {
    @Binding var height: CGFloat
    @Binding var isDragging: Bool

    @State private var isHovering = false

    var body: some View {
        Rectangle()
            .fill(Color.clear)
            .frame(height: 8)
            .contentShape(Rectangle())
            .overlay {
                Capsule()
                    .fill(.secondary.opacity(isHovering || isDragging ? 0.4 : 0.15))
                    .frame(width: 36, height: 4)
            }
            .onHover { hovering in
                isHovering = hovering
                if hovering {
                    NSCursor.resizeUpDown.push()
                } else {
                    NSCursor.pop()
                }
            }
            .gesture(
                DragGesture()
                    .onChanged { value in
                        isDragging = true
                        // Dragging up increases height (y is inverted in screen coords)
                        let delta = -value.translation.height
                        let newHeight = height + delta
                        height = max(200, min(newHeight, 700))
                    }
                    .onEnded { _ in
                        isDragging = false
                    }
            )
    }
}

// MARK: - Glass Circle Button Style

struct GlassCircleButtonStyle: ButtonStyle {
    @Environment(\.isEnabled) private var isEnabled

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .frame(width: Spacing.circleSize, height: Spacing.circleSize)
            .clipShape(Circle())
            .glassEffect(.regular.interactive(), in: Circle())
            .opacity(isEnabled ? (configuration.isPressed ? 0.7 : 1.0) : 0.4)
            .scaleEffect(configuration.isPressed ? 0.92 : 1.0)
            .animation(NusomaAnimation.quick, value: configuration.isPressed)
    }
}

// MARK: - Preference Key

struct ContentHeightKey: PreferenceKey {
    nonisolated(unsafe) static var defaultValue: CGFloat = 160
    static func reduce(value: inout CGFloat, nextValue: () -> CGFloat) {
        value = max(value, nextValue())
    }
}
