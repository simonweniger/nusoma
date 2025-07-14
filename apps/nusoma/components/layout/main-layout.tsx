// import { CreateTaskModalProvider } from '@/components/common/tasks/create-tasks-modal-provider'

import { SidebarProvider } from '@nusoma/design-system/components/ui/sidebar'
import { cn } from '@nusoma/design-system/lib/utils'
import { AppSidebar } from '@/components/layout/sidebar/app-sidebar'

interface MainLayoutProps {
  children: React.ReactNode
  header: React.ReactNode
  headersNumber?: 1 | 2
}

export default function MainLayout({ children, header, headersNumber = 2 }: MainLayoutProps) {
  const height = {
    1: 'h-[calc(100svh-40px)] lg:h-[calc(100svh-56px)]',
    2: 'h-[calc(100svh-80px)] lg:h-[calc(100svh-96px)]',
  }
  return (
    <SidebarProvider>
      {/* <CreateTaskModalProvider /> */}
      <AppSidebar />
      <div className='h-svh w-full overflow-hidden lg:p-2'>
        <div className='flex h-full w-full flex-col items-center justify-start overflow-hidden bg-container lg:rounded-md lg:border'>
          {header}
          <div className={cn('w-full overflow-auto', height[headersNumber as keyof typeof height])}>
            {children}
          </div>
        </div>
      </div>
    </SidebarProvider>
  )
}
