// SyntaxTokenizer.swift — Regex-based syntax highlighting tokenizer
//
// Lightweight tokenizer for code block highlighting.
// Not a full parser — uses regex patterns for common language constructs.
// Supports: Swift, Python, JavaScript/TypeScript, Go, Rust, Shell, SQL, JSON, YAML, HTML/CSS.

import SwiftUI

// MARK: - Token Types

enum SyntaxTokenKind {
    case keyword
    case string
    case comment
    case number
    case type
    case function
    case operator_
    case property
    case plain
}

struct SyntaxToken {
    let text: String
    let kind: SyntaxTokenKind
}

// MARK: - Syntax Colors

struct SyntaxColorSet {
    let keyword: Color
    let string: Color
    let comment: Color
    let number: Color
    let type: Color
    let function: Color
    let operator_: Color
    let property: Color
    let plain: Color
}

let darkSyntaxColors = SyntaxColorSet(
    keyword: Color(hex: "#c792ea"),    // Purple
    string: Color(hex: "#c3e88d"),     // Green
    comment: Color(hex: "#676e7b"),    // Gray
    number: Color(hex: "#f78c6c"),     // Orange
    type: Color(hex: "#ffcb6b"),       // Yellow
    function: Color(hex: "#82aaff"),   // Blue
    operator_: Color(hex: "#89ddff"),  // Cyan
    property: Color(hex: "#f07178"),   // Red
    plain: Color(hex: "#bfc7d5")      // Light gray
)

let lightSyntaxColors = SyntaxColorSet(
    keyword: Color(hex: "#7c4dff"),    // Purple
    string: Color(hex: "#558b2f"),     // Green
    comment: Color(hex: "#90a4ae"),    // Gray
    number: Color(hex: "#f76d47"),     // Orange
    type: Color(hex: "#e6a700"),       // Yellow
    function: Color(hex: "#3949ab"),   // Blue
    operator_: Color(hex: "#0288d1"),  // Cyan
    property: Color(hex: "#d32f2f"),   // Red
    plain: Color(hex: "#37474f")      // Dark gray
)

// MARK: - Tokenizer

struct SyntaxTokenizer {
    /// Tokenize code into highlighted tokens.
    static func tokenize(code: String, language: String) -> [SyntaxToken] {
        let lang = language.lowercased()
        let rules = getRules(for: lang)

        guard !rules.isEmpty else {
            // No rules for this language — return as plain text
            return [SyntaxToken(text: code, kind: .plain)]
        }

        return applyRules(code: code, rules: rules)
    }

    // MARK: - Rule Sets

    private struct Rule {
        let pattern: String
        let kind: SyntaxTokenKind
    }

    private static func getRules(for language: String) -> [Rule] {
        switch language {
        case "swift":
            return swiftRules
        case "python", "py":
            return pythonRules
        case "javascript", "js", "typescript", "ts", "jsx", "tsx":
            return jsRules
        case "go", "golang":
            return goRules
        case "rust", "rs":
            return rustRules
        case "bash", "sh", "zsh", "shell":
            return shellRules
        case "sql":
            return sqlRules
        case "json":
            return jsonRules
        case "yaml", "yml":
            return yamlRules
        case "html", "xml", "svg":
            return htmlRules
        case "css", "scss", "less":
            return cssRules
        case "c", "cpp", "c++", "h", "hpp":
            return cppRules
        case "java", "kotlin", "kt":
            return javaRules
        case "ruby", "rb":
            return rubyRules
        default:
            return genericRules
        }
    }

    // MARK: - Generic rules (used for unknown languages)

    private static let genericRules: [Rule] = [
        Rule(pattern: #"//[^\n]*"#, kind: .comment),
        Rule(pattern: #"#[^\n]*"#, kind: .comment),
        Rule(pattern: #"/\*[\s\S]*?\*/"#, kind: .comment),
        Rule(pattern: #""""[\s\S]*?""""#, kind: .string),
        Rule(pattern: #""(?:[^"\\]|\\.)*""#, kind: .string),
        Rule(pattern: #"'(?:[^'\\]|\\.)*'"#, kind: .string),
        Rule(pattern: #"\b\d+\.?\d*\b"#, kind: .number),
        Rule(pattern: #"\b(?:if|else|for|while|return|func|fn|def|class|struct|enum|import|from|let|var|const|type|interface|true|false|nil|null|none|self|this)\b"#, kind: .keyword),
    ]

    // MARK: - Swift

    private static let swiftRules: [Rule] = [
        Rule(pattern: #"//[^\n]*"#, kind: .comment),
        Rule(pattern: #"/\*[\s\S]*?\*/"#, kind: .comment),
        Rule(pattern: #"#?"(?:[^"\\]|\\.)*""#, kind: .string),
        Rule(pattern: #""""[\s\S]*?""""#, kind: .string),
        Rule(pattern: #"\b\d+\.?\d*\b"#, kind: .number),
        Rule(pattern: #"\b(?:actor|associatedtype|async|await|break|case|catch|class|continue|default|defer|deinit|do|else|enum|extension|fallthrough|fileprivate|for|func|guard|if|import|in|init|inout|internal|is|lazy|let|mutating|nonisolated|open|operator|override|private|protocol|public|repeat|rethrows|return|self|Self|some|static|struct|subscript|super|switch|Task|throw|throws|try|typealias|var|weak|where|while)\b"#, kind: .keyword),
        Rule(pattern: #"\b(?:@Observable|@MainActor|@Environment|@State|@Binding|@Published|@ObservedObject|@StateObject|@AppStorage|@ViewBuilder|@discardableResult|@escaping|@Sendable|@Model|@Attribute|@Relationship)\b"#, kind: .keyword),
        Rule(pattern: #"\b(?:String|Int|Double|Float|Bool|Array|Dictionary|Set|Optional|Any|AnyObject|Void|Never|Result|UUID|Date|URL|Data|Error)\b"#, kind: .type),
        Rule(pattern: #"\b(?:true|false|nil)\b"#, kind: .number),
        Rule(pattern: #"\b[A-Z][A-Za-z0-9]*\b"#, kind: .type),
        Rule(pattern: #"(?<=\.)[a-zA-Z_]\w*(?=\()"#, kind: .function),
        Rule(pattern: #"(?<=\.)[a-zA-Z_]\w*"#, kind: .property),
    ]

    // MARK: - Python

    private static let pythonRules: [Rule] = [
        Rule(pattern: #"#[^\n]*"#, kind: .comment),
        Rule(pattern: #"'{3}[\s\S]*?'{3}"#, kind: .string),
        Rule(pattern: #"\"{3}[\s\S]*?\"{3}"#, kind: .string),
        Rule(pattern: #"f"(?:[^"\\]|\\.)*""#, kind: .string),
        Rule(pattern: #""(?:[^"\\]|\\.)*""#, kind: .string),
        Rule(pattern: #"'(?:[^'\\]|\\.)*'"#, kind: .string),
        Rule(pattern: #"\b\d+\.?\d*\b"#, kind: .number),
        Rule(pattern: #"\b(?:and|as|assert|async|await|break|class|continue|def|del|elif|else|except|finally|for|from|global|if|import|in|is|lambda|nonlocal|not|or|pass|raise|return|try|while|with|yield)\b"#, kind: .keyword),
        Rule(pattern: #"\b(?:True|False|None)\b"#, kind: .number),
        Rule(pattern: #"\b(?:int|float|str|bool|list|dict|set|tuple|bytes|type|object)\b"#, kind: .type),
        Rule(pattern: #"\b[A-Z][A-Za-z0-9_]*\b"#, kind: .type),
        Rule(pattern: #"(?<=def\s)\w+"#, kind: .function),
        Rule(pattern: #"(?<=\.)\w+(?=\()"#, kind: .function),
    ]

    // MARK: - JavaScript / TypeScript

    private static let jsRules: [Rule] = [
        Rule(pattern: #"//[^\n]*"#, kind: .comment),
        Rule(pattern: #"/\*[\s\S]*?\*/"#, kind: .comment),
        Rule(pattern: #"`(?:[^`\\]|\\.)*`"#, kind: .string),
        Rule(pattern: #""(?:[^"\\]|\\.)*""#, kind: .string),
        Rule(pattern: #"'(?:[^'\\]|\\.)*'"#, kind: .string),
        Rule(pattern: #"\b\d+\.?\d*\b"#, kind: .number),
        Rule(pattern: #"\b(?:abstract|as|async|await|break|case|catch|class|const|continue|debugger|default|delete|do|else|enum|export|extends|finally|for|from|function|get|if|implements|import|in|instanceof|interface|let|new|of|private|protected|public|readonly|return|set|static|super|switch|this|throw|try|type|typeof|var|void|while|with|yield)\b"#, kind: .keyword),
        Rule(pattern: #"\b(?:true|false|null|undefined|NaN|Infinity)\b"#, kind: .number),
        Rule(pattern: #"\b(?:string|number|boolean|any|never|void|unknown|object|symbol|bigint)\b"#, kind: .type),
        Rule(pattern: #"\b[A-Z][A-Za-z0-9]*\b"#, kind: .type),
        Rule(pattern: #"(?<=function\s)\w+"#, kind: .function),
        Rule(pattern: #"\w+(?=\s*\()"#, kind: .function),
        Rule(pattern: #"=>"#, kind: .operator_),
    ]

    // MARK: - Go

    private static let goRules: [Rule] = [
        Rule(pattern: #"//[^\n]*"#, kind: .comment),
        Rule(pattern: #"/\*[\s\S]*?\*/"#, kind: .comment),
        Rule(pattern: #"`[^`]*`"#, kind: .string),
        Rule(pattern: #""(?:[^"\\]|\\.)*""#, kind: .string),
        Rule(pattern: #"\b\d+\.?\d*\b"#, kind: .number),
        Rule(pattern: #"\b(?:break|case|chan|const|continue|default|defer|else|fallthrough|for|func|go|goto|if|import|interface|map|package|range|return|select|struct|switch|type|var)\b"#, kind: .keyword),
        Rule(pattern: #"\b(?:true|false|nil|iota)\b"#, kind: .number),
        Rule(pattern: #"\b(?:int|int8|int16|int32|int64|uint|uint8|uint16|uint32|uint64|float32|float64|complex64|complex128|string|bool|byte|rune|error|any)\b"#, kind: .type),
        Rule(pattern: #"\b[A-Z][A-Za-z0-9]*\b"#, kind: .type),
        Rule(pattern: #":="#, kind: .operator_),
    ]

    // MARK: - Rust

    private static let rustRules: [Rule] = [
        Rule(pattern: #"//[^\n]*"#, kind: .comment),
        Rule(pattern: #"/\*[\s\S]*?\*/"#, kind: .comment),
        Rule(pattern: #""(?:[^"\\]|\\.)*""#, kind: .string),
        Rule(pattern: #"\b\d+\.?\d*\b"#, kind: .number),
        Rule(pattern: #"\b(?:as|async|await|break|const|continue|crate|dyn|else|enum|extern|fn|for|if|impl|in|let|loop|match|mod|move|mut|pub|ref|return|self|Self|static|struct|super|trait|type|unsafe|use|where|while)\b"#, kind: .keyword),
        Rule(pattern: #"\b(?:true|false)\b"#, kind: .number),
        Rule(pattern: #"\b(?:i8|i16|i32|i64|i128|isize|u8|u16|u32|u64|u128|usize|f32|f64|bool|char|str|String|Vec|Box|Option|Result|Some|None|Ok|Err)\b"#, kind: .type),
        Rule(pattern: #"\b[A-Z][A-Za-z0-9]*\b"#, kind: .type),
        Rule(pattern: #"->"#, kind: .operator_),
        Rule(pattern: #"=>"#, kind: .operator_),
    ]

    // MARK: - Shell

    private static let shellRules: [Rule] = [
        Rule(pattern: #"#[^\n]*"#, kind: .comment),
        Rule(pattern: #""(?:[^"\\]|\\.)*""#, kind: .string),
        Rule(pattern: #"'[^']*'"#, kind: .string),
        Rule(pattern: #"\$\{?\w+\}?"#, kind: .property),
        Rule(pattern: #"\b\d+\b"#, kind: .number),
        Rule(pattern: #"\b(?:if|then|else|elif|fi|for|while|do|done|case|esac|in|function|return|exit|local|export|source|alias|unalias)\b"#, kind: .keyword),
        Rule(pattern: #"\b(?:echo|printf|cd|ls|mkdir|rm|cp|mv|cat|grep|sed|awk|find|xargs|sort|uniq|wc|head|tail|curl|wget|git|npm|yarn|pip|brew|apt|sudo)\b"#, kind: .function),
        Rule(pattern: #"[|&;><]"#, kind: .operator_),
    ]

    // MARK: - SQL

    private static let sqlRules: [Rule] = [
        Rule(pattern: #"--[^\n]*"#, kind: .comment),
        Rule(pattern: #"/\*[\s\S]*?\*/"#, kind: .comment),
        Rule(pattern: #"'(?:[^'\\]|\\.)*'"#, kind: .string),
        Rule(pattern: #"\b\d+\.?\d*\b"#, kind: .number),
        Rule(pattern: #"(?i)\b(?:SELECT|FROM|WHERE|INSERT|INTO|UPDATE|DELETE|CREATE|ALTER|DROP|TABLE|INDEX|VIEW|JOIN|LEFT|RIGHT|INNER|OUTER|FULL|CROSS|ON|AND|OR|NOT|IN|BETWEEN|LIKE|IS|NULL|AS|ORDER|BY|GROUP|HAVING|LIMIT|OFFSET|UNION|ALL|DISTINCT|EXISTS|CASE|WHEN|THEN|ELSE|END|SET|VALUES|PRIMARY|KEY|FOREIGN|REFERENCES|CONSTRAINT|DEFAULT|CHECK|UNIQUE|CASCADE|GRANT|REVOKE|BEGIN|COMMIT|ROLLBACK|TRANSACTION)\b"#, kind: .keyword),
        Rule(pattern: #"(?i)\b(?:INT|INTEGER|BIGINT|SMALLINT|TINYINT|FLOAT|DOUBLE|DECIMAL|NUMERIC|VARCHAR|CHAR|TEXT|BLOB|DATE|TIME|DATETIME|TIMESTAMP|BOOLEAN|SERIAL|UUID)\b"#, kind: .type),
        Rule(pattern: #"(?i)\b(?:COUNT|SUM|AVG|MIN|MAX|COALESCE|IFNULL|NULLIF|CAST|CONVERT|SUBSTRING|UPPER|LOWER|TRIM|LENGTH|NOW|CURRENT_TIMESTAMP)\b"#, kind: .function),
        Rule(pattern: #"\b(?:TRUE|FALSE|NULL)\b"#, kind: .number),
    ]

    // MARK: - JSON

    private static let jsonRules: [Rule] = [
        Rule(pattern: #""(?:[^"\\]|\\.)*"\s*:"#, kind: .property),
        Rule(pattern: #""(?:[^"\\]|\\.)*""#, kind: .string),
        Rule(pattern: #"-?\b\d+\.?\d*(?:[eE][+-]?\d+)?\b"#, kind: .number),
        Rule(pattern: #"\b(?:true|false|null)\b"#, kind: .keyword),
    ]

    // MARK: - YAML

    private static let yamlRules: [Rule] = [
        Rule(pattern: #"#[^\n]*"#, kind: .comment),
        Rule(pattern: #"^[\w.-]+(?=\s*:)"#, kind: .property),
        Rule(pattern: #""(?:[^"\\]|\\.)*""#, kind: .string),
        Rule(pattern: #"'[^']*'"#, kind: .string),
        Rule(pattern: #"\b\d+\.?\d*\b"#, kind: .number),
        Rule(pattern: #"\b(?:true|false|null|yes|no)\b"#, kind: .keyword),
    ]

    // MARK: - HTML/XML

    private static let htmlRules: [Rule] = [
        Rule(pattern: #"<!--[\s\S]*?-->"#, kind: .comment),
        Rule(pattern: #""[^"]*""#, kind: .string),
        Rule(pattern: #"'[^']*'"#, kind: .string),
        Rule(pattern: #"</?[a-zA-Z][\w-]*"#, kind: .keyword),
        Rule(pattern: #"/?\s*>"#, kind: .keyword),
        Rule(pattern: #"\b[a-zA-Z][\w-]*(?=\s*=)"#, kind: .property),
        Rule(pattern: #"&\w+;"#, kind: .number),
    ]

    // MARK: - CSS

    private static let cssRules: [Rule] = [
        Rule(pattern: #"/\*[\s\S]*?\*/"#, kind: .comment),
        Rule(pattern: #""[^"]*""#, kind: .string),
        Rule(pattern: #"'[^']*'"#, kind: .string),
        Rule(pattern: #"-?\b\d+\.?\d*(?:px|em|rem|vh|vw|%|s|ms|deg|fr)?\b"#, kind: .number),
        Rule(pattern: #"#[0-9a-fA-F]{3,8}\b"#, kind: .number),
        Rule(pattern: #"[.#][\w-]+"#, kind: .type),
        Rule(pattern: #"[\w-]+(?=\s*:)"#, kind: .property),
        Rule(pattern: #"@\w+"#, kind: .keyword),
        Rule(pattern: #"\b(?:important|inherit|initial|unset|none|auto|block|inline|flex|grid)\b"#, kind: .keyword),
    ]

    // MARK: - C/C++

    private static let cppRules: [Rule] = [
        Rule(pattern: #"//[^\n]*"#, kind: .comment),
        Rule(pattern: #"/\*[\s\S]*?\*/"#, kind: .comment),
        Rule(pattern: #"#\w+[^\n]*"#, kind: .keyword),
        Rule(pattern: #""(?:[^"\\]|\\.)*""#, kind: .string),
        Rule(pattern: #"'(?:[^'\\]|\\.)*'"#, kind: .string),
        Rule(pattern: #"\b\d+\.?\d*[fFlLuU]*\b"#, kind: .number),
        Rule(pattern: #"\b(?:auto|break|case|class|const|constexpr|continue|default|delete|do|else|enum|explicit|extern|for|friend|goto|if|inline|mutable|namespace|new|noexcept|nullptr|operator|private|protected|public|register|return|sizeof|static|static_cast|struct|switch|template|this|throw|try|typedef|typeid|typename|union|using|virtual|void|volatile|while)\b"#, kind: .keyword),
        Rule(pattern: #"\b(?:int|long|short|unsigned|signed|char|float|double|bool|size_t|string|vector|map|set|pair|shared_ptr|unique_ptr)\b"#, kind: .type),
        Rule(pattern: #"\b(?:true|false|NULL|nullptr)\b"#, kind: .number),
        Rule(pattern: #"->"#, kind: .operator_),
        Rule(pattern: #"::"#, kind: .operator_),
    ]

    // MARK: - Java/Kotlin

    private static let javaRules: [Rule] = [
        Rule(pattern: #"//[^\n]*"#, kind: .comment),
        Rule(pattern: #"/\*[\s\S]*?\*/"#, kind: .comment),
        Rule(pattern: #""(?:[^"\\]|\\.)*""#, kind: .string),
        Rule(pattern: #"'(?:[^'\\]|\\.)*'"#, kind: .string),
        Rule(pattern: #"\b\d+\.?\d*[fFdDlL]?\b"#, kind: .number),
        Rule(pattern: #"\b(?:abstract|assert|break|case|catch|class|const|continue|default|do|else|enum|extends|final|finally|for|goto|if|implements|import|instanceof|interface|native|new|package|private|protected|public|return|static|strictfp|super|switch|synchronized|this|throw|throws|transient|try|void|volatile|while|val|var|fun|object|companion|data|sealed|when|is|in|out|by|init|suspend|inline|reified|override|open|internal|lateinit|typealias)\b"#, kind: .keyword),
        Rule(pattern: #"\b(?:true|false|null)\b"#, kind: .number),
        Rule(pattern: #"\b(?:int|long|short|byte|char|float|double|boolean|String|Integer|Long|Double|Float|Boolean|List|Map|Set|Optional|Object|Void)\b"#, kind: .type),
        Rule(pattern: #"\b[A-Z][A-Za-z0-9]*\b"#, kind: .type),
        Rule(pattern: #"@\w+"#, kind: .keyword),
    ]

    // MARK: - Ruby

    private static let rubyRules: [Rule] = [
        Rule(pattern: #"#[^\n]*"#, kind: .comment),
        Rule(pattern: #""(?:[^"\\]|\\.)*""#, kind: .string),
        Rule(pattern: #"'(?:[^'\\]|\\.)*'"#, kind: .string),
        Rule(pattern: #":\w+"#, kind: .string),
        Rule(pattern: #"\b\d+\.?\d*\b"#, kind: .number),
        Rule(pattern: #"\b(?:alias|and|begin|break|case|class|def|defined|do|else|elsif|end|ensure|for|if|in|module|next|not|or|raise|redo|rescue|retry|return|self|super|then|undef|unless|until|when|while|yield)\b"#, kind: .keyword),
        Rule(pattern: #"\b(?:true|false|nil)\b"#, kind: .number),
        Rule(pattern: #"@\w+"#, kind: .property),
        Rule(pattern: #"\$\w+"#, kind: .property),
        Rule(pattern: #"\b[A-Z][A-Za-z0-9]*\b"#, kind: .type),
    ]

    // MARK: - Apply Rules

    private static func applyRules(code: String, rules: [Rule]) -> [SyntaxToken] {
        // Build combined regex — order matters (first match wins)
        var tokens: [SyntaxToken] = []
        var position = code.startIndex

        while position < code.endIndex {
            var bestMatch: (range: Range<String.Index>, kind: SyntaxTokenKind)?

            for rule in rules {
                guard let regex = try? NSRegularExpression(pattern: rule.pattern, options: []) else { continue }

                let searchRange = NSRange(position..<code.endIndex, in: code)
                guard let match = regex.firstMatch(in: code, options: [], range: searchRange) else { continue }

                let matchRange = Range(match.range, in: code)!
                guard matchRange.lowerBound == position else { continue }

                let matchLen = code.distance(from: matchRange.lowerBound, to: matchRange.upperBound)
                let bestLen = bestMatch.map { code.distance(from: $0.range.lowerBound, to: $0.range.upperBound) } ?? 0
                if bestMatch == nil || matchLen > bestLen {
                    bestMatch = (matchRange, rule.kind)
                }
            }

            if let best = bestMatch {
                tokens.append(SyntaxToken(text: String(code[best.range]), kind: best.kind))
                position = best.range.upperBound
            } else {
                // No match at this position — emit single character as plain
                let nextIndex = code.index(after: position)
                tokens.append(SyntaxToken(text: String(code[position..<nextIndex]), kind: .plain))
                position = nextIndex
            }
        }

        // Merge adjacent plain tokens for efficiency
        return mergeAdjacentPlain(tokens)
    }

    private static func mergeAdjacentPlain(_ tokens: [SyntaxToken]) -> [SyntaxToken] {
        var result: [SyntaxToken] = []
        for token in tokens {
            if let last = result.last, last.kind == .plain && token.kind == .plain {
                result[result.count - 1] = SyntaxToken(text: last.text + token.text, kind: .plain)
            } else {
                result.append(token)
            }
        }
        return result
    }
}
