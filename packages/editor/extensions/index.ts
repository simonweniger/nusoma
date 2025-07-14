import { InputRule } from '@tiptap/core'
import CharacterCount from '@tiptap/extension-character-count'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { Color } from '@tiptap/extension-color'
import Highlight from '@tiptap/extension-highlight'
import HorizontalRule from '@tiptap/extension-horizontal-rule'
import TiptapImage from '@tiptap/extension-image'
import TiptapLink from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import { TaskItem } from '@tiptap/extension-task-item'
import { TaskList } from '@tiptap/extension-task-list'
import TextStyle from '@tiptap/extension-text-style'
import TiptapUnderline from '@tiptap/extension-underline'
import Youtube from '@tiptap/extension-youtube'
import StarterKit from '@tiptap/starter-kit'
import GlobalDragHandle from 'tiptap-extension-global-drag-handle'
import CustomKeymap from './custom-keymap'
import { ImageResizer } from './image-resizer'
import { Mathematics } from './mathematics'
import { Twitter } from './twitter'
import UpdatedImage from './updated-image'

const PlaceholderExtension = Placeholder.configure({
  placeholder: ({ node, editor, pos }) => {
    if (node.type.name === 'heading') {
      return `Heading ${node.attrs.level}`
    }

    // For task items themselves, never show placeholder
    if (node.type.name === 'taskItem') {
      return ''
    }

    // For paragraphs, only check if we're DIRECTLY inside a task item
    if (node.type.name === 'paragraph') {
      try {
        const resolvedPos = editor.state.doc.resolve(pos)

        // Only check immediate parent - if it's a taskItem, don't show placeholder
        if (resolvedPos.depth > 0) {
          const immediateParent = resolvedPos.node(resolvedPos.depth - 1)
          if (immediateParent.type.name === 'taskItem') {
            return ''
          }
        }
      } catch (e) {
        // If position resolution fails, show the placeholder
        return "Press '/' for commands"
      }
    }

    return "Press '/' for commands"
  },
  includeChildren: true,
})

const HighlightExtension = Highlight.configure({
  multicolor: true,
})

const Horizontal = HorizontalRule.extend({
  addInputRules() {
    return [
      new InputRule({
        find: /^(?:---|—-|___\s|\*\*\*\s)$/u,
        handler: ({ state, range }) => {
          const attributes = {}

          const { tr } = state
          const start = range.from
          const end = range.to

          tr.insert(start - 1, this.type.create(attributes)).delete(
            tr.mapping.map(start),
            tr.mapping.map(end)
          )
        },
      }),
    ]
  },
})

export * from './ai-highlight'
export * from './slash-command'
export {
  CodeBlockLowlight,
  Horizontal as HorizontalRule,
  ImageResizer,
  InputRule,
  PlaceholderExtension as Placeholder,
  StarterKit,
  TaskItem,
  TaskList,
  TiptapImage,
  TiptapUnderline,
  TextStyle,
  Color,
  HighlightExtension,
  CustomKeymap,
  TiptapLink,
  UpdatedImage,
  Youtube,
  Twitter,
  Mathematics,
  CharacterCount,
  GlobalDragHandle,
}
