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
final class RunHandle: @unchecked Sendable {
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

        // -p enables print mode; prompt is a positional argument at the end
        args += ["-p", options.prompt]

        // Create the process — must launch via shell because the Bun-compiled
        // claude binary doesn't load when spawned directly from a GUI app.
        let process = Process()
        process.executableURL = URL(fileURLWithPath: "/bin/zsh")

        // Expand ~ to home directory
        let resolvedPath = options.projectPath == "~"
            ? NSHomeDirectory()
            : NSString(string: options.projectPath).expandingTildeInPath

        // Build shell command: cd + exec claude (exec replaces the shell process)
        let escapedArgs = args.map { arg in
            "'" + arg.replacingOccurrences(of: "'", with: "'\\''") + "'"
        }.joined(separator: " ")
        let shellCommand = "cd '\(resolvedPath.replacingOccurrences(of: "'", with: "'\\''"))' && exec '\(claudePath)' \(escapedArgs)"
        process.arguments = ["-c", shellCommand]
        process.environment = cliEnv.getCliEnv()
        process.standardInput = FileHandle.nullDevice  // Prevent any stdin reads
        print("[RunManager] Resolved working dir: \(resolvedPath)")

        let stdoutPipe = Pipe()
        let stderrPipe = Pipe()
        process.standardOutput = stdoutPipe
        process.standardError = stderrPipe

        let handle = RunHandle(runId: requestId, process: process)
        activeRuns[requestId] = handle

        // Create the event stream
        let (stream, continuation) = AsyncStream<NormalizedEvent>.makeStream()

        // Start reading stdout on a background dispatch queue (blocking read loop)
        let stdoutHandle = stdoutPipe.fileHandleForReading
        DispatchQueue.global(qos: .userInitiated).async {
            var parser = StreamParser()
            var normalizer = EventNormalizer()

            print("[RunManager] Starting stdout reader (blocking)...")
            while true {
                let data = stdoutHandle.availableData
                if data.isEmpty {
                    print("[RunManager] stdout EOF")
                    break
                }
                print("[RunManager] Got \(data.count) bytes from stdout")
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
        let stderrHandle = stderrPipe.fileHandleForReading
        let reqIdForStderr = requestId
        DispatchQueue.global(qos: .utility).async {
            let data = stderrHandle.readDataToEndOfFile()
            if let text = String(data: data, encoding: .utf8), !text.isEmpty {
                print("[RunManager] STDERR: \(text.prefix(500))")
                let lines = text.split(separator: "\n").map(String.init)
                Task { [weak self] in
                    for line in lines {
                        await self?.appendStderr(requestId: reqIdForStderr, line: line)
                    }
                }
            }
        }

        // Handle process termination
        let reqId = requestId
        process.terminationHandler = { [weak self] proc in
            let exitCode = Int(proc.terminationStatus)
            print("[RunManager] Process terminated, exit code: \(exitCode)")
            Task {
                await self?.handleTermination(requestId: reqId, exitCode: exitCode)
                continuation.finish()
            }
        }

        // Launch
        print("[RunManager] Launching: \(claudePath) \(args.joined(separator: " ").prefix(200))...")
        print("[RunManager] Working dir: \(options.projectPath)")
        do {
            try process.run()
            print("[RunManager] Process launched, PID: \(process.processIdentifier)")
        } catch {
            print("[RunManager] LAUNCH FAILED: \(error)")
            continuation.finish()
            throw error
        }

        // Check if process died immediately
        DispatchQueue.global().asyncAfter(deadline: .now() + 1.0) {
            if !process.isRunning {
                let exit = process.terminationStatus
                let stderr = String(data: stderrPipe.fileHandleForReading.availableData, encoding: .utf8) ?? ""
                print("[RunManager] Process died immediately! Exit: \(exit), stderr: \(stderr.prefix(500))")
            }
        }

        return (handle, stream)
    }

    /// Cancel a running process.
    func cancel(_ requestId: String) -> Bool {
        guard let handle = activeRuns[requestId], handle.process.isRunning else { return false }
        let process = handle.process
        process.interrupt() // SIGINT
        // Give it a moment, then force kill if still running
        Task {
            try? await Task.sleep(for: .seconds(2))
            if process.isRunning {
                process.terminate() // SIGTERM
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
