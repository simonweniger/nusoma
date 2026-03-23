// PanelController.swift — NSPanel subclass for floating overlay window
// Ported from src/main/index.ts window creation + management
//
// Replicates the Electron behavior:
// - Frameless, transparent NSPanel (non-activating)
// - Always on top, visible on all Spaces (including full-screen)
// - Accessory app (no Dock icon)
// - Anchored to bottom-center of current display
// - Dynamic height adjustment with bottom-edge anchoring

import AppKit
import SwiftUI

// MARK: - NusomaPanel

/// Custom NSPanel that:
/// - Stays floating above all windows (like Spotlight)
/// - Doesn't steal activation from the frontmost app
/// - Joins all Spaces including full-screen
/// - Has transparent background for glass effects
class NusomaPanel: NSPanel {
    static let barWidth: CGFloat = 1040
    static let pillHeight: CGFloat = 160
    static let bottomMargin: CGFloat = 24

    init<Content: View>(content: Content) {
        // Calculate initial position: bottom-center of current display
        let screen = NSScreen.main ?? NSScreen.screens.first!
        let screenFrame = screen.visibleFrame
        let x = screenFrame.origin.x + (screenFrame.width - Self.barWidth) / 2
        let y = screenFrame.origin.y + Self.bottomMargin

        let rect = NSRect(x: x, y: y, width: Self.barWidth, height: Self.pillHeight)

        super.init(
            contentRect: rect,
            styleMask: [.nonactivatingPanel, .borderless, .fullSizeContentView],
            backing: .buffered,
            defer: false
        )

        // Panel configuration — mirrors Electron BrowserWindow settings
        self.isFloatingPanel = true
        self.level = .statusBar
        self.collectionBehavior = [
            .canJoinAllSpaces,       // Visible on all Spaces
            .fullScreenAuxiliary,    // Visible over full-screen apps
            .transient,              // Don't show in Mission Control
        ]
        self.isOpaque = false
        self.backgroundColor = .clear
        self.hasShadow = false
        self.isMovableByWindowBackground = false
        self.titlebarAppearsTransparent = true
        self.titleVisibility = .hidden

        // Host SwiftUI content
        let hostingView = NSHostingView(rootView: content)
        hostingView.translatesAutoresizingMaskIntoConstraints = false
        self.contentView = hostingView
    }

    // Allow the panel to become key (for keyboard input) without activating the app
    override var canBecomeKey: Bool { true }
    override var canBecomeMain: Bool { false }

    // MARK: - Positioning

    /// Reposition to bottom-center of the display containing the mouse cursor.
    /// Anchors the bottom edge so the pill stays pinned to the bottom.
    func positionOnCurrentDisplay() {
        let mouseLocation = NSEvent.mouseLocation
        guard let screen = NSScreen.screens.first(where: { NSMouseInRect(mouseLocation, $0.frame, false) })
                ?? NSScreen.main else { return }

        let visibleFrame = screen.visibleFrame
        let x = visibleFrame.origin.x + (visibleFrame.width - Self.barWidth) / 2
        let y = visibleFrame.origin.y + Self.bottomMargin

        setFrame(NSRect(x: x, y: y, width: Self.barWidth, height: frame.height), display: true)
    }

    /// Update height while keeping the bottom edge anchored.
    /// Called by SwiftUI GeometryReader when content size changes.
    func updateHeight(_ newHeight: CGFloat) {
        let mouseLocation = NSEvent.mouseLocation
        let screen = NSScreen.screens.first(where: { NSMouseInRect(mouseLocation, $0.frame, false) })
            ?? NSScreen.main ?? NSScreen.screens.first!

        let maxHeight = screen.visibleFrame.height - 20
        let safeHeight = max(120, min(newHeight, maxHeight))

        // Anchor bottom edge: adjust origin.y so bottom stays at the same position
        let bottomY = frame.origin.y
        let newY = bottomY  // Bottom stays fixed since NSWindow origin is bottom-left
        let newX = frame.origin.x

        setFrame(NSRect(x: newX, y: newY, width: frame.width, height: safeHeight), display: true, animate: false)
    }
}

// MARK: - PanelManager

/// Manages the lifecycle of the NusomaPanel:
/// - Show/hide/toggle
/// - Click-through for transparent regions
/// - Window dragging
@MainActor @Observable
class PanelManager {
    private(set) var panel: NusomaPanel?
    private(set) var isVisible: Bool = false

    func createPanel<Content: View>(content: Content) {
        let nusomaPanel = NusomaPanel(content: content)
        self.panel = nusomaPanel
    }

	 func show() {
        guard let panel else { return }
        panel.positionOnCurrentDisplay()

        // Re-assert all-spaces membership (can be lost after hide/show cycles)
        panel.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary, .transient]

        panel.orderFrontRegardless()
        panel.makeKey()
        isVisible = true
    }

	func hide() {
        panel?.orderOut(nil)
        isVisible = false
    }

	func toggle() {
        if isVisible {
            hide()
        } else {
            show()
        }
    }

	func updateHeight(_ height: CGFloat) {
        panel?.updateHeight(height)
    }
}
