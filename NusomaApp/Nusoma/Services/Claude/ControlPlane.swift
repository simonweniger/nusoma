// ControlPlane.swift — Tab/session registry, request queue, dispatch
// Ported from src/main/claude/control-plane.ts
//
// Single backend authority for:
// 1. Tab/session registry
// 2. Request queue + backpressure
// 3. RequestId idempotency
// 4. Run lifecycle state transitions
// 5. Health reporting

import Foundation

// MARK: - ControlPlane Events

enum ControlPlaneEvent: Sendable {
    case normalizedEvent(tabId: String, event: NormalizedEvent)
    case statusChange(tabId: String, newStatus: TabStatus, oldStatus: TabStatus)
    case error(tabId: String, error: EnrichedError)
}

// MARK: - Tab Registry Entry

struct TabRegistryEntry {
    let tabId: String
    var claudeSessionId: String?
    var status: TabStatus = .idle
    var activeRequestId: String?
    var createdAt: Date = Date()
    var lastActivityAt: Date = Date()
    var promptCount: Int = 0
}

// MARK: - ControlPlane

/// Manages the lifecycle of all Claude sessions across tabs.
/// Provides an AsyncStream of events for the UI layer.
class ControlPlane {
    private let maxQueueDepth = 32
    private var tabs: [String: TabRegistryEntry] = [:]
    private let runManager = RunManager()
    private var permissionMode: PermissionMode = .ask

    // Active run tracking
    private var activeStreams: [String: Task<Void, Never>] = [:]
    private var requestToTab: [String: String] = [:]

    // Request queue for when a tab is busy
    private struct QueuedRequest {
        let requestId: String
        let tabId: String
        let options: RunOptions
        let continuation: CheckedContinuation<Void, Error>
    }
    private var requestQueue: [QueuedRequest] = []

    // Event broadcast
    private let eventContinuation: AsyncStream<ControlPlaneEvent>.Continuation
    let events: AsyncStream<ControlPlaneEvent>

    init() {
        let (stream, continuation) = AsyncStream<ControlPlaneEvent>.makeStream()
        self.events = stream
        self.eventContinuation = continuation
    }

    deinit {
        eventContinuation.finish()
    }

    // MARK: - Tab Lifecycle

    func createTab(id: String? = nil) -> String {
        let tabId = id ?? UUID().uuidString
        let entry = TabRegistryEntry(tabId: tabId)
        tabs[tabId] = entry
        return tabId
    }

    func closeTab(_ tabId: String) {
        guard let tab = tabs[tabId] else { return }

        // Cancel active run
        if let requestId = tab.activeRequestId {
            Task { await runManager.cancel(requestId) }
            requestToTab.removeValue(forKey: requestId)
            activeStreams[requestId]?.cancel()
            activeStreams.removeValue(forKey: requestId)
        }

        // Remove queued requests for this tab
        requestQueue.removeAll { $0.tabId == tabId }

        tabs.removeValue(forKey: tabId)
    }

    func resetTabSession(_ tabId: String) {
        tabs[tabId]?.claudeSessionId = nil
    }

    func setPermissionMode(_ mode: PermissionMode) {
        permissionMode = mode
    }

    // MARK: - Submit Prompt

    func submitPrompt(
        tabId: String,
        requestId: String,
        options: RunOptions
    ) async throws {
        guard var tab = tabs[tabId] else {
            throw ControlPlaneError.tabNotFound(tabId)
        }

        // If tab has an active run, queue the request
        if tab.activeRequestId != nil {
            guard requestQueue.count < maxQueueDepth else {
                throw ControlPlaneError.queueFull
            }

            try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
                requestQueue.append(QueuedRequest(
                    requestId: requestId,
                    tabId: tabId,
                    options: options,
                    continuation: continuation
                ))
            }
            return
        }

        // Dispatch immediately
        try await dispatch(tabId: tabId, requestId: requestId, options: options)
    }

    // MARK: - Cancel

    func cancelTab(_ tabId: String) -> Bool {
        guard let tab = tabs[tabId], let requestId = tab.activeRequestId else { return false }
        Task { await runManager.cancel(requestId) }
        return true
    }

    // MARK: - Permission Response

    func respondToPermission(tabId: String, questionId: String, optionId: String) {
        // TODO: Route to permission server when implemented
        // For now, this is a placeholder
    }

    // MARK: - Health

    func getHealth() -> HealthReport {
        let tabEntries = tabs.values.map { tab in
            HealthReport.TabEntry(
                tabId: tab.tabId,
                status: tab.status,
                activeRequestId: tab.activeRequestId,
                claudeSessionId: tab.claudeSessionId,
                alive: tab.activeRequestId != nil
            )
        }
        return HealthReport(tabs: tabEntries, queueDepth: requestQueue.count)
    }

    // MARK: - Private: Dispatch

    private func dispatch(
        tabId: String,
        requestId: String,
        options: RunOptions
    ) async throws {
        guard var tab = tabs[tabId] else {
            throw ControlPlaneError.tabNotFound(tabId)
        }

        // Use stored session ID for resume if available
        var opts = options
        if let sessionId = tab.claudeSessionId, opts.sessionId == nil {
            opts.sessionId = sessionId
        }

        tab.activeRequestId = requestId
        tab.promptCount += 1
        tab.lastActivityAt = Date()
        tabs[tabId] = tab

        // Set status
        let newStatus: TabStatus = tab.claudeSessionId != nil ? .running : .connecting
        setTabStatus(tabId, newStatus)

        // Track request → tab mapping
        requestToTab[requestId] = tabId

        // Start the run
        let (handle, eventStream) = try await runManager.startRun(
            requestId: requestId,
            options: opts
        )

        // Listen to events from this run
        let streamTask = Task { [weak self] in
            for await event in eventStream {
                guard let self else { break }
                self.handleRunEvent(requestId: requestId, event: event)
            }
            // Run completed
            self?.handleRunCompleted(requestId: requestId)
        }
        activeStreams[requestId] = streamTask
    }

    private func handleRunEvent(requestId: String, event: NormalizedEvent) {
        guard let tabId = requestToTab[requestId] else { return }

        // Update tab state for session init
        if case .sessionInit(let sessionId, _, _, _, _, _, _) = event {
            tabs[tabId]?.claudeSessionId = sessionId
            if tabs[tabId]?.status == .connecting {
                setTabStatus(tabId, .running)
            }
        }

        tabs[tabId]?.lastActivityAt = Date()

        // Forward to UI
        eventContinuation.yield(.normalizedEvent(tabId: tabId, event: event))
    }

    private func handleRunCompleted(requestId: String) {
        guard let tabId = requestToTab[requestId] else { return }

        tabs[tabId]?.activeRequestId = nil
        requestToTab.removeValue(forKey: requestId)
        activeStreams.removeValue(forKey: requestId)

        // Process next queued request for this tab
        processQueue(tabId)
    }

    private func setTabStatus(_ tabId: String, _ newStatus: TabStatus) {
        guard var tab = tabs[tabId] else { return }
        let oldStatus = tab.status
        guard oldStatus != newStatus else { return }
        tab.status = newStatus
        tabs[tabId] = tab
        eventContinuation.yield(.statusChange(tabId: tabId, newStatus: newStatus, oldStatus: oldStatus))
    }

    private func processQueue(_ tabId: String) {
        guard let idx = requestQueue.firstIndex(where: { $0.tabId == tabId }) else { return }
        let req = requestQueue.remove(at: idx)

        Task {
            do {
                try await dispatch(tabId: tabId, requestId: req.requestId, options: req.options)
                req.continuation.resume()
            } catch {
                req.continuation.resume(throwing: error)
            }
        }
    }

    // MARK: - Shutdown

    func shutdown() {
        for (requestId, task) in activeStreams {
            task.cancel()
            Task { await runManager.cancel(requestId) }
        }
        activeStreams.removeAll()
        tabs.removeAll()
        eventContinuation.finish()
    }
}

// MARK: - Errors

enum ControlPlaneError: LocalizedError {
    case tabNotFound(String)
    case queueFull

    var errorDescription: String? {
        switch self {
        case .tabNotFound(let id): return "Tab \(id) does not exist"
        case .queueFull: return "Request queue full — back-pressure"
        }
    }
}
