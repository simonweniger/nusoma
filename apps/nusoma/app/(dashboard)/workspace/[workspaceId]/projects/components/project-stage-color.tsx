import { ProjectStage } from '@nusoma/database/schema'

export const projectStageColor: Record<ProjectStage, string> = {
  [ProjectStage.TODO]: 'bg-yellow-600 ring-1 ring-yellow-100 dark:ring-yellow-900',
  [ProjectStage.COMPLETED]: 'bg-green-600 ring-1 ring-green-100 dark:ring-green-900',
  [ProjectStage.CANCELLED]: 'bg-red-600 ring-1 ring-red-100 dark:ring-red-900',
  [ProjectStage.IN_PROGRESS]: 'bg-primary ring-1 ring-primary/10 dark:ring-primary/20',
  [ProjectStage.IN_REVIEW]: 'bg-orange-600 ring-1 ring-orange-100 dark:ring-orange-900',
}
