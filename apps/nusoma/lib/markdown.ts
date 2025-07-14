import MarkdownIt from 'markdown-it'
import sanitizeHtml from 'sanitize-html'
import TurndownService from 'turndown'

// HTML -> Markdown

const turndownService = new TurndownService()

function isShiftEnter(node: HTMLElement): boolean {
  let currentNode: HTMLElement | null | ParentNode = node

  while (currentNode != null && currentNode.nodeType !== 1) {
    currentNode = currentNode.parentElement || currentNode.parentNode
  }

  return (
    // normal enter is <p><br><p> (p has exactly one childNode)
    !!currentNode &&
    currentNode.nodeType === 1 &&
    !!currentNode.parentElement &&
    currentNode.parentElement.childNodes.length !== 1
  )
}

turndownService.addRule('shiftEnter', {
  filter: (node: HTMLElement) => node.nodeName === 'BR' && !!isShiftEnter(node),
  replacement: () => '<br>',
})

turndownService.addRule('enter', {
  filter: (node: HTMLElement) => node.nodeName === 'BR' && !isShiftEnter(node),
  replacement: () => '<p><br></p>',
})

turndownService.addRule('ignoreEmphasized', {
  filter: 'em',
  replacement: (content: string) => content,
})

turndownService.addRule('underline', {
  filter: 'u',
  replacement: (content: string) => `<u>${content}</u>`,
})

export function convertHtmlToMarkdown(html: string | TurndownService.Node): string {
  let result = turndownService.turndown(html)
  result = result.replaceAll('[<p><br></p>]', '')

  if (result === '<p><br></p>') {
    result = ''
  }

  return result
}

// Markdown -> HTML

const md = new MarkdownIt('default', {
  html: true,
  breaks: true,
  linkify: true,
})

export function convertMarkdownToHtml(markdown: string | null) {
  if (!markdown) {
    return ''
  }

  return sanitizeHtml(md.render(markdown))
    .replace(
      /<ul>/g,
      "<ul style='list-style-type: disc; list-style-position: inside; margin-left: 12px; margin-bottom: 4px'>"
    )
    .replace(
      /<ol>/g,
      "<ol style='list-style-type: decimal; list-style-position: inside; margin-left: 12px; margin-bottom: 4px'>"
    )
    .replace(/<a\s+href=/g, "<a target='_blank' class='text-blue-500 hover:text-blue-600' href=")
}
