'use client'

import { SettingsIcon } from '@nusoma/design-system/components/icons'
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@nusoma/design-system/components/ui/sidebar'
import { ActivityIcon, Inbox } from 'lucide-react'
import Link from 'next/link'

export function NavGlobal() {
  const globalNavItems = [
    {
      name: 'Inbox',
      url: '/inbox',
      icon: Inbox,
      disabled: true,
    },
    // {
    //   name: 'Marketplace',
    //   url: '#',
    //   icon: StoreIcon,
    // },
    {
      name: 'Monitoring',
      url: '/logs',
      icon: ActivityIcon,
      disabled: false,
    },
    {
      name: 'Settings',
      url: '/settings',
      icon: SettingsIcon,
      disabled: false,
    },
  ]
  return (
    <SidebarGroup className='group-data-[collapsible=icon]:hidden'>
      <SidebarMenu>
        {globalNavItems.map((item) => (
          <SidebarMenuItem key={item.name}>
            <SidebarMenuButton asChild>
              <Link
                href={item.url}
                className={item.disabled ? 'pointer-events-none opacity-50' : ''}
              >
                <item.icon />
                <span>{item.name}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}
