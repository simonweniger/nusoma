// NusomaApp.swift — Application entry point
//
// Configures the app as a macOS accessory (no Dock icon),
// creates the floating NSPanel, registers global hotkeys,
// and sets up the menu bar tray icon.
//
// Architecture:
// - App delegates to AppDelegate for NSPanel and hotkey setup
// - SwiftUI manages all views inside the panel
// - AppState is the single source of truth
// - ThemeManager handles appearance

import SwiftUI
import SwiftData

@main
struct NusomaApp: App {
    @NSApplicationDelegateAdaptor(AppDelegate.self) var appDelegate

    var body: some Scene {
        // We use a hidden Settings scene as a placeholder.
        // The actual UI lives in the NSPanel managed by AppDelegate.
        Settings {
            EmptyView()
        }
    }
}

// MARK: - App Delegate

class AppDelegate: NSObject, NSApplicationDelegate {
    private let appState = AppState()
    private let themeManager = ThemeManager()
    private let panelManager = PanelManager()
    private let hotkeyManager = HotkeyManager()
    private let trayManager = TrayManager()

    // SwiftData container for Project Management
    private var modelContainer: ModelContainer?

    func applicationDidFinishLaunching(_ notification: Notification) {
        // 1. Become accessory app (no Dock icon) — like Spotlight/Raycast
        NSApp.setActivationPolicy(.accessory)

        // 2. Set up SwiftData container
        do {
            let schema = Schema([PMProject.self, PMIssue.self, PMLabel.self, PMComment.self, PMSetting.self])
            let config = ModelConfiguration(
                "NusomaDB",
                schema: schema,
                url: nusomaDBURL()
            )
            modelContainer = try ModelContainer(for: schema, configurations: [config])
        } catch {
            print("[NusomaApp] Failed to create SwiftData container: \(error)")
        }

        // 3. Create the floating panel with SwiftUI content
        let contentView = MainView()
            .environment(appState)
            .environment(themeManager)
            .modelContainer(for: [PMProject.self, PMIssue.self, PMLabel.self, PMComment.self, PMSetting.self],
                           isUndoEnabled: false)

        panelManager.createPanel(content: contentView)
        panelManager.show()

        // 4. Register global hotkeys
        hotkeyManager.register { [weak self] in
            self?.panelManager.toggle()
        }

        // 5. Set up tray icon
        trayManager.setup { [weak self] in
            self?.panelManager.toggle()
        }

        // 6. Override app menu (remove Cmd+W close window)
        setupMenu()

        // 7. Listen for system appearance changes
        DistributedNotificationCenter.default.addObserver(
            self,
            selector: #selector(systemAppearanceChanged),
            name: Notification.Name("AppleInterfaceThemeChangedNotification"),
            object: nil
        )

        // 8. Initialize app state (async — fetches CLI info, restores tabs)
        Task { @MainActor in
            await appState.initialize()
        }

        // 9. Keyboard shortcuts for tabs (Cmd+T, Cmd+W, Cmd+1-9)
        NSEvent.addLocalMonitorForEvents(matching: .keyDown) { [weak self] event in
            return self?.handleLocalKeyEvent(event)
        }
    }

    func applicationWillTerminate(_ notification: Notification) {
        hotkeyManager.unregister()
        appState.controlPlane.shutdown()
    }

    func applicationShouldHandleReopen(_ sender: NSApplication, hasVisibleWindows flag: Bool) -> Bool {
        panelManager.show()
        return true
    }

    // MARK: - Menu

    private func setupMenu() {
        let mainMenu = NSMenu()

        // App menu
        let appMenu = NSMenu()
        appMenu.addItem(NSMenuItem(title: "About Nusoma", action: #selector(NSApplication.orderFrontStandardAboutPanel(_:)), keyEquivalent: ""))
        appMenu.addItem(.separator())
        appMenu.addItem(NSMenuItem(title: "Hide Nusoma", action: #selector(NSApplication.hide(_:)), keyEquivalent: "h"))
        appMenu.addItem(NSMenuItem(title: "Hide Others", action: #selector(NSApplication.hideOtherApplications(_:)), keyEquivalent: ""))
        appMenu.addItem(NSMenuItem(title: "Show All", action: #selector(NSApplication.unhideAllApplications(_:)), keyEquivalent: ""))
        appMenu.addItem(.separator())
        appMenu.addItem(NSMenuItem(title: "Quit Nusoma", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q"))

        let appMenuItem = NSMenuItem()
        appMenuItem.submenu = appMenu
        mainMenu.addItem(appMenuItem)

        // Edit menu (for Cmd+C/V/X/A)
        let editMenu = NSMenu(title: "Edit")
        editMenu.addItem(NSMenuItem(title: "Undo", action: Selector(("undo:")), keyEquivalent: "z"))
        editMenu.addItem(NSMenuItem(title: "Redo", action: Selector(("redo:")), keyEquivalent: "Z"))
        editMenu.addItem(.separator())
        editMenu.addItem(NSMenuItem(title: "Cut", action: #selector(NSText.cut(_:)), keyEquivalent: "x"))
        editMenu.addItem(NSMenuItem(title: "Copy", action: #selector(NSText.copy(_:)), keyEquivalent: "c"))
        editMenu.addItem(NSMenuItem(title: "Paste", action: #selector(NSText.paste(_:)), keyEquivalent: "v"))
        editMenu.addItem(NSMenuItem(title: "Select All", action: #selector(NSText.selectAll(_:)), keyEquivalent: "a"))

        let editMenuItem = NSMenuItem()
        editMenuItem.submenu = editMenu
        mainMenu.addItem(editMenuItem)

        NSApp.mainMenu = mainMenu
    }

    // MARK: - Local Key Events

    private func handleLocalKeyEvent(_ event: NSEvent) -> NSEvent? {
        guard event.modifierFlags.contains(.command) else { return event }

        switch event.charactersIgnoringModifiers {
        case "t", "T":
            appState.createTab()
            return nil // Consume

        case "w", "W":
            appState.closeTab(appState.activeTabId)
            return nil

        default:
            // Cmd+1 through Cmd+9 for tab switching
            if let char = event.charactersIgnoringModifiers?.first,
               let digit = char.wholeNumberValue,
               digit >= 1 && digit <= 9 {
                let index = digit - 1
                if index < appState.tabs.count {
                    appState.selectTab(appState.tabs[index].id)
                }
                return nil
            }
        }

        return event
    }

    // MARK: - Appearance

    @objc private func systemAppearanceChanged() {
        themeManager.systemAppearanceChanged()
    }

    // MARK: - Database Path

    private func nusomaDBURL() -> URL {
        let appSupport = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first!
        let nusomaDir = appSupport.appendingPathComponent("Nusoma", isDirectory: true)
        try? FileManager.default.createDirectory(at: nusomaDir, withIntermediateDirectories: true)
        return nusomaDir.appendingPathComponent("nusoma.store")
    }
}
