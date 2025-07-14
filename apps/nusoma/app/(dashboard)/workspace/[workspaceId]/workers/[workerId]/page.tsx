'use client'

import { ReactFlowProvider } from '@xyflow/react'
import { useParams } from 'next/navigation'
import { ErrorBoundary } from './components/error/index'
import WorkerCanvas from './worker-canvas'

export default function WorkerPage() {
  const params = useParams()
  const workerId = params.workerId as string
  const workspaceId = params.workspaceId as string

  return (
    <ReactFlowProvider>
      <ErrorBoundary>
        <WorkerCanvas workerId={workerId} workspaceId={workspaceId} />
      </ErrorBoundary>
    </ReactFlowProvider>
  )
}
