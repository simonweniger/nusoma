'use client'

import { useEffect, useMemo, useState } from 'react'
import { Skeleton } from '@nusoma/design-system/components/ui/skeleton'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@nusoma/design-system/components/ui/tooltip'
import clsx from 'clsx'
import { HelpCircle, ScrollText, Send, Settings } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import { useSession } from '@/lib/auth-client'
import {
  getKeyboardShortcutText,
  useGlobalShortcuts,
} from '@/app/(dashboard)/workspace/hooks/use-keyboard-shortcuts'
import { useSidebarStore } from '@/stores/sidebar/store'
import { useWorkerRegistry } from '@/stores/workers/registry/store'
import type { WorkerMetadata } from '@/stores/workers/registry/types'
import { useRegistryLoading } from '../../hooks/use-registry-loading'
import { HelpModal } from './components/help-modal/help-modal'
import { InviteModal } from './components/invite-modal/invite-modal'
import { NavSection } from './components/nav-section/nav-section'
import { WorkerList } from './components/worker-list/worker-list'
import { WorkspaceHeader } from './components/workspace-header/workspace-header'

export function AppSidebar() {
  useRegistryLoading()
  // Initialize global keyboard shortcuts
  useGlobalShortcuts()

  const {
    workers,
    activeWorkspaceId,
    createWorker,
    isLoading: workersLoading,
  } = useWorkerRegistry()
  const { isPending: sessionLoading } = useSession()
  const isLoading = workersLoading || sessionLoading
  const router = useRouter()
  const pathname = usePathname()
  const [showSettings, setShowSettings] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [showInviteMembers, setShowInviteMembers] = useState(false)
  const {
    mode,
    setMode,
    workspaceDropdownOpen,
    setWorkspaceDropdownOpen,
    isAnyModalOpen,
    setAnyModalOpen,
  } = useSidebarStore()
  const [isHovered, setIsHovered] = useState(false)
  const [explicitMouseEnter, setExplicitMouseEnter] = useState(false)

  // Track when active workspace changes to ensure we refresh the UI
  useEffect(() => {
    if (activeWorkspaceId) {
      // We don't need to do anything here, just force a re-render
      // when activeWorkspaceId changes to ensure fresh data
    }
  }, [activeWorkspaceId])

  // Update modal state in the store when settings or help modals open/close
  useEffect(() => {
    setAnyModalOpen(showSettings || showHelp || showInviteMembers)
  }, [showSettings, showHelp, showInviteMembers, setAnyModalOpen])

  // Reset explicit mouse enter state when modal state changes
  useEffect(() => {
    if (isAnyModalOpen) {
      setExplicitMouseEnter(false)
    }
  }, [isAnyModalOpen])

  // Separate regular workers from temporary marketplace workers
  const { regularWorkers, tempWorkers } = useMemo(() => {
    const regular: WorkerMetadata[] = []
    const temp: WorkerMetadata[] = []

    // Only process workers when not in loading state
    if (!isLoading) {
      for (const worker of Object.values(workers)) {
        // Include workers that either:
        // 1. Belong to the active workspace, OR
        // 2. Don't have a workspace ID (legacy workers)
        if (worker.workspaceId === activeWorkspaceId || !worker.workspaceId) {
          if (worker.marketplaceData?.status === 'temp') {
            temp.push(worker)
          } else {
            regular.push(worker)
          }
        }
      }

      // Sort regular workers by last modified date (newest first)
      regular.sort((a, b) => {
        const dateA =
          a.lastModified instanceof Date
            ? a.lastModified.getTime()
            : new Date(a.lastModified).getTime()
        const dateB =
          b.lastModified instanceof Date
            ? b.lastModified.getTime()
            : new Date(b.lastModified).getTime()
        return dateB - dateA
      })

      // Sort temp workers by last modified date (newest first)
      temp.sort((a, b) => {
        const dateA =
          a.lastModified instanceof Date
            ? a.lastModified.getTime()
            : new Date(a.lastModified).getTime()
        const dateB =
          b.lastModified instanceof Date
            ? b.lastModified.getTime()
            : new Date(b.lastModified).getTime()
        return dateB - dateA
      })
    }

    return { regularWorkers: regular, tempWorkers: temp }
  }, [workers, isLoading, activeWorkspaceId])

  // Create worker
  const handleCreateWorker = async () => {
    try {
      // Create the worker and ensure it's associated with the active workspace
      const id = await createWorker({
        workspaceId: activeWorkspaceId || undefined,
      })

      router.push(`/workspace/${id}`)
    } catch (_error) {}
  }

  // Calculate sidebar visibility states
  // When in hover mode, sidebar is collapsed until hovered or workspace dropdown is open
  // When in expanded/collapsed mode, sidebar follows isExpanded state
  const isCollapsed =
    mode === 'collapsed' ||
    (mode === 'hover' &&
      ((!isHovered && !workspaceDropdownOpen) || isAnyModalOpen || !explicitMouseEnter))
  // Only show overlay effect when in hover mode and actually being hovered or dropdown is open
  const showOverlay =
    mode === 'hover' &&
    ((isHovered && !isAnyModalOpen && explicitMouseEnter) || workspaceDropdownOpen)

  return (
    <aside
      className={clsx(
        'fixed inset-y-0 left-0 z-10 flex flex-col border-r bg-background transition-all duration-200 sm:flex',
        isCollapsed ? 'w-14' : 'w-60',
        showOverlay ? 'shadow-lg' : '',
        mode === 'hover' ? 'main-content-overlay' : ''
      )}
      onMouseEnter={() => {
        if (mode === 'hover' && !isAnyModalOpen) {
          setIsHovered(true)
          setExplicitMouseEnter(true)
        }
      }}
      onMouseLeave={() => {
        if (mode === 'hover') {
          setIsHovered(false)
        }
      }}
      style={{
        // When in hover mode and expanded, position above content without pushing it
        position: showOverlay ? 'fixed' : 'fixed',
      }}
    >
      {/* Workspace Header - Fixed at top */}
      <div className='flex-shrink-0'>
        <WorkspaceHeader
          onCreateWorker={handleCreateWorker}
          isCollapsed={isCollapsed}
          onDropdownOpenChange={setWorkspaceDropdownOpen}
        />
      </div>

      {/* Main navigation - Fixed at top below header */}
      {/* <div className="flex-shrink-0 px-2 pt-0">
        <NavSection isLoading={isLoading} itemCount={2} isCollapsed={isCollapsed}>
          <NavSection.Item
            icon={<Home className="h-[18px] w-[18px]" />}
            href="/workspace/1"
            label="Home"
            active={pathname === '/workspace/1'}
            isCollapsed={isCollapsed}
          />
          <NavSection.Item
            icon={<Shapes className="h-[18px] w-[18px]" />}
            href="/workspace/templates"
            label="Templates"
            active={pathname === '/workspace/templates'}
            isCollapsed={isCollapsed}
          />
          <NavSection.Item
            icon={<Store className="h-[18px] w-[18px]" />}
            href="/workspace/marketplace"
            label="Marketplace"
            active={pathname === '/workspace/marketplace'}
            isCollapsed={isCollapsed}
          />
        </NavSection>
      </div> */}

      {/* Scrollable Content Area - Contains Workers and Logs/Settings */}
      <div className='scrollbar-none flex flex-1 flex-col overflow-auto px-2 py-0'>
        {/* Workers Section */}
        <div className='flex-shrink-0'>
          <h2
            className={`mb-1 px-2 font-medium text-muted-foreground text-xs ${isCollapsed ? 'text-center' : ''}`}
          >
            {isLoading ? (
              isCollapsed ? (
                ''
              ) : (
                <Skeleton className='h-4 w-16' />
              )
            ) : isCollapsed ? (
              ''
            ) : (
              'Workers'
            )}
          </h2>
          <WorkerList
            regularWorkers={regularWorkers}
            marketplaceWorkers={tempWorkers}
            isCollapsed={isCollapsed}
            isLoading={isLoading}
          />
        </div>

        {/* Logs and Settings Navigation - Follows workers */}
        <div className='mt-6 flex-shrink-0'>
          <NavSection isLoading={isLoading} itemCount={2} isCollapsed={isCollapsed}>
            <NavSection.Item
              icon={<ScrollText className='h-[18px] w-[18px]' />}
              href='/workspace/logs'
              label='Logs'
              active={pathname === '/workspace/logs'}
              isCollapsed={isCollapsed}
              shortcutCommand={getKeyboardShortcutText('L', true, true)}
              shortcutCommandPosition='below'
            />
            <NavSection.Item
              icon={<Settings className='h-[18px] w-[18px]' />}
              onClick={() => setShowSettings(true)}
              label='Settings'
              isCollapsed={isCollapsed}
            />
          </NavSection>
        </div>

        {/* Push the bottom controls down when content is short */}
        <div className='flex-grow' />
      </div>

      {isCollapsed ? (
        <div className='flex-shrink-0 px-3 pt-1 pb-3'>
          <div className='flex flex-col space-y-[1px]'>
            {/* Invite members button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setShowInviteMembers(true)}
                  type='button'
                  className='mx-auto flex h-8 w-8 cursor-pointer items-center justify-center rounded-md font-medium text-muted-foreground text-sm hover:bg-accent/50'
                >
                  <Send className='h-[18px] w-[18px]' />
                </button>
              </TooltipTrigger>
              <TooltipContent side='right'>Invite Members</TooltipContent>
            </Tooltip>

            {/* Help button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setShowHelp(true)}
                  type='button'
                  className='mx-auto flex h-8 w-8 cursor-pointer items-center justify-center rounded-md font-medium text-muted-foreground text-sm hover:bg-accent/50'
                >
                  <HelpCircle className='h-[18px] w-[18px]' />
                </button>
              </TooltipTrigger>
              <TooltipContent side='right'>Help</TooltipContent>
            </Tooltip>
          </div>
        </div>
      ) : (
        <>
          {/* Invite members bar */}
          <div className='flex-shrink-0 px-3 pt-1'>
            <button
              onClick={() => setShowInviteMembers(true)}
              onKeyUp={() => setShowInviteMembers(true)}
              type='button'
              className='flex cursor-pointer items-center rounded-md px-2 py-1.5 font-medium text-muted-foreground text-sm hover:bg-accent/50'
            >
              <Send className='h-[18px] w-[18px]' />
              <span className='ml-2'>Invite members</span>
            </button>
          </div>

          {/* Bottom buttons container */}
          <div className='flex-shrink-0 px-3 pt-1 pb-3'>
            <div className='flex justify-between'>
              {/* Help button on right with tooltip */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setShowHelp(true)}
                    type='button'
                    className='flex h-8 w-8 cursor-pointer items-center justify-center rounded-md font-medium text-muted-foreground text-sm hover:bg-accent/50'
                  >
                    <HelpCircle className='h-[18px] w-[18px]' />
                    <span className='sr-only'>Help</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side='top'>Help, contact</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </>
      )}
      <HelpModal open={showHelp} onOpenChange={setShowHelp} />
      <InviteModal open={showInviteMembers} onOpenChange={setShowInviteMembers} />
    </aside>
  )
}
