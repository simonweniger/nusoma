'use client'

import { useState } from 'react'
import { Button } from '@nusoma/design-system/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@nusoma/design-system/components/ui/dropdown-menu'
import {
  Book,
  ExternalLink,
  HelpCircle,
  Keyboard,
  Mail,
  MessageSquare,
  PhoneCall,
} from 'lucide-react'
import Link from 'next/link'
import { HelpModal } from '@/app/(dashboard)/workspace/components/sidebar/components/help-modal/help-modal'

export function HelpButton() {
  const [showHelp, setShowHelp] = useState(false)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size='icon' variant='ghost' className='h-8 w-8 shrink-0'>
            <HelpCircle className='size-4' />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end' className='w-60'>
          {/* <div className="p-2">
          <div className="relative">
            <Search className="absolute top-2.5 left-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search for help..."
              className="pl-8"
            />
          </div>
        </div> 
        <DropdownMenuSeparator />
        */}
          <DropdownMenuLabel>Help</DropdownMenuLabel>
          <DropdownMenuItem>
            <Book className='mr-2 h-4 w-4' />
            <span>Documentation</span>
            <ExternalLink className='ml-auto h-3 w-3 text-muted-foreground' />
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Keyboard className='mr-2 h-4 w-4' />
            <span>Keyboard shortcuts</span>
            <span className='ml-auto text-muted-foreground text-xs'>⌘/</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Support</DropdownMenuLabel>
          <DropdownMenuItem asChild>
            <Link href='tel:+4915732552552' target='_blank'>
              <PhoneCall className='mr-2 h-4 w-4' />
              <span>AI Phone Support</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setShowHelp(true)}>
            <Mail className='mr-2 h-4 w-4' />
            <span>Email Us</span>
            {/* <ExternalLink className="ml-auto h-3 w-3 text-muted-foreground" /> */}
          </DropdownMenuItem>
          <DropdownMenuItem>
            <MessageSquare className='mr-2 h-4 w-4' />
            <span>Chat Support</span>
            {/* <ExternalLink className="ml-auto h-3 w-3 text-muted-foreground" /> */}
          </DropdownMenuItem>
          {/* <DropdownMenuItem asChild>
          <Link href="https://threads.net/@ln_dev7" target="_blank">
            <ThreadsIcon className="mr-2 h-4 w-4" />
            <span>Threads</span>
            <ExternalLink className="ml-auto h-3 w-3 text-muted-foreground" />
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="https://linkedin.com/in/lndev" target="_blank">
            <LinkedinIcon className="mr-2 h-4 w-4" />
            <span>LinkedIn</span>
            <ExternalLink className="ml-auto h-3 w-3 text-muted-foreground" />
          </Link>
        </DropdownMenuItem> */}
          <DropdownMenuSeparator />
          <DropdownMenuLabel>What&apos;s new</DropdownMenuLabel>
          <DropdownMenuItem asChild>
            <Link href='https://ui.lndev.me' target='_blank' className='flex items-center'>
              <div className='mr-2 flex h-4 w-4 items-center justify-center'>
                <div className='h-1.5 w-1.5 rounded-full bg-blue-500' />
              </div>
              <span>Launch lndev-ui</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href='#' target='_blank' className='flex items-center'>
              <div className='mr-2 flex h-4 w-4 items-center justify-center'>
                <div className='h-1.5 w-1.5 rounded-full bg-blue-500' />
              </div>
              <span>Changelock</span>
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <HelpModal open={showHelp} onOpenChange={setShowHelp} />
    </>
  )
}
