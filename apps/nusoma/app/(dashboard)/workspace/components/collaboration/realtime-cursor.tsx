'use client'

import { useSession } from '@/lib/auth-client'
import { useRealtimeCursor } from '../../hooks/use-realtime-cursor'
import { Cursor } from './cursor'

const THROTTLE_MS = 50

export const RealtimeCursors = () => {
  const { cursors } = useRealtimeCursor({ throttleMs: THROTTLE_MS })
  const { data: session } = useSession()

  if (!session) {
    return null
  }

  const currentUserId = session.user.id

  return (
    <div>
      {Object.keys(cursors)
        .filter((id) => id !== currentUserId)
        .map((id) => {
          const cursorData = cursors[id]
          if (!cursorData || !cursorData.position || !cursorData.user) {
            return null
          }
          return (
            <Cursor
              key={id}
              className='fixed z-50 transition-transform ease-in-out'
              style={{
                transitionDuration: '20ms',
                top: 0,
                left: 0,
                transform: `translate(${cursorData.position.x}px, ${cursorData.position.y}px)`,
              }}
              color={cursorData.color}
              name={cursorData.user.name}
            />
          )
        })}
    </div>
  )
}
