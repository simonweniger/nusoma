// HotkeyManager.swift — Global hotkey registration
// Uses KeyboardShortcuts (github.com/sindresorhus/KeyboardShortcuts)
//
// Primary: Alt+Space (⌥Space) — matches Spotlight/Raycast convention
// Secondary: Cmd+Shift+K (⌘⇧K) — fallback

import AppKit
import KeyboardShortcuts

// MARK: - Shortcut Names

extension KeyboardShortcuts.Name {
    static let togglePanel = Self("togglePanel", default: .init(.space, modifiers: .option))
    static let togglePanelSecondary = Self("togglePanelSecondary", default: .init(.k, modifiers: [.command, .shift]))
}

// MARK: - HotkeyManager

@MainActor
final class HotkeyManager: Sendable {

    /// Register the global hotkeys with a toggle callback.
    func register(toggle: @escaping @MainActor () -> Void) {
        KeyboardShortcuts.onKeyUp(for: .togglePanel) {
            toggle()
        }
        KeyboardShortcuts.onKeyUp(for: .togglePanelSecondary) {
            toggle()
        }
    }

    /// Unregister all hotkeys.
    func unregister() {
        KeyboardShortcuts.disable(.togglePanel)
        KeyboardShortcuts.disable(.togglePanelSecondary)
    }
}
