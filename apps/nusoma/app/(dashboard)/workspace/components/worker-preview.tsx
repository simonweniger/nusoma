'use client'

import { useMemo } from 'react'
import {
  Background,
  ConnectionLineType,
  type Edge,
  type EdgeTypes,
  type Node,
  type NodeTypes,
  ReactFlow,
  ReactFlowProvider,
} from '@xyflow/react'
import { cloneDeep } from 'lodash'
import '@xyflow/react/dist/style.css'

import { createLogger } from '@/lib/logger/console-logger'
import { cn } from '@/lib/utils'
import { LoopNodeComponent } from '@/app/(dashboard)/workspace/[workspaceId]/workers/[workerId]/components/loop-node/loop-node'
import { ParallelNodeComponent } from '@/app/(dashboard)/workspace/[workspaceId]/workers/[workerId]/components/parallel-node/parallel-node'
import { WorkerBlock } from '@/app/(dashboard)/workspace/[workspaceId]/workers/[workerId]/components/worker-block/worker-block'
import { WorkerEdge } from '@/app/(dashboard)/workspace/[workspaceId]/workers/[workerId]/components/worker-edge/worker-edge'
import { getBlock } from '@/blocks'
import type { WorkerState } from '@/stores/workers/worker/types'

const logger = createLogger('WorkerPreview')

interface WorkerPreviewProps {
  workerState: WorkerState
  showSubBlocks?: boolean
  className?: string
  height?: string | number
  width?: string | number
  isPannable?: boolean
  defaultPosition?: { x: number; y: number }
  defaultZoom?: number
}

// Define node types - the components now handle preview mode internally
const nodeTypes: NodeTypes = {
  workerBlock: WorkerBlock,
  loopNode: LoopNodeComponent,
  parallelNode: ParallelNodeComponent,
}

// Define edge types
const edgeTypes: EdgeTypes = {
  workerEdge: WorkerEdge,
}

export function WorkerPreview({
  workerState,
  showSubBlocks = true,
  height = '100%',
  width = '100%',
  isPannable = false,
  defaultPosition,
  defaultZoom,
}: WorkerPreviewProps) {
  const blocksStructure = useMemo(
    () => ({
      count: Object.keys(workerState.blocks || {}).length,
      ids: Object.keys(workerState.blocks || {}).join(','),
    }),
    [workerState.blocks]
  )

  const loopsStructure = useMemo(
    () => ({
      count: Object.keys(workerState.loops || {}).length,
      ids: Object.keys(workerState.loops || {}).join(','),
    }),
    [workerState.loops]
  )

  const parallelsStructure = useMemo(
    () => ({
      count: Object.keys(workerState.parallels || {}).length,
      ids: Object.keys(workerState.parallels || {}).join(','),
    }),
    [workerState.parallels]
  )

  const edgesStructure = useMemo(
    () => ({
      count: workerState.edges.length,
      ids: workerState.edges.map((e) => e.id).join(','),
    }),
    [workerState.edges]
  )

  const calculateAbsolutePosition = (
    block: any,
    blocks: Record<string, any>
  ): { x: number; y: number } => {
    if (!block.data?.parentId) {
      return block.position
    }

    const parentBlock = blocks[block.data.parentId]
    if (!parentBlock) {
      logger.warn(`Parent block not found for child block: ${block.id}`)
      return block.position
    }

    const parentAbsolutePosition = calculateAbsolutePosition(parentBlock, blocks)

    return {
      x: parentAbsolutePosition.x + block.position.x,
      y: parentAbsolutePosition.y + block.position.y,
    }
  }

  const nodes: Node[] = useMemo(() => {
    const nodeArray: Node[] = []

    Object.entries(workerState.blocks).forEach(([blockId, block]) => {
      if (!block || !block.type) {
        logger.warn(`Skipping invalid block: ${blockId}`)
        return
      }

      const absolutePosition = calculateAbsolutePosition(block, workerState.blocks)

      if (block.type === 'loop') {
        nodeArray.push({
          id: block.id,
          type: 'loopNode',
          position: absolutePosition,
          parentId: block.data?.parentId,
          extent: block.data?.extent || undefined,
          draggable: false,
          data: {
            ...block.data,
            width: block.data?.width || 500,
            height: block.data?.height || 300,
            state: 'valid',
            isPreview: true,
          },
        })
        return
      }

      if (block.type === 'parallel') {
        nodeArray.push({
          id: block.id,
          type: 'parallelNode',
          position: absolutePosition,
          parentId: block.data?.parentId,
          extent: block.data?.extent || undefined,
          draggable: false,
          data: {
            ...block.data,
            width: block.data?.width || 500,
            height: block.data?.height || 300,
            state: 'valid',
            isPreview: true,
          },
        })
        return
      }

      const blockConfig = getBlock(block.type)
      if (!blockConfig) {
        logger.error(`No configuration found for block type: ${block.type}`, { blockId })
        return
      }

      const subBlocksClone = block.subBlocks ? cloneDeep(block.subBlocks) : {}

      nodeArray.push({
        id: blockId,
        type: 'workerBlock',
        position: absolutePosition,
        draggable: false,
        data: {
          type: block.type,
          config: blockConfig,
          name: block.name,
          blockState: block,
          canEdit: false,
          isPreview: true,
          subBlockValues: subBlocksClone,
        },
      })

      if (block.type === 'loop') {
        const childBlocks = Object.entries(workerState.blocks).filter(
          ([_, childBlock]) => childBlock.data?.parentId === blockId
        )

        childBlocks.forEach(([childId, childBlock]) => {
          const childConfig = getBlock(childBlock.type)

          if (childConfig) {
            nodeArray.push({
              id: childId,
              type: 'workerBlock',
              position: {
                x: block.position.x + 50,
                y: block.position.y + (childBlock.position?.y || 100),
              },
              data: {
                type: childBlock.type,
                config: childConfig,
                name: childBlock.name,
                blockState: childBlock,
                showSubBlocks,
                isChild: true,
                parentId: blockId,
                canEdit: false,
                isPreview: true,
              },
              draggable: false,
            })
          }
        })
      }
    })

    return nodeArray
  }, [blocksStructure, loopsStructure, parallelsStructure, showSubBlocks, workerState.blocks])

  const edges: Edge[] = useMemo(() => {
    return workerState.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle,
      type: 'workerEdge',
    }))
  }, [edgesStructure, workerState.edges])

  return (
    <ReactFlowProvider>
      <div style={{ height, width }} className={cn('preview-mode')}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          connectionLineType={ConnectionLineType.SmoothStep}
          fitView
          panOnScroll={false}
          panOnDrag={isPannable}
          zoomOnScroll={false}
          draggable={false}
          defaultViewport={{
            x: defaultPosition?.x ?? 0,
            y: defaultPosition?.y ?? 0,
            zoom: defaultZoom ?? 1,
          }}
          minZoom={0.1}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
          elementsSelectable={false}
          nodesDraggable={false}
          nodesConnectable={false}
        >
          <Background />
        </ReactFlow>
      </div>
    </ReactFlowProvider>
  )
}
