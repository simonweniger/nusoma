// MarketplaceTypes.swift — Plugin catalog types
// Ported from src/shared/types.ts marketplace section

import Foundation

enum PluginStatus: String, Sendable {
    case notInstalled = "not_installed"
    case checking
    case installing
    case installed
    case failed
}

struct CatalogPlugin: Identifiable, Sendable {
    let id: String          // unique: `${repo}/${skillPath}`
    let name: String
    let description: String
    let version: String
    let author: String
    let marketplace: String
    let repo: String
    let sourcePath: String
    let installName: String
    let category: String
    let tags: [String]
    let isSkillMd: Bool     // true = individual SKILL.md, false = CLI plugin
}
