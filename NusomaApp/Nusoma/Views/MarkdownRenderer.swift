// MarkdownRenderer.swift — Rich markdown → SwiftUI view tree
//
// Custom markdown parser that produces native SwiftUI views with:
// - Fenced code blocks with syntax highlighting and copy button
// - Inline code spans
// - Bold, italic, strikethrough
// - Headings (H1-H6)
// - Bullet and numbered lists
// - Block quotes
// - Tables
// - Clickable links
// - Horizontal rules
// - Images (loaded from URL)
//
// Uses swift-markdown (Apple) for parsing, then walks the AST to build views.

import SwiftUI
import Markdown

// MARK: - Public API

struct MarkdownContent: View {
    let source: String
    @Environment(ThemeManager.self) private var theme

    var body: some View {
        let document = Document(parsing: source)
        let blocks = MarkdownBlockParser.parse(document)

        VStack(alignment: .leading, spacing: 6) {
            ForEach(Array(blocks.enumerated()), id: \.offset) { _, block in
                MarkdownBlockView(block: block)
            }
        }
    }
}

// MARK: - Block Model

/// Intermediate representation of parsed markdown blocks.
enum MarkdownBlock {
    case paragraph(inlines: [MarkdownInline])
    case heading(level: Int, inlines: [MarkdownInline])
    case codeBlock(language: String?, code: String)
    case blockQuote(blocks: [MarkdownBlock])
    case unorderedList(items: [[MarkdownBlock]])
    case orderedList(start: Int, items: [[MarkdownBlock]])
    case table(headers: [[MarkdownInline]], rows: [[[MarkdownInline]]])
    case thematicBreak
    case image(source: String, alt: String)
}

enum MarkdownInline {
    case text(String)
    case code(String)
    case emphasis([MarkdownInline])
    case strong([MarkdownInline])
    case strikethrough([MarkdownInline])
    case link(destination: String, children: [MarkdownInline])
    case image(source: String, alt: String)
    case softBreak
    case lineBreak
}

// MARK: - AST → Block Parser

struct MarkdownBlockParser {
    static func parse(_ document: Document) -> [MarkdownBlock] {
        var blocks: [MarkdownBlock] = []
        for child in document.children {
            if let block = parseBlockMarkup(child) {
                blocks.append(block)
            }
        }
        return blocks
    }

    private static func parseBlockMarkup(_ markup: any Markup) -> MarkdownBlock? {
        switch markup {
        case let p as Paragraph:
            return .paragraph(inlines: parseInlines(p.inlineChildren))

        case let h as Heading:
            return .heading(level: h.level, inlines: parseInlines(h.inlineChildren))

        case let cb as CodeBlock:
            return .codeBlock(language: cb.language, code: cb.code)

        case let bq as BlockQuote:
            let inner = bq.children.compactMap { parseBlockMarkup($0) }
            return .blockQuote(blocks: inner)

        case let ul as UnorderedList:
            let items = ul.listItems.map { item in
                item.children.compactMap { parseBlockMarkup($0) }
            }
            return .unorderedList(items: items)

        case let ol as OrderedList:
            let items = ol.listItems.map { item in
                item.children.compactMap { parseBlockMarkup($0) }
            }
            return .orderedList(start: Int(ol.startIndex), items: items)

        case let tbl as Markdown.Table:
            let headers = tbl.head.cells.map { cell in
                parseInlines(cell.inlineChildren)
            }
            let rows = tbl.body.rows.map { row in
                row.cells.map { cell in
                    parseInlines(cell.inlineChildren)
                }
            }
            return .table(headers: headers, rows: rows)

        case is ThematicBreak:
            return .thematicBreak

        default:
            // Fallback: try to extract text
            let text = markup.format()
            if !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                return .paragraph(inlines: [.text(text)])
            }
            return nil
        }
    }

    static func parseInlines(_ children: some Sequence<any InlineMarkup>) -> [MarkdownInline] {
        var inlines: [MarkdownInline] = []
        for child in children {
            switch child {
            case let t as Markdown.Text:
                inlines.append(.text(t.string))

            case let ic as InlineCode:
                inlines.append(.code(ic.code))

            case let em as Emphasis:
                inlines.append(.emphasis(parseInlines(em.inlineChildren)))

            case let st as Strong:
                inlines.append(.strong(parseInlines(st.inlineChildren)))

            case let s as Strikethrough:
                inlines.append(.strikethrough(parseInlines(s.inlineChildren)))

            case let link as Markdown.Link:
                inlines.append(.link(
                    destination: link.destination ?? "",
                    children: parseInlines(link.inlineChildren)
                ))

            case let img as Markdown.Image:
                inlines.append(.image(source: img.source ?? "", alt: img.plainText))

            case is SoftBreak:
                inlines.append(.softBreak)

            case is LineBreak:
                inlines.append(.lineBreak)

            default:
                inlines.append(.text(child.plainText))
            }
        }
        return inlines
    }
}

// MARK: - Block View

struct MarkdownBlockView: View {
    @Environment(ThemeManager.self) private var theme
    let block: MarkdownBlock

    var body: some View {
        switch block {
        case .paragraph(let inlines):
            InlineTextView(inlines: inlines)
                .font(.system(size: 13))

        case .heading(let level, let inlines):
            InlineTextView(inlines: inlines)
                .font(.system(size: headingSize(level), weight: .semibold))
                .padding(.top, level <= 2 ? 4 : 2)

        case .codeBlock(let language, let code):
            CodeBlockView(language: language, code: code)

        case .blockQuote(let blocks):
            HStack(alignment: .top, spacing: 0) {
                RoundedRectangle(cornerRadius: 1.5)
                    .fill(theme.colors.accent.opacity(0.4))
                    .frame(width: 3)
                    .padding(.trailing, 8)

                VStack(alignment: .leading, spacing: 4) {
                    ForEach(Array(blocks.enumerated()), id: \.offset) { _, b in
                        MarkdownBlockView(block: b)
                    }
                }
                .foregroundStyle(theme.colors.textSecondary)
            }
            .padding(.vertical, 2)

        case .unorderedList(let items):
            VStack(alignment: .leading, spacing: 3) {
                ForEach(Array(items.enumerated()), id: \.offset) { _, item in
                    HStack(alignment: .firstTextBaseline, spacing: 6) {
                        Text("•")
                            .font(.system(size: 13))
                            .foregroundStyle(theme.colors.textTertiary)
                        VStack(alignment: .leading, spacing: 3) {
                            ForEach(Array(item.enumerated()), id: \.offset) { _, b in
                                MarkdownBlockView(block: b)
                            }
                        }
                    }
                }
            }

        case .orderedList(let start, let items):
            VStack(alignment: .leading, spacing: 3) {
                ForEach(Array(items.enumerated()), id: \.offset) { idx, item in
                    HStack(alignment: .firstTextBaseline, spacing: 6) {
                        Text("\(start + idx).")
                            .font(.system(size: 13, design: .monospaced))
                            .foregroundStyle(theme.colors.textTertiary)
                            .frame(minWidth: 20, alignment: .trailing)
                        VStack(alignment: .leading, spacing: 3) {
                            ForEach(Array(item.enumerated()), id: \.offset) { _, b in
                                MarkdownBlockView(block: b)
                            }
                        }
                    }
                }
            }

        case .table(let headers, let rows):
            MarkdownTableView(headers: headers, rows: rows)

        case .thematicBreak:
            Divider()
                .padding(.vertical, 4)

        case .image(let source, let alt):
            if let url = URL(string: source) {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .success(let img):
                        img.resizable().scaledToFit()
                            .frame(maxWidth: 300)
                            .clipShape(RoundedRectangle(cornerRadius: 8))
                    case .failure:
                        Text("[\(alt)]")
                            .foregroundStyle(theme.colors.textTertiary)
                    default:
                        ProgressView().controlSize(.small)
                    }
                }
            }
        }
    }

    private func headingSize(_ level: Int) -> CGFloat {
        switch level {
        case 1: return 20
        case 2: return 17
        case 3: return 15
        case 4: return 14
        default: return 13
        }
    }
}

// MARK: - Inline Text View

struct InlineTextView: View {
    @Environment(ThemeManager.self) private var theme
    let inlines: [MarkdownInline]

    var body: some View {
        buildText(inlines)
            .textSelection(.enabled)
    }

    private func buildText(_ inlines: [MarkdownInline]) -> SwiftUI.Text {
        var result = SwiftUI.Text("")
        for inline in inlines {
            result = result + renderInline(inline)
        }
        return result
    }

    private func renderInline(_ inline: MarkdownInline) -> SwiftUI.Text {
        switch inline {
        case .text(let str):
            return SwiftUI.Text(str)
                .foregroundColor(theme.colors.textPrimary)

        case .code(let code):
            return SwiftUI.Text(code)
                .font(.system(size: 12, design: .monospaced))
                .foregroundColor(theme.colors.accent)

        case .emphasis(let children):
            return buildText(children).italic()

        case .strong(let children):
            return buildText(children).bold()

        case .strikethrough(let children):
            return buildText(children).strikethrough()

        case .link(let destination, let children):
            // Markdown links render as tinted text; open on click via .environment
            let label = children.map { plainText($0) }.joined()
            return SwiftUI.Text(.init("[\(label)](\(destination))"))
                .foregroundColor(theme.colors.accent)

        case .image(_, let alt):
            return SwiftUI.Text("[\(alt)]")
                .foregroundColor(theme.colors.textTertiary)

        case .softBreak:
            return SwiftUI.Text(" ")

        case .lineBreak:
            return SwiftUI.Text("\n")
        }
    }

    private func plainText(_ inline: MarkdownInline) -> String {
        switch inline {
        case .text(let s): return s
        case .code(let s): return s
        case .emphasis(let c), .strong(let c), .strikethrough(let c):
            return c.map { plainText($0) }.joined()
        case .link(_, let c): return c.map { plainText($0) }.joined()
        case .image(_, let alt): return alt
        case .softBreak: return " "
        case .lineBreak: return "\n"
        }
    }
}

// MARK: - Code Block View

struct CodeBlockView: View {
    @Environment(ThemeManager.self) private var theme
    let language: String?
    let code: String

    @State private var copied = false
    @State private var isCollapsed = false

    private var trimmedCode: String {
        code.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private var lineCount: Int {
        trimmedCode.components(separatedBy: "\n").count
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Header bar
            HStack(spacing: 6) {
                // Language badge
                if let lang = language, !lang.isEmpty {
                    Text(lang)
                        .font(.system(size: 10, weight: .medium, design: .monospaced))
                        .foregroundStyle(theme.colors.textTertiary)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(theme.colors.textTertiary.opacity(0.1))
                        .clipShape(Capsule())
                }

                // Line count
                Text("\(lineCount) lines")
                    .font(.system(size: 9))
                    .foregroundStyle(theme.colors.textMuted)

                Spacer()

                // Collapse toggle for long blocks
                if lineCount > 15 {
                    Button {
                        withAnimation(NusomaAnimation.quick) {
                            isCollapsed.toggle()
                        }
                    } label: {
                        Image(systemName: isCollapsed ? "chevron.down" : "chevron.up")
                            .font(.system(size: 9))
                            .foregroundStyle(theme.colors.textTertiary)
                    }
                    .buttonStyle(.plain)
                }

                // Copy button
                Button {
                    NSPasteboard.general.clearContents()
                    NSPasteboard.general.setString(trimmedCode, forType: .string)
                    copied = true
                    Task {
                        try? await Task.sleep(for: .seconds(2))
                        copied = false
                    }
                } label: {
                    HStack(spacing: 3) {
                        Image(systemName: copied ? "checkmark" : "doc.on.doc")
                            .font(.system(size: 10))
                        if copied {
                            Text("Copied")
                                .font(.system(size: 10))
                        }
                    }
                    .foregroundStyle(copied ? theme.colors.statusComplete : theme.colors.textTertiary)
                }
                .buttonStyle(.plain)
            }
            .padding(.horizontal, 10)
            .padding(.vertical, 6)

            Divider()
                .opacity(0.3)

            // Code content with syntax highlighting
            ScrollView(.horizontal, showsIndicators: false) {
                if isCollapsed {
                    // Show first 5 lines + "..."
                    let preview = trimmedCode.components(separatedBy: "\n").prefix(5).joined(separator: "\n")
                    SyntaxHighlightedText(code: preview + "\n...", language: language)
                        .padding(10)
                } else {
                    SyntaxHighlightedText(code: trimmedCode, language: language)
                        .padding(10)
                }
            }
            .frame(maxHeight: isCollapsed ? 120 : nil)
        }
        .background(theme.colors.codeBg)
        .clipShape(RoundedRectangle(cornerRadius: 10))
        .overlay(
            RoundedRectangle(cornerRadius: 10)
                .stroke(theme.colors.containerBorder.opacity(0.5), lineWidth: 0.5)
        )
    }
}

// MARK: - Syntax Highlighted Text

/// Renders code with basic keyword-level syntax highlighting.
/// Uses a simple regex-based tokenizer (not a full TreeSitter parser).
struct SyntaxHighlightedText: View {
    @Environment(ThemeManager.self) private var theme
    let code: String
    let language: String?

    var body: some View {
        let tokens = SyntaxTokenizer.tokenize(code: code, language: language ?? "")

        VStack(alignment: .leading, spacing: 0) {
            let lines = splitIntoLines(tokens)
            ForEach(Array(lines.enumerated()), id: \.offset) { lineNum, lineTokens in
                HStack(alignment: .firstTextBaseline, spacing: 0) {
                    // Line number
                    Text("\(lineNum + 1)")
                        .font(.system(size: 10, design: .monospaced))
                        .foregroundStyle(theme.colors.textMuted)
                        .frame(width: 28, alignment: .trailing)
                        .padding(.trailing, 8)

                    // Highlighted tokens
                    buildLine(lineTokens)
                }
            }
        }
        .textSelection(.enabled)
    }

    private func buildLine(_ tokens: [SyntaxToken]) -> SwiftUI.Text {
        var result = SwiftUI.Text("")
        for token in tokens {
            result = result + SwiftUI.Text(token.text)
                .font(.system(size: 12, design: .monospaced))
                .foregroundColor(colorForKind(token.kind))
        }
        // Ensure empty lines still take up space
        if tokens.isEmpty {
            result = SwiftUI.Text(" ")
                .font(.system(size: 12, design: .monospaced))
        }
        return result
    }

    private func colorForKind(_ kind: SyntaxTokenKind) -> Color {
        let syntax = theme.isDark ? darkSyntaxColors : lightSyntaxColors
        switch kind {
        case .keyword: return syntax.keyword
        case .string: return syntax.string
        case .comment: return syntax.comment
        case .number: return syntax.number
        case .type: return syntax.type
        case .function: return syntax.function
        case .operator_: return syntax.operator_
        case .property: return syntax.property
        case .plain: return syntax.plain
        }
    }

    /// Split a flat token list into per-line groups.
    private func splitIntoLines(_ tokens: [SyntaxToken]) -> [[SyntaxToken]] {
        var lines: [[SyntaxToken]] = [[]]
        for token in tokens {
            let parts = token.text.split(separator: "\n", omittingEmptySubsequences: false)
            for (i, part) in parts.enumerated() {
                if i > 0 {
                    lines.append([])
                }
                if !part.isEmpty {
                    lines[lines.count - 1].append(SyntaxToken(text: String(part), kind: token.kind))
                }
            }
        }
        return lines
    }
}

// MARK: - Table View

struct MarkdownTableView: View {
    @Environment(ThemeManager.self) private var theme
    let headers: [[MarkdownInline]]
    let rows: [[[MarkdownInline]]]

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            VStack(alignment: .leading, spacing: 0) {
                // Header row
                HStack(spacing: 0) {
                    ForEach(Array(headers.enumerated()), id: \.offset) { _, header in
                        InlineTextView(inlines: header)
                            .font(.system(size: 12, weight: .semibold))
                            .padding(.horizontal, 8)
                            .padding(.vertical, 6)
                            .frame(minWidth: 60, alignment: .leading)
                    }
                }
                .background(theme.colors.codeBg)

                Divider().opacity(0.5)

                // Data rows
                ForEach(Array(rows.enumerated()), id: \.offset) { rowIdx, row in
                    HStack(spacing: 0) {
                        ForEach(Array(row.enumerated()), id: \.offset) { _, cell in
                            InlineTextView(inlines: cell)
                                .font(.system(size: 12))
                                .padding(.horizontal, 8)
                                .padding(.vertical, 4)
                                .frame(minWidth: 60, alignment: .leading)
                        }
                    }
                    .background(rowIdx % 2 == 0 ? Color.clear : theme.colors.codeBg.opacity(0.5))
                }
            }
            .clipShape(RoundedRectangle(cornerRadius: 8))
            .overlay(
                RoundedRectangle(cornerRadius: 8)
                    .stroke(theme.colors.containerBorder.opacity(0.5), lineWidth: 0.5)
            )
        }
    }
}
