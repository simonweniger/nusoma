'use client'

import { useRef, useState } from 'react'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@nusoma/design-system/components/ui/tooltip'
import clsx from 'clsx'
import Link from 'next/link'
import { useFolderStore, useIsWorkerSelected } from '@/stores/folders/store'
import type { WorkerMetadata } from '@/stores/workers/registry/types'

interface WorkerItemProps {
  worker: WorkerMetadata
  active: boolean
  isMarketplace?: boolean
  isCollapsed?: boolean
  level: number
  isDragOver?: boolean
}

export function WorkerItem({
  worker,
  active,
  isMarketplace,
  isCollapsed,
  level,
  isDragOver = false,
}: WorkerItemProps) {
  const [isDragging, setIsDragging] = useState(false)
  const dragStartedRef = useRef(false)
  const { selectedWorkers, selectOnly, toggleWorkerSelection } = useFolderStore()
  const isSelected = useIsWorkerSelected(worker.id)

  const handleClick = (e: React.MouseEvent) => {
    if (dragStartedRef.current) {
      e.preventDefault()
      return
    }

    if (e.shiftKey) {
      e.preventDefault()
      toggleWorkerSelection(worker.id)
    } else {
      if (!isSelected || selectedWorkers.size > 1) {
        selectOnly(worker.id)
      }
    }
  }

  const handleDragStart = (e: React.DragEvent) => {
    if (isMarketplace) return

    dragStartedRef.current = true
    setIsDragging(true)

    let workerIds: string[]
    if (isSelected && selectedWorkers.size > 1) {
      workerIds = Array.from(selectedWorkers)
    } else {
      workerIds = [worker.id]
    }

    e.dataTransfer.setData('worker-ids', JSON.stringify(workerIds))
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragEnd = () => {
    setIsDragging(false)
    requestAnimationFrame(() => {
      dragStartedRef.current = false
    })
  }

  if (isCollapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            href={`/workspace/${worker.id}`}
            className={clsx(
              'mx-auto flex h-8 w-8 items-center justify-center rounded-md',
              active && !isDragOver
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:bg-accent/50',
              isSelected && selectedWorkers.size > 1 && !active && !isDragOver
                ? 'bg-accent/70'
                : '',
              isDragging ? 'opacity-50' : ''
            )}
            draggable={!isMarketplace}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onClick={handleClick}
          >
            <div
              className='h-[14px] w-[14px] flex-shrink-0 rounded'
              style={{ backgroundColor: worker.color }}
            />
          </Link>
        </TooltipTrigger>
        <TooltipContent side='right'>
          <p>
            {worker.name}
            {isMarketplace && ' (Preview)'}
          </p>
        </TooltipContent>
      </Tooltip>
    )
  }

  return (
    <Link
      href={`/workspace/${worker.id}`}
      className={clsx(
        'flex items-center rounded-md px-2 py-1.5 font-medium text-sm',
        active && !isDragOver
          ? 'bg-accent text-accent-foreground'
          : 'text-muted-foreground hover:bg-accent/50',
        isSelected && selectedWorkers.size > 1 && !active && !isDragOver ? 'bg-accent/70' : '',
        isDragging ? 'opacity-50' : '',
        !isMarketplace ? 'cursor-move' : ''
      )}
      style={{ paddingLeft: isCollapsed ? '0px' : `${(level + 1) * 20 + 8}px` }}
      draggable={!isMarketplace}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={handleClick}
    >
      <div
        className='mr-2 h-[14px] w-[14px] flex-shrink-0 rounded'
        style={{ backgroundColor: worker.color }}
      />
      <span className='truncate'>
        {worker.name}
        {isMarketplace && ' (Preview)'}
      </span>
    </Link>
  )
}
