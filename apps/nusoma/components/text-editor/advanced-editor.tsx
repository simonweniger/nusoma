'use client'

import { useState } from 'react'
import { Separator } from '@nusoma/design-system/components/ui/separator'
import {
  EditorCommand,
  EditorCommandEmpty,
  EditorCommandItem,
  EditorCommandList,
  EditorContent,
  EditorRoot,
  type JSONContent,
} from '@nusoma/editor'
import { handleCommandNavigation, ImageResizer } from '@nusoma/editor/extensions'
import { handleImageDrop, handleImagePaste } from '@nusoma/editor/plugins'
import { defaultExtensions } from './extensions'
import GenerativeMenuSwitch from './generative/generative-menu-switch'
import { uploadFn } from './image-upload'
import { ColorSelector } from './selectors/color-selector'
import { LinkSelector } from './selectors/link-selector'
import { MathSelector } from './selectors/math-selector'
import { NodeSelector } from './selectors/node-selector'
import { TextButtons } from './selectors/text-buttons'
import { slashCommand, suggestionItems } from './slash-command'

interface AdvancedEditorProps {
  initialContent?: JSONContent
}

export const AdvancedEditor = ({ initialContent }: AdvancedEditorProps = {}) => {
  const extensions = [...defaultExtensions, slashCommand]
  //const [charsCount, setCharsCount] = useState()

  const [openNode, setOpenNode] = useState(false)
  const [openColor, setOpenColor] = useState(false)
  const [openLink, setOpenLink] = useState(false)
  const [openAI, setOpenAI] = useState(false)

  // Use provided initialContent or default to empty document
  const editorInitialContent = initialContent || { type: 'doc', content: [] }

  return (
    <div className='relative w-full max-w-screen-lg'>
      <EditorRoot>
        <EditorContent
          extensions={extensions}
          className='relative min-h-[500px] w-full p-24'
          initialContent={editorInitialContent}
          editorProps={{
            handleDOMEvents: {
              keydown: (_view, event) => handleCommandNavigation(event),
            },
            handlePaste: (view, event) => handleImagePaste(view, event, uploadFn),
            handleDrop: (view, event, _slice, moved) =>
              handleImageDrop(view, event, moved, uploadFn),
            attributes: {
              class:
                'prose dark:prose-invert prose-headings:font-title font-default focus:outline-none max-w-full',
            },
          }}
          slotAfter={<ImageResizer />}
          immediatelyRender={false}
        >
          <EditorCommand className='z-50 h-auto max-h-[330px] overflow-y-auto rounded-md border border-muted bg-background px-1 py-2 shadow-md transition-all'>
            <EditorCommandEmpty className='px-2 text-muted-foreground'>
              No results
            </EditorCommandEmpty>
            <EditorCommandList>
              {suggestionItems.map((item) => (
                <EditorCommandItem
                  value={item.title}
                  onCommand={(val: any) => {
                    if (!item?.command) {
                      return
                    }

                    item.command(val)
                  }}
                  className='flex w-full items-center space-x-2 rounded-md px-2 py-1 text-left text-sm hover:bg-accent aria-selected:bg-accent'
                  key={item.title}
                >
                  <div className='flex h-10 w-10 items-center justify-center rounded-md border border-muted bg-background'>
                    {item.icon}
                  </div>
                  <div>
                    <p className='font-medium'>{item.title}</p>
                    <p className='text-muted-foreground text-xs'>{item.description}</p>
                  </div>
                </EditorCommandItem>
              ))}
            </EditorCommandList>
          </EditorCommand>

          <GenerativeMenuSwitch open={openAI} onOpenChange={setOpenAI}>
            <Separator orientation='vertical' />
            <NodeSelector open={openNode} onOpenChange={setOpenNode} />
            <Separator orientation='vertical' />
            <LinkSelector open={openLink} onOpenChange={setOpenLink} />
            <Separator orientation='vertical' />
            <MathSelector />
            <Separator orientation='vertical' />
            <TextButtons />
            <Separator orientation='vertical' />
            <ColorSelector open={openColor} onOpenChange={setOpenColor} />
            <Separator orientation='vertical' />
          </GenerativeMenuSwitch>
        </EditorContent>
      </EditorRoot>
    </div>
  )
}
