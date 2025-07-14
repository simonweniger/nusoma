'use client'

import { useParams } from 'next/navigation'
import { AdvancedEditor } from '@/components/text-editor/advanced-editor'

function WorkspaceEditor({ id, workspaceId }: { id: string; workspaceId: string }) {
  return (
    <div className='absolute inset-0 flex flex-col bg-border/30'>
      {/* <div className='top-0 right-0 left-0 z-10 flex flex-none items-start justify-between border-border border-b bg-background p-1.5'>
            <Avatars /> add active users here
        </div> */}
      <div className='flex-1 overflow-y-scroll'>
        <div className='ml-0 h-auto min-h-0 px-4 xl:ml-[-350px]'>
          <div className='relative mx-auto my-4 min-h-[1100px] w-full max-w-[800px] border border-border bg-background'>
            <AdvancedEditor />
          </div>
        </div>
      </div>
    </div>
  )
}

export default function WorkspaceEditorPage() {
  const params = useParams()
  const documentId = params.documentId as string
  // Note: workspaceId would need to come from a parent route or context
  // For now, using a placeholder
  const workspaceId = 'workspace-id' // This should be obtained from context or parent route

  return <WorkspaceEditor id={documentId} workspaceId={workspaceId} />
}
