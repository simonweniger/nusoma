import { TaskStatus } from '@nusoma/database/schema'
import {
  CancelledIcon,
  CompletedIcon,
  InProgressIcon,
  PausedIcon,
  TechnicalReviewIcon,
  ToDoIcon,
} from '@/lib/labels'

// Centralized status configuration with database enums and custom icons
export const statusConfig = {
  [TaskStatus.TODO]: {
    id: 'todo',
    name: 'To Do',
    color: '#f97316',
    icon: ToDoIcon,
  },
  [TaskStatus.IN_PROGRESS]: {
    id: 'in-progress',
    name: 'In Progress',
    color: '#facc15',
    icon: InProgressIcon,
  },
  [TaskStatus.WORK_COMPLETE]: {
    id: 'work-complete',
    name: 'Task Complete',
    color: '#22c55e',
    icon: TechnicalReviewIcon,
  },
  [TaskStatus.HUMAN_NEEDED]: {
    id: 'human-needed',
    name: 'Human Needed',
    color: '#0ea5e9',
    icon: PausedIcon,
  },
  [TaskStatus.REVIEWED]: {
    id: 'reviewed',
    name: 'Reviewed',
    color: '#8b5cf6',
    icon: CompletedIcon,
  },
  [TaskStatus.ERROR]: {
    id: 'error',
    name: 'Error',
    color: '#ef4444',
    icon: CancelledIcon,
  },
}

// Status order for UI display
export const statusOrder = [
  TaskStatus.TODO,
  TaskStatus.IN_PROGRESS,
  TaskStatus.WORK_COMPLETE,
  TaskStatus.HUMAN_NEEDED,
  TaskStatus.REVIEWED,
  TaskStatus.ERROR,
]

// Helper function to get status config
export const getStatusConfig = (status: TaskStatus) => statusConfig[status]

// Helper function to get all statuses
export const getAllStatuses = () => Object.values(TaskStatus)
