// EventNormalizer.swift — Raw JSON events → NormalizedEvent
// Ported from src/main/claude/event-normalizer.ts
//
// Converts raw Claude CLI stream-json events into the app's canonical NormalizedEvent type.
// Handles: system init, stream_event (message_start, content_block_*, message_delta),
// assistant, result, rate_limit_event, permission_request events.

import Foundation

struct EventNormalizer {
    /// Tracks content block state for stream event assembly
    private var activeBlocks: [Int: ContentBlockState] = [:]
    private var currentTextBlockIndex: Int?

    private struct ContentBlockState {
        let type: String  // "text" or "tool_use"
        var toolName: String?
        var toolId: String?
    }

    /// Normalize a raw JSON event into zero or more NormalizedEvents.
    mutating func normalize(_ raw: [String: Any]) -> [NormalizedEvent] {
        guard let type = raw["type"] as? String else { return [] }

        switch type {
        case "system":
            return normalizeSystemEvent(raw)
        case "stream_event":
            return normalizeStreamEvent(raw)
        case "assistant":
            return normalizeAssistantEvent(raw)
        case "result":
            return normalizeResultEvent(raw)
        case "rate_limit_event":
            return normalizeRateLimitEvent(raw)
        case "permission_request":
            return normalizePermissionEvent(raw)
        default:
            return []
        }
    }

    // MARK: - System Init

    private func normalizeSystemEvent(_ raw: [String: Any]) -> [NormalizedEvent] {
        guard raw["subtype"] as? String == "init" else { return [] }

        let sessionId = raw["session_id"] as? String ?? ""
        let tools = raw["tools"] as? [String] ?? []
        let model = raw["model"] as? String ?? "unknown"
        let skills = raw["skills"] as? [String] ?? []
        let version = raw["claude_code_version"] as? String ?? ""

        var mcpServers: [MCPServer] = []
        if let servers = raw["mcp_servers"] as? [[String: Any]] {
            mcpServers = servers.compactMap { s in
                guard let name = s["name"] as? String,
                      let status = s["status"] as? String else { return nil }
                return MCPServer(name: name, status: status)
            }
        }

        return [.sessionInit(
            sessionId: sessionId,
            tools: tools,
            model: model,
            mcpServers: mcpServers,
            skills: skills,
            version: version,
            isWarmup: false
        )]
    }

    // MARK: - Stream Events

    private mutating func normalizeStreamEvent(_ raw: [String: Any]) -> [NormalizedEvent] {
        guard let event = raw["event"] as? [String: Any],
              let eventType = event["type"] as? String else { return [] }

        switch eventType {
        case "content_block_start":
            guard let index = event["index"] as? Int,
                  let block = event["content_block"] as? [String: Any],
                  let blockType = block["type"] as? String else { return [] }

            let state = ContentBlockState(
                type: blockType,
                toolName: block["name"] as? String,
                toolId: block["id"] as? String
            )
            activeBlocks[index] = state

            if blockType == "text" {
                currentTextBlockIndex = index
                // Emit initial text if present
                if let text = block["text"] as? String, !text.isEmpty {
                    return [.textChunk(text: text)]
                }
            } else if blockType == "tool_use" {
                return [.toolCall(
                    toolName: state.toolName ?? "unknown",
                    toolId: state.toolId ?? "",
                    index: index
                )]
            }
            return []

        case "content_block_delta":
            guard let index = event["index"] as? Int,
                  let delta = event["delta"] as? [String: Any],
                  let deltaType = delta["type"] as? String else { return [] }

            if deltaType == "text_delta", let text = delta["text"] as? String {
                return [.textChunk(text: text)]
            } else if deltaType == "input_json_delta", let partial = delta["partial_json"] as? String {
                let block = activeBlocks[index]
                return [.toolCallUpdate(
                    toolId: block?.toolId ?? "",
                    partialInput: partial
                )]
            }
            return []

        case "content_block_stop":
            guard let index = event["index"] as? Int else { return [] }
            let block = activeBlocks.removeValue(forKey: index)
            if block?.type == "tool_use" {
                return [.toolCallComplete(index: index)]
            }
            if index == currentTextBlockIndex {
                currentTextBlockIndex = nil
            }
            return []

        case "message_delta", "message_start", "message_stop":
            // These are structural events; no direct user-visible output
            return []

        default:
            return []
        }
    }

    // MARK: - Assistant Event (assembled message)

    private func normalizeAssistantEvent(_ raw: [String: Any]) -> [NormalizedEvent] {
        guard let message = raw["message"] as? [String: Any] else { return [] }
        // task_update equivalent — the full assembled message
        // The AppState handler uses this as a fallback if streaming didn't deliver text
        // We don't emit directly here; the ControlPlane handles the task_update pattern
        return []
    }

    // MARK: - Result Event

    private func normalizeResultEvent(_ raw: [String: Any]) -> [NormalizedEvent] {
        let result = raw["result"] as? String ?? ""
        let cost = raw["total_cost_usd"] as? Double ?? 0
        let duration = raw["duration_ms"] as? Int ?? 0
        let turns = raw["num_turns"] as? Int ?? 0
        let sessionId = raw["session_id"] as? String ?? ""

        var denials: [PermissionDenial] = []
        if let rawDenials = raw["permission_denials"] as? [String] {
            denials = rawDenials.map { PermissionDenial(toolName: $0, toolUseId: "") }
        }

        return [.taskComplete(
            result: result,
            costUsd: cost,
            durationMs: duration,
            numTurns: turns,
            sessionId: sessionId,
            permissionDenials: denials
        )]
    }

    // MARK: - Rate Limit

    private func normalizeRateLimitEvent(_ raw: [String: Any]) -> [NormalizedEvent] {
        guard let info = raw["rate_limit_info"] as? [String: Any] else { return [] }
        let status = info["status"] as? String ?? ""
        let resetsAt = info["resetsAt"] as? Double ?? 0
        let rateLimitType = info["rateLimitType"] as? String ?? ""

        return [.rateLimit(
            status: status,
            resetsAt: Date(timeIntervalSince1970: resetsAt / 1000),
            rateLimitType: rateLimitType
        )]
    }

    // MARK: - Permission Request

    private func normalizePermissionEvent(_ raw: [String: Any]) -> [NormalizedEvent] {
        guard let tool = raw["tool"] as? [String: Any],
              let questionId = raw["question_id"] as? String else { return [] }

        let toolName = tool["name"] as? String ?? "unknown"
        let toolDescription = tool["description"] as? String

        var options: [PermissionOption] = []
        if let rawOptions = raw["options"] as? [[String: Any]] {
            options = rawOptions.compactMap { o in
                guard let id = o["id"] as? String,
                      let label = o["label"] as? String else { return nil }
                return PermissionOption(id: id, label: label, kind: o["kind"] as? String)
            }
        }

        return [.permissionRequest(
            questionId: questionId,
            toolName: toolName,
            toolDescription: toolDescription,
            toolInput: nil,
            options: options
        )]
    }
}
