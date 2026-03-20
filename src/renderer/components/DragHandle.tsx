import { useCallback, useRef, type ReactNode, type MouseEvent } from 'react'

interface DragHandleProps {
  children: ReactNode
  className?: string
  style?: React.CSSProperties
}

/**
 * JS-based window drag — replaces CSS `-webkit-app-region: drag` which
 * conflicts with Electron's setIgnoreMouseEvents click-through toggle.
 *
 * Wraps children with a mousedown handler that tracks screen-level delta
 * and moves the native window via IPC.
 */
export default function DragHandle({ children, className, style }: DragHandleProps) {
  const dragging = useRef(false)
  const startScreen = useRef({ x: 0, y: 0 })
  const startWindow = useRef({ x: 0, y: 0 })

  const onMouseDown = useCallback(async (e: MouseEvent) => {
    // Only primary button; ignore if target is an interactive element
    if (e.button !== 0) return
    const target = e.target as HTMLElement
    if (target.closest('button, input, textarea, select, [role="button"], a')) return

    e.preventDefault()
    dragging.current = true
    startScreen.current = { x: e.screenX, y: e.screenY }

    try {
      const pos = await window.nusoma.getWindowPosition()
      startWindow.current = pos
    } catch {
      dragging.current = false
      return
    }

    const onMouseMove = (ev: globalThis.MouseEvent) => {
      if (!dragging.current) return
      const dx = ev.screenX - startScreen.current.x
      const dy = ev.screenY - startScreen.current.y
      window.nusoma.moveWindow(
        startWindow.current.x + dx,
        startWindow.current.y + dy,
      )
    }

    const onMouseUp = () => {
      dragging.current = false
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }, [])

  return (
    <div
      data-nusoma-ui
      className={className}
      style={{ cursor: 'grab', ...style }}
      onMouseDown={onMouseDown}
    >
      {children}
    </div>
  )
}
