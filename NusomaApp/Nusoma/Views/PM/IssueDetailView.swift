// IssueDetailView.swift — Issue detail with status/priority pickers and auto-save
// Ported from src/renderer/components/pm/IssueDetail.tsx

import SwiftUI
import SwiftData

struct IssueDetailView: View {
    @Environment(ThemeManager.self) private var theme
    @Environment(\.modelContext) private var modelContext

    let issueId: String
    let onClose: () -> Void

    @State private var title: String = ""
    @State private var issueDescription: String = ""
    @State private var saving = false
    @State private var showDeleteConfirm = false

    @Query private var issues: [PMIssue]

    private var issue: PMIssue? {
        issues.first { $0.id == issueId }
    }

    init(issueId: String, onClose: @escaping () -> Void) {
        self.issueId = issueId
        self.onClose = onClose
        self._issues = Query(filter: #Predicate<PMIssue> { $0.id == issueId })
    }

    var body: some View {
        if let issue {
            VStack(spacing: 0) {
                // Header
                header(issue: issue)

                // Metadata row
                metadataRow(issue: issue)

                // Title
                titleEditor

                // Description
                descriptionEditor
            }
            .onAppear {
                title = issue.title
                issueDescription = issue.issueDescription ?? ""
            }
            .onChange(of: issueId) {
                if let issue = self.issue {
                    title = issue.title
                    issueDescription = issue.issueDescription ?? ""
                }
            }
            .alert("Delete Issue", isPresented: $showDeleteConfirm) {
                Button("Delete", role: .destructive) { deleteIssue() }
                Button("Cancel", role: .cancel) { }
            } message: {
                Text("Delete issue #\(issue.number)?")
            }
        }
    }

    // MARK: - Header

    private func header(issue: PMIssue) -> some View {
        HStack {
            HStack(spacing: 6) {
                Text("#\(issue.number)")
                    .font(.system(size: 11))
                    .foregroundStyle(theme.colors.textTertiary)

                if issue.githubIssueNumber != nil {
                    Image(systemName: "link")
                        .font(.system(size: 10))
                        .foregroundStyle(theme.colors.textTertiary)
                }

                if saving {
                    Text("Saving…")
                        .font(.system(size: 10))
                        .foregroundStyle(theme.colors.textTertiary)
                }
            }

            Spacer()

            Button(action: onClose) {
                Image(systemName: "xmark")
                    .font(.system(size: 12))
                    .foregroundStyle(theme.colors.textTertiary)
            }
            .buttonStyle(.plain)
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 10)
    }

    // MARK: - Metadata Row

    private func metadataRow(issue: PMIssue) -> some View {
        HStack(spacing: 10) {
            // Status picker
            Picker("", selection: Binding(
                get: { issue.issueStatus },
                set: { newStatus in
                    let pmService = PMService(modelContext: modelContext)
                    pmService.updateIssue(issue.id, status: newStatus)
                }
            )) {
                ForEach(IssueStatus.allCases, id: \.self) { status in
                    Text(statusDisplayName(status)).tag(status)
                }
            }
            .pickerStyle(.menu)
            .font(.system(size: 11))
            .frame(width: 110)

            // Priority picker
            Picker("", selection: Binding(
                get: { issue.issuePriority },
                set: { newPriority in
                    let pmService = PMService(modelContext: modelContext)
                    pmService.updateIssue(issue.id, priority: newPriority)
                }
            )) {
                ForEach(IssuePriority.allCases, id: \.self) { priority in
                    Text(priority.rawValue.capitalized).tag(priority)
                }
            }
            .pickerStyle(.menu)
            .font(.system(size: 11))
            .frame(width: 90)

            Spacer()

            Button("Delete") {
                showDeleteConfirm = true
            }
            .font(.system(size: 11))
            .foregroundStyle(theme.colors.statusError)
            .buttonStyle(.plain)
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 8)
    }

    // MARK: - Title Editor

    private var titleEditor: some View {
        TextEditor(text: $title)
            .font(.system(size: 14, weight: .semibold))
            .scrollContentBackground(.hidden)
            .frame(height: 50)
            .padding(.horizontal, 14)
            .padding(.top, 8)
            .onChange(of: title) {
                scheduleAutoSave()
            }
    }

    // MARK: - Description Editor

    private var descriptionEditor: some View {
        TextEditor(text: $issueDescription)
            .font(.system(size: 12))
            .foregroundStyle(theme.colors.textSecondary)
            .scrollContentBackground(.hidden)
            .padding(.horizontal, 14)
            .padding(.bottom, 14)
            .onChange(of: issueDescription) {
                scheduleAutoSave()
            }
    }

    // MARK: - Auto-save (debounced 600ms)

    @State private var saveTask: Task<Void, Never>?

    private func scheduleAutoSave() {
        saveTask?.cancel()
        saveTask = Task {
            try? await Task.sleep(for: .milliseconds(600))
            guard !Task.isCancelled else { return }

            saving = true
            let pmService = PMService(modelContext: modelContext)
            let trimmedTitle = title.trimmingCharacters(in: .whitespacesAndNewlines)
            if !trimmedTitle.isEmpty {
                pmService.updateIssue(issueId, title: trimmedTitle,
                                       description: issueDescription.isEmpty ? .some(nil) : .some(issueDescription))
            }
            saving = false
        }
    }

    // MARK: - Delete

    private func deleteIssue() {
        let pmService = PMService(modelContext: modelContext)
        pmService.deleteIssue(issueId)
        onClose()
    }

    // MARK: - Helpers

    private func statusDisplayName(_ status: IssueStatus) -> String {
        switch status {
        case .todo: return "Todo"
        case .inProgress: return "In Progress"
        case .done: return "Done"
        case .cancelled: return "Cancelled"
        }
    }
}
