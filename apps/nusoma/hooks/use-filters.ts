import { parseAsArrayOf, parseAsString, useQueryStates } from 'nuqs'

// Define filter types
export type FilterType = 'status' | 'assignee' | 'priority' | 'labels' | 'project'

// Create parsers for each filter type
const filterParsers = {
  status: parseAsArrayOf(parseAsString).withDefault([]),
  assignee: parseAsArrayOf(parseAsString).withDefault([]),
  priority: parseAsArrayOf(parseAsString).withDefault([]),
  labels: parseAsArrayOf(parseAsString).withDefault([]),
  project: parseAsArrayOf(parseAsString).withDefault([]),
}

export function useFilters() {
  const [filters, setFilters] = useQueryStates(filterParsers, {
    // Clear the URL when all filters are empty
    clearOnDefault: true,
  })

  // Set a specific filter type with an array of values
  const setFilter = (type: FilterType, values: string[]) => {
    setFilters({ [type]: values })
  }

  // Toggle a single filter value on/off
  const toggleFilter = (type: FilterType, value: string) => {
    const currentValues = filters[type]
    const newValues = currentValues.includes(value)
      ? currentValues.filter((item) => item !== value)
      : [...currentValues, value]

    setFilters({ [type]: newValues })
  }

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      status: [],
      assignee: [],
      priority: [],
      labels: [],
      project: [],
    })
  }

  // Clear a specific filter type
  const clearFilterType = (type: FilterType) => {
    setFilters({ [type]: [] })
  }

  // Check if any filters are active
  const hasActiveFilters = () => {
    return Object.values(filters).some((filterArray) => filterArray.length > 0)
  }

  // Get total count of active filters
  const getActiveFiltersCount = () => {
    return Object.values(filters).reduce((acc, curr) => acc + curr.length, 0)
  }

  return {
    filters,
    setFilter,
    toggleFilter,
    clearFilters,
    clearFilterType,
    hasActiveFilters,
    getActiveFiltersCount,
  }
}
