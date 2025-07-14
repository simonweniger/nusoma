import { Badge } from '@nusoma/design-system/components/ui/badge'
import { Button } from '@nusoma/design-system/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@nusoma/design-system/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@nusoma/design-system/components/ui/tooltip'
import { Check, Copy, Link, MoreHorizontal, Trash, Workflow as WorkerIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { BlockConfig } from '@/blocks'
import { getBlock } from '@/blocks'
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard'
import { useUserPermissions } from '@/hooks/use-user-permissions'
import type { DeploymentStatus, WorkerMetadata } from '@/stores/workers/registry/types'

// Extended block config with instance data
interface ExtendedBlockConfig extends BlockConfig {
  id: string
  enabled: boolean
}

// Extract worker blocks from the blocks object
function extractWorkerBlocks(blocks: Record<string, any>): ExtendedBlockConfig[] {
  if (!blocks || typeof blocks !== 'object') {
    return []
  }

  return Object.values(blocks)
    .map((block) => {
      if (!block || !block.type) return null

      // Get the block configuration from the blocks registry
      const blockConfig = getBlock(block.type)
      if (!blockConfig) return null

      return {
        ...blockConfig,
        id: block.id,
        name: block.name || blockConfig.name,
        type: block.type,
        enabled: block.enabled ?? true,
      } as ExtendedBlockConfig
    })
    .filter((block): block is ExtendedBlockConfig => block !== null)
}

// Component to display blocks with tooltips
function BlocksTooltip({ blocks }: { blocks: ExtendedBlockConfig[] }) {
  const displayBlocks = blocks.slice(0, 3) // Show first 3 blocks
  const remainingCount = blocks.length - 3

  return (
    <div className='flex items-center gap-1'>
      {displayBlocks.map((block, index) => (
        <Tooltip key={block.id || index}>
          <TooltipTrigger asChild>
            <div
              className='flex h-6 w-6 items-center justify-center rounded'
              style={{ backgroundColor: block.bgColor }}
              title={block.name}
            >
              <block.icon className='h-3 w-3 text-white' />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p className='font-medium'>{block.name}</p>
            <p className='text-muted-foreground text-xs'>{block.description}</p>
          </TooltipContent>
        </Tooltip>
      ))}
      {remainingCount > 0 && (
        <div className='flex h-6 w-6 items-center justify-center rounded bg-muted font-medium text-muted-foreground text-xs'>
          +{remainingCount}
        </div>
      )}
    </div>
  )
}

// Component to display block counts
function BlocksCountTooltip({ blocks }: { blocks: ExtendedBlockConfig[] }) {
  const blockTypeCounts = blocks.reduce(
    (acc, block) => {
      acc[block.type] = (acc[block.type] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  const totalBlocks = blocks.length
  const uniqueTypes = Object.keys(blockTypeCounts).length

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className='cursor-help'>
          {totalBlocks} block{totalBlocks !== 1 ? 's' : ''}
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <div className='space-y-1'>
          <p className='font-medium'>{totalBlocks} total blocks</p>
          <p className='text-muted-foreground text-xs'>{uniqueTypes} unique types</p>
          <div className='mt-2 space-y-1'>
            {Object.entries(blockTypeCounts).map(([type, count]) => {
              const blockConfig = getBlock(type)
              return (
                <div key={type} className='flex items-center gap-2 text-xs'>
                  {blockConfig && (
                    <div
                      className='flex h-4 w-4 items-center justify-center rounded'
                      style={{ backgroundColor: blockConfig.bgColor }}
                    >
                      <blockConfig.icon className='h-2 w-2 text-white' />
                    </div>
                  )}
                  <span>
                    {blockConfig?.name || type}: {count}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  )
}

interface WorkerLineProps {
  worker: WorkerMetadata
  duplicateWorker: (workerId: string) => string | null
  getWorkerDeploymentStatus: (workerId: string | null) => DeploymentStatus | null
  removeWorker: (workerId: string) => void
}

export default function WorkerLine({
  worker,
  duplicateWorker,
  getWorkerDeploymentStatus,
  removeWorker,
}: WorkerLineProps) {
  // Extract blocks from the worker.blocks property
  const blocks: ExtendedBlockConfig[] = worker.blocks ? extractWorkerBlocks(worker.blocks) : []
  const userPermissions = useUserPermissions(worker?.workspaceId || null)
  const isDeployed = getWorkerDeploymentStatus(worker.id)?.isDeployed || false
  const router = useRouter()
  const copyToClipboard = useCopyToClipboard()

  /**
   * Handle duplicating the current worker
   **/
  const handleDuplicateWorker = () => {
    if (!userPermissions.canEdit) return

    // Duplicate the worker and get the new ID
    const newWorkerId = duplicateWorker(worker.id)

    if (newWorkerId) {
      // Navigate to the new worker
      router.push(`/workspace/${worker.workspaceId}/workers/${newWorkerId}`)
    }
  }

  /**
   * Handle deleting the current worker
   */
  const handleDeleteWorker = () => {
    if (!worker.id || !userPermissions.canEdit) return

    // Remove the worker from the registry
    removeWorker(worker.id)
  }

  /**
   * Handle copying worker ID to clipboard
   */
  const handleCopyWorkerId = async () => {
    const workerUrl = `${process.env.NEXT_PUBLIC_APP_URL}/workspace/${worker.workspaceId}/workers/${worker.id}`

    await copyToClipboard(workerUrl)
  }

  console.log('Worker blocks:', worker.blocks)

  return (
    <div
      onClick={() => router.push(`/workspace/${worker.workspaceId}/workers/${worker.id}`)}
      className='flex w-full cursor-pointer items-center border-muted-foreground/5 border-b px-6 py-4 text-sm hover:bg-sidebar/50'
    >
      <div className='flex w-[50%] items-center gap-3 sm:w-[40%] md:w-[35%] lg:w-[29%]'>
        <div className='relative'>
          <div
            className='inline-flex size-8 shrink-0 items-center justify-center rounded-md'
            style={{ backgroundColor: worker.color }}
          >
            <div className='font-medium text-foreground'>{worker.name.charAt(0)}</div>
          </div>
        </div>
        <div className='flex flex-col items-start overflow-hidden'>
          <span className='w-full truncate font-medium'>{worker.name}</span>
          {worker.description && (
            <span className='w-full truncate text-muted-foreground text-xs'>
              {worker.description}
            </span>
          )}
        </div>
      </div>

      <div className='hidden items-center gap-2 sm:flex sm:w-[15%] md:w-[15.5%]'>
        {isDeployed ? (
          <Badge variant='outline' className='bg-green-500/10 text-green-600'>
            <Check className='mr-1 size-3' />
            Deployed
          </Badge>
        ) : (
          <Badge variant='outline' className='bg-muted-foreground/10 text-muted-foreground '>
            <WorkerIcon className='mr-1 size-3' />
            Draft
          </Badge>
        )}
        {worker.marketplaceData?.id && (
          <Badge variant='outline' className='bg-blue-500/10 text-blue-600'>
            <Link className='mr-1 size-3' />
            Published
          </Badge>
        )}
      </div>

      <div className='flex w-[30%] items-center sm:w-[25%] md:w-[21%]'>
        {blocks.length > 0 ? (
          <BlocksTooltip blocks={blocks} />
        ) : (
          <span className='text-muted-foreground text-xs'>No blocks</span>
        )}
      </div>

      <div className='hidden items-center text-muted-foreground text-xs sm:flex sm:w-[10%] md:w-[10%]'>
        {blocks.length > 0 && <BlocksCountTooltip blocks={blocks} />}
      </div>

      <div className='flex w-[20%] items-center justify-end gap-2 sm:w-[15%] md:w-[18%]'>
        {/* <Button variant='ghost' size='icon' className='size-8' title='Preview'>
          <Eye className='size-4' />
        </Button> */}
        {/* <Button variant='ghost' size='icon' className='size-8' title='Edit'>
          <Edit className='size-4' />
        </Button> */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant='ghost'
              size='icon'
              className='size-8'
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className='size-4' />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end'>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation()
                handleDuplicateWorker()
              }}
            >
              <Copy className='mr-2 size-4' />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation()
                handleCopyWorkerId()
              }}
            >
              <Link className='mr-2 size-4' />
              Copy Link
            </DropdownMenuItem>
            <DropdownMenuItem
              className='text-destructive'
              onClick={(e) => {
                e.stopPropagation()
                handleDeleteWorker()
              }}
            >
              <Trash className='mr-2 size-4' />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
