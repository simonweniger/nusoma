import { Priority } from '@nusoma/database/schema'
import { SortDirection } from '@nusoma/types/sort-direction'
import {
  createSearchParamsCache,
  createSerializer,
  parseAsArrayOf,
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
} from 'nuqs/server'
import { GetProjectsSortBy, PriorityOption } from '@/schemas/projects/get-projects-schema'

export const searchParams = {
  pageIndex: parseAsInteger.withDefault(0),
  pageSize: parseAsInteger.withDefault(50),
  priority: parseAsStringLiteral([...Object.values(Priority), PriorityOption.All]).withDefault(
    PriorityOption.All
  ),
  sortBy: parseAsStringLiteral(Object.values(GetProjectsSortBy)).withDefault(
    GetProjectsSortBy.Name
  ),
  sortDirection: parseAsStringLiteral(Object.values(SortDirection)).withDefault(SortDirection.Asc),
  searchQuery: parseAsString.withDefault(''),
  tags: parseAsArrayOf(parseAsString).withDefault([]),
}

export const searchParamsCache = createSearchParamsCache(searchParams)
export const serializer = createSerializer(searchParams)
