'use client'

import * as React from 'react'
import NiceModal from '@ebay/nice-modal-react'
import { Button } from '@nusoma/design-system/components/ui/button'
import { Checkbox } from '@nusoma/design-system/components/ui/checkbox'
import {
  DataTable,
  DataTableColumnHeader,
  DataTableColumnOptionsHeader,
  DataTablePagination,
} from '@nusoma/design-system/components/ui/data-table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@nusoma/design-system/components/ui/dropdown-menu'
import { ScrollArea } from '@nusoma/design-system/components/ui/scroll-area'
import { CenteredSpinner } from '@nusoma/design-system/components/ui/spinner'
import { TagList } from '@nusoma/design-system/components/ui/tag-input'
import { cn } from '@nusoma/design-system/lib/utils'
import type { ProjectDto } from '@nusoma/types/dtos/project-dto'
import { SortDirection } from '@nusoma/types/sort-direction'
import {
  type ColumnDef,
  type ColumnFiltersState,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type Row,
  useReactTable,
  type VisibilityState,
} from '@tanstack/react-table'
import { MoreHorizontalIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useQueryStates } from 'nuqs'
import { projectStageLabel } from '@/lib/labels'
import { useTransitionContext } from '@/hooks/use-transition-context'
import { GetProjectsSortBy } from '@/schemas/projects/get-projects-schema'
import { useWorkerRegistry } from '@/stores/workers/registry/store'
import { DeleteProjectModal } from './delete-project-modal'
//import { ProjectAvatar } from './project-avatar'
import { projectStageColor } from './project-stage-color'
import { ProjectsBulkActions } from './projects-bulk-actions'
import { searchParams } from './projects-search-params'

export type ProjectsDataTableProps = {
  data: ProjectDto[]
  totalCount: number
}

export function ProjectsDataTable({ data, totalCount }: ProjectsDataTableProps): React.JSX.Element {
  const router = useRouter()
  const { activeWorkspaceId } = useWorkerRegistry()
  const { isLoading, startTransition } = useTransitionContext()
  const [rowSelection, setRowSelection] = React.useState({})
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])

  const [sorting, setSorting] = useQueryStates(
    {
      sortBy: searchParams.sortBy,
      sortDirection: searchParams.sortDirection,
    },
    {
      history: 'push',
      startTransition,
      shallow: false,
    }
  )

  const [pagination, setPagination] = useQueryStates(
    {
      pageIndex: searchParams.pageIndex,
      pageSize: searchParams.pageSize,
    },
    {
      history: 'push',
      startTransition,
      shallow: false,
    }
  )

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting: [
        {
          id: sorting.sortBy,
          desc: sorting.sortDirection === SortDirection.Desc,
        },
      ],
      columnVisibility,
      rowSelection,
      columnFilters,
      pagination,
    },
    pageCount: Math.max(1, Math.ceil(totalCount / Math.max(1, pagination.pageSize))),
    defaultColumn: {
      minSize: 0,
      size: 0,
    },
    getRowId: (row, _relativeIndex, parent) => (parent ? parent.id : row.id),
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    onRowSelectionChange: setRowSelection,
    onSortingChange: (updaterOrValue) => {
      const newSorting =
        typeof updaterOrValue === 'function'
          ? updaterOrValue(table.getState().sorting)
          : updaterOrValue

      if (newSorting.length > 0) {
        setSorting({
          sortBy: newSorting[0].id as GetProjectsSortBy,
          sortDirection: newSorting[0].desc ? SortDirection.Desc : SortDirection.Asc,
        })
      } else {
        setSorting({
          sortBy: GetProjectsSortBy.Name,
          sortDirection: SortDirection.Asc,
        })
      }
    },
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,

    enableRowSelection: true,
    manualPagination: true,
    manualFiltering: true,
  })

  const hasSelectedRows = table.getSelectedRowModel().rows.length > 0

  const handleRowClicked = (row: Row<ProjectDto>): void => {
    router.push(`/workspace/${activeWorkspaceId}/projects/${row.original.id}`)
  }

  return (
    <div className='relative flex flex-col overflow-hidden'>
      <ScrollArea verticalScrollBar horizontalScrollBar className='h-full'>
        {/* 56px (primary bar)
              + 48px (secondary bar)
              + 57px (pagination + border-t)
              = 161px
            */}
        <DataTable
          fixedHeader
          table={table}
          wrapperClassName='h-[calc(100svh-161px)] overflow-visible'
          onRowClicked={handleRowClicked}
        />
      </ScrollArea>
      <DataTablePagination table={table} />
      {isLoading && <CenteredSpinner />}
      {hasSelectedRows && <ProjectsBulkActions table={table} />}
    </div>
  )
}

const columns: ColumnDef<ProjectDto>[] = [
  {
    id: 'select',
    size: 64,
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label='Select all'
        className='mx-auto flex items-center justify-center'
        onClick={(e) => e.stopPropagation()}
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label='Select row'
        className='mx-auto flex items-center justify-center'
        onClick={(e) => e.stopPropagation()}
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    meta: {
      title: 'Name',
    },
    accessorKey: 'name',
    header: ({ column }) => <DataTableColumnHeader column={column} title='Name' />,
    cell: ({ row }) => (
      <div className='flex w-fit flex-row items-center gap-2'>
        <div className='whitespace-nowrap font-medium text-sm'>{row.original.name}</div>
      </div>
    ),
    enableSorting: true,
    enableHiding: true,
  },
  {
    meta: {
      title: 'Priority',
    },
    accessorKey: 'priority',
    header: ({ column }) => <DataTableColumnHeader column={column} title='Priority' />,
    cell: ({ row }) => (
      <span className='whitespace-nowrap text-sm capitalize'>{row.original.priority}</span>
    ),
    enableSorting: true,
    enableHiding: true,
  },
  {
    meta: {
      title: 'Stage',
    },
    accessorKey: 'stage',
    header: ({ column }) => <DataTableColumnHeader column={column} title='Stage' />,
    enableSorting: true,
    enableHiding: true,
    cell: ({ row }) => (
      <div className='flex flex-row items-center gap-2 whitespace-nowrap'>
        <div
          className={cn(
            'size-2.5 rounded-full border-2 bg-background',
            projectStageColor[row.original.stage]
          )}
        />
        {projectStageLabel[row.original.stage]}
      </div>
    ),
  },
  {
    meta: {
      title: 'Tags',
    },
    accessorKey: 'tags',
    header: ({ column }) => <DataTableColumnHeader column={column} title='Tags' />,
    cell: ({ row }) => (
      <TagList
        tags={row.original.tags}
        className='flex-nowrap text-clip'
        size='sm'
        variant='default'
        shape='rounded'
        borderStyle='default'
        textCase={null}
        interaction='nonClickable'
        textStyle='normal'
        animation='fadeIn'
        direction='row'
      />
    ),
    enableSorting: false,
    enableHiding: true,
  },
  {
    id: 'actions',
    size: 64,
    header: ({ table }) => <DataTableColumnOptionsHeader table={table} />,
    cell: ({ row }) => <ActionsCell row={row} />,
  },
]

function ActionsCell({ row }: { row: Row<ProjectDto> }): React.JSX.Element {
  const router = useRouter()
  const { activeWorkspaceId } = useWorkerRegistry()

  const handleShowDeleteProjectModal = (): void => {
    NiceModal.show(DeleteProjectModal, { project: row.original })
  }
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          type='button'
          variant='ghost'
          className='mr-4 ml-auto flex size-8 data-[state=open]:bg-muted'
          onClick={(e) => e.stopPropagation()}
          title='Open menu'
        >
          <MoreHorizontalIcon className='size-4 shrink-0' />
          <span className='sr-only'>Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end'>
        <DropdownMenuItem
          className='cursor-pointer'
          onClick={(e) => {
            e.stopPropagation()
            router.push(`workspace/${activeWorkspaceId}/projects/${row.original.id}`)
          }}
        >
          View
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className='!text-destructive cursor-pointer'
          onClick={(e) => {
            e.stopPropagation()
            handleShowDeleteProjectModal()
          }}
        >
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
