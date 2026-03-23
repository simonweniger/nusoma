// SessionHistoryService.swift — Reads past Claude CLI sessions from disk
// Phase 4 — Scans ~/.claude/projects/<encoded-path>/*.jsonl for session history
//
// Mirrors the Electron implementation in src/main/index.ts LIST_SESSIONS/LOAD_SESSION.
// Sessions are stored by Claude CLI at ~/.claude/projects/<path-with-slashes-as-dashes>/

import Foundation

@MainActor @Observable
class SessionHistoryService: @unchecked Sendable {
    var sessions: [SessionMeta] = []
    var isLoading: Bool = false
    var loadedMessages: [SessionLoadMessage] = []

    // MARK: - List Sessions

    /// Lists recent sessions for a given project path.
    /// Claude CLI encodes the project path by replacing `/` with `-`.
    func listSessions(projectPath: String) async {
        isLoading = true
        defer { isLoading = false }

        let encodedPath = projectPath.replacingOccurrences(of: "/", with: "-")
        let homeDir = FileManager.default.homeDirectoryForCurrentUser.path
        let sessionsDir = "\(homeDir)/.claude/projects/\(encodedPath)"

        guard FileManager.default.fileExists(atPath: sessionsDir) else {
            sessions = []
            return
        }

        let fm = FileManager.default
        guard let files = try? fm.contentsOfDirectory(atPath: sessionsDir) else {
            sessions = []
            return
        }

        let jsonlFiles = files.filter { $0.hasSuffix(".jsonl") }
        let uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

        var result: [SessionMeta] = []

        for file in jsonlFiles {
            let sessionId = String(file.dropLast(6)) // Remove ".jsonl"
            guard sessionId.lowercased().wholeMatch(of: uuidRegex) != nil else { continue }

            let filePath = "\(sessionsDir)/\(file)"
            guard let attrs = try? fm.attributesOfItem(atPath: filePath),
                  let size = attrs[.size] as? Int,
                  size >= 100 else { continue }

            // Parse JSONL for metadata
            let meta = parseSessionMetadata(filePath: filePath, sessionId: sessionId, fileSize: size)
            if let meta {
                result.append(meta)
            }
        }

        // Sort by most recent first, take top 20
        result.sort { $0.lastTimestamp > $1.lastTimestamp }
        sessions = Array(result.prefix(20))
    }

    // MARK: - Load Session Messages

    /// Loads conversation messages from a session JSONL file for preview.
    func loadSession(sessionId: String, projectPath: String) async -> [SessionLoadMessage] {
        guard isValidUUID(sessionId) else { return [] }

        let encodedPath = projectPath.replacingOccurrences(of: "/", with: "-")
        let homeDir = FileManager.default.homeDirectoryForCurrentUser.path
        let filePath = "\(homeDir)/.claude/projects/\(encodedPath)/\(sessionId).jsonl"

        guard FileManager.default.fileExists(atPath: filePath) else { return [] }
        guard let data = FileManager.default.contents(atPath: filePath),
              let content = String(data: data, encoding: .utf8) else { return [] }

        var messages: [SessionLoadMessage] = []
        let lines = content.components(separatedBy: .newlines)

        for line in lines where !line.isEmpty {
            guard let lineData = line.data(using: .utf8),
                  let obj = try? JSONSerialization.jsonObject(with: lineData) as? [String: Any] else { continue }

            let type = obj["type"] as? String ?? ""
            let timestamp = parseTimestamp(obj["timestamp"])

            if type == "user" {
                if let text = extractUserText(obj) {
                    messages.append(SessionLoadMessage(role: "user", content: text, timestamp: timestamp))
                }
            } else if type == "assistant" {
                if let messageContent = (obj["message"] as? [String: Any])?["content"] as? [[String: Any]] {
                    for block in messageContent {
                        let blockType = block["type"] as? String ?? ""
                        if blockType == "text", let text = block["text"] as? String, !text.isEmpty {
                            messages.append(SessionLoadMessage(role: "assistant", content: text, timestamp: timestamp))
                        } else if blockType == "tool_use", let name = block["name"] as? String {
                            messages.append(SessionLoadMessage(role: "tool", content: "", toolName: name, timestamp: timestamp))
                        }
                    }
                }
            }
        }

        loadedMessages = messages
        return messages
    }

    // MARK: - Private Helpers

    private func parseSessionMetadata(filePath: String, sessionId: String, fileSize: Int) -> SessionMeta? {
        guard let data = FileManager.default.contents(atPath: filePath),
              let content = String(data: data, encoding: .utf8) else { return nil }

        let lines = content.components(separatedBy: .newlines)
        var validated = false
        var slug: String?
        var firstMessage: String?
        var lastTimestamp: Date = Date.distantPast

        for line in lines where !line.isEmpty {
            guard let lineData = line.data(using: .utf8),
                  let obj = try? JSONSerialization.jsonObject(with: lineData) as? [String: Any] else { continue }

            // Validate: must have Claude transcript fields
            if !validated, obj["type"] != nil, obj["uuid"] != nil, obj["timestamp"] != nil {
                validated = true
            }

            if let s = obj["slug"] as? String, slug == nil {
                slug = s
            }

            let ts = parseTimestamp(obj["timestamp"])
            if ts > lastTimestamp {
                lastTimestamp = ts
            }

            let type = obj["type"] as? String ?? ""
            if type == "user" && firstMessage == nil {
                if let text = extractUserText(obj) {
                    firstMessage = String(text.prefix(100))
                }
            }
        }

        guard validated else { return nil }

        return SessionMeta(
            sessionId: sessionId,
            slug: slug,
            firstMessage: firstMessage,
            lastTimestamp: lastTimestamp,
            size: fileSize
        )
    }

    private func extractUserText(_ obj: [String: Any]) -> String? {
        guard let message = obj["message"] as? [String: Any] else { return nil }
        let content = message["content"]

        if let text = content as? String {
            return text
        } else if let blocks = content as? [[String: Any]] {
            let textPart = blocks.first { ($0["type"] as? String) == "text" }
            return textPart?["text"] as? String
        }
        return nil
    }

    private func parseTimestamp(_ value: Any?) -> Date {
        if let string = value as? String {
            let formatter = ISO8601DateFormatter()
            formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
            return formatter.date(from: string) ?? Date.distantPast
        }
        if let number = value as? Double {
            return Date(timeIntervalSince1970: number / 1000)
        }
        return Date.distantPast
    }

    private func isValidUUID(_ string: String) -> Bool {
        UUID(uuidString: string) != nil
    }
}
