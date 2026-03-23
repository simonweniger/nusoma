// IssueListView.swift — Issue list with search and status grouping
// Ported from src/renderer/components/pm/IssueList.tsx

import SwiftUI
import SwiftData

struct IssueListView: View {
    @Environment(ThemeManager.self) private var theme
    @Environment(\.modelContext) private var modelContext

    let projectId: String
    @Binding var selectedIssueId: String?
    let onNewIssue: () -> Void

    @State private var searchText = ""

    @Query private var allIssues: [PMIssue]

    init(projectId: String, selectedIssueId: Binding<String?>, onNewIssue: @escaping () -> Void) {
        self.projectId = projectId
        self._selectedIssueId = selectedIssueId
        self.onNewIssue = onNewIssue
        self._allIssues = Query(
            filter: #Predicate<PMIssue> { issue in
                issue.project?.id == projectId
            },
            sort: [SortDescriptor(\PMIssue.createdAt, order: .reverse)]
        )
    }

    private var filteredIssues: [PMIssue] {
        if searchText.isEmpty { return allIssues }
        let q = searchText.lowercased()
        return allIssues.filter {
            $0.title.lowercased().contains(q) ||
            String($0.number).contains(q)
        }
    }

    private var groupedIssues: [(IssueStatus, [PMIssue])] {
        let statusOrder: [IssueStatus] = [.inProgress, .todo, .done, .cancelled]
        var groups: [(IssueStatus, [PMIssue])] = []
        for status in statusOrder {
            let issues = filteredIssues.filter { $0.issueStatus == status }
            if !issues.isEmpty {
                groups.append((status, issues))
            }
        }
        return groups
    }

    var body: some View {
        VStack(spacing: 0) {
            if allIssues.isEmpty {
                emptyState
            } else {
                // Search bar
                searchBar

                // Grouped issues
                ScrollView {
                    LazyVStack(spacing: 8) {
                        ForEach(groupedIssues, id: \.0) { status, issues in
                            statusGroup(status: status, issues: issues)
                        }

                        if filteredIssues.isEmpty && !searchText.isEmpty {
                            Text("No matching issues")
                                .font(.system(size: 12))
                                .foregroundStyle(theme.colors.textTertiary)
                                .padding(24)
                        }
                    }
                    .padding(.horizontal, 8)
                    .padding(.vertical, 6)
                }
                .scrollIndicators(.hidden)

                // New issue button
                newIssueButton
            }
        }
    }

    // MARK: - Search Bar

    private var searchBar: some View {
        TextField("Filter issues…", text: $searchText)
            .textFieldStyle(.plain)
            .font(.system(size: 12))
            .padding(.horizontal, 10)
            .padding(.vertical, 5)
            .background(theme.colors.codeBg)
            .clipShape(RoundedRectangle(cornerRadius: 8))
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
    }

    // MARK: - Status Group

    private func statusGroup(status: IssueStatus, issues: [PMIssue]) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            // Section header
            HStack(spacing: 6) {
                Text(statusLabel(status))
                    .font(.system(size: 10, weight: .semibold))
                    .foregroundStyle(theme.colors.textTertiary)
                    .textCase(.uppercase)
                    .tracking(0.5)

                Text("\(issues.count)")
                    .font(.system(size: 9))
                    .foregroundStyle(theme.colors.textTertiary)
                    .padding(.horizontal, 5)
                    .background(theme.colors.codeBg)
                    .clipShape(RoundedRectangle(cornerRadius: 4))
            }
            .padding(.horizontal, 4)
            .padding(.bottom, 2)

            // Issue rows
            ForEach(issues) { issue in
                issueRow(issue)
            }
        }
    }

    // MARK: - Issue Row

    private func issueRow(_ issue: PMIssue) -> some View {
        let isActive = issue.id == selectedIssueId

        return HStack(spacing: 8) {
            // Status icon
            statusIcon(issue.issueStatus)

            VStack(alignment: .leading, spacing: 1) {
                Text(issue.title)
                    .font(.system(size: 12, weight: isActive ? .medium : .regular))
                    .foregroundStyle(theme.colors.textPrimary)
                    .lineLimit(1)

                HStack(spacing: 4) {
                    Text("#\(issue.number)")
                        .font(.system(size: 10))
                        .foregroundStyle(theme.colors.textTertiary)

                    if issue.issuePriority != .none {
                        Text(issue.issuePriority.rawValue)
                            .font(.system(size: 9, weight: .medium))
                            .foregroundStyle(priorityColor(issue.issuePriority))
                    }
                }
            }

            Spacer()

            if issue.githubIssueNumber != nil {
                Image(systemName: "link")
                    .font(.system(size: 9))
                    .foregroundStyle(theme.colors.textTertiary)
            }
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 5)
        .background(isActive ? theme.colors.textTertiary.opacity(0.1) : Color.clear)
        .clipShape(RoundedRectangle(cornerRadius: 8))
        .contentShape(Rectangle())
        .onTapGesture {
            selectedIssueId = (issue.id == selectedIssueId) ? nil : issue.id
        }
    }

    // MARK: - New Issue Button

    private var newIssueButton: some View {
        Button(action: onNewIssue) {
            Text("+ New Issue")
                .font(.system(size: 12))
                .foregroundStyle(theme.colors.textTertiary)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 5)
                .overlay(
                    RoundedRectangle(cornerRadius: 8)
                        .stroke(style: StrokeStyle(lineWidth: 1, dash: [4, 3]))
                        .foregroundStyle(theme.colors.textTertiary.opacity(0.3))
                )
        }
        .buttonStyle(.plain)
        .padding(.horizontal, 12)
        .padding(.vertical, 6)
    }

    // MARK: - Empty State

    private var emptyState: some View {
        VStack(spacing: 12) {
            Image(systemName: "list.bullet.rectangle")
                .font(.system(size: 28))
                .foregroundStyle(theme.colors.textTertiary)
            Text("No issues yet")
                .font(.system(size: 13))
                .foregroundStyle(theme.colors.textTertiary)
            Button("Create Issue", action: onNewIssue)
                .font(.system(size: 12, weight: .medium))
                .foregroundStyle(theme.colors.accent)
                .buttonStyle(.plain)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    // MARK: - Helpers

    private func statusLabel(_ status: IssueStatus) -> String {
        switch status {
        case .inProgress: return "In Progress"
        case .todo: return "Todo"
        case .done: return "Done"
        case .cancelled: return "Cancelled"
        }
    }

    private func statusIcon(_ status: IssueStatus) -> some View {
        let (name, color): (String, Color) = switch status {
        case .todo: ("circle", theme.colors.textTertiary)
        case .inProgress: ("circle.dotted.circle", theme.colors.accent)
        case .done: ("checkmark.circle.fill", theme.colors.statusComplete)
        case .cancelled: ("xmark.circle", theme.colors.textTertiary)
        }
        return Image(systemName: name)
            .font(.system(size: 12))
            .foregroundStyle(color)
    }

    private func priorityColor(_ priority: IssuePriority) -> Color {
        switch priority {
        case .urgent: return theme.colors.statusError
        case .high: return theme.colors.accent
        case .medium: return theme.colors.textSecondary
        case .low: return theme.colors.textTertiary
        case .none: return theme.colors.textMuted
        }
    }
}
