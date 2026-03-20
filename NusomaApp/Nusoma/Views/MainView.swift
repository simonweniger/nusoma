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

    var body: some View {
        VStack(spacing: 0) {
            Spacer(minLength: 0)

            // Content column, centered
            VStack(spacing: 0) {
                // Marketplace panel (above chat shell)
                if appState.marketplaceOpen {
                    MarketplacePlaceholder()
                        .frame(maxWidth: 720)
                        .transition(.asymmetric(
                            insertion: .opacity.combined(with: .move(edge: .bottom)).combined(with: .scale(scale: 0.98)),
                            removal: .opacity.combined(with: .move(edge: .bottom)).combined(with: .scale(scale: 0.985))
                        ))
                        .padding(.bottom, 14)
                }

                // PM panel (above chat shell)
                if appState.pmOpen {
                    PMPlaceholder()
                        .frame(maxWidth: 720)
                        .transition(.asymmetric(
                            insertion: .opacity.combined(with: .move(edge: .bottom)).combined(with: .scale(scale: 0.98)),
                            removal: .opacity.combined(with: .move(edge: .bottom)).combined(with: .scale(scale: 0.985))
                        ))
                        .padding(.bottom, 14)
                }

                // Session history panel
                if appState.historyOpen {
                    SessionHistoryView()
                        .frame(maxWidth: 720, maxHeight: 400)
                        .glassEffect(.regular)
                        .clipShape(RoundedRectangle(cornerRadius: 16))
                        .transition(.asymmetric(
                            insertion: .opacity.combined(with: .move(edge: .bottom)).combined(with: .scale(scale: 0.98)),
                            removal: .opacity.combined(with: .move(edge: .bottom)).combined(with: .scale(scale: 0.985))
                        ))
                        .padding(.bottom, 14)
                }

                // Settings panel
                if appState.settingsOpen {
                    SettingsView()
                        .frame(maxWidth: 720, maxHeight: 420)
                        .glassEffect(.regular)
                        .clipShape(RoundedRectangle(cornerRadius: 16))
                        .transition(.asymmetric(
                            insertion: .opacity.combined(with: .move(edge: .bottom)).combined(with: .scale(scale: 0.98)),
                            removal: .opacity.combined(with: .move(edge: .bottom)).combined(with: .scale(scale: 0.985))
                        ))
                        .padding(.bottom, 14)
                }

                // Chat shell (tabs + conversation)
                chatShell
                    .padding(.bottom, appState.isExpanded ? 10 : -14)

                // Input row with action buttons
                inputRow
                    .padding(.bottom, 10)
            }
            .frame(width: theme.expandedUI ? Spacing.expandedContentWidth : Spacing.contentWidth)
            .animation(NusomaAnimation.standard, value: appState.isExpanded)
            .animation(NusomaAnimation.standard, value: appState.marketplaceOpen)
            .animation(NusomaAnimation.standard, value: appState.pmOpen)
            .animation(NusomaAnimation.standard, value: appState.historyOpen)
            .animation(NusomaAnimation.standard, value: appState.settingsOpen)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color.clear)
        .background(
            GeometryReader { geo in
                Color.clear.preference(key: ContentHeightKey.self, value: geo.size.height)
            }
        )
        .onPreferenceChange(ContentHeightKey.self) { height in
            contentHeight = height
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

    // MARK: - Chat Shell

    private var chatShell: some View {
        let isExpanded = appState.isExpanded
        let cardWidth: CGFloat = isExpanded
            ? (theme.expandedUI ? 700 : 460)
            : (theme.expandedUI ? 670 : 430)

        return VStack(spacing: 0) {
            // Tab strip
            TabStripView()

            // Conversation body — collapses to zero height when not expanded
            if isExpanded {
                VStack(spacing: 0) {
                    // Resize handle (top of conversation)
                    ResizeHandle(height: $conversationHeight, isDragging: $isDraggingResize)

                    ConversationView()
                        .frame(height: conversationHeight)

                    StatusBarView()
                }
                .transition(.opacity.combined(with: .scale(scale: 0.98, anchor: .bottom)))
            }
        }
        .frame(width: cardWidth)
        .glassEffect(.regular.interactive)
        .clipShape(RoundedRectangle(cornerRadius: Spacing.containerRadius))
        .animation(NusomaAnimation.standard, value: isExpanded)
    }

    // MARK: - Input Row

    private var inputRow: some View {
        HStack(spacing: 12) {
            // Action buttons
            actionButtons

            // Input pill
            InputBarView()
                .glassEffect(.regular.interactive)
                .clipShape(Capsule())
        }
        .frame(minHeight: 50)
    }

    // MARK: - Action Buttons

    private var actionButtons: some View {
        HStack(spacing: 8) {
            // Attach file
            Button {
                openFilePicker()
            } label: {
                Image(systemName: "paperclip")
                    .font(.system(size: 15))
            }
            .buttonStyle(GlassCircleButtonStyle())
            .disabled(appState.isRunning)

            // Screenshot
            Button {
                captureScreenshot()
            } label: {
                Image(systemName: "camera")
                    .font(.system(size: 15))
            }
            .buttonStyle(GlassCircleButtonStyle())
            .disabled(appState.isRunning)

            // Skills & Plugins
            Button {
                appState.toggleMarketplace()
            } label: {
                Image(systemName: "cpu")
                    .font(.system(size: 15))
            }
            .buttonStyle(GlassCircleButtonStyle())
            .disabled(appState.isRunning)
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
            .glassEffect(.regular.interactive)
            .clipShape(Circle())
            .opacity(isEnabled ? (configuration.isPressed ? 0.7 : 1.0) : 0.4)
            .scaleEffect(configuration.isPressed ? 0.92 : 1.0)
            .animation(NusomaAnimation.quick, value: configuration.isPressed)
    }
}

// MARK: - Placeholders (to be replaced in later phases)

struct MarketplacePlaceholder: View {
    @Environment(AppState.self) private var appState

    var body: some View {
        VStack(spacing: 16) {
            HStack {
                Text("Skills & Plugins")
                    .font(.headline)
                Spacer()
                Button("Close") { appState.marketplaceOpen = false }
                    .buttonStyle(.plain)
            }
            Text("Marketplace coming in Phase 6")
                .foregroundStyle(.secondary)
        }
        .padding(20)
        .glassEffect(.regular)
        .clipShape(RoundedRectangle(cornerRadius: 24))
    }
}

struct PMPlaceholder: View {
    @Environment(AppState.self) private var appState

    var body: some View {
        VStack(spacing: 16) {
            HStack {
                Text("Project Management")
                    .font(.headline)
                Spacer()
                Button("Close") { appState.pmOpen = false }
                    .buttonStyle(.plain)
            }
            Text("PM panel coming in Phase 5")
                .foregroundStyle(.secondary)
        }
        .padding(20)
        .glassEffect(.regular)
        .clipShape(RoundedRectangle(cornerRadius: 24))
    }
}

// MARK: - Preference Key

struct ContentHeightKey: PreferenceKey {
    static var defaultValue: CGFloat = 160
    static func reduce(value: inout CGFloat, nextValue: () -> CGFloat) {
        value = max(value, nextValue())
    }
}
