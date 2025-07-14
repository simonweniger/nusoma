'use client'

import NiceModal from '@ebay/nice-modal-react'
import { Button } from '@nusoma/design-system/components/ui/button'
import { DataTableBulkActions } from '@nusoma/design-system/components/ui/data-table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@nusoma/design-system/components/ui/dropdown-menu'
import { toast } from '@nusoma/design-system/components/ui/sonner'
import type { ProjectDto } from '@nusoma/types/dtos/project-dto'
import type { Table } from '@tanstack/react-table'
import { saveAs } from 'file-saver'
import { ChevronsUpDownIcon } from 'lucide-react'
import { HttpMethod, MediaTypeNames } from '@/lib/http'
import { useWorkerRegistry } from '@/stores'
import { DeleteProjectsModal } from './delete-projects-modal'

function extractFilenameFromContentDispositionHeader(header: string): string {
  const defaultFileName = 'download'
  const fileNameToken = "filename*=UTF-8''"

  for (const part of header.split(';')) {
    if (part.trim().indexOf(fileNameToken) === 0) {
      return decodeURIComponent(part.trim().replace(fileNameToken, ''))
    }
  }

  return defaultFileName
}

export type ProjectsBulkActionsProps = {
  table: Table<ProjectDto>
}
export function ProjectsBulkActions({ table }: ProjectsBulkActionsProps): React.JSX.Element {
  const { activeWorkspaceId } = useWorkerRegistry()
  const handleExportSelectedProjectsToCsv = async () => {
    const selectedRows = table.getSelectedRowModel().rows
    if (selectedRows.length === 0) {
      return
    }

    const response = await fetch('api/export/csv/project-list', {
      method: HttpMethod.Post,
      headers: {
        'content-type': MediaTypeNames.Application.Json,
      },
      body: JSON.stringify({
        workspaceId: activeWorkspaceId,
        ids: selectedRows.map((row) => row.original.id),
      }),
    })
    if (response.ok) {
      const data = await response.blob()
      const disposition = response.headers.get('Content-Disposition') ?? ''
      const filename = extractFilenameFromContentDispositionHeader(disposition)

      saveAs(data, filename)
    } else {
      toast.error("Couldn't export selected projects to CSV")
    }
  }

  const handleExportSelectedProjectsToExcel = async () => {
    const selectedRows = table.getSelectedRowModel().rows
    if (selectedRows.length === 0) {
      return
    }

    const response = await fetch('api/export/excel/project-list', {
      method: HttpMethod.Post,
      headers: {
        'content-type': MediaTypeNames.Application.Json,
      },
      body: JSON.stringify({
        workspaceId: activeWorkspaceId,
        ids: selectedRows.map((row) => row.original.id),
      }),
    })
    if (response.ok) {
      const data = await response.blob()
      const disposition = response.headers.get('Content-Disposition') ?? ''
      const filename = extractFilenameFromContentDispositionHeader(disposition)

      saveAs(data, filename)
    } else {
      toast.error("Couldn't export selected projects to Excel")
    }
  }

  const handleShowDeleteProjectsModal = () => {
    const selectedRows = table.getSelectedRowModel().rows
    if (selectedRows.length === 0) {
      return
    }

    NiceModal.show(DeleteProjectsModal, {
      projects: selectedRows.map((row) => row.original),
    })
  }

  return (
    <DataTableBulkActions table={table}>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button type='button' variant='outline' size='default' className='text-sm'>
            Bulk actions
            <ChevronsUpDownIcon className='ml-1 size-4 opacity-50' />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='start'>
          <DropdownMenuItem className='cursor-pointer' onClick={handleExportSelectedProjectsToCsv}>
            Export to CSV
          </DropdownMenuItem>
          <DropdownMenuItem
            className='cursor-pointer'
            onClick={handleExportSelectedProjectsToExcel}
          >
            Export to Excel
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className='!text-destructive cursor-pointer'
            onClick={handleShowDeleteProjectsModal}
          >
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </DataTableBulkActions>
  )
}
