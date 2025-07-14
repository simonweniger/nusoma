import type { ReactNode } from 'react'
import { SidebarProvider } from '@nusoma/design-system/components/ui/sidebar'
import { AppSidebar } from '@/components/layout/sidebar/app-sidebar'

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar variant='inset' />
      <div className='h-svh w-full overflow-hidden bg-sidebar lg:p-2'>
        <div className='flex h-full w-full flex-col items-center justify-start overflow-hidden rounded-lg border-border/80 bg-background shadow-elevation-low lg:rounded-lg lg:border'>
          {children}
        </div>
      </div>
    </SidebarProvider>
  )
}
