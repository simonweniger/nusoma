// SkillInstaller.swift — Skill provisioning on launch
// Ported from src/main/skills/installer.ts + manifest.ts

import Foundation

/// Defines a skill that NUSOMA auto-installs into ~/.claude/skills/
struct SkillEntry {
    let name: String
    let source: SkillSource
    let version: String
    let requiredFiles: [String]
}

enum SkillSource {
    case github(repo: String, path: String, commitSha: String)
    case bundled
}

/// Manifest of auto-installed skills (matches src/main/skills/manifest.ts)
let skillManifest: [SkillEntry] = [
    SkillEntry(
        name: "skill-creator",
        source: .github(
            repo: "anthropics/skills",
            path: "skills/skill-creator",
            commitSha: "b0cbd3df1533b396d281a6886d5132f623393a9c"
        ),
        version: "1.0.0",
        requiredFiles: [
            "SKILL.md",
            "agents/grader.md",
            "agents/comparator.md",
            "agents/analyzer.md",
            "references/schemas.md",
            "scripts/run_loop.py",
            "scripts/run_eval.py",
            "scripts/package_skill.py",
        ]
    ),
]

enum SkillState: String, Sendable {
    case pending, downloading, validating, installed, failed, skipped
}

struct SkillStatus: Sendable {
    let name: String
    let state: SkillState
    let error: String?
    let reason: String? // "up-to-date" | "user-managed"

    init(name: String, state: SkillState, error: String? = nil, reason: String? = nil) {
        self.name = name
        self.state = state
        self.error = error
        self.reason = reason
    }
}

/// Version metadata written to .nusoma-version in each skill directory
private struct VersionMeta: Codable {
    let version: String
    let source: String
    let installedBy: String
    let installedAt: String
}

/// Ensures all manifest skills are installed. Non-blocking, non-crashing.
final class SkillInstaller {

    private static let skillsDir: URL = {
        FileManager.default.homeDirectoryForCurrentUser
            .appendingPathComponent(".claude/skills")
    }()

    private static let versionFile = ".nusoma-version"

    static func ensureSkills(onStatus: @escaping @Sendable (SkillStatus) -> Void) async {
        for entry in skillManifest {
            onStatus(SkillStatus(name: entry.name, state: .pending))
            do {
                try await installSkill(entry, onStatus: onStatus)
            } catch {
                onStatus(SkillStatus(name: entry.name, state: .failed, error: error.localizedDescription))
            }
        }
    }

    private static func installSkill(_ entry: SkillEntry, onStatus: @escaping @Sendable (SkillStatus) -> Void) async throws {
        let targetDir = skillsDir.appendingPathComponent(entry.name)

        // Check if already installed
        if FileManager.default.fileExists(atPath: targetDir.path) {
            let meta = readVersionFile(targetDir)

            if meta == nil {
                // User-managed — don't touch
                onStatus(SkillStatus(name: entry.name, state: .skipped, reason: "user-managed"))
                return
            }

            if meta?.version == entry.version && meta?.installedBy == "nusoma" {
                // Validate required files
                if validateSkill(targetDir, requiredFiles: entry.requiredFiles) == nil {
                    onStatus(SkillStatus(name: entry.name, state: .skipped, reason: "up-to-date"))
                    return
                }
            }
        }

        // Ensure parent directory exists
        try FileManager.default.createDirectory(at: skillsDir, withIntermediateDirectories: true)

        switch entry.source {
        case .github(let repo, let path, let commitSha):
            try await installGithubSkill(entry: entry, repo: repo, path: path,
                                          commitSha: commitSha, onStatus: onStatus)
        case .bundled:
            onStatus(SkillStatus(name: entry.name, state: .skipped, reason: "bundled source not found"))
        }
    }

    private static func installGithubSkill(
        entry: SkillEntry, repo: String, path: String, commitSha: String,
        onStatus: @escaping @Sendable (SkillStatus) -> Void
    ) async throws {
        let targetDir = skillsDir.appendingPathComponent(entry.name)
        let tmpDir = skillsDir.appendingPathComponent(".tmp-\(entry.name)-\(UUID().uuidString.prefix(8))")

        onStatus(SkillStatus(name: entry.name, state: .downloading))

        try FileManager.default.createDirectory(at: tmpDir, withIntermediateDirectories: true)

        defer {
            // Clean up tmp on failure
            if FileManager.default.fileExists(atPath: tmpDir.path) {
                try? FileManager.default.removeItem(at: tmpDir)
            }
        }

        // Download pinned tarball and extract
        let pathDepth = path.components(separatedBy: "/").count + 1
        let tarballURL = "https://api.github.com/repos/\(repo)/tarball/\(commitSha)"
        let cmd = "curl -sL \"\(tarballURL)\" | tar -xz --strip-components=\(pathDepth) -C \"\(tmpDir.path)\" \"*/\(path)\""

        let process = Process()
        process.executableURL = URL(fileURLWithPath: "/bin/bash")
        process.arguments = ["-c", cmd]
        try process.run()
        process.waitUntilExit()

        guard process.terminationStatus == 0 else {
            throw SkillInstallerError.downloadFailed(entry.name)
        }

        // Validate
        onStatus(SkillStatus(name: entry.name, state: .validating))
        if let validationError = validateSkill(tmpDir, requiredFiles: entry.requiredFiles) {
            throw SkillInstallerError.validationFailed(validationError)
        }

        // Atomic swap
        if FileManager.default.fileExists(atPath: targetDir.path) {
            let existing = readVersionFile(targetDir)
            if existing?.installedBy == "nusoma" {
                try FileManager.default.removeItem(at: targetDir)
            } else {
                onStatus(SkillStatus(name: entry.name, state: .skipped, reason: "user-managed"))
                return
            }
        }

        try FileManager.default.moveItem(at: tmpDir, to: targetDir)
        writeVersionFile(targetDir, entry: entry)

        onStatus(SkillStatus(name: entry.name, state: .installed))
    }

    // MARK: - Helpers

    private static func readVersionFile(_ dir: URL) -> VersionMeta? {
        let file = dir.appendingPathComponent(versionFile)
        guard let data = try? Data(contentsOf: file) else { return nil }
        return try? JSONDecoder().decode(VersionMeta.self, from: data)
    }

    private static func writeVersionFile(_ dir: URL, entry: SkillEntry) {
        let sourceString: String
        switch entry.source {
        case .github(let repo, _, let sha): sourceString = "github:\(repo)@\(sha)"
        case .bundled: sourceString = "bundled"
        }

        let meta = VersionMeta(
            version: entry.version,
            source: sourceString,
            installedBy: "nusoma",
            installedAt: ISO8601DateFormatter().string(from: Date())
        )

        if let data = try? JSONEncoder().encode(meta) {
            try? data.write(to: dir.appendingPathComponent(versionFile))
        }
    }

    private static func validateSkill(_ dir: URL, requiredFiles: [String]) -> String? {
        for file in requiredFiles {
            let path = dir.appendingPathComponent(file)
            if !FileManager.default.fileExists(atPath: path.path) {
                return "Missing required file: \(file)"
            }
        }
        return nil
    }
}

enum SkillInstallerError: LocalizedError {
    case downloadFailed(String)
    case validationFailed(String)

    var errorDescription: String? {
        switch self {
        case .downloadFailed(let name): return "Failed to download skill: \(name)"
        case .validationFailed(let msg): return "Validation failed: \(msg)"
        }
    }
}
