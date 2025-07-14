import type * as React from 'react'
import type { ProjectDto } from '@nusoma/types/dtos/project-dto'
import { getProjectNotes } from '@/data/projects/get-project-notes'
import { ProjectNotes } from './project-notes'

export type ProjectNotesTabProps = {
  project: ProjectDto
}

export async function ProjectNotesTab({
  project,
}: ProjectNotesTabProps): Promise<React.JSX.Element> {
  const notes = await getProjectNotes({ projectId: project.id })
  return <ProjectNotes project={project} notes={notes} />
}
