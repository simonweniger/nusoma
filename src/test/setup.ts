import { vi, beforeEach } from 'vitest'

// ─── localStorage mock ───

const store: Record<string, string> = {}

Object.defineProperty(globalThis, 'localStorage', {
  value: {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value }),
    removeItem: vi.fn((key: string) => { delete store[key] }),
    clear: vi.fn(() => { for (const k of Object.keys(store)) delete store[k] }),
    get length() { return Object.keys(store).length },
    key: vi.fn((i: number) => Object.keys(store)[i] ?? null),
  },
  writable: true,
})

// ─── Audio mock ───

// eslint-disable-next-line @typescript-eslint/no-explicit-any
;(globalThis as any).Audio = function Audio() {
  return { volume: 1.0, currentTime: 0, play: vi.fn(() => Promise.resolve()) }
}

// ─── window.nusoma mock (Electron IPC bridge) ───

Object.defineProperty(globalThis, 'window', {
  value: globalThis,
  writable: true,
})

;(globalThis as any).nusoma = {
  start: vi.fn(() => Promise.resolve({ version: '1.0.0', auth: null, mcpServers: [], projectPath: '/home/user', homePath: '/home/user' })),
  resetTabSession: vi.fn(),
  createTab: vi.fn(() => Promise.resolve({ tabId: 'new-tab-id' })),
  closeTab: vi.fn(() => Promise.resolve()),
  prompt: vi.fn(() => Promise.resolve()),
  cancel: vi.fn(() => Promise.resolve()),
  loadSession: vi.fn(() => Promise.resolve([])),
  listSessions: vi.fn(() => Promise.resolve([])),
  respondPermission: vi.fn(() => Promise.resolve()),
  isVisible: vi.fn(() => Promise.resolve(true)),
  setIgnoreMouseEvents: vi.fn(),
  setPermissionMode: vi.fn(),
  getTheme: vi.fn(() => Promise.resolve({ isDark: true })),
  onThemeChange: vi.fn(() => () => {}),
  selectDirectory: vi.fn(() => Promise.resolve(null)),
  openInTerminal: vi.fn(),
  fetchMarketplace: vi.fn(() => Promise.resolve({ plugins: [] })),
  listInstalledPlugins: vi.fn(() => Promise.resolve([])),
  installPlugin: vi.fn(() => Promise.resolve({ ok: true })),
  uninstallPlugin: vi.fn(() => Promise.resolve({ ok: true })),
  takeScreenshot: vi.fn(() => Promise.resolve(null)),
  attachFiles: vi.fn(() => Promise.resolve([])),
  getShortcutSettings: vi.fn(() => Promise.resolve({ primaryShortcut: null, secondaryShortcut: null })),
  setShortcutSettings: vi.fn(() => Promise.resolve({ ok: true, settings: { primaryShortcut: null, secondaryShortcut: null } })),
  getAutoStart: vi.fn(() => Promise.resolve(false)),
  setAutoStart: vi.fn(() => Promise.resolve()),
}

// ─── Cleanup ───

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
})
