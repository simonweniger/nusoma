// PMPanelView.swift — Root PM panel with sidebar + content
// Ported from src/renderer/components/pm/PMPanel.tsx

import SwiftUI
import SwiftData

struct PMPanelView: View {
    @Environment(AppState.self) private var appState
    @Environment(ThemeManager.self) private var theme
    @Environment(\.modelContext) private var modelContext

    @State private var selectedProjectId: String?
    @State private var selectedIssueId: String?
    @State private var showCreateIssue = false
    @State private var showProjectSettings = false
    @State private var settingsProject: PMProject?
    @State private var syncProgress: SyncProgress?

    @Query(sort: \PMProject.createdAt) private var projects: [PMProject]

    private var selectedProject: PMProject? {
        projects.first { $0.id == selectedProjectId }
    }

    var body: some View {
        VStack(spacing: 0) {
            // Header
            header

            // Body
            HStack(spacing: 0) {
                // Sidebar
                PMSidebarView(
                    projects: projects,
                    selectedProjectId: $selectedProjectId,
                    onOpenSettings: { project in
                        settingsProject = project
                        showProjectSettings = true
                        selectedIssueId = nil
                    }
                )

                // Main content
                mainContent
            }
        }
        .frame(height: 470)
        .onAppear {
            if selectedProjectId == nil, let first = projects.first {
                selectedProjectId = first.id
            }
        }
        .sheet(isPresented: $showCreateIssue) {
            if let projectId = selectedProjectId {
                CreateIssueSheet(projectId: projectId)
            }
        }
        .sheet(isPresented: $showProjectSettings) {
            if let project = settingsProject {
                ProjectSettingsSheet(project: project)
            }
        }
    }

    // MARK: - Header

    private var header: some View {
        HStack {
            Text("Projects")
                .font(.system(size: 13, weight: .semibold))
            Spacer()
            Button {
                appState.pmOpen = false
            } label: {
                Image(systemName: "xmark")
                    .font(.system(size: 12))
                    .foregroundStyle(theme.colors.textTertiary)
            }
            .buttonStyle(.plain)
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 10)
    }

    // MARK: - Main Content

    @ViewBuilder
    private var mainContent: some View {
        if projects.isEmpty {
            VStack(spacing: 12) {
                Image(systemName: "folder.badge.plus")
                    .font(.system(size: 28))
                    .foregroundStyle(theme.colors.textTertiary)
                Text("No projects yet")
                    .font(.system(size: 13))
                    .foregroundStyle(theme.colors.textTertiary)
                Text("Create a project to start tracking issues.")
                    .font(.system(size: 11))
                    .foregroundStyle(theme.colors.textMuted)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        } else if showProjectSettings, settingsProject != nil {
            ProjectSettingsSheet(project: settingsProject!)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        } else {
            HStack(spacing: 0) {
                // Issue list
                VStack(spacing: 0) {
                    if let projectId = selectedProjectId {
                        IssueListView(
                            projectId: projectId,
                            selectedIssueId: $selectedIssueId,
                            onNewIssue: { showCreateIssue = true }
                        )
                    }

                    // Sync bar
                    if let project = selectedProject,
                       project.githubOwner != nil, project.githubRepo != nil {
                        syncBar(project: project)
                    }
                }
                .frame(width: selectedIssueId != nil ? 260 : nil)
                .frame(maxWidth: selectedIssueId != nil ? 260 : .infinity)

                // Issue detail
                if let issueId = selectedIssueId {
                    IssueDetailView(
                        issueId: issueId,
                        onClose: { selectedIssueId = nil }
                    )
                    .frame(maxWidth: .infinity)
                }
            }
        }
    }

    // MARK: - Sync Bar

    private func syncBar(project: PMProject) -> some View {
        HStack(spacing: 8) {
            if let progress = syncProgress {
                if progress.phase == .done {
                    Image(systemName: "checkmark.circle")
                        .foregroundStyle(theme.colors.statusComplete)
                        .font(.system(size: 11))
                    Text("Synced")
                        .font(.system(size: 10))
                        .foregroundStyle(theme.colors.textTertiary)
                } else if progress.phase == .error {
                    Image(systemName: "exclamationmark.triangle")
                        .foregroundStyle(theme.colors.statusError)
                        .font(.system(size: 11))
                    Text(progress.message)
                        .font(.system(size: 10))
                        .foregroundStyle(theme.colors.statusError)
                        .lineLimit(1)
                } else {
                    ProgressView()
                        .controlSize(.mini)
                    Text(progress.message)
                        .font(.system(size: 10))
                        .foregroundStyle(theme.colors.textTertiary)
                        .lineLimit(1)
                }
            }

            Spacer()

            Button {
                Task { await performSync(project: project) }
            } label: {
                Image(systemName: "arrow.triangle.2.circlepath")
                    .font(.system(size: 11))
                    .foregroundStyle(theme.colors.textTertiary)
            }
            .buttonStyle(.plain)
            .disabled(syncProgress != nil && syncProgress?.phase != .done && syncProgress?.phase != .error)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 6)
    }

    private func performSync(project: PMProject) async {
        let pmService = PMService(modelContext: modelContext)
        _ = await GitHubSync.syncProject(project: project, pmService: pmService) { progress in
            syncProgress = progress
        }
    }
}
