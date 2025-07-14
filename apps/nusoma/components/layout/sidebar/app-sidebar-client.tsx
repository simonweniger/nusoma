'use client'

import type * as React from 'react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from '@nusoma/design-system/components/ui/sidebar'
import type { FavoriteDto } from '@nusoma/types/dtos/favorite-dto'
import type { WorkspaceDTO } from '@nusoma/types/workspace'
import { useQuery } from '@tanstack/react-query'
import { usePathname } from 'next/navigation'
import { BackToApp } from '@/components/layout/sidebar/back-to-app'
import { HelpButton } from '@/components/layout/sidebar/help-button'
import { NavAccount } from '@/components/layout/sidebar/nav-sections/nav-account'
import { NavGlobal } from '@/components/layout/sidebar/nav-sections/nav-global'
//import { useSession } from '@/lib/auth-client'
import { useGlobalShortcuts } from '@/app/(dashboard)/workspace/hooks/use-keyboard-shortcuts'
import { useRegistryLoading } from '@/app/(dashboard)/workspace/hooks/use-registry-loading'
import { ThemeToggle } from '../../../../../packages/design-system/components/theme-toggle'
import { NavWorkspaces } from './nav-sections/nav-workspaces'
import { OrgSwitcher } from './org-switcher'

interface AppSidebarClientProps extends React.ComponentProps<typeof Sidebar> {
  favorites: FavoriteDto[]
}

export function AppSidebarClient({ favorites, ...props }: AppSidebarClientProps) {
  const pathname = usePathname()
  const isSettings = pathname.includes('/settings')
  useRegistryLoading()
  // Initialize global keyboard shortcuts
  useGlobalShortcuts()

  //const { isPending: sessionLoading } = useSession()
  const { data: workspacesData, isPending: isWorkspacesLoading } = useQuery<{
    workspaces: WorkspaceDTO[]
  }>({
    queryKey: ['workspaces'],
    queryFn: async () => {
      const res = await fetch('/api/workspaces')
      if (!res.ok) {
        throw new Error('Failed to fetch workspaces')
      }
      return res.json()
    },
  })
  const workspaces = workspacesData?.workspaces || []

  return (
    <>
      <Sidebar collapsible='offcanvas' {...props}>
        <SidebarHeader>{isSettings ? <BackToApp /> : <OrgSwitcher />}</SidebarHeader>
        <SidebarContent>
          {isSettings ? (
            <>
              <NavAccount />
              {/* <NavWorkspacesSettings /> */}
            </>
          ) : (
            <>
              <NavGlobal />
              {/* <NavFavorites favorites={favorites} /> */}
              <NavWorkspaces workspaces={workspaces} />
              {/* Push the bottom controls down when content is short */}
              <div className='flex-grow' />
            </>
          )}
          {/* <NavTeams /> */}
        </SidebarContent>
        <SidebarFooter>
          <div className='flex w-full flex-col gap-2'>
            <div className='flex w-full items-center justify-between'>
              <HelpButton />
              <ThemeToggle />
            </div>
          </div>
        </SidebarFooter>
      </Sidebar>
    </>
  )
}
