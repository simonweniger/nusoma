// ProjectSettingsSheet.swift — Project settings (name, color, GitHub config)
// Ported from src/renderer/components/pm/ProjectSettings.tsx + GitHubSettings.tsx

import SwiftUI
import SwiftData

struct ProjectSettingsSheet: View {
    @Environment(ThemeManager.self) private var theme
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss

    let project: PMProject

    @State private var name: String = ""
    @State private var projectDescription: String = ""
    @State private var githubOwner: String = ""
    @State private var githubRepo: String = ""
    @State private var githubToken: String = ""
    @State private var testResult: (ok: Bool, error: String?)?
    @State private var testing = false
    @State private var showDeleteConfirm = false

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            // Header
            HStack {
                Text("Project Settings")
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

            // Project name
            VStack(alignment: .leading, spacing: 4) {
                Text("Name")
                    .font(.system(size: 11, weight: .medium))
                    .foregroundStyle(theme.colors.textTertiary)
                TextField("Project name", text: $name)
                    .textFieldStyle(.plain)
                    .font(.system(size: 12))
                    .padding(.horizontal, 10)
                    .padding(.vertical, 6)
                    .background(theme.colors.codeBg)
                    .clipShape(RoundedRectangle(cornerRadius: 8))
            }

            // Description
            VStack(alignment: .leading, spacing: 4) {
                Text("Description")
                    .font(.system(size: 11, weight: .medium))
                    .foregroundStyle(theme.colors.textTertiary)
                TextField("Optional description", text: $projectDescription)
                    .textFieldStyle(.plain)
                    .font(.system(size: 12))
                    .padding(.horizontal, 10)
                    .padding(.vertical, 6)
                    .background(theme.colors.codeBg)
                    .clipShape(RoundedRectangle(cornerRadius: 8))
            }

            Divider()

            // GitHub Settings
            VStack(alignment: .leading, spacing: 8) {
                Text("GitHub Integration")
                    .font(.system(size: 12, weight: .semibold))

                HStack(spacing: 8) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Owner")
                            .font(.system(size: 11, weight: .medium))
                            .foregroundStyle(theme.colors.textTertiary)
                        TextField("owner", text: $githubOwner)
                            .textFieldStyle(.plain)
                            .font(.system(size: 12))
                            .padding(.horizontal, 10)
                            .padding(.vertical, 6)
                            .background(theme.colors.codeBg)
                            .clipShape(RoundedRectangle(cornerRadius: 8))
                    }

                    VStack(alignment: .leading, spacing: 4) {
                        Text("Repository")
                            .font(.system(size: 11, weight: .medium))
                            .foregroundStyle(theme.colors.textTertiary)
                        TextField("repo", text: $githubRepo)
                            .textFieldStyle(.plain)
                            .font(.system(size: 12))
                            .padding(.horizontal, 10)
                            .padding(.vertical, 6)
                            .background(theme.colors.codeBg)
                            .clipShape(RoundedRectangle(cornerRadius: 8))
                    }
                }

                // Token
                VStack(alignment: .leading, spacing: 4) {
                    Text("Personal Access Token")
                        .font(.system(size: 11, weight: .medium))
                        .foregroundStyle(theme.colors.textTertiary)
                    SecureField("ghp_...", text: $githubToken)
                        .textFieldStyle(.plain)
                        .font(.system(size: 12))
                        .padding(.horizontal, 10)
                        .padding(.vertical, 6)
                        .background(theme.colors.codeBg)
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                }

                // Test connection
                HStack(spacing: 8) {
                    Button(testing ? "Testing…" : "Test Connection") {
                        testConnection()
                    }
                    .font(.system(size: 11, weight: .medium))
                    .buttonStyle(.plain)
                    .foregroundStyle(theme.colors.accent)
                    .disabled(testing || githubOwner.isEmpty || githubRepo.isEmpty)

                    if let result = testResult {
                        if result.ok {
                            Label("Connected", systemImage: "checkmark.circle")
                                .font(.system(size: 10))
                                .foregroundStyle(theme.colors.statusComplete)
                        } else {
                            Label(result.error ?? "Failed", systemImage: "xmark.circle")
                                .font(.system(size: 10))
                                .foregroundStyle(theme.colors.statusError)
                        }
                    }
                }
            }

            Spacer()

            // Actions
            HStack {
                Button("Delete Project") {
                    showDeleteConfirm = true
                }
                .font(.system(size: 11))
                .foregroundStyle(theme.colors.statusError)
                .buttonStyle(.plain)

                Spacer()

                Button("Save") {
                    saveSettings()
                }
                .font(.system(size: 12, weight: .medium))
                .foregroundStyle(.white)
                .padding(.horizontal, 14)
                .padding(.vertical, 6)
                .background(theme.colors.accent)
                .clipShape(RoundedRectangle(cornerRadius: 8))
                .buttonStyle(.plain)
            }
        }
        .padding(20)
        .frame(width: 420, height: 480)
        .onAppear {
            name = project.name
            projectDescription = project.projectDescription ?? ""
            githubOwner = project.githubOwner ?? ""
            githubRepo = project.githubRepo ?? ""
            if GitHubSync.hasToken() {
                githubToken = "••••••••" // Placeholder
            }
        }
        .alert("Delete Project", isPresented: $showDeleteConfirm) {
            Button("Delete", role: .destructive) {
                let pmService = PMService(modelContext: modelContext)
                pmService.deleteProject(project.id)
                dismiss()
            }
            Button("Cancel", role: .cancel) { }
        } message: {
            Text("This will delete the project and all its issues. This cannot be undone.")
        }
    }

    private func saveSettings() {
        let pmService = PMService(modelContext: modelContext)
        pmService.updateProject(
            project.id,
            name: name.isEmpty ? nil : name,
            githubOwner: .some(githubOwner.isEmpty ? nil : githubOwner),
            githubRepo: .some(githubRepo.isEmpty ? nil : githubRepo)
        )

        // Save token if changed
        if !githubToken.isEmpty && !githubToken.hasPrefix("•") {
            GitHubSync.setToken(githubToken)
        }

        dismiss()
    }

    private func testConnection() {
        testing = true
        testResult = nil

        Task {
            let result = await GitHubSync.testConnection(owner: githubOwner, repo: githubRepo)
            testing = false
            testResult = result
        }
    }
}
