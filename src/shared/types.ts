// ─── Claude Code Stream Event Types (verified from v2.1.63) ───

export interface InitEvent {
  type: 'system'
  subtype: 'init'
  cwd: string
  session_id: string
  tools: string[]
  mcp_servers: Array<{ name: string; status: string }>
  model: string
  permissionMode: string
  agents: string[]
  skills: string[]
  plugins: string[]
  claude_code_version: string
  fast_mode_state: string
  uuid: string
}

export interface StreamEvent {
  type: 'stream_event'
  event: StreamSubEvent
  session_id: string
  parent_tool_use_id: string | null
  uuid: string
}

export type StreamSubEvent =
  | { type: 'message_start'; message: AssistantMessagePayload }
  | { type: 'content_block_start'; index: number; content_block: ContentBlock }
  | { type: 'content_block_delta'; index: number; delta: ContentDelta }
  | { type: 'content_block_stop'; index: number }
  | { type: 'message_delta'; delta: { stop_reason: string | null }; usage: UsageData; context_management?: unknown }
  | { type: 'message_stop' }

export interface ContentBlock {
  type: 'text' | 'tool_use'
  text?: string
  id?: string
  name?: string
  input?: Record<string, unknown>
}

export type ContentDelta =
  | { type: 'text_delta'; text: string }
  | { type: 'input_json_delta'; partial_json: string }

export interface AssistantEvent {
  type: 'assistant'
  message: AssistantMessagePayload
  parent_tool_use_id: string | null
  session_id: string
  uuid: string
}

export interface AssistantMessagePayload {
  model: string
  id: string
  role: 'assistant'
  content: ContentBlock[]
  stop_reason: string | null
  usage: UsageData
}

export interface RateLimitEvent {
  type: 'rate_limit_event'
  rate_limit_info: {
    status: string
    resetsAt: number
    rateLimitType: string
  }
  session_id: string
  uuid: string
}

export interface ResultEvent {
  type: 'result'
  subtype: 'success' | 'error'
  is_error: boolean
  duration_ms: number
  num_turns: number
  result: string
  total_cost_usd: number
  session_id: string
  usage: UsageData & {
    input_tokens: number
    output_tokens: number
    cache_read_input_tokens?: number
    cache_creation_input_tokens?: number
  }
  permission_denials: string[]
  uuid: string
}

export interface UsageData {
  input_tokens?: number
  output_tokens?: number
  cache_read_input_tokens?: number
  cache_creation_input_tokens?: number
  service_tier?: string
}

export interface PermissionEvent {
  type: 'permission_request'
  tool: { name: string; description?: string; input?: Record<string, unknown> }
  question_id: string
  options: Array<{ id: string; label: string; kind?: string }>
  session_id: string
  uuid: string
}

// Union of all possible top-level events
export type ClaudeEvent = InitEvent | StreamEvent | AssistantEvent | RateLimitEvent | ResultEvent | PermissionEvent | UnknownEvent

export interface UnknownEvent {
  type: string
  [key: string]: unknown
}

// ─── Tab State Machine (v2 — from execution plan) ───

export type TabStatus = 'connecting' | 'idle' | 'running' | 'completed' | 'failed' | 'dead'

export interface PermissionRequest {
  questionId: string
  toolTitle: string
  toolDescription?: string
  toolInput?: Record<string, unknown>
  options: Array<{ optionId: string; kind?: string; label: string }>
}

export interface Attachment {
  id: string
  type: 'image' | 'file'
  name: string
  path: string
  mimeType?: string
  /** Base64 data URL for image previews */
  dataUrl?: string
  /** File size in bytes */
  size?: number
}

export interface TabState {
  id: string
  claudeSessionId: string | null
  status: TabStatus
  activeRequestId: string | null
  hasUnread: boolean
  currentActivity: string
  permissionQueue: PermissionRequest[]
  /** Fallback card when tools were denied and no interactive permission is available */
  permissionDenied: { tools: Array<{ toolName: string; toolUseId: string }> } | null
  attachments: Attachment[]
  messages: Message[]
  title: string
  /** Last run's result data (cost, tokens, duration) */
  lastResult: RunResult | null
  /** Session metadata from init event */
  sessionModel: string | null
  sessionTools: string[]
  sessionMcpServers: Array<{ name: string; status: string }>
  sessionSkills: string[]
  sessionVersion: string | null
  /** Prompts waiting behind the current run (display text only) */
  queuedPrompts: string[]
  /** Working directory for this tab's Claude sessions */
  workingDirectory: string
  /** Whether the user explicitly chose a directory (vs. using default home) */
  hasChosenDirectory: boolean
  /** Extra directories accessible via --add-dir (session-preserving) */
  additionalDirs: string[]
  /** Whether this tab is pinned (persists across restarts) */
  pinned: boolean
}

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'tool' | 'system'
  content: string
  toolName?: string
  toolInput?: string
  toolStatus?: 'running' | 'completed' | 'error'
  timestamp: number
}

export interface RunResult {
  totalCostUsd: number
  durationMs: number
  numTurns: number
  usage: UsageData
  sessionId: string
}

// ─── Canonical Events (normalized from raw stream) ───

export type NormalizedEvent =
  | { type: 'session_init'; sessionId: string; tools: string[]; model: string; mcpServers: Array<{ name: string; status: string }>; skills: string[]; version: string; isWarmup?: boolean }
  | { type: 'text_chunk'; text: string }
  | { type: 'tool_call'; toolName: string; toolId: string; index: number }
  | { type: 'tool_call_update'; toolId: string; partialInput: string }
  | { type: 'tool_call_complete'; index: number }
  | { type: 'task_update'; message: AssistantMessagePayload }
  | { type: 'task_complete'; result: string; costUsd: number; durationMs: number; numTurns: number; usage: UsageData; sessionId: string; permissionDenials?: Array<{ toolName: string; toolUseId: string }> }
  | { type: 'error'; message: string; isError: boolean; sessionId?: string }
  | { type: 'session_dead'; exitCode: number | null; signal: string | null; stderrTail: string[] }
  | { type: 'rate_limit'; status: string; resetsAt: number; rateLimitType: string }
  | { type: 'usage'; usage: UsageData }
  | { type: 'permission_request'; questionId: string; toolName: string; toolDescription?: string; toolInput?: Record<string, unknown>; options: Array<{ id: string; label: string; kind?: string }> }

// ─── Run Options ───

export interface RunOptions {
  prompt: string
  projectPath: string
  sessionId?: string
  allowedTools?: string[]
  maxTurns?: number
  maxBudgetUsd?: number
  systemPrompt?: string
  model?: string
  /** Path to NUSOMA-scoped settings file with hook config (passed via --settings) */
  hookSettingsPath?: string
  /** Extra directories to add via --add-dir (session-preserving) */
  addDirs?: string[]
}

// ─── Control Plane Types ───

export interface TabRegistryEntry {
  tabId: string
  claudeSessionId: string | null
  status: TabStatus
  activeRequestId: string | null
  runPid: number | null
  createdAt: number
  lastActivityAt: number
  promptCount: number
}

export interface HealthReport {
  tabs: Array<{
    tabId: string
    status: TabStatus
    activeRequestId: string | null
    claudeSessionId: string | null
    alive: boolean
  }>
  queueDepth: number
}

export interface EnrichedError {
  message: string
  stderrTail: string[]
  stdoutTail?: string[]
  exitCode: number | null
  elapsedMs: number
  toolCallCount: number
  sawPermissionRequest?: boolean
  permissionDenials?: Array<{ tool_name: string; tool_use_id: string }>
}

// ─── Session History ───

export interface SessionMeta {
  sessionId: string
  slug: string | null
  firstMessage: string | null
  lastTimestamp: string
  size: number
}

export interface SessionLoadMessage {
  role: string
  content: string
  toolName?: string
  timestamp: number
}

// ─── Marketplace / Plugin Types ───

export type PluginStatus = 'not_installed' | 'checking' | 'installing' | 'installed' | 'failed'

export interface CatalogPlugin {
  id: string              // unique: `${repo}/${skillPath}` e.g. 'anthropics/skills/skills/xlsx'
  name: string            // from SKILL.md or plugin.json
  description: string     // from SKILL.md or plugin.json
  version: string         // from plugin.json or '0.0.0'
  author: string          // from plugin.json or marketplace entry
  marketplace: string     // marketplace name from marketplace.json
  repo: string            // 'anthropics/skills'
  sourcePath: string      // path within repo, e.g. 'skills/xlsx'
  installName: string     // individual skill name for SKILL.md skills, bundle name for CLI plugins
  category: string        // 'Agent Skills' | 'Knowledge Work' | 'Financial Services'
  tags: string[]          // Semantic use-case tags derived from name/description (e.g. 'Design', 'Finance')
  isSkillMd: boolean      // true = individual SKILL.md (direct install), false = CLI plugin (bundle install)
}

// ─── App Settings ───

export interface ShortcutSettings {
  primaryShortcut: string | null
  secondaryShortcut: string | null
}

export interface ShortcutSettingsUpdateResult {
  ok: boolean
  settings: ShortcutSettings
  error?: string
}

export const DEFAULT_SHORTCUT_SETTINGS: ShortcutSettings = {
  primaryShortcut: 'Alt+Space',
  secondaryShortcut: 'CommandOrControl+Shift+K',
}

// ─── IPC Channel Names ───

export const IPC = {
  // Request-response (renderer → main)
  START: 'nusoma:start',
  CREATE_TAB: 'nusoma:create-tab',
  PROMPT: 'nusoma:prompt',
  CANCEL: 'nusoma:cancel',
  STOP_TAB: 'nusoma:stop-tab',
  RETRY: 'nusoma:retry',
  STATUS: 'nusoma:status',
  TAB_HEALTH: 'nusoma:tab-health',
  CLOSE_TAB: 'nusoma:close-tab',
  SELECT_DIRECTORY: 'nusoma:select-directory',
  OPEN_EXTERNAL: 'nusoma:open-external',
  OPEN_IN_TERMINAL: 'nusoma:open-in-terminal',
  ATTACH_FILES: 'nusoma:attach-files',
  TAKE_SCREENSHOT: 'nusoma:take-screenshot',
  TRANSCRIBE_AUDIO: 'nusoma:transcribe-audio',
  PASTE_IMAGE: 'nusoma:paste-image',
  GET_DIAGNOSTICS: 'nusoma:get-diagnostics',
  RESPOND_PERMISSION: 'nusoma:respond-permission',
  INIT_SESSION: 'nusoma:init-session',
  RESET_TAB_SESSION: 'nusoma:reset-tab-session',
  ANIMATE_HEIGHT: 'nusoma:animate-height',
  LIST_SESSIONS: 'nusoma:list-sessions',
  LOAD_SESSION: 'nusoma:load-session',

  // One-way events (main → renderer)
  TEXT_CHUNK: 'nusoma:text-chunk',
  TOOL_CALL: 'nusoma:tool-call',
  TOOL_CALL_UPDATE: 'nusoma:tool-call-update',
  TOOL_CALL_COMPLETE: 'nusoma:tool-call-complete',
  TASK_UPDATE: 'nusoma:task-update',
  TASK_COMPLETE: 'nusoma:task-complete',
  SESSION_DEAD: 'nusoma:session-dead',
  SESSION_INIT: 'nusoma:session-init',
  ERROR: 'nusoma:error',
  RATE_LIMIT: 'nusoma:rate-limit',

  // Window management
  RESIZE_HEIGHT: 'nusoma:resize-height',
  SET_WINDOW_WIDTH: 'nusoma:set-window-width',
  HIDE_WINDOW: 'nusoma:hide-window',
  WINDOW_SHOWN: 'nusoma:window-shown',
  SET_IGNORE_MOUSE_EVENTS: 'nusoma:set-ignore-mouse-events',
  IS_VISIBLE: 'nusoma:is-visible',
  MOVE_WINDOW: 'nusoma:move-window',
  GET_WINDOW_POSITION: 'nusoma:get-window-position',

  // Skill provisioning (main → renderer)
  SKILL_STATUS: 'nusoma:skill-status',

  // Theme
  GET_THEME: 'nusoma:get-theme',
  THEME_CHANGED: 'nusoma:theme-changed',

  // Shortcut settings
  GET_SHORTCUT_SETTINGS: 'nusoma:get-shortcut-settings',
  SET_SHORTCUT_SETTINGS: 'nusoma:set-shortcut-settings',

  // Marketplace
  MARKETPLACE_FETCH: 'nusoma:marketplace-fetch',
  MARKETPLACE_INSTALLED: 'nusoma:marketplace-installed',
  MARKETPLACE_INSTALL: 'nusoma:marketplace-install',
  MARKETPLACE_UNINSTALL: 'nusoma:marketplace-uninstall',

  // Permission mode
  SET_PERMISSION_MODE: 'nusoma:set-permission-mode',

  // Legacy (kept for backward compat during migration)
  STREAM_EVENT: 'nusoma:stream-event',
  RUN_COMPLETE: 'nusoma:run-complete',
  RUN_ERROR: 'nusoma:run-error',

  // ─── Project Management (PM) ───
  PM_LIST_PROJECTS:    'pm:list-projects',
  PM_CREATE_PROJECT:   'pm:create-project',
  PM_UPDATE_PROJECT:   'pm:update-project',
  PM_DELETE_PROJECT:   'pm:delete-project',
  PM_LIST_ISSUES:      'pm:list-issues',
  PM_GET_ISSUE:        'pm:get-issue',
  PM_CREATE_ISSUE:     'pm:create-issue',
  PM_UPDATE_ISSUE:     'pm:update-issue',
  PM_DELETE_ISSUE:     'pm:delete-issue',
  PM_LIST_LABELS:      'pm:list-labels',
  PM_CREATE_LABEL:     'pm:create-label',
  PM_DELETE_LABEL:     'pm:delete-label',
  PM_SET_GITHUB_TOKEN: 'pm:set-github-token',
  PM_HAS_GITHUB_TOKEN: 'pm:has-github-token',
  PM_SYNC_PROJECT:     'pm:sync-project',
  PM_TEST_GITHUB:      'pm:test-github',
  PM_SYNC_PROGRESS:    'pm:sync-progress',
} as const
