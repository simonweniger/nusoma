'use client'

import type * as React from 'react'
import NiceModal from '@ebay/nice-modal-react'
import { Avatar, AvatarFallback, AvatarImage } from '@nusoma/design-system/components/ui/avatar'
import { Button } from '@nusoma/design-system/components/ui/button'
import type { CardProps } from '@nusoma/design-system/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@nusoma/design-system/components/ui/dropdown-menu'
import { EmptyText } from '@nusoma/design-system/components/ui/empty-text'
import type { ProjectNoteDto } from '@nusoma/types/dtos/project-note-dto'
import { format } from 'date-fns'
import { ClockIcon, MoreHorizontalIcon } from 'lucide-react'
import { getInitials } from '@/lib/formatters'
import { convertMarkdownToHtml } from '@/lib/markdown'
import { DeleteProjectNoteModal } from './delete-project-note-modal'
import { EditProjectNoteModal } from './edit-project-note-modal'

type ProjectNoteCardProps = CardProps & {
  note: ProjectNoteDto
}

export function ProjectNoteCard({ note, ...others }: ProjectNoteCardProps): React.JSX.Element {
  const handleShowEditProjectNoteModal = (): void => {
    NiceModal.show(EditProjectNoteModal, { note })
  }
  const handleShowDeleteProjectNoteModal = (): void => {
    NiceModal.show(DeleteProjectNoteModal, { note })
  }
  return (
    <div
      {...others}
      className='flex h-[300px] flex-col overflow-hidden rounded-xl border border-border/60 bg-card'
    >
      {/* Header */}
      <div className='flex flex-shrink-0 flex-row items-center justify-between space-y-0 p-3'>
        <div className='flex flex-row items-center gap-2'>
          <Avatar className='relative size-6 flex-none rounded-full'>
            <AvatarImage src={note.sender.image} alt='avatar' />
            <AvatarFallback className='size-6 text-[10px]'>
              {getInitials(note.sender.name)}
            </AvatarFallback>
          </Avatar>
          <p className='text-sm'>{note.sender.name}</p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type='button' variant='ghost' className='size-9' title='Open menu'>
              <MoreHorizontalIcon className='size-4 shrink-0' />
              <span className='sr-only'>Open menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem className='cursor-pointer' onClick={handleShowEditProjectNoteModal}>
              Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className='!text-destructive cursor-pointer'
              onClick={handleShowDeleteProjectNoteModal}
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Separator */}
      <div className='border-border/10 border-t' />

      {/* Content - This should take all remaining space */}
      <div
        className='flex-1 cursor-pointer overflow-y-auto overflow-x-hidden p-6 transition-colors hover:bg-accent/50'
        onClick={handleShowEditProjectNoteModal}
      >
        {note.text ? (
          <div className='text-wrap break-all text-left text-sm [&_h1]:mb-5 [&_h1]:font-bold [&_h1]:text-[25px] [&_h2]:mb-5 [&_h2]:font-bold [&_h2]:text-xl [&_li]:mx-8 [&_li]:my-0 [&_ol]:mb-3 [&_p:last-child]:mb-0 [&_p]:relative [&_p]:m-0 [&_ul]:mb-3'>
            <div
              dangerouslySetInnerHTML={{
                __html: convertMarkdownToHtml(note.text),
              }}
            />
          </div>
        ) : (
          <EmptyText className='opacity-65'>Empty</EmptyText>
        )}
      </div>

      {/* Separator */}
      <div className='border-border/10 border-t' />

      {/* Footer */}
      <div className='flex h-12 flex-shrink-0 flex-row items-center justify-between px-6 py-0'>
        <div className='flex items-center space-x-1 text-muted-foreground text-sm'>
          <ClockIcon className='size-3 shrink-0' />
          <time>{format(note.createdAt, 'MMM dd, yyyy')}</time>
        </div>
      </div>
    </div>
  )
}
