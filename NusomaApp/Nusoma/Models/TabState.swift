// TabState.swift — Per-tab state model
// Ported from src/shared/types.ts TabState interface

import Foundation

@Observable
class TabState: Identifiable {
    let id: String
    var claudeSessionId: String?
    var status: TabStatus = .idle
    var activeRequestId: String?
    var hasUnread: Bool = false
    var currentActivity: String = ""
    var permissionQueue: [PermissionRequest] = []
    var permissionDenied: [PermissionDenial]?
    var attachments: [Attachment] = []
    var messages: [ChatMessage] = []
    var title: String = "New Tab"
    var lastResult: RunResult?

    // Session metadata from init event
    var sessionModel: String?
    var sessionTools: [String] = []
    var sessionMcpServers: [MCPServer] = []
    var sessionSkills: [String] = []
    var sessionVersion: String?

    // Queued prompts (waiting behind current run)
    var queuedPrompts: [String] = []

    // Working directory
    var workingDirectory: String
    var hasChosenDirectory: Bool = false
    var additionalDirs: [String] = []

    // Pinned tabs persist across restarts
    var pinned: Bool = false

    init(
        id: String = UUID().uuidString,
        workingDirectory: String = "~"
    ) {
        self.id = id
        self.workingDirectory = workingDirectory
    }
}

// MARK: - Pinned Tab Persistence

struct PinnedTabData: Codable {
    let claudeSessionId: String
    let title: String
    let workingDirectory: String
    let additionalDirs: [String]
}

private let pinnedStorageKey = "nusoma-pinned-tabs"

func savePinnedTabs(_ tabs: [TabState]) {
    let pinned: [PinnedTabData] = tabs
        .filter { $0.pinned && $0.claudeSessionId != nil }
        .map {
            PinnedTabData(
                claudeSessionId: $0.claudeSessionId!,
                title: $0.title,
                workingDirectory: $0.workingDirectory,
                additionalDirs: $0.additionalDirs
            )
        }

    if let data = try? JSONEncoder().encode(pinned) {
        UserDefaults.standard.set(data, forKey: pinnedStorageKey)
    }
}

func loadPinnedTabs() -> [PinnedTabData] {
    guard let data = UserDefaults.standard.data(forKey: pinnedStorageKey),
          let pinned = try? JSONDecoder().decode([PinnedTabData].self, from: data) else {
        return []
    }
    return pinned
}
