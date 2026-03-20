# Pull Request Reviews — simonweniger/nusoma

Reviewed on 2026-03-20 by Claude Code.

---

## PR #1: feat: enable manual window dragging for frameless overlay
**Branch:** `feat/manual-window-drag` → `main` | **Verdict: Close in favor of PR #5**

### Summary
Adds IPC-based window dragging (54 lines across 4 files) to bypass the `-webkit-app-region: drag` conflict with `setIgnoreMouseEvents()`.

### Strengths
- Clean delta-based IPC solution that correctly solves the root conflict
- Proper event listener cleanup in `useEffect`
- Guards `.no-drag` children for interactive elements

### Issues
1. **Superseded by PR #5** — PR #5 implements a `DragHandle` React component with `requestAnimationFrame` debouncing and proper component extraction. This PR's document-level listeners in App.tsx are less maintainable.
2. **No RAF throttling** — Every `mousemove` fires an IPC call to `win.setPosition()`. On 120Hz+ displays this creates ~120 IPC roundtrips/second during drag.
3. **Merge conflict with PR #5** — Both modify `App.tsx`, `types.ts`, `preload/index.ts`, and `main/index.ts`. Cannot both be merged cleanly.

**Recommendation:** Close without merging. PR #5 provides the same functionality with improvements.

---

## PR #2: Add tab pinning, renaming, and keyboard shortcuts
**Branch:** `claude/implement-pr-features-FBt4W` → `main` | **Verdict: Request Changes**

### Summary
Adds tab pinning (right-click), inline renaming (double-click), and keyboard shortcuts (Cmd+T/W/1-9). Persists pinned tabs via localStorage.

### Strengths
- Useful power-user features with good UX patterns
- Proper localStorage persistence with `nusoma-pinned-tabs` key
- Clean sort logic: pinned first, preserving relative order within groups
- Enter/Escape handling for rename, right-click context for pin

### Issues Requiring Changes

1. **200ms single-click delay (UX regression)** — The timer-based double-click detection delays every tab selection by 200ms. This will feel noticeably sluggish. Fix: use React's native `onDoubleClick` handler instead of a manual timer:
   ```tsx
   onClick={() => selectTab(tab.id)}
   onDoubleClick={(e) => { e.stopPropagation(); setEditingTabId(tab.id); setEditValue(tab.title) }}
   ```

2. **Cmd+W doesn't respect pinned tabs** — The keyboard handler calls `closeTab(activeTabId)` unconditionally. The store's `closeTab` guards against pinned tabs, but the UX should show feedback (flash the pin icon, etc.) rather than silently doing nothing.

3. **Custom menu drops standard menus** — `Menu.setApplicationMenu()` replaces the entire menu bar with only App and Edit menus. This removes the standard Window menu (needed for fullscreen, minimize) and Help menu. Add them back:
   ```typescript
   { label: 'Window', submenu: [{ role: 'minimize' }, { role: 'close' }] }
   ```

4. **Pinned tab restore blocks startup** — The `loadPinnedTabs` loop calls `createTab()` + `loadSession()` sequentially per tab. With 5 pinned tabs, startup could be slow. Use `Promise.all()` to parallelize.

5. **Silent error swallowing** — Multiple `try {} catch {}` blocks with no logging. At minimum add `console.warn()` in catch blocks for debuggability.

6. **Missing type declarations** — `togglePin` and `renameTab` need to be added to the `State` interface in sessionStore.ts. Also verify `pinned: boolean` is added to `TabState` in shared/types.ts.

7. **Hardware acceleration disabled** — The description mentions this but it's not visible in the diff. This is a significant change that affects GPU rendering and should be a separate, documented decision.

---

## PR #3: Add WhisperKit support as preferred transcription backend
**Branch:** `claude/implement-pr-15-JKWCm` → `main` | **Verdict: Approve**

### Summary
Replaces broken `whisper-cli` Homebrew formula with `whisperkit-cli` as the preferred transcription backend. Maintains whisper-cpp and Python Whisper as fallbacks.

### Strengths
- **Fixes a real bug** — `brew install whisper-cli` fails because it's not a Homebrew formula
- **Clean fallback chain** — WhisperKit → whisper-cpp → Python whisper
- **Smart model handling** — Skips GGML model search for WhisperKit (uses CoreML internally)
- **Fully backward compatible** — Existing installations continue to work

### Minor Suggestions

1. **Add timeout comment** — The 60s vs 30s timeout difference should be documented:
   ```typescript
   // 60s timeout: WhisperKit may download CoreML models on first run
   { encoding: 'utf-8', timeout: 60000 }
   ```

2. **Verify WhisperKit output format** — The transcript post-processing (stripping `[timestamp --> timestamp]` patterns, hallucination filtering) was written for whisper-cpp. WhisperKit CLI may produce different output. Test with actual WhisperKit output to confirm compatibility.

3. **Model size consistency** — `--model-size tiny` is hardcoded for WhisperKit while whisper-cpp prefers `base` when available. Consider documenting the rationale or aligning the defaults.

---

## PR #4: Add session persistence and comprehensive unit tests
**Branch:** `claude/implement-pr-18-uBL8y` → `main` | **Verdict: Approve with Suggestions**

### Summary
Adds working directory restoration on startup (`useLastFolder` setting) and introduces Vitest testing infrastructure with 20+ test cases for the session store.

### Strengths
- **Testing infrastructure** — The codebase has zero tests; this adds Vitest with comprehensive mocking
- **20+ test cases** covering session persistence, directory management, text streaming, and task completion
- **Well-scoped feature** — Session persistence with a user toggle in Settings
- **Good test isolation** — Mocks for localStorage, Audio, and Electron IPC

### Suggestions

1. **StatusBar UX regression** — The change from:
   ```tsx
   {tab.hasChosenDirectory ? compactPath(tab.workingDirectory) : '—'}
   ```
   to just `compactPath(tab.workingDirectory)` removes the intentional "no directory selected" indicator. The `—` was a deliberate UX signal. Consider keeping the guard or showing `~/` with a dimmed style instead.

2. **`useLastFolder` in theme store** — This is semantically a session preference, not a theme preference. However, since the theme store already serves as a general preferences store (with `soundEnabled`, `expandedUI`, etc.), this is pragmatic. Just note it's a design debt.

3. **Verify `restoreLastSession`** — The diff shows it called from App.tsx but the full store implementation wasn't visible in the diff. Ensure the method handles edge cases: corrupted localStorage data, non-existent directories, and race conditions with the initial tab setup in `useEffect`.

4. **Consider adding a `security.ts` test** — Since PR #5 introduces security validators, the test infrastructure from this PR would be perfect for testing those. Suggest coordinating with PR #5.

---

## PR #5: Add input validation, dynamic window resizing, and JS-based drag
**Branch:** `claude/implement-clui-cc-improvements-zeYWf` → `main` | **Verdict: Approve with Suggestions**

### Summary
Three major improvements: (1) centralized `security.ts` input validation module, (2) dynamic content-aware window resizing, (3) JS-based `DragHandle` component replacing CSS-based dragging.

### Strengths
- **Security hardening is excellent** — Pure-function validators for plugin names (blocks path traversal), repo formats, session IDs (UUID v4), URLs (http/https only), project paths (containment), binary verification, and AppleScript escaping
- **IPC handler hardening** — Validation on `LOAD_SESSION`, `OPEN_EXTERNAL`, `OPEN_IN_TERMINAL`, and plugin operations
- **DragHandle component** — Proper React component with RAF debouncing, interactive element exclusion, and IPC-based positioning
- **Content-aware resizing** — ResizeObserver + MutationObserver captures layout changes from animations and streaming

### Issues to Address

1. **PILL_HEIGHT 720→160 is a major behavior change** — The current approach (fixed 720px, all expand/collapse in renderer) is deliberate and well-documented in comments (`main/index.ts:37`). Switching to dynamic resizing introduces:
   - Race conditions between `setBounds()` and Framer Motion animations
   - Potential jank when streaming text rapidly changes content height
   - Broken assumption in `showWindow()` which positions based on `PILL_HEIGHT`

   Recommend: Add a transition period with the old behavior as fallback, or gate behind a feature flag.

2. **`validateProjectPath` is too restrictive** — Only allows paths under `$HOME` or `/tmp`. Users commonly have projects in:
   - `/opt/homebrew/...`
   - `/Volumes/...` (external drives)
   - `/var/...`
   - Network mounts

   Consider: Allow any absolute path that doesn't contain `..` segments, or make the allowlist configurable.

3. **Missing tests for `security.ts`** — This is security-critical code. Edge cases to test:
   - Unicode in plugin names (`../` encoded as unicode)
   - Null bytes in paths
   - Very long strings
   - Empty strings
   - Relative paths disguised as absolute (`/home/user/../../etc/passwd`)

   PR #4 adds Vitest infrastructure — coordinate to add these tests.

4. **Verify IPC constants** — Ensure `IPC.GET_WINDOW_POSITION` and `IPC.MOVE_WINDOW` are added to `src/shared/types.ts`. The diff wasn't fully visible for this file.

5. **Makes PR #1 redundant** — The `DragHandle` component subsumes PR #1's functionality. PR #1 should be closed if this merges.

---

## Merge Order Recommendation

```
1. PR #3 (WhisperKit)     — standalone, no conflicts, fixes a real bug
2. PR #4 (Tests + persist) — adds test infrastructure, low conflict risk
3. PR #5 (Security + UX)   — largest change, subsumes PR #1
4. PR #2 (Tab features)    — after addressing requested changes, may conflict with #5
5. PR #1                    — CLOSE without merging (superseded by #5)
```

## Cross-PR Conflict Map
| PR Pair | Conflict Risk | Shared Files |
|---------|--------------|--------------|
| #1 ↔ #5 | **High** | App.tsx, types.ts, preload/index.ts, main/index.ts |
| #2 ↔ #5 | **Medium** | App.tsx, types.ts, main/index.ts |
| #2 ↔ #4 | **Low** | sessionStore.ts |
| #3 ↔ * | **None** | Only touches transcription code |
| #4 ↔ #5 | **None** | Different files |
