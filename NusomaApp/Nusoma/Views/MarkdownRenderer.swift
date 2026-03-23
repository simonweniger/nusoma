// MarkdownRenderer.swift — Rich markdown → SwiftUI view tree
//
// Uses MarkdownView (github.com/LiYanan2004/MarkdownView) for rendering.
// Wraps it in MarkdownContent to match the app's existing API.

import SwiftUI
import MarkdownView

// MARK: - Public API

struct MarkdownContent: View {
    let source: String
    @Environment(ThemeManager.self) private var theme

    var body: some View {
        MarkdownView(source)
            .font(.system(size: 13))
            .tint(theme.colors.accent, for: .inlineCodeBlock)
            .textSelection(.enabled)
    }
}
