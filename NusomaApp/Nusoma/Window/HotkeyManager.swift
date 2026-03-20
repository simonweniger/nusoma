// HotkeyManager.swift — Global hotkey registration
// Ported from src/main/shortcut-settings.ts
//
// Uses Carbon-based global hotkeys via the HotKey SPM package.
// Primary: Alt+Space (⌥Space) — matches Spotlight/Raycast convention
// Secondary: Cmd+Shift+K (⌘⇧K) — fallback

import AppKit
import Carbon

// MARK: - HotkeyManager

/// Manages global keyboard shortcuts for toggling the Nusoma panel.
/// Uses CGEventTap for reliable system-wide hotkey capture.
class HotkeyManager {
    private var eventTap: CFMachPort?
    private var runLoopSource: CFRunLoopSource?
    private var toggleAction: (() -> Void)?
    private var secondaryToggleAction: (() -> Void)?

    // Current shortcuts (stored as modifier+keyCode pairs)
    private var primaryModifiers: CGEventFlags = .maskAlternate
    private var primaryKeyCode: UInt16 = 49 // Space

    private var secondaryModifiers: CGEventFlags = [.maskCommand, .maskShift]
    private var secondaryKeyCode: UInt16 = 40 // K

    deinit {
        unregister()
    }

    /// Register the global hotkey with a toggle callback.
    func register(toggle: @escaping () -> Void) {
        self.toggleAction = toggle
        self.secondaryToggleAction = toggle

        // Create a CGEventTap to intercept key events system-wide
        let eventMask = (1 << CGEventType.keyDown.rawValue)

        // We need to capture `self` safely
        let refcon = Unmanaged.passUnretained(self).toOpaque()

        guard let tap = CGEvent.tapCreate(
            tap: .cgSessionEventTap,
            place: .headInsertEventTap,
            options: .defaultTap,
            eventsOfInterest: CGEventMask(eventMask),
            callback: { (proxy, type, event, refcon) -> Unmanaged<CGEvent>? in
                guard let refcon else { return Unmanaged.passRetained(event) }
                let manager = Unmanaged<HotkeyManager>.fromOpaque(refcon).takeUnretainedValue()
                return manager.handleEvent(proxy: proxy, type: type, event: event)
            },
            userInfo: refcon
        ) else {
            print("[HotkeyManager] Failed to create event tap — accessibility permissions may be needed")
            return
        }

        self.eventTap = tap
        let source = CFMachPortCreateRunLoopSource(kCFAllocatorDefault, tap, 0)
        self.runLoopSource = source
        CFRunLoopAddSource(CFRunLoopGetMain(), source, .commonModes)
        CGEvent.tapEnable(tap: tap, enable: true)
    }

    /// Unregister all hotkeys.
    func unregister() {
        if let tap = eventTap {
            CGEvent.tapEnable(tap: tap, enable: false)
        }
        if let source = runLoopSource {
            CFRunLoopRemoveSource(CFRunLoopGetMain(), source, .commonModes)
        }
        eventTap = nil
        runLoopSource = nil
    }

    /// Update the primary shortcut.
    func updatePrimary(modifiers: CGEventFlags, keyCode: UInt16) {
        primaryModifiers = modifiers
        primaryKeyCode = keyCode
    }

    /// Update the secondary shortcut.
    func updateSecondary(modifiers: CGEventFlags, keyCode: UInt16) {
        secondaryModifiers = modifiers
        secondaryKeyCode = keyCode
    }

    // MARK: - Event Handling

    private func handleEvent(
        proxy: CGEventTapProxy,
        type: CGEventType,
        event: CGEvent
    ) -> Unmanaged<CGEvent>? {
        guard type == .keyDown else {
            return Unmanaged.passRetained(event)
        }

        let keyCode = UInt16(event.getIntegerValueField(.keyboardEventKeycode))
        let flags = event.flags

        // Check primary shortcut (Alt+Space)
        if keyCode == primaryKeyCode && flags.contains(primaryModifiers) {
            // Consume the event and trigger toggle
            DispatchQueue.main.async { [weak self] in
                self?.toggleAction?()
            }
            return nil // Consume the event
        }

        // Check secondary shortcut (Cmd+Shift+K)
        if keyCode == secondaryKeyCode && flags.contains(secondaryModifiers) {
            DispatchQueue.main.async { [weak self] in
                self?.secondaryToggleAction?()
            }
            return nil
        }

        return Unmanaged.passRetained(event)
    }
}
