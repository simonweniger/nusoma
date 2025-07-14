export type PanelTab = 'config' | 'test' | 'monitor' | 'variables' | 'activity' | 'tasks'

export interface PanelStore {
  isOpen: boolean
  activeTab: PanelTab
  selectedBlockId: string | null
  setSelectedBlockId: (blockId: string | null) => void
  togglePanel: () => void
  setActiveTab: (tab: PanelTab) => void
}
