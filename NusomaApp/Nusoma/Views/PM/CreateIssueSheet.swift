// CreateIssueSheet.swift — Create issue modal
// Ported from src/renderer/components/pm/CreateIssueModal.tsx

import SwiftUI
import SwiftData

struct CreateIssueSheet: View {
    @Environment(ThemeManager.self) private var theme
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss

    let projectId: String

    @State private var title = ""
    @State private var status: IssueStatus = .todo
    @State private var priority: IssuePriority = .none
    @State private var submitting = false
    @FocusState private var titleFocused: Bool

    var body: some View {
        VStack(spacing: 16) {
            // Header
            HStack {
                Text("New Issue")
                    .font(.system(size: 13, weight: .semibold))
                Spacer()
                Button {
                    dismiss()
                } label: {
                    Image(systemName: "xmark")
                        .font(.system(size: 12))
                        .foregroundStyle(theme.colors.textTertiary)
                }
                .buttonStyle(.plain)
            }

            // Title input
            TextField("Issue title", text: $title)
                .textFieldStyle(.plain)
                .font(.system(size: 13))
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                .background(theme.colors.codeBg)
                .clipShape(RoundedRectangle(cornerRadius: 8))
                .focused($titleFocused)

            // Status + Priority
            HStack(spacing: 8) {
                Picker("Status", selection: $status) {
                    Text("Todo").tag(IssueStatus.todo)
                    Text("In Progress").tag(IssueStatus.inProgress)
                    Text("Done").tag(IssueStatus.done)
                    Text("Cancelled").tag(IssueStatus.cancelled)
                }
                .pickerStyle(.menu)
                .font(.system(size: 12))

                Picker("Priority", selection: $priority) {
                    Text("No priority").tag(IssuePriority.none)
                    Text("Urgent").tag(IssuePriority.urgent)
                    Text("High").tag(IssuePriority.high)
                    Text("Medium").tag(IssuePriority.medium)
                    Text("Low").tag(IssuePriority.low)
                }
                .pickerStyle(.menu)
                .font(.system(size: 12))
            }

            // Actions
            HStack {
                Spacer()

                Button("Cancel") {
                    dismiss()
                }
                .font(.system(size: 12))
                .buttonStyle(.plain)
                .foregroundStyle(theme.colors.textSecondary)

                Button(submitting ? "Creating…" : "Create Issue") {
                    createIssue()
                }
                .font(.system(size: 12, weight: .medium))
                .foregroundStyle(.white)
                .padding(.horizontal, 14)
                .padding(.vertical, 6)
                .background(canSubmit ? theme.colors.accent : theme.colors.accent.opacity(0.3))
                .clipShape(RoundedRectangle(cornerRadius: 8))
                .buttonStyle(.plain)
                .disabled(!canSubmit)
            }
        }
        .padding(20)
        .frame(width: 420)
        .onAppear { titleFocused = true }
    }

    private var canSubmit: Bool {
        !title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && !submitting
    }

    private func createIssue() {
        let trimmed = title.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }

        submitting = true
        let pmService = PMService(modelContext: modelContext)
        pmService.createIssue(CreateIssueInput(
            projectId: projectId,
            title: trimmed,
            status: status,
            priority: priority
        ))
        dismiss()
    }
}
