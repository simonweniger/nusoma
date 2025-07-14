'use client'

import { useEffect, useState } from 'react'
import { Button } from '@nusoma/design-system/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@nusoma/design-system/components/ui/tabs'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@nusoma/design-system/components/ui/tooltip'
import { Activity, Eraser, ListTree, MessageCircleIcon, PanelRight } from 'lucide-react'
import { useChatStore } from '@/stores/panel/chat/store'
import { useConsoleStore } from '@/stores/panel/console/store'
import { usePanelStore } from '@/stores/panel/store'
import type { PanelTab } from '@/stores/panel/types'
import { useWorkerRegistry } from '@/stores/workers/registry/store'
import { ConfigTab } from './components/config-tab/config-tab'
import { Console } from './components/console/console'
import { Variables } from './components/variables/variables'
import { ChatModal } from './components/worker-test/components/chat-modal/chat-modal'
import { Chat } from './components/worker-test/test'

export function Panel() {
  const [isDragging, setIsDragging] = useState(false)
  const [width, setWidth] = useState(420)
  const [chatMessage, setChatMessage] = useState<string>('')
  const [isChatModalOpen, setIsChatModalOpen] = useState(false)

  const isOpen = usePanelStore((state) => state.isOpen)
  const togglePanel = usePanelStore((state) => state.togglePanel)
  const activeTab = usePanelStore((state) => state.activeTab)
  const setActiveTab = usePanelStore((state) => state.setActiveTab)
  const selectedBlockId = usePanelStore((state) => state.selectedBlockId)
  const setSelectedBlockId = usePanelStore((state) => state.setSelectedBlockId)

  const clearConsole = useConsoleStore((state) => state.clearConsole)
  const clearChat = useChatStore((state) => state.clearChat)
  const { activeWorkerId } = useWorkerRegistry()

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    e.preventDefault()
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const newWidth = window.innerWidth - e.clientX
        setWidth(Math.max(336, Math.min(newWidth, window.innerWidth * 0.8)))
      }
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging])

  // Auto-switch to config tab when a block is selected
  // useEffect(() => {
  //   if (selectedBlockId && activeTab !== 'config') {
  //     setActiveTab('config')
  //   }
  // }, [selectedBlockId, activeTab, setActiveTab])

  if (!isOpen) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type='button'
            onClick={togglePanel}
            className='fixed right-2 bottom-[24px] z-10 flex h-9 w-9 items-center justify-center rounded-l-lg border bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground'
          >
            <PanelRight className='h-4 w-5' />
            <span className='sr-only'>Open Panel</span>
          </button>
        </TooltipTrigger>
        <TooltipContent side='top'>Open Panel</TooltipContent>
      </Tooltip>
    )
  }

  // Otherwise, show the normal tabs
  return (
    <>
      <div
        className='fixed top-18 right-2 bottom-2 z-10 flex flex-col rounded-tl-lg rounded-br-lg border border-border bg-card shadow-lg'
        style={{ width: `${width}px` }}
      >
        <div
          className='absolute top-0 bottom-0 left-[-4px] z-50 w-4 cursor-ew-resize hover:bg-accent/50'
          onMouseDown={handleMouseDown}
        />
        {selectedBlockId ? (
          <div className='flex-1 overflow-y-auto'>
            <ConfigTab />
          </div>
        ) : (
          <>
            {/* Panel Header */}
            <Tabs
              value={activeTab}
              onValueChange={(value: string) => setActiveTab(value as PanelTab)}
              className='flex min-h-0 flex-1 flex-col'
            >
              <TabsList className='relative flex h-auto w-full items-center justify-between overflow-hidden bg-transparent pt-6 pb-0 before:absolute before:inset-x-0 before:bottom-0 before:h-px before:bg-border'>
                <div className='inline-flex items-center gap-1 pl-6'>
                  <TabsTrigger
                    value='test'
                    className='data-[state=active]:-mb-px overflow-hidden rounded-b-none border-x border-t bg-muted py-2 transition-all ease-in-out data-[state=active]:z-10 data-[state=active]:scale-105 data-[state=active]:border-b-card data-[state=active]:bg-card data-[state=active]:shadow-elevation-medium'
                  >
                    <MessageCircleIcon
                      className='-ms-0.5 me-1.5 opacity-60'
                      size={16}
                      aria-hidden='true'
                    />
                    Test
                  </TabsTrigger>
                  <TabsTrigger
                    value='monitor'
                    className='data-[state=active]:-mb-px overflow-hidden rounded-b-none border-x border-t bg-muted py-2 transition-all ease-in-out data-[state=active]:z-10 data-[state=active]:scale-105 data-[state=active]:border-b-card data-[state=active]:bg-card data-[state=active]:shadow-elevation-medium '
                  >
                    <Activity className='-ms-0.5 me-1.5 opacity-60' size={16} aria-hidden='true' />
                    Monitor
                  </TabsTrigger>
                  <TabsTrigger
                    value='variables'
                    className='data-[state=active]:-mb-px overflow-hidden rounded-b-none border-x border-t bg-muted py-2 transition-all ease-in-out data-[state=active]:z-10 data-[state=active]:scale-105 data-[state=active]:border-b-card data-[state=active]:bg-card data-[state=active]:shadow-elevation-medium'
                  >
                    <ListTree className='-ms-0.5 me-1.5 opacity-60' size={16} aria-hidden='true' />
                    Variables
                  </TabsTrigger>
                </div>

                <div className='mr-2 flex items-center'>
                  {(activeTab === 'monitor' || activeTab === 'test') && (
                    <Button
                      variant='ghost'
                      size='icon'
                      onClick={() =>
                        activeTab === 'monitor'
                          ? clearConsole(activeWorkerId)
                          : clearChat(activeWorkerId)
                      }
                      className='flex-shrink-0 text-muted-foreground hover:text-foreground'
                    >
                      <Eraser className='h-4 w-4' />
                      <span className='sr-only'>Clear</span>
                    </Button>
                  )}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant='ghost' size='icon' onClick={togglePanel}>
                        <PanelRight className='h-5 w-5 transform' />
                        <span className='sr-only'>Close Panel</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side='right'>Close Panel</TooltipContent>
                  </Tooltip>
                </div>
              </TabsList>

              {/* Panel Content */}
              <TabsContent value='test' className='h-full overflow-hidden'>
                <Chat
                  panelWidth={width}
                  chatMessage={chatMessage}
                  setChatMessage={setChatMessage}
                />
              </TabsContent>
              <TabsContent value='monitor' className='h-full overflow-hidden'>
                <Console panelWidth={width} />
              </TabsContent>
              <TabsContent value='variables' className='h-full overflow-hidden'>
                <Variables panelWidth={width} />
              </TabsContent>
            </Tabs>
          </>
        )}
        {/* Panel Footer */}
        {/* <div className='flex h-12 flex-none items-center justify-between border-t px-4'>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant='ghost' size='icon' onClick={togglePanel}>
                <PanelRight className='h-5 w-5 rotate-180 transform' />
                <span className='sr-only'>Close Panel</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side='right'>Close Panel</TooltipContent>
          </Tooltip>

           {activeTab === 'test' && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant='ghost' size='icon' onClick={() => setIsChatModalOpen(true)}>
                  <Expand className='h-5 w-5' />
                  <span className='sr-only'>Expand Chat</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side='left'>Expand Chat</TooltipContent>
            </Tooltip>
          )} 
        </div> */}
      </div>

      {/* Fullscreen Chat Modal */}
      <ChatModal
        open={isChatModalOpen}
        onOpenChange={setIsChatModalOpen}
        chatMessage={chatMessage}
        setChatMessage={setChatMessage}
      />
    </>
  )
}
