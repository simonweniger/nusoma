'use client'

import { useMemo } from 'react'
import { ScrollArea } from '@nusoma/design-system/components/ui/scroll-area'
import { useConsoleStore } from '@/stores/panel/console/store'
import { useWorkerRegistry } from '@/stores/workers/registry/store'
import { ConsoleEntry } from './components/console-entry/console-entry'

interface ConsoleProps {
  panelWidth: number
}

export function Console({ panelWidth }: ConsoleProps) {
  const entries = useConsoleStore((state) => state.entries)
  const { activeWorkerId } = useWorkerRegistry()

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => entry.workerId === activeWorkerId)
  }, [entries, activeWorkerId])

  return (
    <ScrollArea className='h-full'>
      <div>
        {filteredEntries.length === 0 ? (
          <div className='flex h-32 items-center justify-center pt-4 text-muted-foreground text-sm'>
            No console entries
          </div>
        ) : (
          filteredEntries.map((entry) => (
            <ConsoleEntry key={entry.id} entry={entry} consoleWidth={panelWidth} />
          ))
        )}
      </div>
    </ScrollArea>
  )
}
