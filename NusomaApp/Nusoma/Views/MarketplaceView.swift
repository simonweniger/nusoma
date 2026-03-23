// MarketplaceView.swift — Plugin browser with search, filter, install/uninstall
// Ported from src/renderer/components/MarketplacePanel.tsx

import SwiftUI

struct MarketplaceView: View {
    @Environment(AppState.self) private var appState
    @Environment(ThemeManager.self) private var theme

    @State private var searchText = ""
    @State private var selectedFilter = "All"
    @State private var expandedPluginId: String?

    private var catalog: [CatalogPlugin] { appState.marketplaceCatalog }
    private var pluginStates: [String: PluginStatus] { appState.marketplacePluginStates }
    private var loading: Bool { appState.marketplaceLoading }
    private var error: String? { appState.marketplaceError }

    // MARK: - Derived

    private var filters: [String] {
        var tagCounts: [String: Int] = [:]
        for plugin in catalog {
            for tag in plugin.tags {
                tagCounts[tag, default: 0] += 1
            }
        }
        let sorted = tagCounts.sorted { $0.value > $1.value || ($0.value == $1.value && $0.key < $1.key) }
            .map(\.key)
        return ["All"] + sorted + ["Installed"]
    }

    private var filteredPlugins: [CatalogPlugin] {
        let q = searchText.lowercased()
        return catalog.filter { plugin in
            let matchesSearch = q.isEmpty ||
                plugin.name.lowercased().contains(q) ||
                plugin.description.lowercased().contains(q) ||
                plugin.tags.contains { $0.lowercased().contains(q) } ||
                plugin.author.lowercased().contains(q) ||
                plugin.repo.lowercased().contains(q) ||
                plugin.marketplace.lowercased().contains(q)

            let matchesFilter = selectedFilter == "All" ||
                (selectedFilter == "Installed" && pluginStates[plugin.id] == .installed) ||
                plugin.tags.contains(selectedFilter)

            return matchesSearch && matchesFilter
        }
    }

    var body: some View {
        VStack(spacing: 0) {
            // Header
            header

            // Search + Build your own
            searchRow

            // Filter chips
            filterChips

            // Body
            ScrollView {
                if loading {
                    loadingState
                } else if let error {
                    errorState(error)
                } else if filteredPlugins.isEmpty {
                    emptyState
                } else {
                    pluginGrid
                }
            }
            .scrollIndicators(.hidden)
        }
        .frame(height: 470)
    }

    // MARK: - Header

    private var header: some View {
        HStack {
            HStack(spacing: 8) {
                Image(systemName: "cpu")
                    .font(.system(size: 16))
                    .foregroundStyle(theme.colors.accent)
                VStack(alignment: .leading, spacing: 2) {
                    Text("Skills Marketplace")
                        .font(.system(size: 13, weight: .bold))
                    Text("Install skills and plugins without leaving NUSOMA")
                        .font(.system(size: 11))
                        .foregroundStyle(theme.colors.textTertiary)
                }
            }

            Spacer()

            HStack(spacing: 10) {
                Text("\(filteredPlugins.count) result\(filteredPlugins.count == 1 ? "" : "s")")
                    .font(.system(size: 11))
                    .foregroundStyle(theme.colors.textTertiary)

                Button {
                    appState.loadMarketplace(forceRefresh: true)
                } label: {
                    Image(systemName: "arrow.clockwise")
                        .font(.system(size: 12))
                        .foregroundStyle(theme.colors.textTertiary)
                }
                .buttonStyle(.plain)

                Button {
                    appState.marketplaceOpen = false
                } label: {
                    Image(systemName: "xmark")
                        .font(.system(size: 12))
                        .foregroundStyle(theme.colors.textTertiary)
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.horizontal, 18)
        .padding(.top, 16)
        .padding(.bottom, 10)
    }

    // MARK: - Search Row

    private var searchRow: some View {
        HStack(spacing: 8) {
            HStack(spacing: 6) {
                Image(systemName: "magnifyingglass")
                    .font(.system(size: 12))
                    .foregroundStyle(theme.colors.textTertiary)
                TextField("Search skills, tags, authors...", text: $searchText)
                    .textFieldStyle(.plain)
                    .font(.system(size: 12))
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 9)
            .background(theme.colors.inputPillBg)
            .clipShape(RoundedRectangle(cornerRadius: 12))

            Button {
                // Build your own — open skill creator docs
                if let url = URL(string: "https://docs.anthropic.com/en/docs/claude-code/skills") {
                    NSWorkspace.shared.open(url)
                }
            } label: {
                HStack(spacing: 6) {
                    Image(systemName: "safari")
                        .font(.system(size: 11))
                    Text("Build your own")
                        .font(.system(size: 11, weight: .semibold))
                }
                .foregroundStyle(theme.colors.accent)
                .padding(.horizontal, 12)
                .padding(.vertical, 9)
                .overlay(
                    Capsule()
                        .stroke(style: StrokeStyle(lineWidth: 1, dash: [4, 3]))
                        .foregroundStyle(theme.colors.accent.opacity(0.4))
                )
            }
            .buttonStyle(.plain)
        }
        .padding(.horizontal, 18)
        .padding(.bottom, 10)
    }

    // MARK: - Filter Chips

    private var filterChips: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(filters, id: \.self) { filter in
                    Button {
                        selectedFilter = filter
                    } label: {
                        Text(filter)
                            .font(.system(size: 11, weight: .semibold))
                            .padding(.horizontal, 11)
                            .padding(.vertical, 6)
                            .foregroundStyle(selectedFilter == filter ? theme.colors.accent : theme.colors.textSecondary)
                            .overlay(
                                Capsule()
                                    .stroke(selectedFilter == filter ? theme.colors.accent : theme.colors.textTertiary.opacity(0.3), lineWidth: 1)
                            )
                            .background(
                                selectedFilter == filter ? theme.colors.accentLight : Color.clear
                            )
                            .clipShape(Capsule())
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.horizontal, 18)
        }
        .padding(.bottom, 12)
    }

    // MARK: - Plugin Grid

    private var pluginGrid: some View {
        LazyVGrid(columns: [
            GridItem(.flexible(), spacing: 10),
            GridItem(.flexible(), spacing: 10),
        ], spacing: 10) {
            ForEach(filteredPlugins) { plugin in
                PluginCardView(
                    plugin: plugin,
                    status: pluginStates[plugin.id] ?? .notInstalled,
                    isExpanded: expandedPluginId == plugin.id,
                    onToggleExpand: {
                        expandedPluginId = (expandedPluginId == plugin.id) ? nil : plugin.id
                    }
                )
            }
        }
        .padding(.horizontal, 18)
        .padding(.bottom, 6)
    }

    // MARK: - States

    private var loadingState: some View {
        VStack(spacing: 12) {
            ProgressView()
            Text("Loading marketplace…")
                .font(.system(size: 12))
                .foregroundStyle(theme.colors.textTertiary)
        }
        .frame(maxWidth: .infinity)
        .padding(40)
    }

    private func errorState(_ error: String) -> some View {
        VStack(spacing: 8) {
            Text(error.prefix(100) + (error.count > 100 ? "…" : ""))
                .font(.system(size: 11))
                .foregroundStyle(theme.colors.statusError)
                .multilineTextAlignment(.center)

            Button {
                appState.loadMarketplace(forceRefresh: true)
            } label: {
                HStack(spacing: 4) {
                    Image(systemName: "arrow.clockwise")
                        .font(.system(size: 10))
                    Text("Retry")
                        .font(.system(size: 10, weight: .semibold))
                }
                .foregroundStyle(theme.colors.accent)
            }
            .buttonStyle(.plain)
        }
        .padding(20)
    }

    private var emptyState: some View {
        Text("No plugins match your search")
            .font(.system(size: 11))
            .foregroundStyle(theme.colors.textTertiary)
            .padding(24)
    }
}

// MARK: - Plugin Card

struct PluginCardView: View {
    @Environment(AppState.self) private var appState
    @Environment(ThemeManager.self) private var theme

    let plugin: CatalogPlugin
    let status: PluginStatus
    let isExpanded: Bool
    let onToggleExpand: () -> Void

    @State private var showConfirm = false
    @State private var isHovering = false

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Tags + action button row
            HStack(alignment: .top) {
                // Tags
                HStack(spacing: 6) {
                    TagChip(label: plugin.category, isAccent: true)
                    ForEach(plugin.tags.prefix(isExpanded ? plugin.tags.count : 2), id: \.self) { tag in
                        TagChip(label: tag)
                    }
                }
                .fixedSize(horizontal: false, vertical: true)

                Spacer()

                HStack(spacing: 6) {
                    // GitHub link
                    Button {
                        let url = "https://github.com/\(plugin.repo)/tree/main/\(plugin.sourcePath)"
                        if let nsurl = URL(string: url) {
                            NSWorkspace.shared.open(nsurl)
                        }
                    } label: {
                        Image(systemName: "link")
                            .font(.system(size: 11))
                            .foregroundStyle(theme.colors.textTertiary)
                    }
                    .buttonStyle(.plain)

                    // Status button
                    statusButton
                }
            }
            .padding(.bottom, 8)

            // Name
            Text(plugin.name)
                .font(.system(size: 13, weight: .semibold))
                .lineLimit(isExpanded ? nil : 1)

            // Description
            Text(plugin.description)
                .font(.system(size: 11))
                .foregroundStyle(theme.colors.textSecondary)
                .lineLimit(isExpanded ? nil : 3)
                .padding(.top, 5)

            // Metadata
            Text("\(plugin.repo) · by \(plugin.author) · v\(plugin.version)")
                .font(.system(size: 10))
                .foregroundStyle(theme.colors.textTertiary)
                .padding(.top, 8)

            // Confirm install panel
            if isExpanded && showConfirm && status == .notInstalled {
                confirmPanel
                    .padding(.top, 10)
            }

            // Installing indicator
            if isExpanded && status == .installing {
                HStack(spacing: 8) {
                    ProgressView()
                        .controlSize(.mini)
                    Text("Installing plugin...")
                        .font(.system(size: 11))
                        .foregroundStyle(theme.colors.textSecondary)
                }
                .padding(.top, 10)
            }
        }
        .padding(12)
        .background(isExpanded || isHovering ? theme.colors.textTertiary.opacity(0.06) : Color.clear)
        .clipShape(RoundedRectangle(cornerRadius: 14))
        .overlay(
            RoundedRectangle(cornerRadius: 14)
                .stroke(theme.colors.textTertiary.opacity(0.15), lineWidth: 1)
        )
        .contentShape(Rectangle())
        .onTapGesture { onToggleExpand() }
        .onHover { isHovering = $0 }
        .onChange(of: isExpanded) {
            if !isExpanded { showConfirm = false }
        }
    }

    // MARK: - Status Button

    @ViewBuilder
    private var statusButton: some View {
        switch status {
        case .installed:
            Button {
                appState.uninstallMarketplacePlugin(plugin)
            } label: {
                Text("Installed")
                    .font(.system(size: 10, weight: .medium))
                    .foregroundStyle(theme.colors.statusComplete)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 2)
                    .background(theme.colors.statusComplete.opacity(0.1))
                    .clipShape(RoundedRectangle(cornerRadius: 8))
            }
            .buttonStyle(.plain)

        case .installing:
            Text("Installing...")
                .font(.system(size: 10, weight: .medium))
                .foregroundStyle(theme.colors.accent)
                .padding(.horizontal, 8)
                .padding(.vertical, 2)
                .background(theme.colors.accentLight)
                .clipShape(RoundedRectangle(cornerRadius: 8))

        case .failed:
            Button {
                appState.installMarketplacePlugin(plugin)
            } label: {
                Text("Failed — Retry")
                    .font(.system(size: 10, weight: .medium))
                    .foregroundStyle(theme.colors.statusError)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 2)
                    .background(theme.colors.statusError.opacity(0.1))
                    .clipShape(RoundedRectangle(cornerRadius: 8))
            }
            .buttonStyle(.plain)

        default:
            Button {
                if status == .failed {
                    appState.installMarketplacePlugin(plugin)
                } else {
                    showConfirm = true
                    if !isExpanded { onToggleExpand() }
                }
            } label: {
                Text("Install")
                    .font(.system(size: 10, weight: .semibold))
                    .foregroundStyle(theme.colors.accent)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 2)
                    .background(theme.colors.accentLight)
                    .overlay(
                        RoundedRectangle(cornerRadius: 8)
                            .stroke(theme.colors.accent.opacity(0.3), lineWidth: 1)
                    )
                    .clipShape(RoundedRectangle(cornerRadius: 8))
            }
            .buttonStyle(.plain)
        }
    }

    // MARK: - Confirm Panel

    private var confirmPanel: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(plugin.isSkillMd ? "Will install to:" : "Will run:")
                .font(.system(size: 10))
                .foregroundStyle(theme.colors.textTertiary)

            Text(plugin.isSkillMd
                 ? "~/.claude/skills/\(plugin.installName)/SKILL.md"
                 : "claude plugin install \(plugin.installName)@\(plugin.marketplace)")
                .font(.system(size: 10, design: .monospaced))
                .foregroundStyle(theme.colors.textSecondary)
                .padding(.horizontal, 6)
                .padding(.vertical, 4)
                .background(theme.colors.codeBg)
                .clipShape(RoundedRectangle(cornerRadius: 4))

            HStack(spacing: 6) {
                Button("Confirm Install") {
                    showConfirm = false
                    appState.installMarketplacePlugin(plugin)
                }
                .font(.system(size: 10, weight: .semibold))
                .foregroundStyle(.white)
                .padding(.horizontal, 10)
                .padding(.vertical, 4)
                .background(theme.colors.accent)
                .clipShape(RoundedRectangle(cornerRadius: 6))
                .buttonStyle(.plain)

                Button("Cancel") {
                    showConfirm = false
                }
                .font(.system(size: 10, weight: .medium))
                .foregroundStyle(theme.colors.textSecondary)
                .padding(.horizontal, 10)
                .padding(.vertical, 4)
                .overlay(
                    RoundedRectangle(cornerRadius: 6)
                        .stroke(theme.colors.textTertiary.opacity(0.3), lineWidth: 1)
                )
                .buttonStyle(.plain)
            }
        }
        .padding(12)
        .background(theme.colors.codeBg)
        .clipShape(RoundedRectangle(cornerRadius: 10))
    }
}

// MARK: - Tag Chip

struct TagChip: View {
    @Environment(ThemeManager.self) private var theme
    let label: String
    var isAccent: Bool = false

    var body: some View {
        Text(label)
            .font(.system(size: 10, weight: .semibold))
            .lineLimit(1)
            .padding(.horizontal, 8)
            .padding(.vertical, 5)
            .foregroundStyle(isAccent ? theme.colors.accent : theme.colors.textSecondary)
            .background(isAccent ? theme.colors.accentLight : theme.colors.codeBg)
            .overlay(
                Capsule()
                    .stroke(isAccent ? theme.colors.accent.opacity(0.3) : theme.colors.textTertiary.opacity(0.2), lineWidth: 1)
            )
            .clipShape(Capsule())
    }
}
