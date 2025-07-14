'use client'

import { useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@nusoma/design-system/components/ui/dialog'
import { HelpForm } from './components/help-form/help-form'

interface HelpModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function HelpModal({ open, onOpenChange }: HelpModalProps) {
  // Listen for the custom event to open the help modal
  useEffect(() => {
    const handleOpenHelp = (_event: CustomEvent) => {
      onOpenChange(true)
    }

    // Add event listener
    window.addEventListener('open-help', handleOpenHelp as EventListener)

    // Clean up
    return () => {
      window.removeEventListener('open-help', handleOpenHelp as EventListener)
    }
  }, [onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='flex h-[80vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-[700px]'>
        <DialogHeader className='flex-shrink-0 border-b px-6 py-4'>
          <DialogTitle className='font-medium text-lg'>Help & Support</DialogTitle>
        </DialogHeader>

        <div className='flex flex-1 flex-col overflow-hidden'>
          <HelpForm onClose={() => onOpenChange(false)} />
        </div>
      </DialogContent>
    </Dialog>
  )
}
