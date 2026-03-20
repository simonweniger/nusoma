// EventNormalizerTests.swift — Tests for Claude stream event normalization

import XCTest
@testable import Nusoma

final class EventNormalizerTests: XCTestCase {
    func testSystemInitEvent() {
        var normalizer = EventNormalizer()
        let raw: [String: Any] = [
            "type": "system",
            "subtype": "init",
            "session_id": "sess-123",
            "tools": ["Read", "Edit", "Bash"],
            "model": "claude-sonnet-4-6",
            "mcp_servers": [
                ["name": "postgres", "status": "connected"]
            ],
            "skills": ["commit"],
            "claude_code_version": "1.2.3"
        ]

        let events = normalizer.normalize(raw)
        XCTAssertEqual(events.count, 1)

        if case .sessionInit(let sessionId, let tools, let model, let mcpServers, _, let version, _) = events[0] {
            XCTAssertEqual(sessionId, "sess-123")
            XCTAssertEqual(tools, ["Read", "Edit", "Bash"])
            XCTAssertEqual(model, "claude-sonnet-4-6")
            XCTAssertEqual(mcpServers.count, 1)
            XCTAssertEqual(mcpServers[0].name, "postgres")
            XCTAssertEqual(version, "1.2.3")
        } else {
            XCTFail("Expected sessionInit event")
        }
    }

    func testTextStreamEvent() {
        var normalizer = EventNormalizer()

        // content_block_start (text)
        let start: [String: Any] = [
            "type": "stream_event",
            "event": [
                "type": "content_block_start",
                "index": 0,
                "content_block": ["type": "text", "text": ""]
            ] as [String: Any]
        ]
        let startEvents = normalizer.normalize(start)
        XCTAssertEqual(startEvents.count, 0) // Empty initial text

        // content_block_delta (text)
        let delta: [String: Any] = [
            "type": "stream_event",
            "event": [
                "type": "content_block_delta",
                "index": 0,
                "delta": ["type": "text_delta", "text": "Hello, world!"]
            ] as [String: Any]
        ]
        let deltaEvents = normalizer.normalize(delta)
        XCTAssertEqual(deltaEvents.count, 1)

        if case .textChunk(let text) = deltaEvents[0] {
            XCTAssertEqual(text, "Hello, world!")
        } else {
            XCTFail("Expected textChunk event")
        }
    }

    func testToolCallEvents() {
        var normalizer = EventNormalizer()

        // Tool use start
        let start: [String: Any] = [
            "type": "stream_event",
            "event": [
                "type": "content_block_start",
                "index": 1,
                "content_block": ["type": "tool_use", "name": "Read", "id": "tool-1"]
            ] as [String: Any]
        ]
        let startEvents = normalizer.normalize(start)
        XCTAssertEqual(startEvents.count, 1)

        if case .toolCall(let toolName, let toolId, _) = startEvents[0] {
            XCTAssertEqual(toolName, "Read")
            XCTAssertEqual(toolId, "tool-1")
        } else {
            XCTFail("Expected toolCall event")
        }

        // Tool input delta
        let delta: [String: Any] = [
            "type": "stream_event",
            "event": [
                "type": "content_block_delta",
                "index": 1,
                "delta": ["type": "input_json_delta", "partial_json": "{\"path\":"]
            ] as [String: Any]
        ]
        let deltaEvents = normalizer.normalize(delta)
        XCTAssertEqual(deltaEvents.count, 1)

        if case .toolCallUpdate(let toolId, let partial) = deltaEvents[0] {
            XCTAssertEqual(toolId, "tool-1")
            XCTAssertEqual(partial, "{\"path\":")
        } else {
            XCTFail("Expected toolCallUpdate event")
        }

        // Tool complete
        let stop: [String: Any] = [
            "type": "stream_event",
            "event": [
                "type": "content_block_stop",
                "index": 1
            ] as [String: Any]
        ]
        let stopEvents = normalizer.normalize(stop)
        XCTAssertEqual(stopEvents.count, 1)

        if case .toolCallComplete(let index) = stopEvents[0] {
            XCTAssertEqual(index, 1)
        } else {
            XCTFail("Expected toolCallComplete event")
        }
    }

    func testResultEvent() {
        var normalizer = EventNormalizer()
        let raw: [String: Any] = [
            "type": "result",
            "result": "Task completed successfully",
            "total_cost_usd": 0.0234,
            "duration_ms": 5420,
            "num_turns": 3,
            "session_id": "sess-456"
        ]

        let events = normalizer.normalize(raw)
        XCTAssertEqual(events.count, 1)

        if case .taskComplete(let result, let cost, let duration, let turns, let sessionId, _) = events[0] {
            XCTAssertEqual(result, "Task completed successfully")
            XCTAssertEqual(cost, 0.0234, accuracy: 0.0001)
            XCTAssertEqual(duration, 5420)
            XCTAssertEqual(turns, 3)
            XCTAssertEqual(sessionId, "sess-456")
        } else {
            XCTFail("Expected taskComplete event")
        }
    }

    func testUnknownEventType() {
        var normalizer = EventNormalizer()
        let raw: [String: Any] = ["type": "unknown_type"]
        let events = normalizer.normalize(raw)
        XCTAssertEqual(events.count, 0)
    }

    func testMissingTypeField() {
        var normalizer = EventNormalizer()
        let raw: [String: Any] = ["data": "something"]
        let events = normalizer.normalize(raw)
        XCTAssertEqual(events.count, 0)
    }
}
