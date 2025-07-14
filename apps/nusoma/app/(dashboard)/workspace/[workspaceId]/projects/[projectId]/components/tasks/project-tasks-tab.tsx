import type * as React from 'react'
import type { ProjectDto } from '@nusoma/types/dtos/project-dto'
import { getProjectTasks } from '@/data/projects/get-project-tasks'
import { EnhancedProjectTasks } from './enhanced-project-tasks'

export type ProjectTasksTabProps = {
  project: ProjectDto
}

export async function ProjectTasksTab({
  project,
}: ProjectTasksTabProps): Promise<React.JSX.Element> {
  const tasks = await getProjectTasks({ projectId: project.id })
  return <EnhancedProjectTasks project={project} initialTasks={tasks} />
}
