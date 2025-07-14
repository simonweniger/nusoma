'use client'

import { useMemo } from 'react'
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
} from '@nusoma/design-system/components/ui/sidebar'
import { Skeleton } from '@nusoma/design-system/components/ui/skeleton'
import clsx from 'clsx'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from '@/lib/auth-client'
import { useWorkerRegistry } from '@/stores/workers/registry/store'
import type { WorkerMetadata } from '@/stores/workers/registry/types'

interface WorkerItemProps {
  worker: WorkerMetadata
  active: boolean
  isMarketplace?: boolean
  isCollapsed?: boolean
}

function WorkerItem({ worker, active, isMarketplace, isCollapsed }: WorkerItemProps) {
  return (
    <Link
      href={`/workspace/${worker.id}`}
      className={clsx(
        'flex items-center rounded-md px-2 py-1.5 font-medium text-sm',
        active ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent/50',
        isCollapsed && 'mx-auto h-8 w-8 justify-center'
      )}
    >
      <div
        className={clsx(
          'flex-shrink-0 rounded',
          isCollapsed ? 'h-[14px] w-[14px]' : 'mr-2 h-[14px] w-[14px]'
        )}
        style={{ backgroundColor: worker.color }}
      />
      {!isCollapsed && (
        <span className='truncate'>
          {worker.name}
          {isMarketplace && ' (Preview)'}
        </span>
      )}
    </Link>
  )
}

interface WorkerListProps {
  regularWorkers: WorkerMetadata[]
  marketplaceWorkers: WorkerMetadata[]
  isCollapsed?: boolean
  isLoading?: boolean
}

export function WorkerList({
  regularWorkers,
  marketplaceWorkers,
  isCollapsed = false,
  isLoading = false,
}: WorkerListProps) {
  const pathname = usePathname()
  const { activeWorkspaceId } = useWorkerRegistry()
  const { data: session } = useSession()

  // Generate skeleton items for loading state
  const skeletonItems = useMemo(() => {
    return new Array(4).fill(0).map((_, i) => (
      <div
        key={`skeleton-${i}`}
        className={`mb-1 flex w-full items-center gap-2 rounded-md px-2 py-1.5 ${
          isCollapsed ? 'justify-center' : ''
        }`}
      >
        {isCollapsed ? (
          <Skeleton className='h-[14px] w-[14px] rounded-md' />
        ) : (
          <>
            <Skeleton className='h-[14px] w-[14px] rounded-md' />
            <Skeleton className='h-4 w-20' />
          </>
        )}
      </div>
    ))
  }, [isCollapsed])

  // Only show empty state when not loading and user is logged in
  const showEmptyState =
    !isLoading && session?.user && regularWorkers.length === 0 && marketplaceWorkers.length === 0

  return (
    <SidebarGroup className='group-data-[collapsible=icon]:hidden'>
      <SidebarGroupLabel>Workers</SidebarGroupLabel>
      <SidebarMenu>
        {isLoading ? (
          // Show skeleton loading state
          skeletonItems
        ) : (
          <>
            {/* Regular workers */}
            {regularWorkers.map((worker) => (
              <SidebarMenuItem key={worker.id}>
                <WorkerItem
                  worker={worker}
                  active={pathname === `/workspace/${worker.id}`}
                  isCollapsed={isCollapsed}
                />
              </SidebarMenuItem>
            ))}

            {/* Marketplace Temp Workers (if any) */}
            {marketplaceWorkers.length > 0 && (
              <div className='mt-2 border-border/30 border-t pt-2'>
                <h3
                  className={`mb-1 px-2 font-medium text-muted-foreground text-xs ${
                    isCollapsed ? 'text-center' : ''
                  }`}
                >
                  {isCollapsed ? '' : 'Marketplace'}
                </h3>
                {marketplaceWorkers.map((worker) => (
                  <SidebarMenuItem key={worker.id}>
                    <WorkerItem
                      worker={worker}
                      active={pathname === `/workspace/${worker.id}`}
                      isMarketplace
                      isCollapsed={isCollapsed}
                    />
                  </SidebarMenuItem>
                ))}
              </div>
            )}

            {/* Empty state */}
            {showEmptyState && !isCollapsed && pathname === '/workspace/[id]' && (
              <div className='px-2 py-1.5 text-muted-foreground text-xs'>
                No workers in {activeWorkspaceId ? 'this workspace' : 'your account'}. Create one to
                get started.
              </div>
            )}
          </>
        )}
      </SidebarMenu>
    </SidebarGroup>
  )
}
