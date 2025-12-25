'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import NiceModal from '@ebay/nice-modal-react';
import {
  ColumnDef,
  ColumnFiltersState,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  VisibilityState,
  type Row
} from '@tanstack/react-table';
import { MoreHorizontalIcon } from 'lucide-react';
import { useQueryStates } from 'nuqs';

import { replaceOrgSlug, routes } from '@workspace/routes';
import { Button } from '@workspace/ui/components/button';
import { Checkbox } from '@workspace/ui/components/checkbox';
import {
  DataTable,
  DataTableColumnHeader,
  DataTableColumnOptionsHeader,
  DataTablePagination
} from '@workspace/ui/components/data-table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@workspace/ui/components/dropdown-menu';
import { ScrollArea } from '@workspace/ui/components/scroll-area';
import { CenteredSpinner } from '@workspace/ui/components/spinner';
import { TagList } from '@workspace/ui/components/tag-input';
import { cn } from '@workspace/ui/lib/utils';

import { DeleteDocumentModal } from '~/components/organizations/slug/documents/delete-document-modal';
import { DocumentAvatar } from '~/components/organizations/slug/documents/details/document-avatar';
import { documentStageColor } from '~/components/organizations/slug/documents/document-stage-color';
import { DocumentsBulkActions } from '~/components/organizations/slug/documents/documents-bulk-actions';
import { searchParams } from '~/components/organizations/slug/documents/documents-search-params';
import { useActiveOrganization } from '~/hooks/use-active-organization';
import { useTransitionContext } from '~/hooks/use-transition-context';
import { documentStageLabel } from '~/lib/labels';
import { GetDocumentsSortBy } from '~/schemas/documents/get-documents-schema';
import type { DocumentDto } from '~/types/dtos/document-dto';
import { SortDirection } from '~/types/sort-direction';

export type DocumentsDataTableProps = {
  data: DocumentDto[];
  totalCount: number;
};

export function DocumentsDataTable({
  data,
  totalCount
}: DocumentsDataTableProps): React.JSX.Element {
  const router = useRouter();
  const activeOrganization = useActiveOrganization();
  const { isLoading, startTransition } = useTransitionContext();
  const [rowSelection, setRowSelection] = React.useState({});
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );

  const [sorting, setSorting] = useQueryStates(
    {
      sortBy: searchParams.sortBy,
      sortDirection: searchParams.sortDirection
    },
    {
      history: 'push',
      startTransition,
      shallow: false
    }
  );

  const [pagination, setPagination] = useQueryStates(
    {
      pageIndex: searchParams.pageIndex,
      pageSize: searchParams.pageSize
    },
    {
      history: 'push',
      startTransition,
      shallow: false
    }
  );

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting: [
        {
          id: sorting.sortBy,
          desc: sorting.sortDirection === SortDirection.Desc
        }
      ],
      columnVisibility,
      rowSelection,
      columnFilters,
      pagination
    },
    pageCount: Math.max(
      1,
      Math.ceil(totalCount / Math.max(1, pagination.pageSize))
    ),
    defaultColumn: {
      minSize: 0,
      size: 0
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
          : updaterOrValue;

      if (newSorting.length > 0) {
        setSorting({
          sortBy: newSorting[0].id as GetDocumentsSortBy,
          sortDirection: newSorting[0].desc
            ? SortDirection.Desc
            : SortDirection.Asc
        });
      } else {
        setSorting({
          sortBy: GetDocumentsSortBy.Name,
          sortDirection: SortDirection.Asc
        });
      }
    },
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,

    enableRowSelection: true,
    manualPagination: true,
    manualFiltering: true
  });

  const hasSelectedRows = table.getSelectedRowModel().rows.length > 0;

  const handleRowClicked = (row: Row<DocumentDto>): void => {
    router.push(
      `${replaceOrgSlug(routes.dashboard.organizations.slug.Documents, activeOrganization.slug)}/${row.original.id}`
    );
  };

  return (
    <div className="relative flex flex-col overflow-hidden">
      <ScrollArea
        verticalScrollBar
        horizontalScrollBar
        className="h-full"
      >
        {/* 56px (primary bar)
              + 48px (secondary bar)
              + 57px (pagination + border-t)
              = 161px
            */}
        <DataTable
          fixedHeader
          table={table}
          wrapperClassName="h-[calc(100svh-161px)] overflow-visible"
          onRowClicked={handleRowClicked}
        />
      </ScrollArea>
      <DataTablePagination table={table} />
      {isLoading && <CenteredSpinner />}
      {hasSelectedRows && <DocumentsBulkActions table={table} />}
    </div>
  );
}

const columns: ColumnDef<DocumentDto>[] = [
  {
    id: 'select',
    size: 64,
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
        className="mx-auto flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
        className="mx-auto flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      />
    ),
    enableSorting: false,
    enableHiding: false
  },
  {
    meta: {
      title: 'Name'
    },
    accessorKey: 'name',
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Name"
      />
    ),
    cell: ({ row }) => (
      <div className="flex w-fit flex-row items-center gap-2">
        <DocumentAvatar
          record={row.original.record}
          src={row.original.image}
        />
        <div className="whitespace-nowrap text-sm font-medium">
          {row.original.name}
        </div>
      </div>
    ),
    enableSorting: true,
    enableHiding: true
  },
  {
    meta: {
      title: 'Email'
    },
    accessorKey: 'email',
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Email"
      />
    ),
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-sm">{row.original.email}</span>
    ),
    enableSorting: true,
    enableHiding: true
  },
  {
    meta: {
      title: 'Phone'
    },
    accessorKey: 'phone',
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Phone"
      />
    ),
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-sm">{row.original.phone}</span>
    ),
    enableSorting: true,
    enableHiding: true
  },
  {
    meta: {
      title: 'Stage'
    },
    accessorKey: 'stage',
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Stage"
      />
    ),
    enableSorting: true,
    enableHiding: true,
    cell: ({ row }) => (
      <div className="flex flex-row items-center gap-2 whitespace-nowrap">
        <div
          className={cn(
            'size-2.5 rounded-full border-2 bg-background',
            documentStageColor[row.original.stage]
          )}
        />
        {documentStageLabel[row.original.stage]}
      </div>
    )
  },
  {
    meta: {
      title: 'Tags'
    },
    accessorKey: 'tags',
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Tags"
      />
    ),
    cell: ({ row }) => (
      <TagList
        tags={row.original.tags}
        className="flex-nowrap text-clip"
        size="sm"
        variant="default"
        shape="rounded"
        borderStyle="default"
        textCase={null}
        interaction="nonClickable"
        textStyle="normal"
        animation="fadeIn"
        direction="row"
      />
    ),
    enableSorting: false,
    enableHiding: true
  },
  {
    id: 'actions',
    size: 64,
    header: ({ table }) => <DataTableColumnOptionsHeader table={table} />,
    cell: ({ row }) => <ActionsCell row={row} />
  }
];

function ActionsCell({ row }: { row: Row<DocumentDto> }): React.JSX.Element {
  const activeOrganization = useActiveOrganization();
  const handleShowDeleteDocumentModal = (): void => {
    NiceModal.show(DeleteDocumentModal, { document: row.original });
  };
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className="ml-auto mr-4 flex size-8 data-[state=open]:bg-muted"
          onClick={(e) => e.stopPropagation()}
          title="Open menu"
        >
          <MoreHorizontalIcon className="size-4 shrink-0" />
          <span className="sr-only">Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          asChild
          className="cursor-pointer"
        >
          <Link
            href={`${replaceOrgSlug(routes.dashboard.organizations.slug.Documents, activeOrganization.slug)}/${row.original.id}`}
          >
            View
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer text-destructive!"
          onClick={(e) => {
            e.stopPropagation();
            handleShowDeleteDocumentModal();
          }}
        >
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
