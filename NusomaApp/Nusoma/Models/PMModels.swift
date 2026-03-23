// PMModels.swift — SwiftData models for Project Management
// Ported from src/main/pm/schema.ts + src/shared/pm-types.ts

import Foundation
import SwiftData

// MARK: - Enums

enum IssueStatus: String, Codable, CaseIterable {
    case todo
    case inProgress = "in_progress"
    case done
    case cancelled
}

enum IssuePriority: String, Codable, CaseIterable {
    case urgent
    case high
    case medium
    case low
    case none
}

// MARK: - SwiftData Models

@Model
class PMProject {
    @Attribute(.unique) var id: String
    var name: String
    var projectDescription: String?
    var githubOwner: String?
    var githubRepo: String?
    var color: String
    var icon: String?
    var createdAt: Date
    var updatedAt: Date

    @Relationship(deleteRule: .cascade, inverse: \PMIssue.project)
    var issues: [PMIssue] = []

    @Relationship(deleteRule: .cascade, inverse: \PMLabel.project)
    var labels: [PMLabel] = []

    init(
        id: String = UUID().uuidString,
        name: String,
        projectDescription: String? = nil,
        githubOwner: String? = nil,
        githubRepo: String? = nil,
        color: String = "#d97757",
        icon: String? = nil
    ) {
        self.id = id
        self.name = name
        self.projectDescription = projectDescription
        self.githubOwner = githubOwner
        self.githubRepo = githubRepo
        self.color = color
        self.icon = icon
        self.createdAt = Date()
        self.updatedAt = Date()
    }
}

@Model
class PMIssue {
    @Attribute(.unique) var id: String
    var project: PMProject?
    var number: Int
    var title: String
    var issueDescription: String?
    var status: String  // IssueStatus raw value
    var priority: String  // IssuePriority raw value
    var assignee: String?
    var githubIssueNumber: Int?
    var githubPrNumber: Int?
    var githubNodeId: String?
    var syncedAt: Date?
    var createdAt: Date
    var updatedAt: Date

    @Relationship(inverse: \PMLabel.issues)
    var labels: [PMLabel] = []

    @Relationship(deleteRule: .cascade, inverse: \PMComment.issue)
    var comments: [PMComment] = []

    var issueStatus: IssueStatus {
        get { IssueStatus(rawValue: status) ?? .todo }
        set { status = newValue.rawValue }
    }

    var issuePriority: IssuePriority {
        get { IssuePriority(rawValue: priority) ?? .none }
        set { priority = newValue.rawValue }
    }

    init(
        id: String = UUID().uuidString,
        number: Int,
        title: String,
        issueDescription: String? = nil,
        status: IssueStatus = .todo,
        priority: IssuePriority = .none,
        assignee: String? = nil
    ) {
        self.id = id
        self.number = number
        self.title = title
        self.issueDescription = issueDescription
        self.status = status.rawValue
        self.priority = priority.rawValue
        self.assignee = assignee
        self.createdAt = Date()
        self.updatedAt = Date()
    }
}

@Model
class PMLabel {
    @Attribute(.unique) var id: String
    var project: PMProject?
    var name: String
    var color: String

    var issues: [PMIssue] = []

    init(
        id: String = UUID().uuidString,
        name: String,
        color: String = "#8a8a80"
    ) {
        self.id = id
        self.name = name
        self.color = color
    }
}

@Model
class PMComment {
    @Attribute(.unique) var id: String
    var issue: PMIssue?
    var body: String
    var author: String?
    var createdAt: Date

    init(
        id: String = UUID().uuidString,
        body: String,
        author: String? = nil
    ) {
        self.id = id
        self.body = body
        self.author = author
        self.createdAt = Date()
    }
}

@Model
class PMSetting {
    @Attribute(.unique) var key: String
    var value: String

    init(key: String, value: String) {
        self.key = key
        self.value = value
    }
}

// MARK: - IPC Payload Types

struct CreateProjectInput {
    var name: String
    var description: String?
    var githubOwner: String?
    var githubRepo: String?
    var color: String?
    var icon: String?
}

struct CreateIssueInput {
    var projectId: String
    var title: String
    var description: String?
    var status: IssueStatus?
    var priority: IssuePriority?
    var assignee: String?
    var labelIds: [String]?
}

struct IssueFilters {
    var status: [IssueStatus]?
    var priority: IssuePriority?
    var search: String?
    var labelId: String?
}

struct SyncProgress: Sendable {
    enum Phase: String, Sendable {
        case fetching, processing, pushing, done, error
    }
    let phase: Phase
    let current: Int
    let total: Int
    let message: String
}

struct SyncResult: Sendable {
    let created: Int
    let updated: Int
    let pushed: Int
    let errors: [String]
}
