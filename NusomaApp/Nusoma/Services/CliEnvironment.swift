// CliEnvironment.swift — CLI path resolution and environment setup
// Ported from src/main/cli-env.ts

import Foundation

/// Resolves the Claude CLI binary path and constructs the environment
/// needed to run Claude Code from a non-terminal context.
struct CliEnvironment {
    /// Common locations where Claude CLI might be installed
    private static let searchPaths = [
        "/usr/local/bin/claude",
        "/opt/homebrew/bin/claude",
        "\(NSHomeDirectory())/.local/bin/claude",
        "\(NSHomeDirectory())/.claude/local/claude",
        "/usr/bin/claude",
    ]

    /// Find the Claude CLI binary path.
    func findClaudeBinary() -> String? {
        // 1. Check common paths
        for path in Self.searchPaths {
            if FileManager.default.isExecutableFile(atPath: path) {
                return path
            }
        }

        // 2. Try `which claude` via shell
        if let path = shellWhich("claude") {
            return path
        }

        return nil
    }

    /// Get environment variables for spawning Claude CLI.
    /// Merges the current process environment with PATH additions
    /// to ensure Homebrew, nvm, etc. are accessible.
    func getCliEnv() -> [String: String] {
        var env = ProcessInfo.processInfo.environment

        // Ensure common binary directories are in PATH
        let extraPaths = [
            "/usr/local/bin",
            "/opt/homebrew/bin",
            "\(NSHomeDirectory())/.local/bin",
            "\(NSHomeDirectory())/.claude/local",
            "/usr/bin",
            "/bin",
        ]

        let currentPath = env["PATH"] ?? "/usr/bin:/bin"
        let pathComponents = Set(currentPath.split(separator: ":").map(String.init))
        let missingPaths = extraPaths.filter { !pathComponents.contains($0) }

        if !missingPaths.isEmpty {
            env["PATH"] = (missingPaths + [currentPath]).joined(separator: ":")
        }

        return env
    }

    /// Fetch static CLI info (version, auth, MCP servers).
    func fetchStaticInfo() async -> StaticInfo? {
        guard let claudePath = findClaudeBinary() else { return nil }
        let env = getCliEnv()

        async let version = runCommand(claudePath, args: ["-v"], env: env)
        async let authRaw = runCommand(claudePath, args: ["auth", "status"], env: env)
        async let mcpRaw = runCommand(claudePath, args: ["mcp", "list"], env: env)

        let versionResult = await version ?? "unknown"

        var email: String?
        var subscriptionType: String?

        if let authJson = await authRaw,
           let data = authJson.data(using: .utf8),
           let auth = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
            email = auth["email"] as? String
            subscriptionType = auth["subscriptionType"] as? String
        }

        return StaticInfo(
            version: versionResult.trimmingCharacters(in: .whitespacesAndNewlines),
            email: email,
            subscriptionType: subscriptionType,
            projectPath: FileManager.default.currentDirectoryPath,
            homePath: NSHomeDirectory()
        )
    }

    // MARK: - Private

    private func shellWhich(_ command: String) -> String? {
        let process = Process()
        process.executableURL = URL(fileURLWithPath: "/bin/zsh")
        process.arguments = ["-lc", "whence -p \(command)"]
        process.environment = getCliEnv()

        let pipe = Pipe()
        process.standardOutput = pipe
        process.standardError = Pipe()

        do {
            try process.run()
            process.waitUntilExit()

            let data = pipe.fileHandleForReading.readDataToEndOfFile()
            guard let output = String(data: data, encoding: .utf8)?.trimmingCharacters(in: .whitespacesAndNewlines),
                  !output.isEmpty else { return nil }

            // Extract absolute path (strip ANSI escape sequences)
            return extractAbsolutePath(output)
        } catch {
            return nil
        }
    }

    /// Run a command and return stdout as a string.
    private func runCommand(_ path: String, args: [String], env: [String: String]) async -> String? {
        await withCheckedContinuation { continuation in
            let process = Process()
            process.executableURL = URL(fileURLWithPath: path)
            process.arguments = args
            process.environment = env

            let pipe = Pipe()
            process.standardOutput = pipe
            process.standardError = Pipe()

            do {
                try process.run()
                process.waitUntilExit()

                let data = pipe.fileHandleForReading.readDataToEndOfFile()
                let output = String(data: data, encoding: .utf8)
                continuation.resume(returning: output)
            } catch {
                continuation.resume(returning: nil)
            }
        }
    }

    /// Extract an absolute path from shell output, stripping ANSI escape sequences.
    private func extractAbsolutePath(_ raw: String) -> String? {
        // Strip ANSI escape sequences
        let stripped = raw.replacingOccurrences(
            of: "\\x1B\\[[0-9;]*[a-zA-Z]",
            with: "",
            options: .regularExpression
        )

        // Find the first line starting with /
        for line in stripped.split(separator: "\n") {
            let trimmed = line.trimmingCharacters(in: .whitespacesAndNewlines)
            if trimmed.hasPrefix("/") {
                return trimmed
            }
        }
        return nil
    }
}
