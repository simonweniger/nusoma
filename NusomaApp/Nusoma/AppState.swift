// AppState.swift — Root observable state (replaces Zustand sessionStore + themeStore)
// Single source of truth for all app state, injected via @Environment

import SwiftUI

@Observable
class AppState {
    // MARK: - Tab State

    var tabs: [TabState] = []
    var activeTabId: String = ""
    var isExpanded: Bool = false

    // MARK: - Global Info

    var staticInfo: StaticInfo?
    var preferredModel: String?
    var permissionMode: PermissionMode = .ask
    var shortcutSettings: ShortcutSettings = .default

    // MARK: - Marketplace

    var marketplaceOpen: Bool = false
    var marketplaceCatalog: [CatalogPlugin] = []
    var marketplaceLoading: Bool = false
    var marketplaceError: String?
    var marketplaceInstalledNames: [String] = []
    var marketplacePluginStates: [String: PluginStatus] = [:]
    var marketplaceSearch: String = ""
    var marketplaceFilter: String = "All"

    // MARK: - Project Management

    var pmOpen: Bool = false

    // MARK: - Session History & Settings Panels

    var historyOpen: Bool = false
    var settingsOpen: Bool = false

    // MARK: - Services

    let controlPlane: ControlPlane
    let marketplaceService: MarketplaceService
    private(set) var eventTask: Task<Void, Never>?

    // MARK: - Computed

    var activeTab: TabState? {
        tabs.first { $0.id == activeTabId }
    }

    var activeTabStatus: TabStatus? {
        activeTab?.status
    }

    var isRunning: Bool {
        let status = activeTabStatus
        return status == .running || status == .connecting
    }

    // MARK: - Init

    init() {
        self.controlPlane = ControlPlane()
        self.marketplaceService = MarketplaceService()
        let initialTab = TabState()
        self.tabs = [initialTab]
        self.activeTabId = initialTab.id
    }

    // MARK: - Startup

    @MainActor
    func initialize() async {
        // Fetch static CLI info
        let cliEnv = CliEnvironment()
        if let info = await cliEnv.fetchStaticInfo() {
            staticInfo = info
            // Set home directory on first tab
            if let tab = tabs.first {
                tab.workingDirectory = info.homePath
            }
        }

        // Start listening for ControlPlane events
        startEventStream()

        // Ensure manifest skills are installed (non-blocking)
        Task.detached {
            await SkillInstaller.ensureSkills { status in
                // Log only — UI not needed for startup provisioning
                if status.state == .failed, let error = status.error {
                    print("[SkillInstaller] Failed to install \(status.name): \(error)")
                }
            }
        }

        // Restore pinned tabs
        let pinnedData = loadPinnedTabs()
        for p in pinnedData {
            let tab = TabState(workingDirectory: p.workingDirectory)
            tab.claudeSessionId = p.claudeSessionId
            tab.title = p.title
            tab.additionalDirs = p.additionalDirs
            tab.pinned = true
            tab.hasChosenDirectory = true
            controlPlane.createTab(id: tab.id)
            tabs.insert(tab, at: 0)
        }
    }

    // MARK: - Event Stream

    private func startEventStream() {
        eventTask = Task { [weak self] in
            guard let self else { return }
            for await event in self.controlPlane.events {
                await MainActor.run {
                    self.handleControlPlaneEvent(event)
                }
            }
        }
    }

    // MARK: - Tab Management

    @MainActor
    func createTab() {
        let homeDir = staticInfo?.homePath ?? "~"
        let tab = TabState(workingDirectory: homeDir)
        controlPlane.createTab(id: tab.id)
        tabs.append(tab)
        activeTabId = tab.id
    }

    @MainActor
    func selectTab(_ tabId: String) {
        if tabId == activeTabId {
            // Clicking active tab toggles expand/collapse
            isExpanded.toggle()
            marketplaceOpen = false
            historyOpen = false
            settingsOpen = false
            if isExpanded, let tab = tabs.first(where: { $0.id == tabId }) {
                tab.hasUnread = false
            }
        } else {
            activeTabId = tabId
            marketplaceOpen = false
            historyOpen = false
            settingsOpen = false
            if let tab = tabs.first(where: { $0.id == tabId }) {
                tab.hasUnread = false
            }
        }
    }

    @MainActor
    func closeTab(_ tabId: String) {
        guard let tab = tabs.first(where: { $0.id == tabId }), !tab.pinned else { return }
        controlPlane.closeTab(tabId)

        let remaining = tabs.filter { $0.id != tabId }
        if activeTabId == tabId {
            if remaining.isEmpty {
                let newTab = TabState(workingDirectory: staticInfo?.homePath ?? "~")
                controlPlane.createTab(id: newTab.id)
                tabs = [newTab]
                activeTabId = newTab.id
            } else {
                let closedIndex = tabs.firstIndex(where: { $0.id == tabId }) ?? 0
                let newActive = remaining[min(closedIndex, remaining.count - 1)]
                tabs = remaining
                activeTabId = newActive.id
            }
        } else {
            tabs = remaining
        }
    }

    @MainActor
    func clearTab() {
        guard let tab = activeTab else { return }
        tab.messages = []
        tab.lastResult = nil
        tab.currentActivity = ""
        tab.permissionQueue = []
        tab.permissionDenied = nil
        tab.queuedPrompts = []
    }

    @MainActor
    func toggleExpanded() {
        isExpanded.toggle()
        marketplaceOpen = false
        historyOpen = false
        settingsOpen = false
        if isExpanded, let tab = activeTab {
            tab.hasUnread = false
        }
    }

    @MainActor
    func toggleMarketplace() {
        if marketplaceOpen {
            marketplaceOpen = false
        } else {
            isExpanded = false
            marketplaceOpen = true
            pmOpen = false
            historyOpen = false
            settingsOpen = false
            // Load marketplace data on first open
            if marketplaceCatalog.isEmpty && !marketplaceLoading {
                loadMarketplace()
            }
        }
    }

    @MainActor
    func togglePin(_ tabId: String) {
        guard let tab = tabs.first(where: { $0.id == tabId }) else { return }
        tab.pinned.toggle()
        // Sort: pinned first
        let pinned = tabs.filter(\.pinned)
        let unpinned = tabs.filter { !$0.pinned }
        tabs = pinned + unpinned
        savePinnedTabs(tabs)
    }

    // MARK: - Send Message

    @MainActor
    func sendMessage(_ prompt: String, projectPath: String? = nil) {
        guard let tab = activeTab else { return }
        guard tab.status != .connecting else { return }

        let resolvedPath = projectPath
            ?? (tab.hasChosenDirectory ? tab.workingDirectory : (staticInfo?.homePath ?? tab.workingDirectory))
        let isBusy = tab.status == .running
        let requestId = UUID().uuidString

        // Build prompt with attachment context
        var fullPrompt = prompt
        if !tab.attachments.isEmpty {
            let ctx = tab.attachments.map { "[Attached \($0.type.rawValue): \($0.path)]" }.joined(separator: "\n")
            fullPrompt = "\(ctx)\n\n\(prompt)"
        }

        // Set title from first message
        if tab.messages.isEmpty {
            tab.title = prompt.count > 30 ? String(prompt.prefix(27)) + "..." : prompt
        }

        // Lock in working directory on first send
        if !tab.hasChosenDirectory {
            tab.hasChosenDirectory = true
            tab.workingDirectory = resolvedPath
        }

        if isBusy {
            // Queue behind current run
            tab.queuedPrompts.append(prompt)
            tab.attachments = []
        } else {
            tab.status = .connecting
            tab.activeRequestId = requestId
            tab.currentActivity = "Starting..."
            tab.attachments = []
            tab.messages.append(ChatMessage(role: .user, content: prompt))
        }

        // Dispatch to ControlPlane
        let options = RunOptions(
            prompt: fullPrompt,
            projectPath: resolvedPath,
            sessionId: tab.claudeSessionId,
            model: preferredModel,
            addDirs: tab.additionalDirs.isEmpty ? nil : tab.additionalDirs
        )

        Task {
            do {
                try await controlPlane.submitPrompt(
                    tabId: tab.id,
                    requestId: requestId,
                    options: options
                )
            } catch {
                await MainActor.run {
                    self.handleError(tabId: tab.id, message: error.localizedDescription)
                }
            }
        }
    }

    // MARK: - Permission Response

    @MainActor
    func respondPermission(tabId: String, questionId: String, optionId: String) {
        controlPlane.respondToPermission(tabId: tabId, questionId: questionId, optionId: optionId)
        guard let tab = tabs.first(where: { $0.id == tabId }) else { return }
        tab.permissionQueue.removeAll { $0.questionId == questionId }
        tab.currentActivity = tab.permissionQueue.isEmpty
            ? "Working..."
            : "Waiting for permission: \(tab.permissionQueue[0].toolName)"
    }

    // MARK: - Directory Management

    @MainActor
    func setBaseDirectory(_ dir: String) {
        guard let tab = activeTab else { return }
        tab.workingDirectory = dir
        tab.hasChosenDirectory = true
        tab.claudeSessionId = nil
        tab.additionalDirs = []
        controlPlane.resetTabSession(tab.id)
        // Persist for "use last folder" feature
        UserDefaults.standard.set(dir, forKey: "nusoma-last-folder")
    }

    @MainActor
    func addDirectory(_ dir: String) {
        guard let tab = activeTab, !tab.additionalDirs.contains(dir) else { return }
        tab.additionalDirs.append(dir)
    }

    @MainActor
    func removeDirectory(_ dir: String) {
        guard let tab = activeTab else { return }
        tab.additionalDirs.removeAll { $0 == dir }
    }

    // MARK: - Attachment Management

    @MainActor
    func addAttachments(_ attachments: [Attachment]) {
        guard let tab = activeTab else { return }
        tab.attachments.append(contentsOf: attachments)
    }

    @MainActor
    func removeAttachment(_ attachmentId: String) {
        guard let tab = activeTab else { return }
        tab.attachments.removeAll { $0.id == attachmentId }
    }

    // MARK: - Model Selection

    func setPreferredModel(_ model: String?) {
        preferredModel = model
    }

    func setPermissionMode(_ mode: PermissionMode) {
        permissionMode = mode
        controlPlane.setPermissionMode(mode)
    }

    // MARK: - Project Management

    @MainActor
    func togglePM() {
        if pmOpen {
            pmOpen = false
        } else {
            isExpanded = false
            pmOpen = true
            marketplaceOpen = false
            historyOpen = false
            settingsOpen = false
        }
    }

    // MARK: - Marketplace Actions

    @MainActor
    func loadMarketplace(forceRefresh: Bool = false) {
        marketplaceLoading = true
        marketplaceError = nil

        Task {
            let (plugins, error) = await marketplaceService.fetchCatalog(forceRefresh: forceRefresh)
            marketplaceCatalog = plugins
            marketplaceError = error
            marketplaceLoading = false

            // Refresh installed state
            let installed = marketplaceService.listInstalled()
            marketplaceInstalledNames = installed

            // Update plugin states
            for plugin in plugins {
                if installed.contains(plugin.installName) || installed.contains(plugin.id) {
                    marketplacePluginStates[plugin.id] = .installed
                } else if marketplacePluginStates[plugin.id] == nil {
                    marketplacePluginStates[plugin.id] = .notInstalled
                }
            }
        }
    }

    @MainActor
    func installMarketplacePlugin(_ plugin: CatalogPlugin) {
        marketplacePluginStates[plugin.id] = .installing

        Task {
            let (ok, error) = await marketplaceService.installPlugin(plugin)
            if ok {
                marketplacePluginStates[plugin.id] = .installed
                marketplaceInstalledNames.append(plugin.installName)
            } else {
                marketplacePluginStates[plugin.id] = .failed
                print("[Marketplace] Install failed: \(error ?? "unknown")")
            }
        }
    }

    @MainActor
    func uninstallMarketplacePlugin(_ plugin: CatalogPlugin) {
        Task {
            let (ok, _) = await marketplaceService.uninstallPlugin(plugin)
            if ok {
                marketplacePluginStates[plugin.id] = .notInstalled
                marketplaceInstalledNames.removeAll { $0 == plugin.installName }
            }
        }
    }

    // MARK: - Event Handling

    @MainActor
    private func handleControlPlaneEvent(_ event: ControlPlaneEvent) {
        switch event {
        case .normalizedEvent(let tabId, let normalized):
            handleNormalizedEvent(tabId: tabId, event: normalized)
        case .statusChange(let tabId, let newStatus, _):
            guard let tab = tabs.first(where: { $0.id == tabId }) else { return }
            tab.status = newStatus
            if newStatus == .idle {
                tab.currentActivity = ""
                tab.permissionQueue = []
                tab.permissionDenied = nil
            }
        case .error(let tabId, let enriched):
            handleError(tabId: tabId, message: enriched.message, stderrTail: enriched.stderrTail)
        }
    }

    @MainActor
    private func handleNormalizedEvent(tabId: String, event: NormalizedEvent) {
        guard let tab = tabs.first(where: { $0.id == tabId }) else { return }

        switch event {
        case .sessionInit(let sessionId, let tools, let model, let mcpServers, let skills, let version, let isWarmup):
            tab.claudeSessionId = sessionId
            tab.sessionModel = model
            tab.sessionTools = tools
            tab.sessionMcpServers = mcpServers
            tab.sessionSkills = skills
            tab.sessionVersion = version
            if tab.pinned { savePinnedTabs(tabs) }
            if !isWarmup {
                tab.status = .running
                tab.currentActivity = "Thinking..."
                // Dequeue next prompt if any
                if !tab.queuedPrompts.isEmpty {
                    let next = tab.queuedPrompts.removeFirst()
                    tab.messages.append(ChatMessage(role: .user, content: next))
                }
            }

        case .textChunk(let text):
            tab.currentActivity = "Writing..."
            if let last = tab.messages.last, last.role == .assistant, last.toolName == nil {
                tab.messages[tab.messages.count - 1].content += text
            } else {
                tab.messages.append(ChatMessage(role: .assistant, content: text))
            }

        case .toolCall(let toolName, _, _):
            tab.currentActivity = "Running \(toolName)..."
            tab.messages.append(ChatMessage(
                role: .tool,
                content: "",
                toolName: toolName,
                toolInput: "",
                toolStatus: .running
            ))

        case .toolCallUpdate(_, let partialInput):
            if let idx = tab.messages.lastIndex(where: { $0.role == .tool && $0.toolStatus == .running }) {
                tab.messages[idx].toolInput = (tab.messages[idx].toolInput ?? "") + partialInput
            }

        case .toolCallComplete:
            if let idx = tab.messages.lastIndex(where: { $0.role == .tool && $0.toolStatus == .running }) {
                tab.messages[idx].toolStatus = .completed
            }

        case .taskComplete(let result, let costUsd, let durationMs, let numTurns, let sessionId, let denials):
            tab.status = .completed
            tab.activeRequestId = nil
            tab.currentActivity = ""
            tab.permissionQueue = []
            tab.lastResult = RunResult(
                totalCostUsd: costUsd,
                durationMs: durationMs,
                numTurns: numTurns,
                sessionId: sessionId
            )
            // Final text fallback
            if !result.isEmpty {
                let hasAssistantText = tab.messages.suffix(from: tab.messages.lastIndex(where: { $0.role == .user }) ?? 0)
                    .contains { $0.role == .assistant && $0.toolName == nil }
                if !hasAssistantText {
                    tab.messages.append(ChatMessage(role: .assistant, content: result))
                }
            }
            // Unread if not active
            if tabId != activeTabId || !isExpanded {
                tab.hasUnread = true
            }
            // Permission denials
            tab.permissionDenied = denials.isEmpty ? nil : denials

        case .error(let message, _, _):
            tab.status = .failed
            tab.activeRequestId = nil
            tab.currentActivity = ""
            tab.permissionQueue = []
            tab.messages.append(ChatMessage(role: .system, content: "Error: \(message)"))

        case .sessionDead(let exitCode, _, _):
            tab.status = .dead
            tab.activeRequestId = nil
            tab.currentActivity = ""
            tab.permissionQueue = []
            tab.messages.append(ChatMessage(
                role: .system,
                content: "Session ended unexpectedly (exit \(exitCode ?? -1))"
            ))

        case .rateLimit(let status, let resetsAt, let rateLimitType):
            if status != "allowed" {
                let formatter = DateFormatter()
                formatter.timeStyle = .short
                tab.messages.append(ChatMessage(
                    role: .system,
                    content: "Rate limited (\(rateLimitType)). Resets at \(formatter.string(from: resetsAt))."
                ))
            }

        case .permissionRequest(let questionId, let toolName, let toolDescription, _, let options):
            let req = PermissionRequest(
                questionId: questionId,
                toolName: toolName,
                toolDescription: toolDescription,
                options: options
            )
            tab.permissionQueue.append(req)
            tab.currentActivity = "Waiting for permission: \(toolName)"
        }
    }

    @MainActor
    private func handleError(tabId: String, message: String, stderrTail: [String] = []) {
        guard let tab = tabs.first(where: { $0.id == tabId }) else { return }
        // Deduplicate
        if let last = tab.messages.last, last.role == .system, last.content.hasPrefix("Error:") { return }

        tab.status = .failed
        tab.activeRequestId = nil
        tab.currentActivity = ""
        tab.permissionQueue = []

        var errorMsg = "Error: \(message)"
        if !stderrTail.isEmpty {
            errorMsg += "\n\n" + stderrTail.suffix(5).joined(separator: "\n")
        }
        tab.messages.append(ChatMessage(role: .system, content: errorMsg))
    }
}
