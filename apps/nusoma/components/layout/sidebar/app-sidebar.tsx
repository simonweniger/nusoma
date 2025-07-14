'use client'

import type * as React from 'react'
import type { Sidebar } from '@nusoma/design-system/components/ui/sidebar'
import { useFavorites } from '@/hooks/use-favorites-api'
import { AppSidebarClient } from './app-sidebar-client'

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { data: favorites = [] } = useFavorites()

  return <AppSidebarClient favorites={favorites} {...props} />
}
