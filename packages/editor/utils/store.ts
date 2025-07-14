import type { Range } from '@tiptap/core'
import { create } from 'zustand'

interface EditorStore {
  query: string
  range: Range | null
  setQuery: (query: string) => void
  setRange: (range: Range | null) => void
}

export const useEditorStore = create<EditorStore>((set) => ({
  query: '',
  range: null,
  setQuery: (query: string) => set({ query }),
  setRange: (range: Range | null) => set({ range }),
}))
