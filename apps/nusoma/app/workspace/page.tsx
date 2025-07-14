'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'

// A simple fetcher function
const fetcher = (url: string) => fetch(url).then((res) => res.json())

// A simple loading spinner component
function LoadingSpinner() {
  return (
    <div
      className='inline-block h-8 w-8 animate-spin rounded-full border-4 border-current border-r-transparent border-solid align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]'
      role='status'
    >
      <span className='!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]'>
        Loading...
      </span>
    </div>
  )
}

// Assuming the workspace type is structured like this based on the API
interface Workspace {
  id: string
  name: string
  ownerId: string
  createdAt: string
  updatedAt: string
  role: string
}

interface WorkspacesResponse {
  workspaces: Workspace[]
}

export default function WorkspaceRedirectPage() {
  const router = useRouter()
  const { data, error, isLoading } = useSWR<WorkspacesResponse>('/api/workspaces', fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    shouldRetryOnError: false,
  })

  useEffect(() => {
    if (data?.workspaces && data.workspaces.length > 0) {
      const firstWorkspace = data.workspaces[0]
      router.replace(`/workspace/${firstWorkspace.id}`)
    }
  }, [data, router])

  if (isLoading) {
    return (
      <div className='flex h-screen items-center justify-center'>
        <LoadingSpinner />
      </div>
    )
  }

  if (error) {
    return (
      <div className='flex h-screen items-center justify-center'>
        <p>Error loading workspace. Please try again later.</p>
      </div>
    )
  }

  // Fallback view while redirecting
  return (
    <div className='flex h-screen items-center justify-center'>
      <LoadingSpinner />
      <p className='ml-4'>Setting up your workspace...</p>
    </div>
  )
}
