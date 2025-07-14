import type { EditorInstance } from '@nusoma/editor'

export function isValidUrl(url: string) {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

export function getUrlFromString(str: string) {
  if (isValidUrl(str)) return str
  try {
    if (str.includes('.') && !str.includes(' ')) {
      return new URL(`https://${str}`).toString()
    }
  } catch {
    return null
  }
  return null
}

// Get the text before a given position in plain text format
export const getPrevText = (editor: EditorInstance, position: number) => {
  return editor.state.doc.textBetween(0, position, '\n', '\n')
}

// Get all content from the editor in plain text format
export const getAllContent = (editor: EditorInstance) => {
  return editor.state.doc.textBetween(0, editor.state.doc.content.size, '\n', '\n')
}

// Export markdown utilities
export { markdownToTiptapJSON, parseMarkdownToTiptapJSON } from './markdown-to-tiptap'
