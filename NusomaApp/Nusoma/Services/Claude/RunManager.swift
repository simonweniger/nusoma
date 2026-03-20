// RunManager.swift — Process spawning and lifecycle for Claude CLI runs
// Ported from src/main/claude/run-manager.ts
//
// Spawns `claude` CLI as a subprocess with --output-format stream-json,
// pipes stdout through StreamParser + EventNormalizer, and emits NormalizedEvents.

import Foundation

// MARK: - System Prompt Hint

/// Appended to Claude's system prompt so it knows it's in a GUI context.
let cluiSystemHint = """
IMPORTANT: You are NOT running in a terminal. You are running inside NUSOMA,
a desktop chat application with a rich UI that renders full markdown.
NUSOMA is a GUI wrapper around Claude Code — the user sees your output in a
styled conversation view, not a raw terminal.

Because NUSOMA renders markdown natively, you MUST use rich formatting when it helps:
- Always use clickable markdown links: [label](https://url) — they render as real buttons.
- Use tables, bold, headers, and bullet lists freely — they all render beautifully.
- Use code blocks with language tags for syntax highlighting.

You are still a software engineering assistant. Keep using your tools (Read, Edit, Bash, etc.)
normally. But when presenting information, take full advantage of the rich UI.
"""

/// Tools auto-approved via --allowedTools (never trigger permission card)
let safeTools = [
    "Read", "Glob", "Grep", "LS",
    "TodoRead", "TodoWrite",
    "Agent", "Task", "TaskOutput",
    "Notebook",
    "WebSearch", "WebFetch",
]

/// All tools to pre-approve when NO hook server is available
let defaultAllowedTools = [
    "Bash", "Edit", "Write", "MultiEdit",
] + safeTools

// MARK: - Run Handle

/// Tracks a single Claude CLI process execution.
class RunHandle {
    let runId: String
    var sessionId: String?
    let process: Process
    var pid: Int32? { process.isRunning ? process.processIdentifier : nil }
    let startedAt: Date
    var stderrTail: [String] = []  // Ring buffer, last 100 lines
    var stdoutTail: [String] = []
    var toolCallCount: Int = 0
    var sawPermissionRequest: Bool = false
    var permissionDenials: [(toolName: String, toolUseId: String)] = []

    private let maxRingLines = 100

    init(runId: String, process: Process) {
        self.runId = runId
        self.process = process
        self.startedAt = Date()
    }

    func appendStderr(_ line: String) {
        stderrTail.append(line)
        if stderrTail.count > maxRingLines {
            stderrTail.removeFirst()
        }
    }

    func appendStdout(_ line: String) {
        stdoutTail.append(line)
        if stdoutTail.count > maxRingLines {
            stdoutTail.removeFirst()
        }
    }
}

// MARK: - Run Manager

/// Manages Claude CLI process lifecycle.
/// Spawns processes, parses output, emits normalized events via AsyncStream.
actor RunManager {
    private var activeRuns: [String: RunHandle] = [:]
    private var finishedRuns: [String: RunHandle] = [:]  // Keep for diagnostics
    private let cliEnv = CliEnvironment()

    /// Start a new Claude CLI run. Returns the run handle and an AsyncStream of events.
    func startRun(
        requestId: String,
        options: RunOptions
    ) throws -> (handle: RunHandle, events: AsyncStream<NormalizedEvent>) {
        guard let claudePath = cliEnv.findClaudeBinary() else {
            throw RunManagerError.claudeNotFound
        }

        // Build command-line arguments
        var args = [
            "--output-format", "stream-json",
            "--verbose",
            "--max-turns", String(options.maxTurns ?? 200),
        ]

        // Append system prompt hint
        args += ["--append-system-prompt", cluiSystemHint]

        // Session resume
        if let sessionId = options.sessionId {
            args += ["--resume", sessionId]
        }

        // Model override
        if let model = options.model {
            args += ["--model", model]
        }

        // Hook settings path (for permission server)
        if let hookPath = options.hookSettingsPath {
            args += ["--settings", hookPath]
        }

        // Safe tools always allowed
        for tool in safeTools {
            args += ["--allowedTools", tool]
        }

        // Additional directories
        if let addDirs = options.addDirs {
            for dir in addDirs {
                args += ["--add-dir", dir]
            }
        }

        // The prompt itself
        args += ["--print", options.prompt]

        // Create the process
        let process = Process()
        process.executableURL = URL(fileURLWithPath: claudePath)
        process.arguments = args
        process.environment = cliEnv.getCliEnv()
        process.currentDirectoryURL = URL(fileURLWithPath: options.projectPath)

        let stdoutPipe = Pipe()
        let stderrPipe = Pipe()
        process.standardOutput = stdoutPipe
        process.standardError = stderrPipe

        let handle = RunHandle(runId: requestId, process: process)
        activeRuns[requestId] = handle

        // Create the event stream
        let (stream, continuation) = AsyncStream<NormalizedEvent>.makeStream()

        // Start reading stdout
        Task {
            var parser = StreamParser()
            var normalizer = EventNormalizer()

            let stdoutHandle = stdoutPipe.fileHandleForReading

            // Read stdout asynchronously
            for try await data in stdoutHandle.bytes(forStream: stdoutHandle) {
                let events = parser.feed(data)
                for raw in events {
                    let normalized = normalizer.normalize(raw)
                    for event in normalized {
                        continuation.yield(event)
                    }
                }
            }

            // Flush remaining
            let remaining = parser.flush()
            for raw in remaining {
                let normalized = normalizer.normalize(raw)
                for event in normalized {
                    continuation.yield(event)
                }
            }

            continuation.finish()
        }

        // Read stderr in background
        Task {
            let stderrHandle = stderrPipe.fileHandleForReading
            let data = stderrHandle.readDataToEndOfFile()
            if let text = String(data: data, encoding: .utf8) {
                for line in text.split(separator: "\n") {
                    await self.appendStderr(requestId: requestId, line: String(line))
                }
            }
        }

        // Handle process termination
        process.terminationHandler = { [weak self] proc in
            Task {
                await self?.handleTermination(requestId: requestId, exitCode: Int(proc.terminationStatus))
                continuation.finish()
            }
        }

        // Launch
        try process.run()

        return (handle, stream)
    }

    /// Cancel a running process.
    func cancel(_ requestId: String) -> Bool {
        guard let handle = activeRuns[requestId], handle.process.isRunning else { return false }
        handle.process.interrupt() // SIGINT
        // Give it a moment, then force kill if still running
        Task {
            try? await Task.sleep(for: .seconds(2))
            if handle.process.isRunning {
                handle.process.terminate() // SIGTERM
            }
        }
        return true
    }

    /// Check if a run is still active.
    func isRunning(_ requestId: String) -> Bool {
        activeRuns[requestId]?.process.isRunning ?? false
    }

    /// Get enriched error info for diagnostics.
    func getEnrichedError(_ requestId: String, exitCode: Int?) -> EnrichedError {
        let handle = activeRuns[requestId] ?? finishedRuns[requestId]
        return EnrichedError(
            message: "Process exited with code \(exitCode ?? -1)",
            stderrTail: handle?.stderrTail ?? [],
            stdoutTail: handle?.stdoutTail ?? [],
            exitCode: exitCode,
            elapsedMs: Int((Date().timeIntervalSince(handle?.startedAt ?? Date())) * 1000),
            toolCallCount: handle?.toolCallCount ?? 0,
            sawPermissionRequest: handle?.sawPermissionRequest ?? false
        )
    }

    // MARK: - Private

    private func appendStderr(requestId: String, line: String) {
        activeRuns[requestId]?.appendStderr(line)
    }

    private func handleTermination(requestId: String, exitCode: Int) {
        if let handle = activeRuns.removeValue(forKey: requestId) {
            finishedRuns[requestId] = handle
        }
    }
}

// MARK: - Helper: FileHandle async bytes

extension FileHandle {
    /// Read data from file handle as an AsyncSequence of Data chunks.
    func bytes(forStream handle: FileHandle) -> AsyncStream<Data> {
        AsyncStream { continuation in
            handle.readabilityHandler = { fileHandle in
                let data = fileHandle.availableData
                if data.isEmpty {
                    fileHandle.readabilityHandler = nil
                    continuation.finish()
                } else {
                    continuation.yield(data)
                }
            }
        }
    }
}

// MARK: - Errors

enum RunManagerError: LocalizedError {
    case claudeNotFound

    var errorDescription: String? {
        switch self {
        case .claudeNotFound:
            return "Claude CLI not found. Install with: npm install -g @anthropic-ai/claude-code"
        }
    }
}
