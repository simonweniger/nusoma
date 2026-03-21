// TrayManager.swift — Menu bar status item
// Ported from src/main/index.ts tray creation

import AppKit

/// Manages the NSStatusItem (tray icon) in the macOS menu bar.
/// Provides quick access to show/hide Nusoma and quit the app.
class TrayManager {
    private var statusItem: NSStatusItem?
    private var toggleAction: (() -> Void)?

    func setup(toggle: @escaping () -> Void) {
        self.toggleAction = toggle

        let item = NSStatusBar.system.statusItem(withLength: NSStatusItem.squareLength)

        // Use template image for automatic dark/light mode adaptation
        if let button = item.button {
            if let image = NSImage(named: "trayTemplate") {
                image.isTemplate = true
                button.image = image
            } else {
                // Fallback: use SF Symbol
                button.image = NSImage(systemSymbolName: "message.circle.fill", accessibilityDescription: "Nusoma")
            }
            button.toolTip = "Nusoma — Claude Code UI"
        }

        // Context menu (shown on click since item.menu is set)
        let menu = NSMenu()
        menu.addItem(NSMenuItem(title: "Show Nusoma", action: #selector(showClicked(_:)), keyEquivalent: ""))
        menu.items.last?.target = self
        menu.addItem(.separator())
        menu.addItem(NSMenuItem(title: "Quit", action: #selector(quitClicked(_:)), keyEquivalent: "q"))
        menu.items.last?.target = self

        item.menu = menu
        self.statusItem = item
    }

    @objc private func showClicked(_ sender: Any?) {
        toggleAction?()
    }

    @objc private func quitClicked(_ sender: Any?) {
        NSApp.terminate(nil)
    }
}
