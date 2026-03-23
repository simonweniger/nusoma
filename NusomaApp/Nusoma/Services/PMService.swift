// PMService.swift — SwiftData CRUD for Project Management
// Ported from src/main/pm/issues.ts + projects.ts

import Foundation
import SwiftData

@MainActor
final class PMService {

    private let modelContext: ModelContext

    init(modelContext: ModelContext) {
        self.modelContext = modelContext
    }

    // MARK: - Projects

    func listProjects() -> [PMProject] {
        let descriptor = FetchDescriptor<PMProject>(sortBy: [SortDescriptor(\.createdAt)])
        return (try? modelContext.fetch(descriptor)) ?? []
    }

    func getProject(_ id: String) -> PMProject? {
        var descriptor = FetchDescriptor<PMProject>(predicate: #Predicate { $0.id == id })
        descriptor.fetchLimit = 1
        return try? modelContext.fetch(descriptor).first
    }

    @discardableResult
    func createProject(_ input: CreateProjectInput) -> PMProject {
        let project = PMProject(
            name: input.name,
            projectDescription: input.description,
            githubOwner: input.githubOwner,
            githubRepo: input.githubRepo,
            color: input.color ?? "#d97757",
            icon: input.icon
        )
        modelContext.insert(project)
        try? modelContext.save()
        return project
    }

    func updateProject(_ id: String, name: String? = nil, description: String?? = nil,
                       githubOwner: String?? = nil, githubRepo: String?? = nil,
                       color: String? = nil, icon: String?? = nil) {
        guard let project = getProject(id) else { return }
        if let name { project.name = name }
        if let description { project.projectDescription = description }
        if let githubOwner { project.githubOwner = githubOwner }
        if let githubRepo { project.githubRepo = githubRepo }
        if let color { project.color = color }
        if let icon { project.icon = icon }
        project.updatedAt = Date()
        try? modelContext.save()
    }

    func deleteProject(_ id: String) {
        guard let project = getProject(id) else { return }
        modelContext.delete(project)
        try? modelContext.save()
    }

    // MARK: - Issues

    func listIssues(projectId: String, filters: IssueFilters? = nil) -> [PMIssue] {
        let descriptor = FetchDescriptor<PMIssue>(
            predicate: #Predicate<PMIssue> { issue in
                issue.project?.id == projectId
            },
            sortBy: [SortDescriptor(\.createdAt, order: .reverse)]
        )
        var results = (try? modelContext.fetch(descriptor)) ?? []

        if let filters {
            if let statusFilter = filters.status {
                let rawValues = statusFilter.map(\.rawValue)
                results = results.filter { rawValues.contains($0.status) }
            }
            if let priority = filters.priority {
                results = results.filter { $0.priority == priority.rawValue }
            }
            if let search = filters.search, !search.isEmpty {
                let q = search.lowercased()
                results = results.filter {
                    $0.title.lowercased().contains(q) ||
                    ($0.issueDescription?.lowercased().contains(q) ?? false)
                }
            }
        }

        return results
    }

    func getIssue(_ id: String) -> PMIssue? {
        var descriptor = FetchDescriptor<PMIssue>(predicate: #Predicate { $0.id == id })
        descriptor.fetchLimit = 1
        return try? modelContext.fetch(descriptor).first
    }

    @discardableResult
    func createIssue(_ input: CreateIssueInput) -> PMIssue? {
        guard let project = getProject(input.projectId) else { return nil }

        // Auto-increment per-project number
        let existingIssues = listIssues(projectId: input.projectId)
        let maxNumber = existingIssues.map(\.number).max() ?? 0

        let issue = PMIssue(
            number: maxNumber + 1,
            title: input.title,
            issueDescription: input.description,
            status: input.status ?? .todo,
            priority: input.priority ?? .none,
            assignee: input.assignee
        )
        issue.project = project
        modelContext.insert(issue)

        // Attach labels
        if let labelIds = input.labelIds {
            for labelId in labelIds {
                if let label = getLabel(labelId) {
                    issue.labels.append(label)
                }
            }
        }

        try? modelContext.save()
        return issue
    }

    func updateIssue(_ id: String, title: String? = nil, description: String?? = nil,
                     status: IssueStatus? = nil, priority: IssuePriority? = nil,
                     assignee: String?? = nil, githubIssueNumber: Int?? = nil,
                     syncedAt: Date?? = nil) {
        guard let issue = getIssue(id) else { return }
        if let title { issue.title = title }
        if let description { issue.issueDescription = description }
        if let status { issue.issueStatus = status }
        if let priority { issue.issuePriority = priority }
        if let assignee { issue.assignee = assignee }
        if let githubIssueNumber { issue.githubIssueNumber = githubIssueNumber }
        if let syncedAt { issue.syncedAt = syncedAt }
        issue.updatedAt = Date()
        try? modelContext.save()
    }

    func deleteIssue(_ id: String) {
        guard let issue = getIssue(id) else { return }
        modelContext.delete(issue)
        try? modelContext.save()
    }

    // MARK: - Labels

    func listLabels(projectId: String) -> [PMLabel] {
        let descriptor = FetchDescriptor<PMLabel>(
            predicate: #Predicate<PMLabel> { label in
                label.project?.id == projectId
            }
        )
        return (try? modelContext.fetch(descriptor)) ?? []
    }

    func getLabel(_ id: String) -> PMLabel? {
        var descriptor = FetchDescriptor<PMLabel>(predicate: #Predicate { $0.id == id })
        descriptor.fetchLimit = 1
        return try? modelContext.fetch(descriptor).first
    }

    @discardableResult
    func createLabel(projectId: String, name: String, color: String = "#8a8a80") -> PMLabel? {
        guard let project = getProject(projectId) else { return nil }
        let label = PMLabel(name: name, color: color)
        label.project = project
        modelContext.insert(label)
        try? modelContext.save()
        return label
    }

    func deleteLabel(_ id: String) {
        guard let label = getLabel(id) else { return }
        modelContext.delete(label)
        try? modelContext.save()
    }

    // MARK: - Comments

    func listComments(issueId: String) -> [PMComment] {
        let descriptor = FetchDescriptor<PMComment>(
            predicate: #Predicate<PMComment> { comment in
                comment.issue?.id == issueId
            },
            sortBy: [SortDescriptor(\.createdAt)]
        )
        return (try? modelContext.fetch(descriptor)) ?? []
    }

    @discardableResult
    func addComment(issueId: String, body: String, author: String? = nil) -> PMComment? {
        guard let issue = getIssue(issueId) else { return nil }
        let comment = PMComment(body: body, author: author)
        comment.issue = issue
        modelContext.insert(comment)
        try? modelContext.save()
        return comment
    }

    // MARK: - Settings

    func getSetting(_ key: String) -> String? {
        var descriptor = FetchDescriptor<PMSetting>(predicate: #Predicate { $0.key == key })
        descriptor.fetchLimit = 1
        return try? modelContext.fetch(descriptor).first?.value
    }

    func setSetting(_ key: String, value: String) {
        if let existing = (try? modelContext.fetch(FetchDescriptor<PMSetting>(predicate: #Predicate { $0.key == key })))?.first {
            existing.value = value
        } else {
            modelContext.insert(PMSetting(key: key, value: value))
        }
        try? modelContext.save()
    }
}
