'use client'

import { useState } from 'react'
import { Button } from '@nusoma/design-system/components/ui/button'
import { Command, CommandInput } from '@nusoma/design-system/components/ui/command'
import { ResponsiveScrollArea } from '@nusoma/design-system/components/ui/scroll-area'
import { useEditor } from '@nusoma/editor'
import { addAIHighlight } from '@nusoma/editor/extensions'
import { useCompletion } from 'ai/react'
import { ArrowUp, Sparkles } from 'lucide-react'
import Markdown from 'react-markdown'
import { toast } from 'sonner'
import { MediaQueries } from '../../../lib/media-queries'
import { CrazySpinner } from '../icons'
import AICompletionCommands from './ai-completion-command'
import AISelectorCommands from './ai-selector-commands'

//TODO: I think it makes more sense to create a custom Tiptap extension for this functionality https://tiptap.dev/docs/editor/ai/introduction

interface AISelectorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AISelector({ onOpenChange }: AISelectorProps) {
  const { editor } = useEditor()
  const [inputValue, setInputValue] = useState('')

  const { completion, complete, isLoading } = useCompletion({
    // id: "nusoma-editor",
    api: '/api/generate',
    onResponse: (response) => {
      if (response.status === 429) {
        toast.error('You have reached your request limit for the day.')
        return
      }
    },
    onError: (e) => {
      toast.error(e.message)
    },
  })

  const hasCompletion = completion.length > 0

  return (
    <Command className='w-[350px]'>
      {hasCompletion && (
        <div className='flex max-h-[400px]'>
          <ResponsiveScrollArea
            breakpoint={MediaQueries.MdUp}
            mediaQueryOptions={{ ssr: true }}
            className='h-full w-full'
          >
            <div className='prose dark:prose-invert prose-sm p-2 px-4'>
              <Markdown>{completion}</Markdown>
            </div>
          </ResponsiveScrollArea>
        </div>
      )}

      {isLoading && (
        <div className='flex h-12 w-full items-center px-4 font-medium text-primary text-sm'>
          <Sparkles className='mr-2 h-4 w-4 shrink-0 ' />
          AI is thinking
          <div className='mt-1 ml-2'>
            <CrazySpinner />
          </div>
        </div>
      )}
      {!isLoading && (
        <>
          <div className='relative'>
            <CommandInput
              value={inputValue}
              onValueChange={setInputValue}
              autoFocus
              placeholder={
                hasCompletion ? 'Tell AI what to do next' : 'Ask AI to edit or generate...'
              }
              onFocus={() => {
                if (!editor) {
                  return
                }

                addAIHighlight(editor)
              }}
            />
            <Button
              size='icon'
              className='-translate-y-1/2 absolute top-1/2 right-2 h-6 w-6 rounded-full bg-primary hover:bg-primary/90'
              onClick={() => {
                if (!editor) {
                  return
                }

                if (completion)
                  return complete(completion, {
                    body: { option: 'zap', command: inputValue },
                  }).then(() => setInputValue(''))

                const selection = editor.state.selection
                const text = editor.state.doc.textBetween(selection.from, selection.to, '\n', '\n')

                complete(text, {
                  body: { option: 'zap', command: inputValue },
                }).then(() => setInputValue(''))
              }}
            >
              <ArrowUp className='h-4 w-4' />
            </Button>
          </div>
          {hasCompletion ? (
            <AICompletionCommands
              onDiscard={() => {
                if (!editor) {
                  return
                }

                editor.chain().unsetHighlight().focus().run()
                onOpenChange(false)
              }}
              completion={completion}
            />
          ) : (
            <AISelectorCommands
              onSelect={(value, option) => complete(value, { body: { option } })}
            />
          )}
        </>
      )}
    </Command>
  )
}
