'use client'

import type { Workspace } from '@nusoma/database/schema'
import { Button } from '@nusoma/design-system/components/ui/button'
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@nusoma/design-system/components/ui/sidebar'
import { useQuery } from '@tanstack/react-query'
import { PlusIcon } from 'lucide-react'
import Link from 'next/link'
import { useSession } from '@/lib/auth-client'

export function NavWorkspacesSettings() {
  const { data: sessionData } = useSession()

  // Query for fetching workspaces
  const { data: workspacesData, isPending: isWorkspacesLoading } = useQuery({
    queryKey: ['workspaces'],
    queryFn: async () => {
      if (!sessionData?.user?.id) {
        return { workspaces: [] }
      }
      const res = await fetch('/api/workspaces')
      if (!res.ok) {
        throw new Error('Failed to fetch workspaces')
      }
      return res.json()
    },
    enabled: !!sessionData?.user?.id,
  })

  const workspaces = workspacesData?.workspaces || []

  //const joinedTeams = workspaces.filter((workspace: Workspace) => workspace.joined)
  return (
    <SidebarGroup>
      <SidebarGroupLabel>Your workspaces</SidebarGroupLabel>
      <SidebarMenu>
        {workspaces.map((workspace: Workspace) => (
          <SidebarMenuItem key={workspace.id}>
            <SidebarMenuButton asChild>
              <Link href={`/settings/workspaces/${workspace.id}`}>
                <div className='inline-flex size-6 shrink-0 items-center justify-center rounded bg-muted/50'>
                  <div className='text-sm'>{workspace.icon}</div>
                </div>
                <span>{workspace.name}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
        <SidebarMenuItem>
          <SidebarMenuButton asChild>
            <Button variant='ghost' className='w-full justify-start gap-2 px-2' asChild>
              <Link href='#'>
                <PlusIcon className='size-4' />
                <span>Join or create a workspace</span>
              </Link>
            </Button>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroup>
  )
}
