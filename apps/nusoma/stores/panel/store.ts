import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import type { PanelStore, PanelTab } from './types'

export const usePanelStore = create<PanelStore>()(
  devtools(
    persist(
      (set) => ({
        isOpen: true,
        activeTab: 'test',
        selectedBlockId: null,

        togglePanel: () => {
          set((state) => ({ isOpen: !state.isOpen }))
        },

        setSelectedBlockId: (blockId: string | null) => {
          set((state) => ({
            selectedBlockId: blockId,
            isOpen: blockId ? true : state.isOpen,
          }))
        },

        setActiveTab: (tab: PanelTab) => {
          set({ activeTab: tab })
        },
      }),
      {
        name: 'panel-store',
        version: 2,
      }
    )
  )
)
