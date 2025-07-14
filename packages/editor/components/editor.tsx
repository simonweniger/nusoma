import type { FC, ReactNode } from 'react'
import { forwardRef, useRef } from 'react'
import type { EditorProviderProps, JSONContent } from '@tiptap/react'
import { EditorProvider } from '@tiptap/react'
import tunnel from 'tunnel-rat'
import { EditorCommandTunnelContext } from './editor-command'

export interface EditorProps {
  readonly children: ReactNode
  readonly className?: string
}

interface EditorRootProps {
  readonly children: ReactNode
}

export const EditorRoot: FC<EditorRootProps> = ({ children }) => {
  const tunnelInstance = useRef(tunnel()).current

  return (
    <EditorCommandTunnelContext.Provider value={tunnelInstance}>
      {children}
    </EditorCommandTunnelContext.Provider>
  )
}

export type EditorContentProps = Omit<EditorProviderProps, 'content'> & {
  readonly children?: ReactNode
  readonly className?: string
  readonly initialContent?: JSONContent
}

export const EditorContent = forwardRef<HTMLDivElement, EditorContentProps>(
  ({ className, children, initialContent, ...rest }, ref) => (
    <div ref={ref} className={className}>
      <EditorProvider {...rest} content={initialContent}>
        {children}
      </EditorProvider>
    </div>
  )
)

EditorContent.displayName = 'EditorContent'
