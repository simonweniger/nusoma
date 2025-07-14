import type { FC } from 'react'
import { createContext, forwardRef, useEffect, useId } from 'react'
import type { Range } from '@tiptap/core'
import { Command } from 'cmdk'
import type tunnel from 'tunnel-rat'
import { useEditorStore } from '../utils/store'

export const EditorCommandTunnelContext = createContext({} as ReturnType<typeof tunnel>)

interface EditorCommandOutProps {
  readonly query: string
  readonly range: Range
}

export const EditorCommandOut: FC<EditorCommandOutProps> = ({ query, range }) => {
  const setQuery = useEditorStore((state) => state.setQuery)
  const setRange = useEditorStore((state) => state.setRange)

  useEffect(() => {
    setQuery(query)
  }, [query, setQuery])

  useEffect(() => {
    setRange(range)
  }, [range, setRange])

  useEffect(() => {
    const navigationKeys = ['ArrowUp', 'ArrowDown', 'Enter']
    const onKeyDown = (e: KeyboardEvent) => {
      if (navigationKeys.includes(e.key)) {
        e.preventDefault()
        const commandRef = document.querySelector('#slash-command')

        if (commandRef)
          commandRef.dispatchEvent(
            new KeyboardEvent('keydown', {
              key: e.key,
              cancelable: true,
              bubbles: true,
            })
          )

        return false
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  return (
    <EditorCommandTunnelContext.Consumer>
      {(tunnelInstance) => <tunnelInstance.Out />}
    </EditorCommandTunnelContext.Consumer>
  )
}

interface EditorCommandProps {
  children?: React.ReactNode
  className?: string
  [key: string]: any
}

export const EditorCommand = forwardRef<HTMLDivElement, EditorCommandProps>(
  ({ children, className, ...rest }, ref) => {
    const query = useEditorStore((state) => state.query)
    const setQuery = useEditorStore((state) => state.setQuery)
    const commandId = useId()

    return (
      <EditorCommandTunnelContext.Consumer>
        {(tunnelInstance) => (
          <tunnelInstance.In>
            <Command
              ref={ref}
              onKeyDown={(e) => {
                e.stopPropagation()
              }}
              id={commandId}
              className={className}
              {...rest}
            >
              <Command.Input value={query} onValueChange={setQuery} style={{ display: 'none' }} />
              {children}
            </Command>
          </tunnelInstance.In>
        )}
      </EditorCommandTunnelContext.Consumer>
    )
  }
)
export const EditorCommandList: React.ComponentType<any> = Command.List

EditorCommand.displayName = 'EditorCommand'
