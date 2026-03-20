// ClaudeTypes.swift — Domain types for Claude Code CLI integration
// Ported from src/shared/types.ts

import Foundation

// MARK: - Tab State Machine

enum TabStatus: String, Sendable {
    case connecting
    case idle
    case running
    case completed
    case failed
    case dead
}

enum PermissionMode: String, Sendable {
    case ask
    case auto
}

// MARK: - Messages

enum MessageRole: String, Sendable, Codable {
    case user
    case assistant
    case tool
    case system
}

enum ToolStatus: String, Sendable {
    case running
    case completed
    case error
}

struct ChatMessage: Identifiable, Sendable {
    let id: String
    let role: MessageRole
    var content: String
    var toolName: String?
    var toolInput: String?
    var toolOutput: String?
    var toolStatus: ToolStatus?
    var isCollapsed: Bool = false
    let timestamp: Date

    init(
        id: String = UUID().uuidString,
        role: MessageRole,
        content: String,
        toolName: String? = nil,
        toolInput: String? = nil,
        toolOutput: String? = nil,
        toolStatus: ToolStatus? = nil,
        timestamp: Date = Date()
    ) {
        self.id = id
        self.role = role
        self.content = content
        self.toolName = toolName
        self.toolInput = toolInput
        self.toolOutput = toolOutput
        self.toolStatus = toolStatus
        self.timestamp = timestamp
    }
}

// MARK: - Attachments

enum AttachmentType: String, Sendable {
    case image
    case file
}

struct Attachment: Identifiable, Sendable {
    let id: String
    let type: AttachmentType
    let name: String
    let path: String
    var mimeType: String?
    var dataUrl: String?
    var size: Int?

    init(
        id: String = UUID().uuidString,
        type: AttachmentType,
        name: String,
        path: String,
        mimeType: String? = nil,
        dataUrl: String? = nil,
        size: Int? = nil
    ) {
        self.id = id
        self.type = type
        self.name = name
        self.path = path
        self.mimeType = mimeType
        self.dataUrl = dataUrl
        self.size = size
    }
}

// MARK: - Permission Request

struct PermissionOption: Sendable {
    let id: String
    let label: String
    var kind: String?
}

struct PermissionRequest: Identifiable, Sendable {
    let id: String  // questionId
    let toolName: String
    var toolDescription: String?
    var toolInput: [String: Any]?
    let options: [PermissionOption]

    var questionId: String { id }

    // Sendable compliance: toolInput uses Any, so manual conformance
    init(
        questionId: String,
        toolName: String,
        toolDescription: String? = nil,
        toolInput: [String: Any]? = nil,
        options: [PermissionOption]
    ) {
        self.id = questionId
        self.toolName = toolName
        self.toolDescription = toolDescription
        self.toolInput = toolInput
        self.options = options
    }
}

// MARK: - Run Result

struct RunResult: Sendable {
    let totalCostUsd: Double
    let durationMs: Int
    let numTurns: Int
    let sessionId: String
    var inputTokens: Int?
    var outputTokens: Int?
}

// MARK: - Run Options

struct RunOptions: Sendable {
    let prompt: String
    let projectPath: String
    var sessionId: String?
    var allowedTools: [String]?
    var maxTurns: Int?
    var maxBudgetUsd: Double?
    var systemPrompt: String?
    var model: String?
    var hookSettingsPath: String?
    var addDirs: [String]?
}

// MARK: - Normalized Events (from stream)

enum NormalizedEvent: Sendable {
    case sessionInit(
        sessionId: String,
        tools: [String],
        model: String,
        mcpServers: [MCPServer],
        skills: [String],
        version: String,
        isWarmup: Bool
    )
    case textChunk(text: String)
    case toolCall(toolName: String, toolId: String, index: Int)
    case toolCallUpdate(toolId: String, partialInput: String)
    case toolCallComplete(index: Int)
    case taskComplete(
        result: String,
        costUsd: Double,
        durationMs: Int,
        numTurns: Int,
        sessionId: String,
        permissionDenials: [PermissionDenial]
    )
    case error(message: String, isError: Bool, sessionId: String?)
    case sessionDead(exitCode: Int?, signal: String?, stderrTail: [String])
    case rateLimit(status: String, resetsAt: Date, rateLimitType: String)
    case permissionRequest(
        questionId: String,
        toolName: String,
        toolDescription: String?,
        toolInput: [String: String]?,
        options: [PermissionOption]
    )
}

struct MCPServer: Sendable {
    let name: String
    let status: String
}

struct PermissionDenial: Sendable {
    let toolName: String
    let toolUseId: String
}

// MARK: - Health Report

struct HealthReport: Sendable {
    struct TabEntry: Sendable {
        let tabId: String
        let status: TabStatus
        let activeRequestId: String?
        let claudeSessionId: String?
        let alive: Bool
    }

    let tabs: [TabEntry]
    let queueDepth: Int
}

// MARK: - Enriched Error

struct EnrichedError: Sendable {
    var message: String
    var stderrTail: [String]
    var stdoutTail: [String]
    var exitCode: Int?
    var elapsedMs: Int
    var toolCallCount: Int
    var sawPermissionRequest: Bool
}

// MARK: - Session History

struct SessionMeta: Identifiable, Sendable {
    var id: String { sessionId }
    let sessionId: String
    let slug: String?
    let firstMessage: String?
    let lastTimestamp: Date
    let size: Int
}

struct SessionLoadMessage: Sendable {
    let role: String
    let content: String
    var toolName: String?
    let timestamp: Date
}

// MARK: - Static Info

struct StaticInfo: Sendable {
    let version: String
    let email: String?
    let subscriptionType: String?
    let projectPath: String
    let homePath: String
}

// MARK: - Shortcut Settings

struct ShortcutSettings: Sendable, Codable {
    var primaryShortcut: String?
    var secondaryShortcut: String?

    static let `default` = ShortcutSettings(
        primaryShortcut: "Alt+Space",
        secondaryShortcut: "CommandOrControl+Shift+K"
    )
}

// MARK: - Known Models

struct ClaudeModel: Identifiable, Sendable {
    let id: String
    let label: String
}

let availableModels: [ClaudeModel] = [
    ClaudeModel(id: "claude-opus-4-6", label: "Opus 4.6"),
    ClaudeModel(id: "claude-sonnet-4-6", label: "Sonnet 4.6"),
    ClaudeModel(id: "claude-haiku-4-5-20251001", label: "Haiku 4.5"),
]
