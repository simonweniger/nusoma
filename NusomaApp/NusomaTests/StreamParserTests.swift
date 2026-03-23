// StreamParserTests.swift — Unit tests for NDJSON stream parser

import XCTest
@testable import Nusoma

final class StreamParserTests: XCTestCase {
    func testParseSingleLine() {
        var parser = StreamParser()
        let json = #"{"type":"system","subtype":"init","session_id":"abc123"}"# + "\n"
        let results = parser.feed(json.data(using: .utf8)!)

        XCTAssertEqual(results.count, 1)
        XCTAssertEqual(results[0]["type"] as? String, "system")
        XCTAssertEqual(results[0]["subtype"] as? String, "init")
    }

    func testParseMultipleLines() {
        var parser = StreamParser()
        let json = """
        {"type":"system","subtype":"init"}
        {"type":"result","subtype":"success"}

        """
        let results = parser.feed(json.data(using: .utf8)!)

        XCTAssertEqual(results.count, 2)
        XCTAssertEqual(results[0]["type"] as? String, "system")
        XCTAssertEqual(results[1]["type"] as? String, "result")
    }

    func testPartialLine() {
        var parser = StreamParser()

        // Feed partial line
        let part1 = #"{"type":"sys"#
        let results1 = parser.feed(part1.data(using: .utf8)!)
        XCTAssertEqual(results1.count, 0) // No complete line yet

        // Complete the line
        let part2 = #"tem","subtype":"init"}"# + "\n"
        let results2 = parser.feed(part2.data(using: .utf8)!)
        XCTAssertEqual(results2.count, 1)
        XCTAssertEqual(results2[0]["type"] as? String, "system")
    }

    func testFlush() {
        var parser = StreamParser()
        let json = #"{"type":"result"}"#  // No trailing newline
        _ = parser.feed(json.data(using: .utf8)!)

        let flushed = parser.flush()
        XCTAssertEqual(flushed.count, 1)
        XCTAssertEqual(flushed[0]["type"] as? String, "result")
    }

    func testEmptyLines() {
        var parser = StreamParser()
        let json = "\n\n\n"
        let results = parser.feed(json.data(using: .utf8)!)
        XCTAssertEqual(results.count, 0)
    }

    func testInvalidJSON() {
        var parser = StreamParser()
        let json = "not json at all\n"
        let results = parser.feed(json.data(using: .utf8)!)
        XCTAssertEqual(results.count, 0) // Silently skipped
    }
}
