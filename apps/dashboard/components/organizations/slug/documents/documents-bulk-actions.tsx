'use client';

import NiceModal from '@ebay/nice-modal-react';
import { type Table } from '@tanstack/react-table';
import { saveAs } from 'file-saver';
import { ChevronsUpDownIcon } from 'lucide-react';

import { HttpMethod, MediaTypeNames } from '@workspace/common/http';
import { routes } from '@workspace/routes';
import { Button } from '@workspace/ui/components/button';
import { DataTableBulkActions } from '@workspace/ui/components/data-table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@workspace/ui/components/dropdown-menu';
import { toast } from '@workspace/ui/components/sonner';

import { DeleteDocumentsModal } from '~/components/organizations/slug/documents/delete-documents-modal';
import { useActiveOrganization } from '~/hooks/use-active-organization';
import type { DocumentDto } from '~/types/dtos/document-dto';

function extractFilenameFromContentDispositionHeader(header: string): string {
  const defaultFileName = 'download';
  const fileNameToken = "filename*=UTF-8''";

  for (const part of header.split(';')) {
    if (part.trim().indexOf(fileNameToken) === 0) {
      return decodeURIComponent(part.trim().replace(fileNameToken, ''));
    }
  }

  return defaultFileName;
}

export type DocumentsBulkActionsProps = {
  table: Table<DocumentDto>;
};
export function DocumentsBulkActions({
  table
}: DocumentsBulkActionsProps): React.JSX.Element {
  const activeOrganization = useActiveOrganization();
  const handleExportSelectedDocumentsToCsv = async () => {
    const selectedRows = table.getSelectedRowModel().rows;
    if (selectedRows.length === 0) {
      return;
    }

    const response = await fetch(
      `${routes.dashboard.Api}/export/csv/document-list`,
      {
        method: HttpMethod.Post,
        headers: {
          'content-type': MediaTypeNames.Application.Json
        },
        body: JSON.stringify({
          organizationId: activeOrganization.id,
          ids: selectedRows.map((row) => row.original.id)
        })
      }
    );
    if (!response.ok) {
      toast.error("Couldn't export selected documents to CSV");
    } else {
      const data = await response.blob();
      const disposition = response.headers.get('Content-Disposition') ?? '';
      const filename = extractFilenameFromContentDispositionHeader(disposition);

      saveAs(data, filename);
    }
  };

  const handleExportSelectedDocumentsToExcel = async () => {
    const selectedRows = table.getSelectedRowModel().rows;
    if (selectedRows.length === 0) {
      return;
    }

    const response = await fetch(
      `${routes.dashboard.Api}/export/excel/document-list`,
      {
        method: HttpMethod.Post,
        headers: {
          'content-type': MediaTypeNames.Application.Json
        },
        body: JSON.stringify({
          organizationId: activeOrganization.id,
          ids: selectedRows.map((row) => row.original.id)
        })
      }
    );
    if (!response.ok) {
      toast.error("Couldn't export selected documents to Excel");
    } else {
      const data = await response.blob();
      const disposition = response.headers.get('Content-Disposition') ?? '';
      const filename = extractFilenameFromContentDispositionHeader(disposition);

      saveAs(data, filename);
    }
  };

  const handleShowDeleteDocumentsModal = () => {
    const selectedRows = table.getSelectedRowModel().rows;
    if (selectedRows.length === 0) {
      return;
    }

    NiceModal.show(DeleteDocumentsModal, {
      documents: selectedRows.map((row) => row.original)
    });
  };

  return (
    <DataTableBulkActions table={table}>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="default"
            className="text-sm"
          >
            Bulk actions
            <ChevronsUpDownIcon className="ml-1 size-4 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem
            className="cursor-pointer"
            onClick={handleExportSelectedDocumentsToCsv}
          >
            Export to CSV
          </DropdownMenuItem>
          <DropdownMenuItem
            className="cursor-pointer"
            onClick={handleExportSelectedDocumentsToExcel}
          >
            Export to Excel
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive! cursor-pointer"
            onClick={handleShowDeleteDocumentsModal}
          >
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </DataTableBulkActions>
  );
}
