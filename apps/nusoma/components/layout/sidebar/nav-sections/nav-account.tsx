'use client'

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@nusoma/design-system/components/ui/sidebar'
import {
  Building,
  CreditCard,
  FolderKanban,
  Inbox,
  KeyRound,
  Settings,
  UserRound,
  Variable,
} from 'lucide-react'
import Link from 'next/link'

export const inboxItems = [
  {
    name: 'Inbox',
    url: '#',
    icon: Inbox,
  },
  {
    name: 'My issues',
    url: '#',
    icon: FolderKanban,
  },
]

export const accountItems = [
  {
    name: 'Account',
    url: '/settings/account',
    icon: UserRound,
  },
  {
    name: 'Preferences',
    url: '/settings/preferences',
    icon: Settings,
  },
  // {
  //   name: 'Profile',
  //   url: '/settings/profile',
  //   icon: UserRound,
  // },
  {
    name: 'Organizations',
    url: '/settings/team-management',
    icon: Building,
  },
  {
    name: 'Billing',
    url: '/settings/subscription',
    icon: CreditCard,
  },
  {
    name: 'Environment Variables',
    url: '/settings/environment',
    icon: Variable,
  },
  {
    name: 'Api Keys',
    url: '/settings/api-keys',
    icon: KeyRound,
  },
]

// export const featuresItems = [
//   {
//     name: 'Labels',
//     url: '/settings/labels',
//     icon: Tag,
//   },
//   {
//     name: 'Projects',
//     url: '/settings/projects',
//     icon: Box,
//   },
//   {
//     name: 'Initiatives',
//     url: '/settings/initiatives',
//     icon: Layers,
//   },
//   {
//     name: 'Customer requests',
//     url: '/settings/customer-requests',
//     icon: Inbox,
//   },
//   {
//     name: 'Templates',
//     url: '/settings/templates',
//     icon: FileText,
//   },
//   {
//     name: 'Asks',
//     url: '/settings/asks',
//     icon: MessageSquare,
//   },
//   {
//     name: 'SLAs',
//     url: '/settings/slas',
//     icon: Clock,
//   },
//   {
//     name: 'Emojis',
//     url: '/settings/emojis',
//     icon: MessageSquare,
//   },
//   {
//     name: 'Integrations',
//     url: '/settings/integrations',
//     icon: Zap,
//   },
// ]

export function NavAccount() {
  return (
    <SidebarGroup className='group-data-[collapsible=icon]:hidden'>
      <SidebarGroupLabel>Account</SidebarGroupLabel>
      <SidebarMenu>
        {accountItems.map((item) => (
          <SidebarMenuItem key={item.name}>
            <SidebarMenuButton asChild>
              <Link href={item.url}>
                <item.icon className='size-4' />
                <span>{item.name}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}
