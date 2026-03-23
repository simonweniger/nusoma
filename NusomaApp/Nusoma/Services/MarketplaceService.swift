// MarketplaceService.swift — Catalog fetch, install/uninstall plugins
// Ported from src/main/marketplace/catalog.ts

import Foundation

@MainActor
@Observable
final class MarketplaceService {

    // MARK: - Source Definitions

    private static let sources: [(repo: String, category: String)] = [
        ("anthropics/skills", "Agent Skills"),
        ("anthropics/knowledge-work-plugins", "Knowledge Work"),
        ("anthropics/financial-services-plugins", "Financial Services"),
    ]

    // MARK: - Cache

    private var cachedPlugins: [CatalogPlugin]?
    private var cacheTimestamp: Date?
    private let cacheTTL: TimeInterval = 5 * 60 // 5 minutes

    /// Cached raw SKILL.md content keyed by skill name for direct installation
    private var skillContentCache: [String: String] = [:]

    // MARK: - Fetch Catalog

    func fetchCatalog(forceRefresh: Bool = false) async -> (plugins: [CatalogPlugin], error: String?) {
        if !forceRefresh,
           let cached = cachedPlugins,
           let timestamp = cacheTimestamp,
           Date().timeIntervalSince(timestamp) < cacheTTL {
            return (cached, nil)
        }

        var allPlugins: [CatalogPlugin] = []
        var errors: [String] = []

        await withTaskGroup(of: Result<[CatalogPlugin], Error>.self) { group in
            for source in Self.sources {
                group.addTask {
                    do {
                        return .success(try await self.fetchSource(repo: source.repo, category: source.category))
                    } catch {
                        return .failure(error)
                    }
                }
            }

            for await result in group {
                switch result {
                case .success(let plugins):
                    allPlugins.append(contentsOf: plugins)
                case .failure(let error):
                    errors.append(error.localizedDescription)
                }
            }
        }

        if allPlugins.isEmpty && !errors.isEmpty {
            return ([], errors.joined(separator: "; "))
        }

        allPlugins.sort { $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedAscending }
        cachedPlugins = allPlugins
        cacheTimestamp = Date()

        return (allPlugins, nil)
    }

    // MARK: - Fetch Single Source

    private func fetchSource(repo: String, category: String) async throws -> [CatalogPlugin] {
        let marketplaceURL = URL(string: "https://raw.githubusercontent.com/\(repo)/main/.claude-plugin/marketplace.json")!
        let (data, response) = try await URLSession.shared.data(from: marketplaceURL)

        guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
            throw MarketplaceError.fetchFailed(repo)
        }

        guard let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
              let marketplaceName = json["name"] as? String,
              let pluginEntries = json["plugins"] as? [[String: Any]] else {
            throw MarketplaceError.parseFailed(repo)
        }

        var plugins: [CatalogPlugin] = []

        for entry in pluginEntries {
            guard let entryName = entry["name"] as? String else { continue }
            let entryDescription = entry["description"] as? String ?? ""
            let entryAuthor: String = {
                if let author = entry["author"] as? String { return author }
                if let authorObj = entry["author"] as? [String: Any] { return authorObj["name"] as? String ?? "Anthropic" }
                return "Anthropic"
            }()

            if let skills = entry["skills"] as? [String], !skills.isEmpty {
                // Skills repo: each skill path becomes its own entry
                for skillRef in skills {
                    let skillPath = skillRef
                        .replacingOccurrences(of: "^\\./", with: "", options: .regularExpression)
                        .replacingOccurrences(of: "/$", with: "", options: .regularExpression)
                    let installName = skillPath.components(separatedBy: "/").last ?? entryName

                    // Fetch SKILL.md for name/description
                    var name = installName
                    var description = entryDescription

                    if let skillData = try? await fetchSkillMd(repo: repo, path: skillPath) {
                        let parsed = Self.parseSkillFrontmatter(skillData)
                        if !parsed.name.isEmpty { name = parsed.name }
                        if !parsed.description.isEmpty { description = parsed.description }
                        skillContentCache[installName] = skillData
                    }

                    plugins.append(CatalogPlugin(
                        id: "\(repo)/\(skillPath)",
                        name: name,
                        description: description,
                        version: "0.0.0",
                        author: entryAuthor,
                        marketplace: marketplaceName,
                        repo: repo,
                        sourcePath: skillPath,
                        installName: installName,
                        category: category,
                        tags: Self.deriveSemanticTags(name: name, description: description, path: skillPath),
                        isSkillMd: true
                    ))
                }
            } else {
                // Standard plugin
                let source = (entry["source"] as? String ?? "")
                    .replacingOccurrences(of: "^\\./", with: "", options: .regularExpression)
                    .replacingOccurrences(of: "/$", with: "", options: .regularExpression)
                let sourcePath = source.isEmpty ? entryName : source

                var name = entryName
                var description = entryDescription
                var version = "0.0.0"
                var author = entryAuthor

                // Try fetching plugin.json
                let pluginURL = URL(string: "https://raw.githubusercontent.com/\(repo)/main/\(sourcePath)/.claude-plugin/plugin.json")!
                if let (pluginData, pluginResponse) = try? await URLSession.shared.data(from: pluginURL),
                   let pluginHttp = pluginResponse as? HTTPURLResponse,
                   pluginHttp.statusCode == 200,
                   let pluginJson = try? JSONSerialization.jsonObject(with: pluginData) as? [String: Any] {
                    if let n = pluginJson["name"] as? String, !n.isEmpty { name = n.trimmingCharacters(in: .whitespaces) }
                    if let d = pluginJson["description"] as? String { description = d }
                    if let v = pluginJson["version"] as? String { version = v.trimmingCharacters(in: .whitespaces) }
                    if let a = pluginJson["author"] as? String { author = a.trimmingCharacters(in: .whitespaces) }
                }

                plugins.append(CatalogPlugin(
                    id: "\(repo)/\(sourcePath)",
                    name: name,
                    description: description,
                    version: version,
                    author: author,
                    marketplace: marketplaceName,
                    repo: repo,
                    sourcePath: sourcePath,
                    installName: entryName,
                    category: category,
                    tags: Self.deriveSemanticTags(name: name, description: description, path: sourcePath),
                    isSkillMd: false
                ))
            }
        }

        return plugins
    }

    // MARK: - Fetch SKILL.md

    private func fetchSkillMd(repo: String, path: String) async throws -> String {
        let url = URL(string: "https://raw.githubusercontent.com/\(repo)/main/\(path)/SKILL.md")!
        let (data, response) = try await URLSession.shared.data(from: url)
        guard let http = response as? HTTPURLResponse, http.statusCode == 200,
              let content = String(data: data, encoding: .utf8) else {
            throw MarketplaceError.fetchFailed(path)
        }
        return content
    }

    // MARK: - List Installed

    func listInstalled() -> [String] {
        let homeDir = FileManager.default.homeDirectoryForCurrentUser
        let claudeDir = homeDir.appendingPathComponent(".claude")
        var names = Set<String>()

        // 1. Installed plugins from JSON registry
        let pluginsFile = claudeDir.appendingPathComponent("plugins/installed_plugins.json")
        if let data = try? Data(contentsOf: pluginsFile),
           let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
           let plugins = json["plugins"] as? [String: Any] {
            for key in plugins.keys {
                let pluginName = key.components(separatedBy: "@").first ?? key
                names.insert(pluginName)
                names.insert(key)
            }
        }

        // 2. Installed skills from ~/.claude/skills/
        let skillsDir = claudeDir.appendingPathComponent("skills")
        if let entries = try? FileManager.default.contentsOfDirectory(at: skillsDir, includingPropertiesForKeys: [.isDirectoryKey]) {
            for entry in entries {
                var isDir: ObjCBool = false
                if FileManager.default.fileExists(atPath: entry.path, isDirectory: &isDir), isDir.boolValue {
                    names.insert(entry.lastPathComponent)
                }
            }
        }

        return Array(names)
    }

    // MARK: - Install Plugin

    func installPlugin(_ plugin: CatalogPlugin) async -> (ok: Bool, error: String?) {
        // Validate plugin name (no path traversal)
        guard Self.isValidName(plugin.installName) else {
            return (false, "Invalid plugin name")
        }

        if plugin.isSkillMd {
            return await installSkillMd(plugin)
        } else {
            return await installCliPlugin(plugin)
        }
    }

    private func installSkillMd(_ plugin: CatalogPlugin) async -> (ok: Bool, error: String?) {
        let homeDir = FileManager.default.homeDirectoryForCurrentUser
        let skillsDir = homeDir.appendingPathComponent(".claude/skills/\(plugin.installName)")

        do {
            // Get content from cache or fetch
            var content = skillContentCache[plugin.installName]
            if content == nil {
                content = try await fetchSkillMd(repo: plugin.repo, path: plugin.sourcePath)
            }

            try FileManager.default.createDirectory(at: skillsDir, withIntermediateDirectories: true)
            try content?.write(to: skillsDir.appendingPathComponent("SKILL.md"),
                               atomically: true, encoding: .utf8)
            return (true, nil)
        } catch {
            return (false, error.localizedDescription)
        }
    }

    private func installCliPlugin(_ plugin: CatalogPlugin) async -> (ok: Bool, error: String?) {
        // Use `claude plugin marketplace add` then `claude plugin install`
        let cliPath = CliEnvironment().findClaudeBinary() ?? "claude"

        // Add marketplace
        let addResult = await runProcess(cliPath, args: ["plugin", "marketplace", "add", plugin.repo])
        if addResult.exitCode != 0 && !addResult.stdout.contains("already added") && !addResult.stderr.contains("already added") {
            return (false, addResult.stderr.isEmpty ? "Failed to add marketplace" : addResult.stderr)
        }

        // Install plugin
        let installResult = await runProcess(cliPath, args: ["plugin", "install", "\(plugin.installName)@\(plugin.marketplace)"])
        if installResult.exitCode != 0 {
            return (false, installResult.stderr.isEmpty ? "Failed to install plugin" : installResult.stderr)
        }

        return (true, nil)
    }

    // MARK: - Uninstall Plugin

    func uninstallPlugin(_ plugin: CatalogPlugin) async -> (ok: Bool, error: String?) {
        guard Self.isValidName(plugin.installName) else {
            return (false, "Invalid plugin name")
        }

        let homeDir = FileManager.default.homeDirectoryForCurrentUser
        let skillsDir = homeDir.appendingPathComponent(".claude/skills/\(plugin.installName)")

        do {
            try FileManager.default.removeItem(at: skillsDir)
            return (true, nil)
        } catch {
            return (false, error.localizedDescription)
        }
    }

    // MARK: - Helpers

    private func runProcess(_ path: String, args: [String]) async -> (exitCode: Int, stdout: String, stderr: String) {
        await withCheckedContinuation { continuation in
            let process = Process()
            process.executableURL = URL(fileURLWithPath: path)
            process.arguments = args

            let stdoutPipe = Pipe()
            let stderrPipe = Pipe()
            process.standardOutput = stdoutPipe
            process.standardError = stderrPipe

            do {
                try process.run()
                process.waitUntilExit()
                let stdout = String(data: stdoutPipe.fileHandleForReading.readDataToEndOfFile(), encoding: .utf8) ?? ""
                let stderr = String(data: stderrPipe.fileHandleForReading.readDataToEndOfFile(), encoding: .utf8) ?? ""
                continuation.resume(returning: (Int(process.terminationStatus), stdout, stderr))
            } catch {
                continuation.resume(returning: (1, "", error.localizedDescription))
            }
        }
    }

    static func isValidName(_ name: String) -> Bool {
        !name.isEmpty &&
        !name.contains("..") &&
        !name.contains("/") &&
        !name.contains("\\") &&
        !name.hasPrefix(".")
    }

    // MARK: - Frontmatter Parser

    static func parseSkillFrontmatter(_ content: String) -> (name: String, description: String) {
        var name = ""
        var description = ""
        for line in content.components(separatedBy: "\n") {
            if name.isEmpty, let match = line.range(of: #"^name:\s*(.+)"#, options: .regularExpression) {
                name = String(line[match]).replacingOccurrences(of: #"^name:\s*"#, with: "", options: .regularExpression)
                    .trimmingCharacters(in: CharacterSet(charactersIn: "\"'").union(.whitespaces))
            }
            if description.isEmpty, let match = line.range(of: #"^description:\s*(.+)"#, options: .regularExpression) {
                description = String(line[match]).replacingOccurrences(of: #"^description:\s*"#, with: "", options: .regularExpression)
                    .trimmingCharacters(in: CharacterSet(charactersIn: "\"'").union(.whitespaces))
                if description.count > 200 {
                    description = String(description.prefix(197)) + "..."
                }
            }
            if !name.isEmpty && !description.isEmpty { break }
            if line.hasPrefix("# ") { break }
        }
        return (name, description)
    }

    // MARK: - Semantic Tags

    private static let tagRules: [(tag: String, pattern: String)] = [
        ("Design", #"\b(figma|ui|ux|design|sketch|prototype|wireframe|layout|css|style|visual)\b"#),
        ("Product", #"\b(prd|roadmap|strategy|product|backlog|prioriti[sz]|feature\s*request|user\s*stor)\b"#),
        ("Research", #"\b(research|interview|insights?|survey|user\s*study|ethnograph|discover)\b"#),
        ("Docs", #"\b(doc(ument)?s?|writing|spec(ification)?|readme|markdown|technical\s*writ|content)\b"#),
        ("Spreadsheet", #"\b(sheet|spreadsheet|xlsx?|csv|tabular|pivot|formula)\b"#),
        ("Slides", #"\b(slides?|presentation|deck|pptx?|keynote|pitch)\b"#),
        ("Analysis", #"\b(analy[sz](is|e|ing)|insight|metric|dashboard|report(ing)?|data\s*viz|statistic)\b"#),
        ("Finance", #"\b(financ|accounting|budget|revenue|forecast|valuation|portfolio|investment)\b"#),
        ("Compliance", #"\b(risk|audit|policy|compliance|regulat|governance|sox|gdpr|hipaa)\b"#),
        ("Code", #"\b(code|coding|program|develop|engineer|debug|refactor|test(ing)?|linter?)\b"#),
        ("Data", #"\b(data|database|sql|etl|warehouse|lake|ingest|transform|schema)\b"#),
        ("AI/ML", #"\b(ai|ml|machine\s*learn|model|train|inference|llm|prompt|embed)\b"#),
    ]

    static func deriveSemanticTags(name: String, description: String, path: String) -> [String] {
        let text = "\(name) \(description) \(path)".lowercased()
        var matched: [String] = []
        for rule in tagRules {
            if text.range(of: rule.pattern, options: .regularExpression) != nil {
                matched.append(rule.tag)
            }
            if matched.count >= 2 { break }
        }
        return matched
    }
}

// MARK: - Errors

enum MarketplaceError: LocalizedError {
    case fetchFailed(String)
    case parseFailed(String)

    var errorDescription: String? {
        switch self {
        case .fetchFailed(let source): return "Failed to fetch: \(source)"
        case .parseFailed(let source): return "Failed to parse: \(source)"
        }
    }
}
