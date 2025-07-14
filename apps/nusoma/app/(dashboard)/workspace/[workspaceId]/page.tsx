'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

export default function WorkspacePage() {
  const router = useRouter()
  const params = useParams()

  useEffect(() => {
    if (params.workspaceId) {
      router.replace(`/workspace/${params.workspaceId}/tasks`)
    }
  }, [params.workspaceId, router])

  return null
}
