'use client'

import type * as React from 'react'
import NiceModal from '@ebay/nice-modal-react'
import { Button } from '@nusoma/design-system/components/ui/button'
import { EmptyText } from '@nusoma/design-system/components/ui/empty-text'
import { ResponsiveScrollArea } from '@nusoma/design-system/components/ui/scroll-area'
import type { ProjectDto } from '@nusoma/types/dtos/project-dto'
import type { ProjectNoteDto } from '@nusoma/types/dtos/project-note-dto'
import { FilePlus2Icon } from 'lucide-react'
import { MediaQueries } from '@/lib/media-queries'
import { AddProjectNoteModal } from './add-project-note-modal'
import { ProjectNoteCard } from './project-note-card'

export type ProjectNotesProps = {
  project: ProjectDto
  notes: ProjectNoteDto[]
}

export function ProjectNotes({ project, notes }: ProjectNotesProps): React.JSX.Element {
  const handleShowAddProjectNoteModal = async (): Promise<void> => {
    NiceModal.show(AddProjectNoteModal, { projectId: project.id })
  }
  return (
    <ResponsiveScrollArea
      breakpoint={MediaQueries.MdUp}
      mediaQueryOptions={{ ssr: true }}
      className='h-full'
    >
      <div className='flex h-14 flex-row items-center justify-between gap-2 px-6'>
        <h1 className='font-semibold text-sm'>
          All notes <span className='text-muted-foreground'>({notes.length})</span>
        </h1>
        <Button
          type='button'
          variant='outline'
          size='default'
          onClick={handleShowAddProjectNoteModal}
        >
          <FilePlus2Icon className='mr-2 size-4 shrink-0' />
          Add note
        </Button>
      </div>
      <div className='h-full p-6 pt-0'>
        {notes.length > 0 ? (
          <div className='grid size-full grid-cols-1 gap-12 sm:grid-cols-2 2xl:grid-cols-3'>
            {notes.map((note) => (
              <ProjectNoteCard key={note.id + note.createdAt} note={note} />
            ))}
          </div>
        ) : (
          <EmptyText>There are no associated notes with this project.</EmptyText>
        )}
      </div>
    </ResponsiveScrollArea>
  )
}
