'use client'

import type * as React from 'react'
import { AuthUIProvider } from '@daveyplate/better-auth-ui'
import NiceModal from '@ebay/nice-modal-react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { NuqsAdapter } from 'nuqs/adapters/next/app'
import { client as authClient } from '@/lib/auth-client'
import { NotificationList } from '../../[workspaceId]/workers/[workerId]/components/notifications/notifications'

export default function Providers({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutes
        retry: 1,
      },
    },
  })

  return (
    <>
      <NuqsAdapter>
        <QueryClientProvider client={queryClient}>
          <AuthUIProvider
            authClient={authClient}
            navigate={router.push}
            replace={router.replace}
            settingsURL='/settings/account'
            onSessionChange={() => {
              router.refresh()
            }}
            Link={Link}
          >
            <NiceModal.Provider>{children}</NiceModal.Provider>
          </AuthUIProvider>
          <SpeedInsights />
          <Analytics />
          <ReactQueryDevtools initialIsOpen={false} />
        </QueryClientProvider>
      </NuqsAdapter>
      <NotificationList />
    </>
  )
}
