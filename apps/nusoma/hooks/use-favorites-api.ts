'use client'

import type { FavoriteDto } from '@nusoma/types/dtos/favorite-dto'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

// Types
interface FavoriteRequest {
  projectId?: string
  taskId?: string
  workerId?: string
}

interface ReorderFavoritesRequest {
  favorites: Array<{ id: string; order: number }>
}

// API functions
async function fetchFavorites(): Promise<FavoriteDto[]> {
  const response = await fetch('/api/favorites')

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to fetch favorites')
  }

  return response.json()
}

async function addFavorite(data: FavoriteRequest): Promise<{ success: boolean }> {
  const response = await fetch('/api/favorites', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to add favorite')
  }

  return response.json()
}

async function removeFavorite(data: FavoriteRequest): Promise<{ success: boolean }> {
  const response = await fetch('/api/favorites', {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to remove favorite')
  }

  return response.json()
}

async function reorderFavorites(data: ReorderFavoritesRequest): Promise<{ success: boolean }> {
  const response = await fetch('/api/favorites/reorder', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to reorder favorites')
  }

  return response.json()
}

async function checkTaskIsInFavorites(taskId: string): Promise<{ isInFavorites: boolean }> {
  const response = await fetch(`/api/tasks/${taskId}/favorites`)

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to check favorites')
  }

  return response.json()
}

// Query keys
export const favoritesKeys = {
  all: ['favorites'] as const,
  lists: () => [...favoritesKeys.all, 'list'] as const,
  list: (filters?: string) => [...favoritesKeys.lists(), { filters }] as const,
  details: () => [...favoritesKeys.all, 'detail'] as const,
  detail: (id: string) => [...favoritesKeys.details(), id] as const,
}

// Hooks
export function useAddFavorite() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: addFavorite,
    onSuccess: (_, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: favoritesKeys.lists() })

      // Invalidate specific favorite status queries based on what was favorited
      if (variables.taskId) {
        queryClient.invalidateQueries({
          queryKey: ['taskIsInFavorites', variables.taskId],
        })
      }
      if (variables.projectId) {
        queryClient.invalidateQueries({
          queryKey: ['projectIsInFavorites', variables.projectId],
        })
      }
      if (variables.workerId) {
        queryClient.invalidateQueries({
          queryKey: ['workerIsInFavorites', variables.workerId],
        })
      }

      toast.success('Added to favorites')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to add favorite')
    },
  })
}

export function useRemoveFavorite() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: removeFavorite,
    onSuccess: (_, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: favoritesKeys.lists() })

      // Invalidate specific favorite status queries based on what was unfavorited
      if (variables.taskId) {
        queryClient.invalidateQueries({
          queryKey: ['taskIsInFavorites', variables.taskId],
        })
      }
      if (variables.projectId) {
        queryClient.invalidateQueries({
          queryKey: ['projectIsInFavorites', variables.projectId],
        })
      }
      if (variables.workerId) {
        queryClient.invalidateQueries({
          queryKey: ['workerIsInFavorites', variables.workerId],
        })
      }

      toast.success('Removed from favorites')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to remove favorite')
    },
  })
}

export function useTaskIsInFavorites(taskId: string) {
  return useQuery({
    queryKey: ['taskIsInFavorites', taskId],
    queryFn: () => checkTaskIsInFavorites(taskId),
    enabled: !!taskId,
    select: (data) => data.isInFavorites,
  })
}

export function useFavorites() {
  return useQuery({
    queryKey: favoritesKeys.lists(),
    queryFn: fetchFavorites,
  })
}

export function useReorderFavorites() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: reorderFavorites,
    onSuccess: () => {
      // Invalidate favorites list to refresh the order
      queryClient.invalidateQueries({ queryKey: favoritesKeys.lists() })
      toast.success('Favorites reordered')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to reorder favorites')
    },
  })
}
