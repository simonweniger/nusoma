// PermissionHookServerTests.swift — Tests for safe Bash command detection

import XCTest
@testable import Nusoma

final class PermissionHookServerTests: XCTestCase {
    // MARK: - Safe Bash Command Tests

    func testSafeReadOnlyCommands() {
        XCTAssertTrue(isSafeBashCommand("ls -la"))
        XCTAssertTrue(isSafeBashCommand("cat /etc/hosts"))
        XCTAssertTrue(isSafeBashCommand("grep -r 'pattern' src/"))
        XCTAssertTrue(isSafeBashCommand("head -20 file.txt"))
        XCTAssertTrue(isSafeBashCommand("git status"))
        XCTAssertTrue(isSafeBashCommand("git log --oneline"))
        XCTAssertTrue(isSafeBashCommand("git diff"))
        XCTAssertTrue(isSafeBashCommand("pwd"))
        XCTAssertTrue(isSafeBashCommand("echo hello"))
        XCTAssertTrue(isSafeBashCommand("find . -name '*.swift'"))
        XCTAssertTrue(isSafeBashCommand("wc -l file.txt"))
        XCTAssertTrue(isSafeBashCommand("which swift"))
        XCTAssertTrue(isSafeBashCommand("python3 --version"))
    }

    func testMutatingGitCommands() {
        XCTAssertFalse(isSafeBashCommand("git push origin main"))
        XCTAssertFalse(isSafeBashCommand("git commit -m 'msg'"))
        XCTAssertFalse(isSafeBashCommand("git merge feature"))
        XCTAssertFalse(isSafeBashCommand("git rebase main"))
        XCTAssertFalse(isSafeBashCommand("git reset --hard"))
        XCTAssertFalse(isSafeBashCommand("git checkout -b new"))
        XCTAssertFalse(isSafeBashCommand("git stash"))
    }

    func testDangerousCommands() {
        XCTAssertFalse(isSafeBashCommand("rm -rf /tmp/something"))
        XCTAssertFalse(isSafeBashCommand("mkdir new_dir"))
        XCTAssertFalse(isSafeBashCommand("touch file.txt"))
        XCTAssertFalse(isSafeBashCommand("curl https://example.com"))
        XCTAssertFalse(isSafeBashCommand("wget https://example.com"))
    }

    func testPackageManagerMutations() {
        XCTAssertFalse(isSafeBashCommand("npm install lodash"))
        XCTAssertFalse(isSafeBashCommand("npm run build"))
        XCTAssertFalse(isSafeBashCommand("yarn add react"))
        XCTAssertFalse(isSafeBashCommand("pnpm install"))
        XCTAssertFalse(isSafeBashCommand("bun install"))
    }

    func testPipedCommands() {
        XCTAssertTrue(isSafeBashCommand("cat file.txt | grep pattern"))
        XCTAssertTrue(isSafeBashCommand("ls -la | head -5"))
        XCTAssertTrue(isSafeBashCommand("git log | grep fix"))
    }

    func testChainedCommands() {
        XCTAssertTrue(isSafeBashCommand("ls && pwd"))
        XCTAssertFalse(isSafeBashCommand("ls && rm file.txt"))
        XCTAssertFalse(isSafeBashCommand("pwd; npm install"))
    }

    func testOutputRedirection() {
        XCTAssertFalse(isSafeBashCommand("echo hello > file.txt"))
        XCTAssertTrue(isSafeBashCommand("ls 2>/dev/null"))
        XCTAssertTrue(isSafeBashCommand("git status 2>&1"))
    }

    func testEmptyCommand() {
        XCTAssertFalse(isSafeBashCommand(""))
        XCTAssertFalse(isSafeBashCommand("   "))
    }

    // MARK: - Sensitive Field Masking Tests

    func testMaskSensitiveFields() {
        let input: [String: Any] = [
            "command": "echo hello",
            "api_key": "sk-12345",
            "password": "secret123",
            "file_path": "/home/user/file.txt",
            "auth_token": "bearer xyz",
        ]

        let masked = maskSensitiveFields(input)

        XCTAssertEqual(masked["command"] as? String, "echo hello")
        XCTAssertEqual(masked["api_key"] as? String, "***")
        XCTAssertEqual(masked["password"] as? String, "***")
        XCTAssertEqual(masked["file_path"] as? String, "/home/user/file.txt")
        XCTAssertEqual(masked["auth_token"] as? String, "***")
    }

    func testMaskNestedFields() {
        let input: [String: Any] = [
            "config": [
                "secret_key": "abc",
                "name": "test",
            ] as [String: Any]
        ]

        let masked = maskSensitiveFields(input)
        let config = masked["config"] as? [String: Any]
        XCTAssertEqual(config?["secret_key"] as? String, "***")
        XCTAssertEqual(config?["name"] as? String, "test")
    }
}
