'use client'

import type * as React from 'react'
import { Button } from '@nusoma/design-system/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@nusoma/design-system/components/ui/dropdown-menu'
import { EmptyText } from '@nusoma/design-system/components/ui/empty-text'
import {
  Page,
  PageActions,
  PageBody,
  PageHeader,
  PagePrimaryBar,
  PageTitle,
} from '@nusoma/design-system/components/ui/page'
import { toast } from '@nusoma/design-system/components/ui/sonner'
import { MoreHorizontalIcon } from 'lucide-react'
import type { Metadata } from 'next'
import { createTitle } from '@/lib/formatters'
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard'

function getLastPartOfUrl(url: string): string {
  const parts = url.split('/')
  return parts.at(-1) ?? ''
}

export const metadata: Metadata = {
  title: createTitle('Task not found'),
}

export default function TaskNotFoundPage(): React.JSX.Element {
  const copyToClipboard = useCopyToClipboard()
  const handleCopyTaskId = async (): Promise<void> => {
    await copyToClipboard(getLastPartOfUrl(window.location.href))
    toast.success('Copied!')
  }
  const handleCopyPageUrl = async (): Promise<void> => {
    await copyToClipboard(window.location.href)
    toast.success('Copied!')
  }
  return (
    <Page>
      <PageHeader>
        <PagePrimaryBar>
          <PageTitle>Task not found</PageTitle>
          <PageActions>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type='button' variant='ghost' className='size-9' title='Open menu'>
                  <MoreHorizontalIcon className='size-4 shrink-0' />
                  <span className='sr-only'>Open menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align='end'>
                <DropdownMenuItem className='cursor-pointer' onClick={handleCopyTaskId}>
                  Copy task ID
                </DropdownMenuItem>
                <DropdownMenuItem className='cursor-pointer' onClick={handleCopyPageUrl}>
                  Copy page URL
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </PageActions>
        </PagePrimaryBar>
      </PageHeader>
      <PageBody>
        <EmptyText className='p-6'>Task was not found.</EmptyText>
      </PageBody>
    </Page>
  )
}
