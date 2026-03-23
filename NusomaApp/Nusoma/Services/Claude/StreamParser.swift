// StreamParser.swift — NDJSON line parser for Claude CLI stream output
// Ported from src/main/stream-parser.ts
//
// Claude CLI with --output-format stream-json emits newline-delimited JSON.
// Each line is a complete JSON object representing a stream event.

import Foundation

/// Parses a byte stream into individual JSON objects (NDJSON format).
/// Handles partial lines that may be split across reads.
struct StreamParser {
    private var buffer: String = ""

    /// Feed a chunk of data from stdout. Returns zero or more parsed JSON objects.
    mutating func feed(_ data: Data) -> [[String: Any]] {
        guard let text = String(data: data, encoding: .utf8) else { return [] }
        buffer += text

        var results: [[String: Any]] = []

        while let newlineIndex = buffer.firstIndex(of: "\n") {
            let line = String(buffer[buffer.startIndex..<newlineIndex])
                .trimmingCharacters(in: .whitespacesAndNewlines)
            buffer = String(buffer[buffer.index(after: newlineIndex)...])

            guard !line.isEmpty else { continue }

            // Parse JSON line
            guard let data = line.data(using: .utf8),
                  let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
                continue
            }

            results.append(json)
        }

        return results
    }

    /// Flush any remaining buffered content (call on process exit).
    mutating func flush() -> [[String: Any]] {
        let remaining = buffer.trimmingCharacters(in: .whitespacesAndNewlines)
        buffer = ""

        guard !remaining.isEmpty,
              let data = remaining.data(using: .utf8),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            return []
        }

        return [json]
    }
}
