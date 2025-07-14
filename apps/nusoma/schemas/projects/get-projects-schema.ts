import { Priority } from '@nusoma/database/schema'
import { SortDirection } from '@nusoma/types/sort-direction'
import { literal, z } from 'zod'

const MAX_INT32 = +2147483647

export enum GetProjectsSortBy {
  Name = 'name',
  Priority = 'priority',
  Stage = 'stage',
  CreatedAt = 'createdAt',
}

export enum PriorityOption {
  All = 'all',
  Low = 'low',
  Medium = 'medium',
  High = 'high',
  Urgent = 'urgent',
}

export const getProjectsSchema = z.object({
  workspaceId: z.string().min(1, 'Workspace ID is required'),
  pageIndex: z.coerce
    .number({
      required_error: 'Page index is required.',
      invalid_type_error: 'Page index must be a number.',
    })
    .int()
    .min(0, 'Page number must be equal or greater than 1.')
    .max(MAX_INT32, `Page number must be equal or smaller than ${MAX_INT32}.`),
  pageSize: z.coerce
    .number({
      required_error: 'Page size is required.',
      invalid_type_error: 'Page size must be a number.',
    })
    .int()
    .min(1, 'Page size must be equal or greater than 1.')
    .max(100, 'Page number must be equal or smaller than 100.'),
  sortBy: z.nativeEnum(GetProjectsSortBy, {
    required_error: 'Sort by is required.',
    invalid_type_error: 'Sort by must be a string.',
  }),
  sortDirection: z.nativeEnum(SortDirection, {
    required_error: 'Sort direction is required.',
    invalid_type_error: 'Sort direction must be a string.',
  }),
  searchQuery: z
    .string({
      invalid_type_error: 'Search query must be a string.',
    })
    .max(2000, 'Maximum 2000 characters allowed.')
    .optional()
    .or(literal('')),
  priority: z.nativeEnum(Priority).optional(),
  tags: z.array(z.string().max(128, 'Maximum 128 characters allowed.')).optional(),
})

export type GetProjectsSchema = z.infer<typeof getProjectsSchema>
