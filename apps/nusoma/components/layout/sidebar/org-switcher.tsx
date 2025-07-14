'use client'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@nusoma/design-system/components/ui/dropdown-menu'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@nusoma/design-system/components/ui/sidebar'
import { ChevronsUpDown } from 'lucide-react'
import Link from 'next/link'

export function OrgSwitcher() {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <div className='flex w-full items-center gap-1 pt-2'>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size='lg'
                className='h-8 p-1 data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground'
              >
                <div className='flex aspect-square size-6 items-center justify-center rounded bg-blue-500 text-sidebar-primary-foreground'>
                  NU
                </div>
                <div className='grid flex-1 text-left text-sm leading-tight'>
                  <span className='truncate font-semibold'>nusoma-dev</span>
                </div>
                <ChevronsUpDown className='ml-auto' />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
          </div>
          <DropdownMenuContent
            className='w-[--radix-dropdown-menu-trigger-width] min-w-60 rounded-lg'
            side='bottom'
            align='end'
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <Link href='/settings'>
                  Settings
                  <DropdownMenuShortcut>G then S</DropdownMenuShortcut>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem>Invite and manage members</DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem>Download desktop app</DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Switch Workspace</DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent>
                  <DropdownMenuLabel>leonelngoya@gmail.com</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <div className='flex aspect-square size-6 items-center justify-center rounded bg-blue-500 text-sidebar-primary-foreground'>
                      NU
                    </div>
                    nusoma-dev
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>Create or join workspace</DropdownMenuItem>
                  <DropdownMenuItem>Add an account</DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
            <DropdownMenuItem>
              Log out
              <DropdownMenuShortcut>⌥⇧Q</DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
