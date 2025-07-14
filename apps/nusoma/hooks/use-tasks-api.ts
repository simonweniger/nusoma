'use client'

import { useEffect } from 'react'
import type { Priority, TaskStatus } from '@nusoma/database/schema'
import { supabase } from '@nusoma/database/supabase'
import type { TaskDto } from '@nusoma/types/dtos/task-dto'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

// Types for API requests
export interface CreateTaskRequest {
  title: string
  description?: string
  status: TaskStatus
  priority: Priority
  workspaceId: string
  projectId?: string
  assigneeId?: string
  scheduleDate?: string
  tags?: string[]
}

export interface UpdateTaskRequest {
  title?: string
  description?: string
  status?: TaskStatus
  priority?: Priority
  assigneeId?: string
  projectId?: string
  scheduleDate?: string
  tags?: string[]
}

// Additional types for new API requests
export interface CreateCommentRequest {
  text: string
}

export interface UpdateCommentRequest {
  text: string
}

export interface AssignWorkerRequest {
  workerId: string | null
  projectId?: string
}

export interface AddActivityRequest {
  actionType: string
  metadata?: Record<string, any>
}

// API client functions
async function fetchTasks(workspaceId?: string): Promise<TaskDto[]> {
  const url = workspaceId ? `/api/tasks?workspaceId=${workspaceId}` : '/api/tasks'
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error('Failed to fetch tasks')
  }
  return response.json()
}

async function fetchTask(taskId: string): Promise<TaskDto> {
  const response = await fetch(`/api/tasks/${taskId}`)
  if (!response.ok) {
    throw new Error('Failed to fetch task')
  }
  return response.json()
}

async function createTask(data: CreateTaskRequest): Promise<TaskDto> {
  const response = await fetch('/api/tasks', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to create task')
  }
  return response.json()
}

async function updateTask(taskId: string, data: UpdateTaskRequest): Promise<{ success: boolean }> {
  const response = await fetch(`/api/tasks/${taskId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to update task')
  }
  return response.json()
}

async function deleteTask(taskId: string): Promise<{ success: boolean }> {
  const response = await fetch(`/api/tasks/${taskId}`, {
    method: 'DELETE',
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to delete task')
  }
  return response.json()
}

async function deleteTasks(taskIds: string[]): Promise<{ success: boolean }> {
  const response = await fetch(`/api/tasks?ids=${taskIds.join(',')}`, {
    method: 'DELETE',
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to delete tasks')
  }
  return response.json()
}

// API client functions for comments
async function createTaskComment(taskId: string, data: CreateCommentRequest) {
  const response = await fetch(`/api/tasks/${taskId}/comments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to create comment')
  }
  return response.json()
}

async function updateTaskComment(taskId: string, commentId: string, data: UpdateCommentRequest) {
  const response = await fetch(`/api/tasks/${taskId}/comments/${commentId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to update comment')
  }
  return response.json()
}

async function deleteTaskComment(taskId: string, commentId: string) {
  const response = await fetch(`/api/tasks/${taskId}/comments/${commentId}`, {
    method: 'DELETE',
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to delete comment')
  }
  return response.json()
}

// API client functions for worker assignment
async function assignWorkerToTask(taskId: string, data: AssignWorkerRequest) {
  const response = await fetch(`/api/tasks/${taskId}/assign`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to assign worker')
  }
  return response.json()
}

// API client functions for activities
async function addTaskActivity(taskId: string, data: AddActivityRequest) {
  const response = await fetch(`/api/tasks/${taskId}/activities`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to add activity')
  }
  return response.json()
}

// Query keys
export const taskKeys = {
  all: ['tasks'] as const,
  lists: () => [...taskKeys.all, 'list'] as const,
  list: (workspaceId?: string) => [...taskKeys.lists(), { workspaceId }] as const,
  details: () => [...taskKeys.all, 'detail'] as const,
  detail: (id: string) => [...taskKeys.details(), id] as const,
}

// Hooks
export function useTasks(workspaceId?: string) {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: taskKeys.list(workspaceId),
    queryFn: () => fetchTasks(workspaceId),
  })

  // Set up realtime subscription
  useEffect(() => {
    if (!workspaceId) return

    let isMounted = true

    const handleTaskChange = (payload: any) => {
      if (!isMounted) return

      console.log('Task change received:', payload)

      try {
        // Invalidate and refetch tasks list for this workspace
        queryClient.invalidateQueries({
          queryKey: taskKeys.list(workspaceId),
        })

        // Also invalidate the general tasks list
        queryClient.invalidateQueries({
          queryKey: taskKeys.lists(),
        })

        // Handle specific event types for cached task details
        if (payload.eventType === 'DELETE' && payload.old?.id) {
          queryClient.removeQueries({
            queryKey: taskKeys.detail(payload.old.id),
          })
        } else if (payload.eventType === 'UPDATE' && payload.new?.id) {
          queryClient.invalidateQueries({
            queryKey: taskKeys.detail(payload.new.id),
          })
        } else if (payload.eventType === 'INSERT' && payload.new?.id) {
          // For new tasks, we might want to show a toast notification
          // but for now just invalidate to refresh the list
          console.log('New task created:', payload.new.title)
        }
      } catch (error) {
        console.error('Error handling task realtime update:', error)
      }
    }

    const channel = supabase
      .channel(`tasks-workspace-${workspaceId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'task',
          filter: `workspaceId=eq.${workspaceId}`,
        },
        handleTaskChange
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`Realtime connected for workspace tasks: ${workspaceId}`)
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Realtime subscription error for workspace tasks')
        } else if (status === 'TIMED_OUT') {
          console.warn('Realtime subscription timed out for workspace tasks')
        }
      })

    return () => {
      isMounted = false
      supabase.removeChannel(channel)
      console.log(`Realtime disconnected for workspace tasks: ${workspaceId}`)
    }
  }, [workspaceId, queryClient])

  return query
}

export function useTask(taskId: string) {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: taskKeys.detail(taskId),
    queryFn: () => fetchTask(taskId),
    enabled: !!taskId,
  })

  // Set up realtime subscription for individual task
  useEffect(() => {
    if (!taskId) return

    let isMounted = true

    const handleTaskChange = (payload: any) => {
      if (!isMounted) return

      console.log('Individual task change received:', payload)

      try {
        if (payload.eventType === 'DELETE') {
          // Remove the task from cache if it was deleted
          queryClient.removeQueries({
            queryKey: taskKeys.detail(taskId),
          })
          // Also invalidate lists to reflect the deletion
          queryClient.invalidateQueries({
            queryKey: taskKeys.lists(),
          })
        } else if (payload.eventType === 'UPDATE' && payload.new) {
          // Update the cached task data directly
          queryClient.setQueryData(taskKeys.detail(taskId), payload.new)
          // Also invalidate lists in case the change affects list views (status, assignee, etc.)
          queryClient.invalidateQueries({
            queryKey: taskKeys.lists(),
          })
        }
      } catch (error) {
        console.error('Error handling individual task realtime update:', error)
      }
    }

    const channel = supabase
      .channel(`task-detail-${taskId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'task',
          filter: `id=eq.${taskId}`,
        },
        handleTaskChange
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`Realtime connected for task detail: ${taskId}`)
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Realtime subscription error for task detail')
        } else if (status === 'TIMED_OUT') {
          console.warn('Realtime subscription timed out for task detail')
        }
      })

    return () => {
      isMounted = false
      supabase.removeChannel(channel)
      console.log(`Realtime disconnected for task detail: ${taskId}`)
    }
  }, [taskId, queryClient])

  return query
}

export function useCreateTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createTask,
    onSuccess: (newTask) => {
      // Invalidate and refetch tasks lists
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() })
      toast.success('Task created successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

export function useUpdateTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ taskId, data }: { taskId: string; data: UpdateTaskRequest }) =>
      updateTask(taskId, data),
    onSuccess: (_, { taskId }) => {
      // Invalidate and refetch the specific task and lists
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId) })
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() })
      toast.success('Task updated successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

export function useDeleteTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteTask,
    onSuccess: (_, taskId) => {
      // Remove the task from cache and invalidate lists
      queryClient.removeQueries({ queryKey: taskKeys.detail(taskId) })
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() })
      toast.success('Task deleted successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

export function useDeleteTasks() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteTasks,
    onSuccess: (_, taskIds) => {
      // Remove all deleted tasks from cache and invalidate lists
      taskIds.forEach((taskId) => {
        queryClient.removeQueries({ queryKey: taskKeys.detail(taskId) })
      })
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() })
      toast.success(`${taskIds.length} task(s) deleted successfully`)
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

// New hooks for comments
export function useCreateTaskComment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ taskId, data }: { taskId: string; data: CreateCommentRequest }) =>
      createTaskComment(taskId, data),
    onSuccess: (_, { taskId }) => {
      // Invalidate task details to refetch comments
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId) })
      toast.success('Comment added successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

export function useUpdateTaskComment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      taskId,
      commentId,
      data,
    }: {
      taskId: string
      commentId: string
      data: UpdateCommentRequest
    }) => updateTaskComment(taskId, commentId, data),
    onSuccess: (_, { taskId }) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId) })
      toast.success('Comment updated successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

export function useDeleteTaskComment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ taskId, commentId }: { taskId: string; commentId: string }) =>
      deleteTaskComment(taskId, commentId),
    onSuccess: (_, { taskId }) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId) })
      toast.success('Comment deleted successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

// New hook for worker assignment
export function useAssignWorker() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ taskId, data }: { taskId: string; data: AssignWorkerRequest }) =>
      assignWorkerToTask(taskId, data),
    onSuccess: (_, { taskId }) => {
      // Invalidate task details and lists
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId) })
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() })
      toast.success('Worker assignment updated successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

// New hook for activities
export function useAddTaskActivity() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ taskId, data }: { taskId: string; data: AddActivityRequest }) =>
      addTaskActivity(taskId, data),
    onSuccess: (_, { taskId }) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId) })
      toast.success('Activity added successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

// Specialized update hooks for better ergonomics
export function useUpdateTaskTags() {
  const updateMutation = useUpdateTask()

  return useMutation({
    mutationFn: ({ taskId, tags }: { taskId: string; tags: string[] }) =>
      updateMutation.mutateAsync({ taskId, data: { tags } }),
    onSuccess: () => {
      toast.success('Task tags updated successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

export function useUpdateTaskStatus() {
  const updateMutation = useUpdateTask()

  return useMutation({
    mutationFn: ({ taskId, status }: { taskId: string; status: TaskStatus }) =>
      updateMutation.mutateAsync({ taskId, data: { status } }),
    onSuccess: () => {
      toast.success('Task status updated successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

export function useUpdateTaskProperties() {
  const updateMutation = useUpdateTask()

  return useMutation({
    mutationFn: ({ taskId, properties }: { taskId: string; properties: UpdateTaskRequest }) =>
      updateMutation.mutateAsync({ taskId, data: properties }),
    onSuccess: () => {
      toast.success('Task properties updated successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}
