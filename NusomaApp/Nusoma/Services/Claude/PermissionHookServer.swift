// PermissionHookServer.swift — Local HTTP hook server for Claude CLI PreToolUse hooks
// Ported from src/main/hooks/permission-server.ts
//
// Architecture:
// - Claude CLI is spawned with --settings pointing to a per-run JSON file
// - That JSON file configures a PreToolUse HTTP hook pointing to this server
// - When Claude wants to use a dangerous tool (Bash, Edit, Write, MultiEdit, mcp__*),
//   it POSTs the tool request here
// - This server checks scoped-allows, safe-bash auto-approve, then either:
//   a) Auto-approves (auto mode or scoped allow)
//   b) Forwards to the UI as a permission request, waits for user decision
// - Returns a structured hook response (allow/deny) to Claude CLI
//
// Security:
// - Per-launch app secret in URL path (prevents local spoofing)
// - Per-run token in URL path (prevents cross-run confusion)
// - Deny-by-default on every failure path
// - Per-run settings files with 0600 permissions
// - 5-minute timeout on pending requests

import Foundation

// MARK: - Constants

private let permissionTimeoutSeconds: TimeInterval = 300 // 5 minutes
private let defaultPort: UInt16 = 19836
private let maxBodySize = 1024 * 1024 // 1 MB

/// Tools that need explicit user approval via the permission card.
let permissionRequiredTools: Set<String> = ["Bash", "Edit", "Write", "MultiEdit"]

/// Bash commands that are safe (read-only) to auto-approve.
private let safeBashCommands: Set<String> = [
    // Info / help
    "cat", "head", "tail", "less", "more", "wc", "file", "stat",
    "ls", "pwd", "echo", "printf", "date", "whoami", "hostname", "uname",
    "which", "whence", "where", "type", "command",
    "man", "help", "info",
    // Search
    "find", "grep", "rg", "ag", "ack", "fd", "fzf", "locate",
    // Git (further checked for mutating subcommands)
    "git",
    // Env / config
    "env", "printenv", "set",
    // Package info (read-only)
    "npm", "yarn", "pnpm", "bun", "cargo", "pip", "pip3", "go", "rustup",
    "node", "python", "python3", "ruby", "java", "javac",
    // Claude CLI (read-only subcommands)
    "claude",
    // Disk / system info
    "df", "du", "free", "top", "htop", "ps", "uptime", "lsof",
    "tree", "realpath", "dirname", "basename",
    // macOS
    "sw_vers", "system_profiler", "defaults", "mdls", "mdfind",
    // Diff / compare
    "diff", "cmp", "comm", "sort", "uniq", "cut", "awk", "sed",
    "jq", "yq", "xargs", "tr",
]

/// Git subcommands that mutate state.
private let gitMutatingSubcommands: Set<String> = [
    "push", "commit", "merge", "rebase", "reset", "checkout", "switch",
    "branch", "tag", "stash", "cherry-pick", "revert", "am", "apply",
    "clean", "rm", "mv", "restore", "bisect", "pull", "fetch", "clone",
    "init", "submodule", "worktree", "gc", "prune", "filter-branch",
]

/// Package manager subcommands that mutate state.
private let packageMutatingSubcommands: Set<String> = [
    "install", "i", "add", "remove", "uninstall", "publish", "run",
    "exec", "dlx", "npx", "create", "init", "link", "unlink", "pack", "deprecate",
]

/// Regex matcher for the hook config.
private let hookMatcher = "^(Bash|Edit|Write|MultiEdit|mcp__.*)$"

/// Valid decision IDs.
private let validAllowDecisions: Set<String> = ["allow", "allow-session", "allow-domain"]
private let validDecisions: Set<String> = ["allow", "allow-session", "allow-domain", "deny"]

// MARK: - Data Types

struct HookToolRequest: @unchecked Sendable {
    let sessionId: String
    let transcriptPath: String?
    let cwd: String?
    let permissionMode: String?
    let hookEventName: String
    let toolName: String
    let toolInput: [String: Any]
    let toolUseId: String?
}

struct HookPermissionDecision {
    let decision: String  // "allow" or "deny"
    let reason: String?
}

// MARK: - Pending Request

private class PendingRequest {
    let toolRequest: HookToolRequest
    let questionId: String
    let runToken: String
    let continuation: CheckedContinuation<HookPermissionDecision, Never>
    var timeoutTask: Task<Void, Never>?

    init(toolRequest: HookToolRequest, questionId: String, runToken: String,
         continuation: CheckedContinuation<HookPermissionDecision, Never>) {
        self.toolRequest = toolRequest
        self.questionId = questionId
        self.runToken = runToken
        self.continuation = continuation
    }
}

// MARK: - Run Registration

private struct RunRegistration {
    let tabId: String
    let requestId: String
    var sessionId: String?
}

// MARK: - Permission Event

struct PermissionHookEvent: Sendable {
    let questionId: String
    let toolRequest: HookToolRequest
    let tabId: String
    let options: [PermissionOption]
}

// MARK: - PermissionHookServer

/// Local HTTP server that acts as a Claude Code PreToolUse hook handler.
actor PermissionHookServer {
    private var listener: Task<Void, Never>?
    private var serverSocket: Int32 = -1
    private var port: UInt16
    private var actualPort: UInt16?
    private let appSecret: String

    // Run token registry
    private var runTokens: [String: RunRegistration] = [:]

    // Pending permission requests
    private var pendingRequests: [String: PendingRequest] = [:]

    // Scoped allow keys (session:X:tool:Y or session:X:webfetch:domain)
    private var scopedAllows: Set<String> = []

    // Generated settings files: runToken → filePath
    private var settingsFiles: [String: String] = [:]

    // Permission mode
    private var permissionMode: String = "ask"

    // Event stream for forwarding permission requests to UI
    private let eventContinuation: AsyncStream<PermissionHookEvent>.Continuation
    let events: AsyncStream<PermissionHookEvent>

    init(port: UInt16 = defaultPort) {
        self.port = port
        self.appSecret = UUID().uuidString
        let (stream, continuation) = AsyncStream<PermissionHookEvent>.makeStream()
        self.events = stream
        self.eventContinuation = continuation
    }

    // MARK: - Lifecycle

    func start() async throws -> UInt16 {
        guard serverSocket < 0 else {
            return actualPort ?? port
        }

        // Create socket
        let sock = socket(AF_INET, SOCK_STREAM, 0)
        guard sock >= 0 else {
            throw PermissionServerError.socketCreationFailed
        }

        // Set SO_REUSEADDR
        var yes: Int32 = 1
        setsockopt(sock, SOL_SOCKET, SO_REUSEADDR, &yes, socklen_t(MemoryLayout<Int32>.size))

        // Try binding to port, incrementing if in use
        var currentPort = port
        var bound = false
        for _ in 0..<10 {
            var addr = sockaddr_in()
            addr.sin_len = UInt8(MemoryLayout<sockaddr_in>.size)
            addr.sin_family = sa_family_t(AF_INET)
            addr.sin_port = currentPort.bigEndian
            addr.sin_addr = in_addr(s_addr: INADDR_LOOPBACK.bigEndian)

            let result = withUnsafePointer(to: &addr) { ptr in
                ptr.withMemoryRebound(to: sockaddr.self, capacity: 1) { sockPtr in
                    bind(sock, sockPtr, socklen_t(MemoryLayout<sockaddr_in>.size))
                }
            }

            if result == 0 {
                bound = true
                break
            }
            currentPort += 1
        }

        guard bound else {
            close(sock)
            throw PermissionServerError.bindFailed
        }

        guard listen(sock, 16) == 0 else {
            close(sock)
            throw PermissionServerError.listenFailed
        }

        serverSocket = sock
        actualPort = currentPort
        print("[PermissionHookServer] Listening on 127.0.0.1:\(currentPort)")

        // Start accept loop
        listener = Task {
            await acceptLoop()
        }

        return currentPort
    }

    func stop() {
        // Deny all pending requests
        for (_, pending) in pendingRequests {
            pending.timeoutTask?.cancel()
            pending.continuation.resume(returning: HookPermissionDecision(decision: "deny", reason: "Server shutting down"))
        }
        pendingRequests.removeAll()

        // Clean up settings files
        for (_, filePath) in settingsFiles {
            try? FileManager.default.removeItem(atPath: filePath)
        }
        settingsFiles.removeAll()

        // Close socket
        listener?.cancel()
        if serverSocket >= 0 {
            close(serverSocket)
            serverSocket = -1
        }

        eventContinuation.finish()
        print("[PermissionHookServer] Stopped")
    }

    func getPort() -> UInt16? { actualPort }

    func setPermissionMode(_ mode: String) {
        permissionMode = mode
    }

    // MARK: - Run Registration

    func registerRun(tabId: String, requestId: String, sessionId: String?) -> String {
        let runToken = UUID().uuidString
        runTokens[runToken] = RunRegistration(tabId: tabId, requestId: requestId, sessionId: sessionId)
        return runToken
    }

    func unregisterRun(_ runToken: String) {
        // Deny any pending requests for this run
        for (qid, pending) in pendingRequests where pending.runToken == runToken {
            pending.timeoutTask?.cancel()
            pending.continuation.resume(returning: HookPermissionDecision(decision: "deny", reason: "Run ended"))
            pendingRequests.removeValue(forKey: qid)
        }

        // Clean up settings file
        if let filePath = settingsFiles.removeValue(forKey: runToken) {
            try? FileManager.default.removeItem(atPath: filePath)
        }

        runTokens.removeValue(forKey: runToken)
    }

    // MARK: - Permission Response

    func respondToPermission(questionId: String, decision: String, reason: String? = nil) -> Bool {
        guard let pending = pendingRequests.removeValue(forKey: questionId) else {
            return false
        }

        pending.timeoutTask?.cancel()

        // Fail-closed: reject unknown decision IDs
        guard validDecisions.contains(decision) else {
            pending.continuation.resume(returning: HookPermissionDecision(decision: "deny", reason: "Unknown decision: \(decision)"))
            return true
        }

        let toolName = pending.toolRequest.toolName
        let sessionId = pending.toolRequest.sessionId

        // Handle scoped "allow always" decisions
        if decision == "allow-session" {
            scopedAllows.insert("session:\(sessionId):tool:\(toolName)")
        } else if decision == "allow-domain" {
            if let url = pending.toolRequest.toolInput["url"] as? String,
               let domain = extractDomain(url) {
                scopedAllows.insert("session:\(sessionId):webfetch:\(domain)")
            }
        }

        let hookDecision = validAllowDecisions.contains(decision) ? "allow" : "deny"
        pending.continuation.resume(returning: HookPermissionDecision(decision: hookDecision, reason: reason))
        return true
    }

    // MARK: - Settings File Generation

    func generateSettingsFile(runToken: String) -> String {
        let port = actualPort ?? self.port
        let url = "http://127.0.0.1:\(port)/hook/pre-tool-use/\(appSecret)/\(runToken)"

        let settings: [String: Any] = [
            "hooks": [
                "PreToolUse": [
                    [
                        "matcher": hookMatcher,
                        "hooks": [
                            [
                                "type": "http",
                                "url": url,
                                "timeout": 300,
                            ]
                        ]
                    ]
                ]
            ]
        ]

        let dir = NSTemporaryDirectory() + "nusoma-hook-config"
        try? FileManager.default.createDirectory(atPath: dir, withIntermediateDirectories: true, attributes: [.posixPermissions: 0o700])

        let filePath = "\(dir)/nusoma-hook-\(runToken).json"
        if let data = try? JSONSerialization.data(withJSONObject: settings, options: .prettyPrinted) {
            FileManager.default.createFile(atPath: filePath, contents: data, attributes: [.posixPermissions: 0o600])
        }

        settingsFiles[runToken] = filePath
        return filePath
    }

    // MARK: - Permission Options

    func getOptionsForTool(_ toolName: String, toolInput: [String: Any]? = nil) -> [PermissionOption] {
        if toolName == "Bash" {
            return [
                PermissionOption(id: "allow", label: "Allow Once", kind: "allow"),
                PermissionOption(id: "deny", label: "Deny", kind: "deny"),
            ]
        }

        return [
            PermissionOption(id: "allow", label: "Allow Once", kind: "allow"),
            PermissionOption(id: "allow-session", label: "Allow for Session", kind: "allow"),
            PermissionOption(id: "deny", label: "Deny", kind: "deny"),
        ]
    }

    // MARK: - Accept Loop

    private func acceptLoop() async {
        let sock = serverSocket
        while !Task.isCancelled && sock >= 0 {
            // Run blocking accept() on a background thread to avoid blocking the actor
            let clientSock = await withCheckedContinuation { continuation in
                DispatchQueue.global().async {
                    let client = accept(sock, nil, nil)
                    continuation.resume(returning: client)
                }
            }
            guard clientSock >= 0 else { continue }

            // Handle each connection in its own task
            Task {
                await handleConnection(clientSock)
            }
        }
    }

    // MARK: - HTTP Request Handling

    private func handleConnection(_ sock: Int32) async {
        defer { close(sock) }

        // Read the full HTTP request
        guard let rawRequest = readHTTPRequest(sock) else {
            sendResponse(sock, status: 400, body: denyResponseJSON("Bad request"))
            return
        }

        // Only POST allowed
        guard rawRequest.method == "POST" else {
            sendResponse(sock, status: 404, body: denyResponseJSON("Not found"))
            return
        }

        // Parse URL: /hook/pre-tool-use/<appSecret>/<runToken>
        let segments = rawRequest.path.split(separator: "/").map(String.init)
        guard segments.count == 4,
              segments[0] == "hook",
              segments[1] == "pre-tool-use" else {
            sendResponse(sock, status: 404, body: denyResponseJSON("Invalid path"))
            return
        }

        let urlSecret = segments[2]
        let urlToken = segments[3]

        // Validate app secret
        guard urlSecret == appSecret else {
            sendResponse(sock, status: 403, body: denyResponseJSON("Invalid credentials"))
            return
        }

        // Validate run token
        guard let registration = runTokens[urlToken] else {
            sendResponse(sock, status: 403, body: denyResponseJSON("Unknown run"))
            return
        }

        // Parse JSON body
        guard let bodyData = rawRequest.body.data(using: .utf8),
              let json = try? JSONSerialization.jsonObject(with: bodyData) as? [String: Any],
              let toolName = json["tool_name"] as? String,
              let sessionId = json["session_id"] as? String,
              let hookEventName = json["hook_event_name"] as? String,
              hookEventName == "PreToolUse" else {
            sendResponse(sock, status: 400, body: denyResponseJSON("Invalid request"))
            return
        }

        let toolRequest = HookToolRequest(
            sessionId: sessionId,
            transcriptPath: json["transcript_path"] as? String,
            cwd: json["cwd"] as? String,
            permissionMode: json["permission_mode"] as? String,
            hookEventName: hookEventName,
            toolName: toolName,
            toolInput: json["tool_input"] as? [String: Any] ?? [:],
            toolUseId: json["tool_use_id"] as? String
        )

        // Check scoped allows
        if scopedAllows.contains("session:\(sessionId):tool:\(toolName)") {
            sendResponse(sock, status: 200, body: allowResponseJSON("Allowed for session by user"))
            return
        }

        // Check domain-scoped allow (WebFetch)
        if toolName == "WebFetch", let url = toolRequest.toolInput["url"] as? String,
           let domain = extractDomain(url),
           scopedAllows.contains("session:\(sessionId):webfetch:\(domain)") {
            sendResponse(sock, status: 200, body: allowResponseJSON("Domain \(domain) allowed by user"))
            return
        }

        // Auto-approve safe Bash commands
        if toolName == "Bash", let command = toolRequest.toolInput["command"] as? String,
           isSafeBashCommand(command) {
            sendResponse(sock, status: 200, body: allowResponseJSON("Safe read-only command"))
            return
        }

        // Auto mode: immediately allow
        if permissionMode == "auto" {
            sendResponse(sock, status: 200, body: allowResponseJSON("Auto mode"))
            return
        }

        // Generate question ID and wait for user decision
        let questionId = "hook-\(Int(Date().timeIntervalSince1970 * 1000))-\(UUID().uuidString.prefix(8))"
        let options = getOptionsForTool(toolName, toolInput: toolRequest.toolInput)

        let decision = await withCheckedContinuation { (continuation: CheckedContinuation<HookPermissionDecision, Never>) in
            let pending = PendingRequest(
                toolRequest: toolRequest,
                questionId: questionId,
                runToken: urlToken,
                continuation: continuation
            )

            // Set timeout
            pending.timeoutTask = Task {
                try? await Task.sleep(for: .seconds(permissionTimeoutSeconds))
                if pendingRequests[questionId] != nil {
                    pendingRequests.removeValue(forKey: questionId)
                    continuation.resume(returning: HookPermissionDecision(decision: "deny", reason: "Timed out after 5 minutes"))
                }
            }

            pendingRequests[questionId] = pending

            // Emit permission request to UI
            eventContinuation.yield(PermissionHookEvent(
                questionId: questionId,
                toolRequest: toolRequest,
                tabId: registration.tabId,
                options: options
            ))
        }

        // Return structured hook response
        if decision.decision == "allow" {
            sendResponse(sock, status: 200, body: allowResponseJSON(decision.reason ?? "Approved by user"))
        } else {
            sendResponse(sock, status: 200, body: denyResponseJSON(decision.reason ?? "Denied by user"))
        }
    }

    // MARK: - HTTP Helpers

    private struct RawHTTPRequest {
        let method: String
        let path: String
        let headers: [String: String]
        let body: String
    }

    private func readHTTPRequest(_ sock: Int32) -> RawHTTPRequest? {
        var buffer = Data(count: maxBodySize)
        let bytesRead = buffer.withUnsafeMutableBytes { ptr in
            recv(sock, ptr.baseAddress!, maxBodySize, 0)
        }
        guard bytesRead > 0 else { return nil }
        buffer.count = bytesRead

        guard let raw = String(data: buffer, encoding: .utf8) else { return nil }

        // Split headers and body
        let parts = raw.components(separatedBy: "\r\n\r\n")
        guard parts.count >= 1 else { return nil }

        let headerSection = parts[0]
        let body = parts.count > 1 ? parts.dropFirst().joined(separator: "\r\n\r\n") : ""

        let headerLines = headerSection.components(separatedBy: "\r\n")
        guard let requestLine = headerLines.first else { return nil }

        let requestParts = requestLine.split(separator: " ")
        guard requestParts.count >= 2 else { return nil }

        let method = String(requestParts[0])
        let path = String(requestParts[1])

        var headers: [String: String] = [:]
        for line in headerLines.dropFirst() {
            if let colonIdx = line.firstIndex(of: ":") {
                let key = String(line[..<colonIdx]).trimmingCharacters(in: .whitespaces).lowercased()
                let value = String(line[line.index(after: colonIdx)...]).trimmingCharacters(in: .whitespaces)
                headers[key] = value
            }
        }

        return RawHTTPRequest(method: method, path: path, headers: headers, body: body)
    }

    private func sendResponse(_ sock: Int32, status: Int, body: String) {
        let statusText: String
        switch status {
        case 200: statusText = "OK"
        case 400: statusText = "Bad Request"
        case 403: statusText = "Forbidden"
        case 404: statusText = "Not Found"
        case 413: statusText = "Payload Too Large"
        default: statusText = "Error"
        }

        let response = """
        HTTP/1.1 \(status) \(statusText)\r
        Content-Type: application/json\r
        Content-Length: \(body.utf8.count)\r
        Connection: close\r
        \r
        \(body)
        """

        _ = response.withCString { ptr in
            send(sock, ptr, strlen(ptr), 0)
        }
    }

    // MARK: - Hook Response JSON

    private func allowResponseJSON(_ reason: String) -> String {
        return """
        {"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"allow","permissionDecisionReason":"\(escapeJSON(reason))"}}
        """
    }

    private func denyResponseJSON(_ reason: String) -> String {
        return """
        {"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"\(escapeJSON(reason))"}}
        """
    }

    private func escapeJSON(_ s: String) -> String {
        s.replacingOccurrences(of: "\\", with: "\\\\")
         .replacingOccurrences(of: "\"", with: "\\\"")
         .replacingOccurrences(of: "\n", with: "\\n")
    }
}

// MARK: - Safe Bash Command Check

/// Check if a Bash command string is safe (read-only).
func isSafeBashCommand(_ command: String) -> Bool {
    let trimmed = command.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !trimmed.isEmpty else { return false }

    // Split on chaining operators and check each segment
    let segments = trimmed.components(separatedBy: CharacterSet(charactersIn: ";|&"))

    for segment in segments {
        let parts = segment.trimmingCharacters(in: .whitespaces).split(separator: " ")
        guard let first = parts.first else { continue }

        // Handle env prefix (VAR=val command)
        let cmd: String
        if first.contains("="), parts.count > 1 {
            cmd = String(parts[1])
        } else {
            cmd = String(first)
        }

        // Strip path prefix
        let base = cmd.split(separator: "/").last.map(String.init) ?? cmd

        guard safeBashCommands.contains(base) else { return false }

        // Git: only read-only subcommands
        if base == "git" {
            let subIdx = first.contains("=") ? 2 : 1
            if subIdx < parts.count {
                let sub = String(parts[subIdx])
                if gitMutatingSubcommands.contains(sub) { return false }
            }
        }

        // Package managers: block mutating subcommands
        if ["npm", "yarn", "pnpm", "bun"].contains(base) {
            let subIdx = first.contains("=") ? 2 : 1
            if subIdx < parts.count {
                let sub = String(parts[subIdx])
                if packageMutatingSubcommands.contains(sub) { return false }
            }
        }

        // Block output redirections that write to files
        if segment.contains(">") && !segment.contains(">/dev/null") && !segment.contains("2>/dev/null") && !segment.contains("2>&1") {
            return false
        }
    }

    return true
}

// MARK: - Domain Extraction

private func extractDomain(_ urlString: String) -> String? {
    URL(string: urlString)?.host
}

// MARK: - Sensitive Field Masking

func maskSensitiveFields(_ input: [String: Any]) -> [String: Any] {
    let sensitivePattern = try! NSRegularExpression(pattern: "token|password|secret|key|auth|credential|api.?key", options: .caseInsensitive)

    var masked: [String: Any] = [:]
    for (key, value) in input {
        let range = NSRange(key.startIndex..., in: key)
        if sensitivePattern.firstMatch(in: key, range: range) != nil {
            masked[key] = "***"
        } else if let dict = value as? [String: Any] {
            masked[key] = maskSensitiveFields(dict)
        } else {
            masked[key] = value
        }
    }
    return masked
}

// MARK: - Errors

enum PermissionServerError: LocalizedError {
    case socketCreationFailed
    case bindFailed
    case listenFailed

    var errorDescription: String? {
        switch self {
        case .socketCreationFailed: return "Failed to create server socket"
        case .bindFailed: return "Failed to bind to any port (tried 10 ports)"
        case .listenFailed: return "Failed to start listening"
        }
    }
}
