import type { Editor } from '@tiptap/core'
import type { JSONContent } from '@tiptap/react'

/**
 * Converts Markdown string to Tiptap JSON format using an editor instance
 * @param markdown - The markdown string to convert
 * @param editor - The Tiptap editor instance with extensions loaded
 * @returns JSONContent compatible with Tiptap
 */
export function markdownToTiptapJSON(markdown: string, editor: Editor): JSONContent {
  try {
    // Create a temporary editor state with the markdown content
    // Tiptap's StarterKit can parse basic markdown syntax automatically
    const tempContent = editor.state.schema.nodeFromJSON({
      type: 'doc',
      content: [],
    })

    // Use the editor's commands to insert content and let it parse markdown
    const currentContent = editor.getJSON()

    // Clear editor, insert markdown, get JSON, then restore
    editor.commands.clearContent()
    editor.commands.insertContent(markdown)
    const result = editor.getJSON()

    // Restore original content
    editor.commands.setContent(currentContent)

    return result
  } catch (error) {
    console.error('Error converting markdown to Tiptap JSON:', error)
    // Fallback to basic paragraph structure
    return {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: markdown,
            },
          ],
        },
      ],
    }
  }
}

/**
 * Creates a simple Tiptap JSON structure from markdown text
 * This is a basic parser for common markdown elements
 * @param markdown - The markdown string to convert
 * @returns JSONContent compatible with Tiptap
 */
export function parseMarkdownToTiptapJSON(markdown: string): JSONContent {
  const lines = markdown.split('\n')
  const content: any[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    if (line === '') {
      // Skip empty lines or add paragraph breaks
      continue
    }

    // Headings
    if (line.startsWith('#')) {
      const level = line.match(/^#+/)?.[0].length || 1
      const text = line.replace(/^#+\s*/, '')
      content.push({
        type: 'heading',
        attrs: { level: Math.min(level, 6) },
        content: [{ type: 'text', text }],
      })
    }
    // Bullet lists
    else if (line.startsWith('- ') || line.startsWith('* ')) {
      const text = line.replace(/^[-*]\s*/, '')
      content.push({
        type: 'bulletList',
        content: [
          {
            type: 'listItem',
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text }],
              },
            ],
          },
        ],
      })
    }
    // Numbered lists
    else if (/^\d+\.\s/.test(line)) {
      const text = line.replace(/^\d+\.\s*/, '')
      content.push({
        type: 'orderedList',
        content: [
          {
            type: 'listItem',
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text }],
              },
            ],
          },
        ],
      })
    }
    // Blockquotes
    else if (line.startsWith('> ')) {
      const text = line.replace(/^>\s*/, '')
      content.push({
        type: 'blockquote',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text }],
          },
        ],
      })
    }
    // Code blocks
    else if (line.startsWith('```')) {
      const language = line.replace('```', '')
      const codeLines = []
      i++ // Skip the opening ```

      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i])
        i++
      }

      content.push({
        type: 'codeBlock',
        attrs: { language: language || null },
        content: [{ type: 'text', text: codeLines.join('\n') }],
      })
    }
    // Regular paragraphs
    else {
      // Parse inline formatting (basic)
      const textContent = parseInlineFormatting(line)
      content.push({
        type: 'paragraph',
        content: textContent,
      })
    }
  }

  return {
    type: 'doc',
    content:
      content.length > 0
        ? content
        : [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: markdown }],
            },
          ],
  }
}

/**
 * Parse basic inline formatting (bold, italic, code)
 * @param text - Text to parse
 * @returns Array of text nodes with formatting
 */
function parseInlineFormatting(text: string): any[] {
  // This is a simplified parser - you might want to use a proper markdown parser
  const content: any[] = []
  const current = text

  // For now, just return plain text
  // You could enhance this to handle **bold**, *italic*, `code`, etc.
  return [{ type: 'text', text: current }]
}
