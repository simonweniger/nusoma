import React from 'react'
import { Priority } from '@nusoma/database/schema'

// Centralized priority configuration with database enums
export const priorityConfig = {
  [Priority.URGENT]: {
    id: Priority.URGENT,
    name: 'Urgent',
    color: '#ef4444',
    icon: () =>
      React.createElement('div', {
        className: 'w-3 h-3 rounded-full bg-red-500',
      }),
  },
  [Priority.HIGH]: {
    id: Priority.HIGH,
    name: 'High',
    color: '#f97316',
    icon: () =>
      React.createElement('div', {
        className: 'w-3 h-3 rounded-full bg-orange-500',
      }),
  },
  [Priority.MEDIUM]: {
    id: Priority.MEDIUM,
    name: 'Medium',
    color: '#facc15',
    icon: () =>
      React.createElement('div', {
        className: 'w-3 h-3 rounded-full bg-yellow-500',
      }),
  },
  [Priority.LOW]: {
    id: Priority.LOW,
    name: 'Low',
    color: '#22c55e',
    icon: () =>
      React.createElement('div', {
        className: 'w-3 h-3 rounded-full bg-green-500',
      }),
  },
}

// Priority order for UI display (highest to lowest)
export const priorityOrder = [Priority.URGENT, Priority.HIGH, Priority.MEDIUM, Priority.LOW]

// Helper function to get priority config
export const getPriorityConfig = (priority: Priority) => priorityConfig[priority]

// Helper function to get all priorities
export const getAllPriorities = () => Object.values(Priority)
