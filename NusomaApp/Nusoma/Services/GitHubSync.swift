// GitHubSync.swift — GitHub REST API sync for PM issues
// Ported from src/main/pm/github.ts

import Foundation

actor GitHubSync {

    // MARK: - Token Management

    /// Store token in Keychain (replaces Electron's safeStorage)
    static func setToken(_ token: String) {
        let data = Data(token.utf8)
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: "com.nusoma.github",
            kSecAttrAccount as String: "token",
        ]

        SecItemDelete(query as CFDictionary)

        var addQuery = query
        addQuery[kSecValueData as String] = data
        SecItemAdd(addQuery as CFDictionary, nil)
    }

    static func getToken() -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: "com.nusoma.github",
            kSecAttrAccount as String: "token",
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne,
        ]

        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        guard status == errSecSuccess, let data = result as? Data else { return nil }
        return String(data: data, encoding: .utf8)
    }

    static func hasToken() -> Bool {
        getToken() != nil
    }

    static func removeToken() {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: "com.nusoma.github",
            kSecAttrAccount as String: "token",
        ]
        SecItemDelete(query as CFDictionary)
    }

    // MARK: - API Helpers

    private static func apiRequest(
        method: String = "GET",
        path: String,
        body: [String: Any]? = nil
    ) async throws -> (Data, HTTPURLResponse) {
        guard let url = URL(string: "https://api.github.com\(path)") else {
            throw GitHubSyncError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/vnd.github+json", forHTTPHeaderField: "Accept")
        request.setValue("2022-11-28", forHTTPHeaderField: "X-GitHub-Api-Version")

        if let token = getToken() {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        if let body {
            request.httpBody = try JSONSerialization.data(withJSONObject: body)
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        }

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse else {
            throw GitHubSyncError.invalidResponse
        }
        return (data, httpResponse)
    }

    // MARK: - Test Connection

    static func testConnection(owner: String, repo: String) async -> (ok: Bool, error: String?) {
        do {
            let (_, response) = try await apiRequest(path: "/repos/\(owner)/\(repo)")
            if response.statusCode == 200 {
                return (true, nil)
            }
            return (false, "HTTP \(response.statusCode)")
        } catch {
            return (false, error.localizedDescription)
        }
    }

    // MARK: - Sync

    @MainActor
    static func syncProject(
        project: PMProject,
        pmService: PMService,
        onProgress: @escaping (SyncProgress) -> Void
    ) async -> SyncResult {
        var result = SyncResult(created: 0, updated: 0, pushed: 0, errors: [])

        guard let owner = project.githubOwner, let repo = project.githubRepo else {
            return result
        }

        // 1. Fetch all GH issues
        onProgress(SyncProgress(phase: .fetching, current: 0, total: 0, message: "Fetching GitHub issues…"))

        let ghIssues: [[String: Any]]
        do {
            ghIssues = try await fetchAllGitHubIssues(owner: owner, repo: repo)
        } catch {
            result = SyncResult(created: 0, updated: 0, pushed: 0,
                                errors: ["Failed to fetch issues: \(error.localizedDescription)"])
            onProgress(SyncProgress(phase: .error, current: 0, total: 0, message: "Failed to fetch GitHub issues"))
            return result
        }

        let total = ghIssues.count
        onProgress(SyncProgress(phase: .processing, current: 0, total: total, message: "Processing \(total) issues…"))

        // 2. Upsert locally
        let localIssues = pmService.listIssues(projectId: project.id)
        var localByGhNumber: [Int: PMIssue] = [:]
        for issue in localIssues {
            if let ghNum = issue.githubIssueNumber {
                localByGhNumber[ghNum] = issue
            }
        }

        var createdCount = 0
        var updatedCount = 0
        var pushedCount = 0
        var errors: [String] = []

        for (i, gh) in ghIssues.enumerated() {
            guard let number = gh["number"] as? Int,
                  let title = gh["title"] as? String else { continue }

            let ghBody = gh["body"] as? String
            let ghState = gh["state"] as? String ?? "open"
            let ghLabels = gh["labels"] as? [[String: Any]] ?? []
            let ghUpdatedAt = parseISO8601(gh["updated_at"] as? String)

            let ghStatus = mapGhStatus(state: ghState, labels: ghLabels)

            onProgress(SyncProgress(phase: .processing, current: i + 1, total: total,
                                     message: "Processing #\(number): \(title)"))

            if let existing = localByGhNumber[number] {
                // Compare timestamps
                let localUpdated = existing.updatedAt
                if let ghDate = ghUpdatedAt, ghDate > localUpdated {
                    // GH is newer — update local
                    pmService.updateIssue(existing.id, title: title, description: ghBody,
                                          status: ghStatus, syncedAt: .some(Date()))
                    updatedCount += 1
                } else if ghUpdatedAt == nil || localUpdated > ghUpdatedAt! {
                    // Local is newer — push to GH
                    do {
                        guard let ghNum = existing.githubIssueNumber else { continue }
                        try await pushIssueToGitHub(owner: owner, repo: repo, ghNumber: ghNum, title: existing.title, status: existing.status, description: existing.issueDescription)
                        pushedCount += 1
                    } catch {
                        errors.append("Push #\(existing.number): \(error.localizedDescription)")
                    }
                }
            } else {
                // Create local issue
                let input = CreateIssueInput(
                    projectId: project.id,
                    title: title,
                    description: ghBody,
                    status: ghStatus
                )
                if let created = pmService.createIssue(input) {
                    pmService.updateIssue(created.id, githubIssueNumber: .some(number),
                                          syncedAt: .some(Date()))
                    createdCount += 1
                }
            }
        }

        // 3. Push local issues with no GH number
        let unsynced = pmService.listIssues(projectId: project.id).filter { $0.githubIssueNumber == nil }
        if !unsynced.isEmpty {
            onProgress(SyncProgress(phase: .pushing, current: 0, total: unsynced.count,
                                     message: "Pushing \(unsynced.count) new issues to GitHub…"))
            for (i, issue) in unsynced.enumerated() {
                onProgress(SyncProgress(phase: .pushing, current: i + 1, total: unsynced.count,
                                         message: "Pushing: \(issue.title)"))
                do {
                    let ghNumber = try await createGitHubIssue(owner: owner, repo: repo,
                                                                title: issue.title,
                                                                body: issue.issueDescription)
                    pmService.updateIssue(issue.id, githubIssueNumber: .some(ghNumber),
                                          syncedAt: .some(Date()))
                    pushedCount += 1
                } catch {
                    errors.append("Push \"\(issue.title)\": \(error.localizedDescription)")
                }
            }
        }

        onProgress(SyncProgress(phase: .done, current: total, total: total, message: "Sync complete"))
        return SyncResult(created: createdCount, updated: updatedCount, pushed: pushedCount, errors: errors)
    }

    // MARK: - GitHub API Calls

    private static func fetchAllGitHubIssues(owner: String, repo: String) async throws -> [[String: Any]] {
        var allIssues: [[String: Any]] = []
        var page = 1

        while true {
            let (data, response) = try await apiRequest(
                path: "/repos/\(owner)/\(repo)/issues?state=all&per_page=100&page=\(page)"
            )

            guard response.statusCode == 200 else {
                throw GitHubSyncError.apiError(response.statusCode)
            }

            guard let items = try JSONSerialization.jsonObject(with: data) as? [[String: Any]] else {
                break
            }

            // Filter out PRs (they have a "pull_request" key)
            let issues = items.filter { $0["pull_request"] == nil }
            allIssues.append(contentsOf: issues)

            if items.count < 100 { break }
            page += 1
        }

        return allIssues
    }

    private static func pushIssueToGitHub(owner: String, repo: String, ghNumber: Int, title: String, status: String, description: String?) async throws {
        let state = (status == "done" || status == "cancelled") ? "closed" : "open"
        var body: [String: Any] = [
            "title": title,
            "state": state,
        ]
        if let desc = description {
            body["body"] = desc
        }
        let (_, response) = try await apiRequest(
            method: "PATCH",
            path: "/repos/\(owner)/\(repo)/issues/\(ghNumber)",
            body: body
        )
        guard response.statusCode == 200 else {
            throw GitHubSyncError.apiError(response.statusCode)
        }
    }

    private static func createGitHubIssue(owner: String, repo: String, title: String, body: String?) async throws -> Int {
        var requestBody: [String: Any] = ["title": title]
        if let body { requestBody["body"] = body }

        let (data, response) = try await apiRequest(
            method: "POST",
            path: "/repos/\(owner)/\(repo)/issues",
            body: requestBody
        )
        guard response.statusCode == 201 else {
            throw GitHubSyncError.apiError(response.statusCode)
        }

        guard let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
              let number = json["number"] as? Int else {
            throw GitHubSyncError.invalidResponse
        }
        return number
    }

    // MARK: - Helpers

    private static func mapGhStatus(state: String, labels: [[String: Any]]) -> IssueStatus {
        if state == "closed" { return .done }
        let labelNames = labels.compactMap { $0["name"] as? String }
        if labelNames.contains("status:in-progress") { return .inProgress }
        return .todo
    }

    private static func parseISO8601(_ string: String?) -> Date? {
        guard let string else { return nil }
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter.date(from: string) ?? ISO8601DateFormatter().date(from: string)
    }
}

// MARK: - Errors

enum GitHubSyncError: LocalizedError {
    case invalidURL
    case invalidResponse
    case apiError(Int)

    var errorDescription: String? {
        switch self {
        case .invalidURL: return "Invalid GitHub API URL"
        case .invalidResponse: return "Invalid response from GitHub"
        case .apiError(let code): return "GitHub API error (HTTP \(code))"
        }
    }
}
