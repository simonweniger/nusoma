export type NotificationType = 'error' | 'console' | 'api' | 'marketplace' | 'info'

export interface Notification {
  id: string
  type: NotificationType
  message: string
  timestamp: number
  isVisible: boolean
  workerId: string | null
  read: boolean
  isFading?: boolean
  options?: NotificationOptions
}

export interface NotificationSection {
  label: string
  content: string
}

export interface NotificationAction {
  label: string
  onClick: () => void
}

export interface NotificationOptions {
  copyableContent?: string
  isPersistent?: boolean
  sections?: NotificationSection[]
  needsRedeployment?: boolean
  actions?: NotificationAction[]
}

export interface NotificationStore {
  notifications: Notification[]
  addNotification: (
    type: NotificationType,
    message: string,
    workerId: string | null,
    options?: NotificationOptions
  ) => string
  hideNotification: (id: string) => void
  showNotification: (id: string) => void
  setNotificationFading: (id: string) => void
  markAsRead: (id: string) => void
  markAllAsRead: (workerId: string) => void
  removeNotification: (id: string) => void
  clearNotifications: () => void
  getWorkerNotifications: (workerId: string) => Notification[]
  getVisibleNotificationCount: (workerId: string | null) => number
}
