import {
  Priority,
  ProjectStage,
  TaskStatus,
  WorkerRecord,
  WorkerStage,
} from '@nusoma/database/schema'

export interface PriorityLabel {
  id: string
  name: string
  icon: React.FC<React.SVGProps<SVGSVGElement>>
}

export const workerRecordLabel: Record<WorkerRecord, string> = {
  [WorkerRecord.SINGLE]: 'Single',
  [WorkerRecord.TEAM]: 'Team',
}

export const workerStageLabel: Record<WorkerStage, string> = {
  [WorkerStage.DRAFT]: 'Draft',
  [WorkerStage.PAUSED]: 'Paused',
  [WorkerStage.LIVE]: 'Live',
}

export const projectStageLabel: Record<ProjectStage, string> = {
  [ProjectStage.TODO]: 'Todo',
  [ProjectStage.IN_PROGRESS]: 'In progress',
  [ProjectStage.IN_REVIEW]: 'In review',
  [ProjectStage.COMPLETED]: 'Completed',
  [ProjectStage.CANCELLED]: 'Cancelled',
}

export const taskStatusLabel: Record<TaskStatus, string> = {
  [TaskStatus.TODO]: 'Todo',
  [TaskStatus.IN_PROGRESS]: 'In progress',
  [TaskStatus.WORK_COMPLETE]: 'Work complete',
  [TaskStatus.HUMAN_NEEDED]: 'Human needed',
  [TaskStatus.REVIEWED]: 'Reviewed',
  [TaskStatus.ERROR]: 'Error',
}

export const priorityLabel: Record<Priority, string> = {
  [Priority.LOW]: 'Low',
  [Priority.MEDIUM]: 'Medium',
  [Priority.HIGH]: 'High',
  [Priority.URGENT]: 'Urgent',
}

interface IconProps extends React.SVGProps<SVGSVGElement> {
  className?: string
}

const UrgentPriorityIcon = ({ className, ...props }: IconProps) => (
  <svg
    width='16'
    height='16'
    viewBox='0 0 16 16'
    fill='currentColor'
    className={className}
    aria-label='Urgent Priority'
    role='img'
    focusable='false'
    xmlns='http://www.w3.org/2000/svg'
    {...props}
  >
    <path d='M3 1C1.91067 1 1 1.91067 1 3V13C1 14.0893 1.91067 15 3 15H13C14.0893 15 15 14.0893 15 13V3C15 1.91067 14.0893 1 13 1H3ZM7 4L9 4L8.75391 8.99836H7.25L7 4ZM9 11C9 11.5523 8.55228 12 8 12C7.44772 12 7 11.5523 7 11C7 10.4477 7.44772 10 8 10C8.55228 10 9 10.4477 9 11Z' />
  </svg>
)

const HighPriorityIcon = ({ className, ...props }: IconProps) => (
  <svg
    width='16'
    height='16'
    viewBox='0 0 16 16'
    fill='currentColor'
    className={className}
    aria-label='High Priority'
    role='img'
    focusable='false'
    xmlns='http://www.w3.org/2000/svg'
    {...props}
  >
    <rect x='1.5' y='8' width='3' height='6' rx='1' />
    <rect x='6.5' y='5' width='3' height='9' rx='1' />
    <rect x='11.5' y='2' width='3' height='12' rx='1' />
  </svg>
)

const MediumPriorityIcon = ({ className, ...props }: IconProps) => (
  <svg
    width='16'
    height='16'
    viewBox='0 0 16 16'
    fill='currentColor'
    className={className}
    aria-label='Medium Priority'
    role='img'
    focusable='false'
    xmlns='http://www.w3.org/2000/svg'
    {...props}
  >
    <rect x='1.5' y='8' width='3' height='6' rx='1' />
    <rect x='6.5' y='5' width='3' height='9' rx='1' />
    <rect x='11.5' y='2' width='3' height='12' rx='1' fillOpacity='0.4' />
  </svg>
)

const LowPriorityIcon = ({ className, ...props }: IconProps) => (
  <svg
    width='16'
    height='16'
    viewBox='0 0 16 16'
    fill='currentColor'
    className={className}
    aria-label='Low Priority'
    role='img'
    focusable='false'
    xmlns='http://www.w3.org/2000/svg'
    {...props}
  >
    <rect x='1.5' y='8' width='3' height='6' rx='1' />
    <rect x='6.5' y='5' width='3' height='9' rx='1' fillOpacity='0.4' />
    <rect x='11.5' y='2' width='3' height='12' rx='1' fillOpacity='0.4' />
  </svg>
)

export const priorities = [
  {
    id: Priority.URGENT,
    name: priorityLabel[Priority.URGENT],
    icon: UrgentPriorityIcon,
  },
  {
    id: Priority.HIGH,
    name: priorityLabel[Priority.HIGH],
    icon: HighPriorityIcon,
  },
  {
    id: Priority.MEDIUM,
    name: priorityLabel[Priority.MEDIUM],
    icon: MediumPriorityIcon,
  },
  {
    id: Priority.LOW,
    name: priorityLabel[Priority.LOW],
    icon: LowPriorityIcon,
  },
]

export interface Status {
  id: string
  name: string
  color: string
  icon: React.FC
}

export const PausedIcon: React.FC = () => {
  return (
    <svg width='14' height='14' viewBox='0 0 14 14' fill='none'>
      <circle
        cx='7'
        cy='7'
        r='6'
        fill='none'
        stroke='#0ea5e9'
        strokeWidth='2'
        strokeDasharray='3.14 0'
        strokeDashoffset='-0.7'
      />
      <circle
        className='progress'
        cx='7'
        cy='7'
        r='2'
        fill='none'
        stroke='#0ea5e9'
        strokeWidth='4'
        strokeDasharray='6.2517693806436885 100'
        strokeDashoffset='0'
        transform='rotate(-90 7 7)'
      />
    </svg>
  )
}

export const ToDoIcon: React.FC = () => {
  return (
    <svg width='14' height='14' viewBox='0 0 14 14' fill='none'>
      <circle
        cx='7'
        cy='7'
        r='6'
        fill='none'
        stroke='#e2e2e2'
        strokeWidth='2'
        strokeDasharray='3.14 0'
        strokeDashoffset='-0.7'
      />
      <circle
        className='progress'
        cx='7'
        cy='7'
        r='2'
        fill='none'
        stroke='#e2e2e2'
        strokeWidth='4'
        strokeDasharray='0 100'
        strokeDashoffset='0'
        transform='rotate(-90 7 7)'
      />
    </svg>
  )
}

export const InProgressIcon: React.FC = () => {
  return (
    <svg width='14' height='14' viewBox='0 0 14 14' fill='none'>
      <circle
        cx='7'
        cy='7'
        r='6'
        fill='none'
        stroke='#facc15'
        strokeWidth='2'
        strokeDasharray='3.14 0'
        strokeDashoffset='-0.7'
      />
      <circle
        className='progress'
        cx='7'
        cy='7'
        r='2'
        fill='none'
        stroke='#facc15'
        strokeWidth='4'
        strokeDasharray='2.0839231268812295 100'
        strokeDashoffset='0'
        transform='rotate(-90 7 7)'
      />
    </svg>
  )
}

export const TechnicalReviewIcon: React.FC = () => {
  return (
    <svg width='14' height='14' viewBox='0 0 14 14' fill='none'>
      <circle
        cx='7'
        cy='7'
        r='6'
        fill='none'
        stroke='#22c55e'
        strokeWidth='2'
        strokeDasharray='3.14 0'
        strokeDashoffset='-0.7'
      />
      <circle
        className='progress'
        cx='7'
        cy='7'
        r='2'
        fill='none'
        stroke='#22c55e'
        strokeWidth='4'
        strokeDasharray='4.167846253762459 100'
        strokeDashoffset='0'
        transform='rotate(-90 7 7)'
      />
    </svg>
  )
}

export const CompletedIcon: React.FC = () => {
  return (
    <svg width='14' height='14' viewBox='0 0 14 14' fill='none'>
      <circle
        cx='7'
        cy='7'
        r='6'
        fill='none'
        stroke='#8b5cf6'
        strokeWidth='2'
        strokeDasharray='3.14 0'
        strokeDashoffset='-0.7'
      />
      <path
        d='M4.5 7L6.5 9L9.5 5'
        stroke='#8b5cf6'
        strokeWidth='1.5'
        strokeLinecap='round'
        strokeLinejoin='round'
      />
    </svg>
  )
}

export const CancelledIcon: React.FC = () => {
  return (
    <svg width='14' height='14' viewBox='0 0 14 14' fill='none'>
      <circle
        cx='7'
        cy='7'
        r='6'
        fill='none'
        stroke='#ef4444'
        strokeWidth='2'
        strokeDasharray='3.14 0'
        strokeDashoffset='-0.7'
      />
      <path
        d='M5 5L9 9M9 5L5 9'
        stroke='#ef4444'
        strokeWidth='1.5'
        strokeLinecap='round'
        strokeLinejoin='round'
      />
    </svg>
  )
}

export const status: Status[] = [
  {
    id: TaskStatus.IN_PROGRESS,
    name: 'In Progress',
    color: '#facc15',
    icon: InProgressIcon,
  },
  {
    id: TaskStatus.HUMAN_NEEDED,
    name: 'Human needed',
    color: '#22c55e',
    icon: TechnicalReviewIcon,
  },
  {
    id: TaskStatus.REVIEWED,
    name: 'Reviewed',
    color: '#8b5cf6',
    icon: CompletedIcon,
  },
  {
    id: TaskStatus.WORK_COMPLETE,
    name: 'Work complete',
    color: '#0ea5e9',
    icon: PausedIcon,
  },
  { id: TaskStatus.TODO, name: 'Todo', color: '#f97316', icon: ToDoIcon },
  {
    id: TaskStatus.ERROR,
    name: 'Error',
    color: '#ef4444',
    icon: CancelledIcon,
  },
]

export const StatusIcon: React.FC<{ statusId: string }> = ({ statusId }) => {
  const currentStatus = status.find((s) => s.id === statusId)
  if (!currentStatus) {
    return null
  }

  const IconComponent = currentStatus.icon
  return <IconComponent />
}
