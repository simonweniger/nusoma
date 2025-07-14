'use client'

import type React from 'react'
import { useEffect, useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@nusoma/design-system/components/ui/alert-dialog'
import { Button } from '@nusoma/design-system/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@nusoma/design-system/components/ui/collapsible'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@nusoma/design-system/components/ui/dropdown-menu'
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@nusoma/design-system/components/ui/sidebar'
import { Skeleton } from '@nusoma/design-system/components/ui/skeleton'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@nusoma/design-system/components/ui/tooltip'
import type { WorkspaceDTO } from '@nusoma/types/workspace'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Archive,
  ChevronRight,
  LibraryBigIcon,
  Link as LinkIcon,
  ListTodoIcon,
  MoreHorizontal,
  PencilIcon,
  Plus,
  Settings,
  Trash2,
  UsersIcon,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  WorkspaceEditModal,
  WorkspaceModal,
} from '@/app/(dashboard)/workspace/components/sidebar/workspace-modals'
import { useSidebarStore } from '@/stores/sidebar/store'
import { useWorkerRegistry } from '@/stores/workers/registry/store'

interface NavWorkspacesProps {
  workspaces: WorkspaceDTO[]
}

export function NavWorkspaces({ workspaces }: NavWorkspacesProps) {
  // Get sidebar store state to check current mode
  const { mode, workspaceDropdownOpen, setAnyModalOpen } = useSidebarStore()

  // Keep local isOpen state in sync with the store (for internal component use)
  const [_isOpen, setIsOpen] = useState(workspaceDropdownOpen)
  // Use client-side loading instead of isPending to avoid hydration mismatch
  const [isWorkspaceModalOpen, setIsWorkspaceModalOpen] = useState(false)
  const [editingWorkspace, setEditingWorkspace] = useState<WorkspaceDTO | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [workspaceToDelete, setWorkspaceToDelete] = useState<WorkspaceDTO | null>(null)
  const router = useRouter()
  const queryClient = useQueryClient()

  // Get workerRegistry state and actions
  const { activeWorkspaceId, handleWorkspaceDeletion, switchToWorkspace } = useWorkerRegistry()

  // Find active workspace
  const activeWorkspace =
    workspaces.find((workspace: WorkspaceDTO) => workspace.id === activeWorkspaceId) ||
    workspaces[0] ||
    null

  // Update active workspace in registry when it changes
  useEffect(() => {
    if (activeWorkspace && activeWorkspace.id !== activeWorkspaceId) {
      switchToWorkspace(activeWorkspace.id)
    }
  }, [activeWorkspace, activeWorkspaceId])

  // Create workspace mutation
  const { mutate: createWorkspaceMutation, isPending: isCreatingWorkspace } = useMutation({
    mutationFn: async (name: string) => {
      const response = await fetch('/api/workspaces', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name }),
      })
      if (!response.ok) {
        throw new Error('Failed to create workspace')
      }
      return response.json()
    },
    onSuccess: (data) => {
      // Invalidate workspaces query to refetch
      queryClient.invalidateQueries({ queryKey: ['workspaces'] })

      if (data.workspace) {
        // Update the worker registry store with the new active workspace
        switchToWorkspace(data.workspace.id)

        // Update URL to include new workspace ID
        router.push(`/workspace/${data.workspace.id}`)
      }
    },
  })

  // Update workspace mutation
  const { mutate: updateWorkspaceMutation, isPending: isUpdatingWorkspace } = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const response = await fetch(`/api/workspaces/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name }),
      })
      if (!response.ok) {
        throw new Error('Failed to update workspace')
      }
      return response.json()
    },
    onSuccess: (data: { workspace: WorkspaceDTO }) => {
      queryClient.setQueryData<WorkspaceDTO[]>(['workspaces'], (old) =>
        old?.map((ws) => (ws.id === data.workspace.id ? { ...ws, ...data.workspace } : ws))
      )
    },
  })

  // Delete workspace mutation
  const { mutate: deleteWorkspaceMutation, isPending: isDeletingWorkspace } = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/workspaces/${id}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        throw new Error('Failed to delete workspace')
      }
      return response.json()
    },
    onSuccess: (_, deletedId: string) => {
      const previousWorkspaces = queryClient.getQueryData<WorkspaceDTO[]>(['workspaces'])

      if (previousWorkspaces) {
        const remainingWorkspaces = previousWorkspaces.filter((w) => w.id !== deletedId)
        queryClient.setQueryData(['workspaces'], remainingWorkspaces)

        if (activeWorkspaceId === deletedId) {
          if (remainingWorkspaces.length > 0) {
            const newWorkspaceId = remainingWorkspaces[0].id
            handleWorkspaceDeletion(newWorkspaceId)
            router.push(`/workspace/${newWorkspaceId}`)
          } else {
            router.push('/workspace') // Redirect to a default page if no workspaces are left
          }
        }
      } else {
        // Fallback to invalidation if cache is empty for some reason
        queryClient.invalidateQueries({ queryKey: ['workspaces'] })
      }

      setIsOpen(false)
    },
  })
  // Handle modal open/close state
  useEffect(() => {
    // Update the modal state in the store
    setAnyModalOpen(isWorkspaceModalOpen || isEditModalOpen || isDeletingWorkspace)
  }, [isWorkspaceModalOpen, isEditModalOpen, isDeletingWorkspace, setAnyModalOpen])

  // Handle workspace creation
  const handleCreateWorkspace = (name: string) => {
    createWorkspaceMutation(name)
  }

  // Handle workspace update
  const handleUpdateWorkspace = (id: string, name: string) => {
    // Check if user has permission to update the workspace
    const workspace = workspaces.find((w: WorkspaceDTO) => w.id === id)
    if (!workspace || workspace.role !== 'owner') {
      return
    }

    updateWorkspaceMutation({ id, name })
  }

  // Handle workspace deletion
  const handleDeleteWorkspace = (id: string) => {
    // Check if user has permission to delete the workspace
    const workspace = workspaces.find((w: WorkspaceDTO) => w.id === id)
    if (!workspace || workspace.role !== 'owner') {
      return
    }

    deleteWorkspaceMutation(id)
  }

  // Open edit modal for a workspace
  const openEditModal = (workspace: WorkspaceDTO, e: React.MouseEvent) => {
    e.stopPropagation()
    // Check if user has permission to edit the workspace
    if (workspace.role !== 'owner') {
      return
    }
    setEditingWorkspace(workspace)
    setIsEditModalOpen(true)
  }

  return (
    <SidebarGroup>
      <SidebarGroupLabel className='flex w-full items-center justify-between'>
        <span>Workspaces</span>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size='xxs'
              variant='ghost'
              onClick={() => setIsWorkspaceModalOpen(true)}
              aria-label='Create new workspace'
            >
              <Plus className='h-4 w-4' />
            </Button>
          </TooltipTrigger>
          <TooltipContent side='right'>Create new workspace</TooltipContent>
        </Tooltip>
      </SidebarGroupLabel>
      <SidebarMenu>
        {workspaces.length === 0 ? (
          <Skeleton className='h-6 w-24' />
        ) : (
          workspaces.map((workspace: WorkspaceDTO, index: number) => (
            <Collapsible
              key={workspace.name}
              asChild
              defaultOpen={index === 0}
              className='group/collapsible'
            >
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton tooltip={workspace.name}>
                    <div
                      style={{ backgroundColor: workspace.color }}
                      className='inline-flex size-3 shrink-0 items-center justify-center rounded'
                    />
                    <span className='text-sm'>{workspace.name}</span>
                    <span className='w-3 shrink-0'>
                      <ChevronRight className='w-full transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90' />
                    </span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <SidebarMenuAction asChild showOnHover>
                          <div>
                            <MoreHorizontal />
                            <span className='sr-only'>More</span>
                          </div>
                        </SidebarMenuAction>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className='w-48 rounded-lg' side='right' align='start'>
                        <DropdownMenuItem>
                          <Settings className='size-4' />
                          <span>Team settings</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <LinkIcon className='size-4' />
                          <span>Copy link</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Archive className='size-4' />
                          <span>Open archive</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {/* <DropdownMenuItem>
                          <Bell className="size-4" />
                          <span>Subscribe</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator /> */}
                        {/* <DropdownMenuItem>
                          <span>Leave workspace...</span>
                        </DropdownMenuItem> */}
                        {workspace.role === 'owner' && (
                          <>
                            <DropdownMenuItem onClick={(e) => openEditModal(workspace, e)}>
                              <PencilIcon className='size-4' />
                              <span>Edit workspace</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation()
                                setWorkspaceToDelete(workspace)
                                setIsDeleteDialogOpen(true)
                              }}
                            >
                              <Trash2 className='size-4' />
                              <span>Delete workspace</span>
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton asChild>
                        <Link href={`/workspace/${workspace.id}/knowledge`}>
                          <div className='flex items-center gap-2'>
                            <LibraryBigIcon size={14} />
                            <span>Knowledge</span>
                          </div>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton asChild>
                        <Link href={`/workspace/${workspace.id}/tasks`}>
                          <div className='flex items-center gap-2'>
                            <ListTodoIcon size={14} />
                            <span>Tasks</span>
                          </div>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    {/* <SidebarMenuSubItem>
                      <SidebarMenuSubButton asChild>
                        <Link href={`/workspace/${workspace.id}/projects`}>
                          <div className='flex items-center gap-2'>
                            <Box size={14} />
                            <span>Projects</span>
                          </div>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem> */}
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton asChild>
                        <Link href={`/workspace/${workspace.id}/workers`}>
                          <div className='flex items-center gap-2'>
                            <UsersIcon size={14} />
                            <span>Workers</span>
                          </div>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          ))
        )}
      </SidebarMenu>
      {/* Workspace Edit Modal */}
      <WorkspaceEditModal
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        onUpdateWorkspace={handleUpdateWorkspace}
        workspace={editingWorkspace}
      />
      {/* Workspace Create Modal */}
      <WorkspaceModal
        open={isWorkspaceModalOpen}
        onOpenChange={setIsWorkspaceModalOpen}
        onCreateWorkspace={handleCreateWorkspace}
      />
      {/* Delete Workspace Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Workspace</AlertDialogTitle>
            <AlertDialogDescription>
              {workspaceToDelete && (
                <>
                  Are you sure you want to delete "{workspaceToDelete.name}"? This action cannot be
                  undone.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (workspaceToDelete) {
                  handleDeleteWorkspace(workspaceToDelete.id)
                }
                setIsDeleteDialogOpen(false)
              }}
              className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarGroup>
  )
}
