'use client'

import { parseMarkdownToTiptapJSON } from '@nusoma/editor'
import { AdvancedEditor } from './advanced-editor'

interface EditorProps {
  initialContent?: string | null
  taskData?: {
    title: string
    description: string | null | undefined
    status: any
    rawResult: any
  }
}

export function Editor({ initialContent, taskData }: EditorProps) {
  // Convert markdown initial content to Tiptap JSON if provided
  const initialTiptapContent = initialContent
    ? parseMarkdownToTiptapJSON(initialContent)
    : { type: 'doc', content: [] }

  return (
    <div className='relative mx-auto flex max-w-3xl flex-col rounded-xl bg-muted'>
      <div className='flex w-full flex-none items-center justify-between p-4 pr-2'>
        <h2 className='font-semibold text-lg'>
          {taskData?.title ? `Task Report: ${taskData.title}` : 'Task Report'}
        </h2>
      </div>
      <div className='flex-1 overflow-y-scroll p-2 pt-0'>
        <div className='relative mx-auto min-h-[600px] w-full max-w-[800px] rounded-xl border border-border bg-background'>
          <AdvancedEditor initialContent={initialTiptapContent} />
        </div>
      </div>
    </div>
  )
}
