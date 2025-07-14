import { forwardRef } from 'react'
import type { Editor, Range } from '@tiptap/core'
import { useCurrentEditor } from '@tiptap/react'
import { CommandEmpty, CommandItem } from 'cmdk'
import { useEditorStore } from '../utils/store'

interface EditorCommandItemProps {
  readonly onCommand: ({ editor, range }: { editor: Editor; range: Range }) => void
  children?: React.ReactNode
  [key: string]: any
}

export const EditorCommandItem = forwardRef<HTMLDivElement, EditorCommandItemProps>(
  ({ children, onCommand, ...rest }, ref) => {
    const { editor } = useCurrentEditor()
    const range = useEditorStore((state) => state.range)

    if (!editor || !range) return null

    return (
      <CommandItem ref={ref} {...rest} onSelect={() => onCommand({ editor, range })}>
        {children}
      </CommandItem>
    )
  }
)

EditorCommandItem.displayName = 'EditorCommandItem'

export const EditorCommandEmpty: React.ComponentType<any> = CommandEmpty

export default EditorCommandItem
