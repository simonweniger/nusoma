import type React from 'react'
import { memo, useMemo, useRef } from 'react'
import { StartIcon } from '@nusoma/design-system/components/icons'
import { Button } from '@nusoma/design-system/components/ui/button'
import { Card } from '@nusoma/design-system/components/ui/card'
import { cn } from '@nusoma/design-system/lib/utils'
import { Handle, type NodeProps, Position, useReactFlow } from '@xyflow/react'
import { Trash2 } from 'lucide-react'
import { useWorkerStore } from '@/stores/workers/worker/store'
import { LoopBadges } from './components/loop-badges'

// Add these styles to your existing global CSS file or create a separate CSS module
const _LoopNodeStyles: React.FC = () => {
  return (
    <style jsx global>{`
      @keyframes loop-node-pulse {
        0% { box-shadow: 0 0 0 0 rgba(64, 224, 208, 0.3); }
        70% { box-shadow: 0 0 0 6px rgba(64, 224, 208, 0); }
        100% { box-shadow: 0 0 0 0 rgba(64, 224, 208, 0); }
      }
      
      .loop-node-drag-over {
        animation: loop-node-pulse 1.2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        border-style: solid !important;
        background-color: rgba(47, 179, 255, 0.08) !important;
        box-shadow: 0 0 0 8px rgba(47, 179, 255, 0.1);
      }
      
      /* Ensure parent borders are visible when hovering over resize controls */
      .react-flow__node-group:hover,
      .hover-highlight {
        border-color: #1e293b !important;
      }
      
      /* Ensure hover effects work well */
      .group-node-container:hover .react-flow__resize-control.bottom-right {
        opacity: 1 !important;
        visibility: visible !important;
      }
    
      
      /* Prevent jumpy drag behavior */
      .loop-drop-container .react-flow__node {
        transform-origin: center;
        position: absolute;
      }
      
      /* Remove default border from React Flow group nodes */
      .react-flow__node-group {
        border: none;
        background-color: transparent;
        outline: none;
        box-shadow: none;
      }
      
      /* Ensure child nodes stay within parent bounds */
      .react-flow__node[data-parent-node-id] .react-flow__handle {
        z-index: 30;
      }
      
      /* Enhanced drag detection */
      .react-flow__node-group.dragging-over {
        background-color: rgba(34,197,94,0.05);
        transition: all 0.2s ease-in-out;
      }
    `}</style>
  )
}

export const LoopNodeComponent = memo(({ data, selected, id }: NodeProps) => {
  const { getNodes } = useReactFlow()
  const removeBlock = useWorkerStore((state) => state.removeBlock)
  const blockRef = useRef<HTMLDivElement>(null)

  // Determine nesting level by counting parents
  const nestingLevel = useMemo(() => {
    let level = 0
    let currentParentId = data?.parentId

    while (currentParentId) {
      level++
      const parentNode = getNodes().find((n) => n.id === currentParentId)
      if (!parentNode) {
        break
      }
      currentParentId = parentNode.data?.parentId
    }

    return level
  }, [id, data?.parentId, getNodes])

  // Generate different background styles based on nesting level
  const getNestedStyles = () => {
    // Base styles
    const styles: Record<string, string> = {
      backgroundColor: data?.state === 'valid' ? 'rgba(34,197,94,0.05)' : 'transparent',
    }

    // Apply nested styles
    if (nestingLevel > 0) {
      // Each nesting level gets a different color
      const colors = ['#e2e8f0', '#cbd5e1', '#94a3b8', '#64748b', '#475569']
      const colorIndex = (nestingLevel - 1) % colors.length

      styles.backgroundColor = `${colors[colorIndex]}30` // Slightly more visible background
    }

    return styles
  }

  const nestedStyles = getNestedStyles()

  return (
    <>
      {/* <LoopNodeStyles /> */}
      <div className='group relative bg-card/40 backdrop-blur-2xl'>
        <Card
          ref={blockRef}
          className={cn(
            'relative cursor-default select-none',
            'transition-block-bg transition-ring',
            'z-[20]',
            data?.state === 'valid' && 'bg-[rgba(34,197,94,0.05)] ring-2 ring-[#2FB3FF]',
            nestingLevel > 0 &&
              `border-[0.5px] ${nestingLevel % 2 === 0 ? 'border-slate-300/60' : 'border-slate-400/60'}`
          )}
          style={{
            width: Number(data.width) || 500,
            height: Number(data.height) || 300,
            position: 'relative',
            overflow: 'visible',
            ...nestedStyles,
            pointerEvents: 'all',
          }}
          data-node-id={id}
          data-type='loopNode'
          data-nesting-level={nestingLevel}
        >
          {/* Critical drag handle that controls only the loop node movement */}
          <div
            className='worker-drag-handle absolute top-0 right-0 left-0 z-10 h-10 cursor-move'
            style={{ pointerEvents: 'auto' }}
          />

          {/* Custom visible resize handle */}
          <div
            className='absolute right-2 bottom-2 z-20 flex h-8 w-8 cursor-se-resize items-center justify-center text-muted-foreground'
            style={{ pointerEvents: 'auto' }}
          />

          {/* Child nodes container - Enable pointer events to allow dragging of children */}
          <div
            className='h-[calc(100%-10px)] p-4'
            data-dragarea='true'
            style={{
              position: 'relative',
              minHeight: '100%',
              pointerEvents: 'auto',
            }}
          >
            {/* Delete button - styled like in action-bar.tsx */}
            <Button
              variant='ghost'
              size='sm'
              onClick={(e) => {
                e.stopPropagation()
                removeBlock(id)
              }}
              className='absolute top-2 right-2 z-20 text-gray-500 opacity-0 transition-opacity duration-200 hover:text-red-600 group-hover:opacity-100'
              style={{ pointerEvents: 'auto' }}
            >
              <Trash2 className='h-4 w-4' />
            </Button>

            {/* Loop Start Block */}
            <div
              className='-translate-y-1/2 absolute top-1/2 left-8 flex h-10 w-10 transform items-center justify-center rounded-md bg-[#2FB3FF] p-2'
              style={{ pointerEvents: 'auto' }}
              data-parent-id={id}
              data-node-role='loop-start'
              data-extent='parent'
            >
              <StartIcon className='h-6 w-6 text-white' />

              <Handle
                type='source'
                position={Position.Bottom}
                id='loop-start-source'
                className='!w-4 !h-[6px] !bg-slate-300 dark:!bg-slate-500 !rounded-[2px] !border-none !z-[30] hover:!h-[10px] hover:!bottom-[-10px] hover:!rounded-b-full hover:!rounded-t-none !cursor-crosshair transition-[colors] duration-150'
                style={{
                  bottom: '-6px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  pointerEvents: 'auto',
                }}
                data-parent-id={id}
              />
            </div>
          </div>

          {/* Input handle on top center */}
          <Handle
            type='target'
            position={Position.Top}
            className='!w-5 !h-[7px] !bg-slate-300 dark:!bg-slate-500 !rounded-[2px] !border-none !z-[30] hover:!h-[10px] hover:!top-[-10px] hover:!rounded-t-full hover:!rounded-b-none !cursor-crosshair transition-[colors] duration-150'
            style={{
              top: '-7px',
              left: '50%',
              transform: 'translateX(-50%)',
              pointerEvents: 'auto',
            }}
          />

          {/* Output handle on bottom center */}
          <Handle
            type='source'
            position={Position.Bottom}
            className='!w-5 !h-[7px] !bg-slate-300 dark:!bg-slate-500 !rounded-[2px] !border-none !z-[30] hover:!h-[10px] hover:!bottom-[-10px] hover:!rounded-b-full hover:!rounded-t-none !cursor-crosshair transition-[colors] duration-150'
            style={{
              bottom: '-7px',
              left: '50%',
              transform: 'translateX(-50%)',
              pointerEvents: 'auto',
            }}
            id='loop-end-source'
          />

          {/* Loop Configuration Badges */}
          <LoopBadges nodeId={id} data={data} />
        </Card>
      </div>
    </>
  )
})

LoopNodeComponent.displayName = 'LoopNodeComponent'
