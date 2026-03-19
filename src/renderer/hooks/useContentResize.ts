import { useEffect, useRef, type RefObject } from 'react'

/**
 * Observes the rendered height of a container element and sends it to the
 * main process so the native window can resize dynamically.
 *
 * Uses ResizeObserver + MutationObserver for comprehensive coverage of
 * layout changes (framer-motion animations, message streaming, etc.).
 *
 * Debounced via requestAnimationFrame to avoid flooding IPC.
 */
export function useContentResize(ref: RefObject<HTMLElement | null>, buffer = 40) {
  const rafId = useRef(0)
  const lastHeight = useRef(0)

  useEffect(() => {
    const el = ref.current
    if (!el || !window.nusoma?.resizeHeight) return

    const measure = () => {
      cancelAnimationFrame(rafId.current)
      rafId.current = requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect()
        const h = Math.ceil(rect.height) + buffer
        // Only send if height actually changed (avoid no-op IPC)
        if (Math.abs(h - lastHeight.current) > 2) {
          lastHeight.current = h
          window.nusoma.resizeHeight(h)
        }
      })
    }

    // ResizeObserver catches size changes from layout reflows
    const ro = new ResizeObserver(measure)
    ro.observe(el)

    // MutationObserver catches DOM changes that may not trigger resize
    // (e.g. class toggles that affect height, new child nodes)
    const mo = new MutationObserver(measure)
    mo.observe(el, { childList: true, subtree: true, attributes: true })

    // Initial measurement
    measure()

    return () => {
      cancelAnimationFrame(rafId.current)
      ro.disconnect()
      mo.disconnect()
    }
  }, [ref, buffer])
}
