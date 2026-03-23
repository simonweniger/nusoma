// PMSidebarView.swift — Project list sidebar
// Ported from src/renderer/components/pm/Sidebar.tsx

import SwiftUI
import SwiftData

struct PMSidebarView: View {
    @Environment(ThemeManager.self) private var theme
    @Environment(\.modelContext) private var modelContext

    let projects: [PMProject]
    @Binding var selectedProjectId: String?
    let onOpenSettings: (PMProject) -> Void

    @State private var isCreating = false
    @State private var newName = ""

    var body: some View {
        VStack(spacing: 0) {
            // Header
            HStack {
                Text("PROJECTS")
                    .font(.system(size: 10, weight: .semibold))
                    .foregroundStyle(theme.colors.textTertiary)
                    .tracking(0.6)
                Spacer()
                Button {
                    isCreating = true
                } label: {
                    Image(systemName: "plus")
                        .font(.system(size: 11))
                        .foregroundStyle(theme.colors.textTertiary)
                }
                .buttonStyle(.plain)
            }
            .padding(.horizontal, 12)
            .padding(.top, 12)
            .padding(.bottom, 8)

            // Project list
            ScrollView {
                LazyVStack(spacing: 1) {
                    ForEach(projects) { project in
                        projectRow(project)
                    }

                    // Inline create form
                    if isCreating {
                        TextField("Project name…", text: $newName)
                            .textFieldStyle(.plain)
                            .font(.system(size: 12))
                            .padding(.horizontal, 8)
                            .padding(.vertical, 5)
                            .background(theme.colors.codeBg)
                            .clipShape(RoundedRectangle(cornerRadius: 8))
                            .padding(.horizontal, 6)
                            .onSubmit {
                                createProject()
                            }
                            .onExitCommand {
                                isCreating = false
                                newName = ""
                            }
                    }
                }
                .padding(.horizontal, 6)
            }
            .scrollIndicators(.hidden)
        }
        .frame(width: 180)
    }

    // MARK: - Project Row

    private func projectRow(_ project: PMProject) -> some View {
        let isActive = project.id == selectedProjectId

        return HStack(spacing: 6) {
            // Color dot
            Circle()
                .fill(Color(hex: project.color))
                .frame(width: 7, height: 7)

            Text(project.name)
                .font(.system(size: 12, weight: isActive ? .medium : .regular))
                .foregroundStyle(isActive ? theme.colors.textPrimary : theme.colors.textSecondary)
                .lineLimit(1)
                .truncationMode(.tail)

            Spacer()

            // Settings gear (shown on hover)
            Button {
                onOpenSettings(project)
            } label: {
                Image(systemName: "gearshape")
                    .font(.system(size: 10))
                    .foregroundStyle(theme.colors.textTertiary)
            }
            .buttonStyle(.plain)
            .opacity(isActive ? 0.6 : 0)
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 6)
        .background(isActive ? theme.colors.textTertiary.opacity(0.1) : Color.clear)
        .clipShape(RoundedRectangle(cornerRadius: 8))
        .contentShape(Rectangle())
        .onTapGesture {
            selectedProjectId = project.id
        }
    }

    // MARK: - Create

    private func createProject() {
        let name = newName.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !name.isEmpty else { return }

        let pmService = PMService(modelContext: modelContext)
        let project = pmService.createProject(CreateProjectInput(name: name))
        selectedProjectId = project.id
        newName = ""
        isCreating = false
    }
}
