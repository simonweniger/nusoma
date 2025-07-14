export const API_ENDPOINTS = {
  ENVIRONMENT: '/api/environment',
  SCHEDULE: '/api/schedules',
  SETTINGS: '/api/settings',
  WORKERS: '/api/workers',
  WORKSPACE_PERMISSIONS: (id: string) => `/api/workspaces/${id}/permissions`,
}

export const SYNC_INTERVALS = {
  DEFAULT: 30000, // 30 seconds
}
