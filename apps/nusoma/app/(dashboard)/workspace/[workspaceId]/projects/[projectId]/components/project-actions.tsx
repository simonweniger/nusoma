import type * as React from 'react'
import type { ProjectDto } from '@nusoma/types/dtos/project-dto'
import { getProjectIsInFavorites } from '@/data/projects/get-project-is-in-favorites'
import { ProjectActionsDropdown } from './project-actions-dropdown'
import { ProjectFavoriteToggle } from './project-favorite-toggle'

export type ProjectActionsProps = React.HtmlHTMLAttributes<HTMLDivElement> & {
  project: ProjectDto
}

export async function ProjectActions({ project }: ProjectActionsProps): Promise<React.JSX.Element> {
  const addedToFavorites = await getProjectIsInFavorites({
    projectId: project.id,
  })

  return (
    <div className='flex flex-row items-center gap-2'>
      <ProjectFavoriteToggle project={project} addedToFavorites={addedToFavorites} />
      <ProjectActionsDropdown project={project} addedToFavorites={addedToFavorites} />
    </div>
  )
}
