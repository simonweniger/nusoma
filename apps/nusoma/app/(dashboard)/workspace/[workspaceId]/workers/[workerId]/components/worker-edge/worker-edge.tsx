import { BaseEdge, EdgeLabelRenderer, type EdgeProps, getSmoothStepPath } from '@xyflow/react'
import { GitFork, Plus, X } from 'lucide-react'

interface WorkerEdgeData {
  onDelete?: (id: string) => void
  isSelected?: boolean
  isInsideLoop?: boolean
  parentLoopId?: string
  isHovered?: boolean
  onPlusClick?: (
    edgeId: string,
    sourceId: string,
    targetId: string,
    sourceHandle: string,
    targetHandle: string
  ) => void
  onSplitClick?: (
    sourceId: string,
    sourceHandle: string,
    midpoint: { x: number; y: number }
  ) => void
  sourceId?: string
  targetId?: string
  sourceHandle?: string
  targetHandle?: string
}

export const WorkerEdge = (props: EdgeProps) => {
  const {
    id,
    source,
    target,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    data,
    style,
  } = props

  // Get handle info from props
  const sourceHandle = (props as any).sourceHandle || 'source'
  const targetHandle = (props as any).targetHandle || 'target'
  const isHorizontal = sourcePosition === 'right' || sourcePosition === 'left'

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 8,
    offset: 20,
  })

  // Use the directly provided isSelected flag instead of computing it
  const edgeData = data as WorkerEdgeData
  const isSelected = edgeData?.isSelected ?? false
  const isHovered = edgeData?.isHovered ?? false
  const isInsideLoop = edgeData?.isInsideLoop ?? false
  const parentLoopId = edgeData?.parentLoopId

  // Merge any style props passed from parent
  const edgeStyle = {
    strokeWidth: isSelected ? 2.5 : 2,
    stroke: isSelected ? '#475569' : '#94a3b8',
    strokeDasharray: '5,5',
    ...style,
  }

  // Function to prevent drag behavior on edge elements
  const preventDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    return false
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  return (
    <>
      <BaseEdge
        path={edgePath}
        data-testid='worker-edge'
        style={{
          ...edgeStyle,
          pointerEvents: 'stroke',
        }}
        interactionWidth={30}
        data-edge-id={id}
        data-parent-loop-id={parentLoopId}
        data-is-selected={isSelected ? 'true' : 'false'}
        data-is-inside-loop={isInsideLoop ? 'true' : 'false'}
        onMouseDown={(e) => {
          e.preventDefault()
          e.stopPropagation()
        }}
        onDragStart={(e) => {
          e.preventDefault()
          e.stopPropagation()
          return false
        }}
      />
      <animate
        attributeName='stroke-dashoffset'
        from='10'
        to='0'
        dur='1s'
        repeatCount='indefinite'
      />

      {isSelected && (
        <EdgeLabelRenderer>
          <div
            className='nodrag nopan flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-[#FAFBFC] shadow-sm'
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
              zIndex: 22,
            }}
            draggable={false}
            onDragStart={preventDrag}
            onMouseDown={handleMouseDown}
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()

              if (edgeData?.onDelete) {
                // Pass this specific edge's ID to the delete function
                edgeData.onDelete(id)
              }
            }}
          >
            <X className='h-5 w-5 text-red-500 hover:text-red-600' />
          </div>
        </EdgeLabelRenderer>
      )}

      {isHovered && !isSelected && (
        <EdgeLabelRenderer>
          <div
            className='nodrag nopan absolute flex items-center gap-2'
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
              zIndex: 21,
            }}
            draggable={false}
            onDragStart={preventDrag}
            onMouseDown={handleMouseDown}
          >
            {/* Delete Icon for removing the edge */}
            <div
              className='flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-red-500 shadow-lg transition-all hover:scale-110 hover:bg-red-600'
              draggable={false}
              onDragStart={preventDrag}
              onMouseDown={handleMouseDown}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()

                if (edgeData?.onDelete) {
                  edgeData.onDelete(id)
                }
              }}
              title='Delete connection'
            >
              <X className='h-4 w-4 text-white' />
            </div>

            {/* Plus Icon for inserting a node */}
            <div
              className='flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-blue-500 shadow-lg transition-all hover:scale-110 hover:bg-blue-600'
              draggable={false}
              onDragStart={preventDrag}
              onMouseDown={handleMouseDown}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()

                if (edgeData?.onPlusClick) {
                  edgeData.onPlusClick(id, source, target, sourceHandle, targetHandle)
                }
              }}
              title='Insert step'
            >
              <Plus className='h-4 w-4 text-white' />
            </div>

            {/* Split Icon for adding a new path */}
            <div
              className='flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-green-500 shadow-lg transition-all hover:scale-110 hover:bg-green-600'
              draggable={false}
              onDragStart={preventDrag}
              onMouseDown={handleMouseDown}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()

                if (edgeData?.onSplitClick) {
                  edgeData.onSplitClick(source, sourceHandle, { x: labelX, y: labelY })
                }
              }}
              title='Add parallel step'
            >
              <GitFork className='h-4 w-4 text-white' />
            </div>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}
