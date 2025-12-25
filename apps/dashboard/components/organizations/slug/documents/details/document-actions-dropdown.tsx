'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import NiceModal from '@ebay/nice-modal-react';
import { MoreHorizontalIcon } from 'lucide-react';

import { replaceOrgSlug, routes } from '@workspace/routes';
import { Button } from '@workspace/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@workspace/ui/components/dropdown-menu';
import { toast } from '@workspace/ui/components/sonner';

import { addFavorite } from '~/actions/favorites/add-favorite';
import { removeFavorite } from '~/actions/favorites/remove-favorite';
import { DeleteDocumentModal } from '~/components/organizations/slug/documents/delete-document-modal';
import { useActiveOrganization } from '~/hooks/use-active-organization';
import { useCopyToClipboard } from '~/hooks/use-copy-to-clipboard';
import type { DocumentDto } from '~/types/dtos/document-dto';

export type DocumentActionsDropdownProps = {
  document: DocumentDto;
  addedToFavorites: boolean;
};

export function DocumentActionsDropdown({
  document,
  addedToFavorites
}: DocumentActionsDropdownProps): React.JSX.Element {
  const router = useRouter();
  const activeOrganization = useActiveOrganization();
  const copyToClipboard = useCopyToClipboard();
  const handleShowDeleteDocumentModal = async (): Promise<void> => {
    const deleted: boolean = await NiceModal.show(DeleteDocumentModal, {
      document
    });
    if (deleted) {
      router.push(
        replaceOrgSlug(
          routes.dashboard.organizations.slug.Documents,
          activeOrganization.slug
        )
      );
    }
  };
  const handleCopyDocumentId = async (): Promise<void> => {
    await copyToClipboard(document.id);
    toast.success('Copied!');
  };
  const handleCopyPageUrl = async (): Promise<void> => {
    await copyToClipboard(window.location.href);
    toast.success('Copied!');
  };
  const handleAddFavorite = async (): Promise<void> => {
    const result = await addFavorite({ documentId: document.id });
    if (result?.serverError || result?.validationErrors) {
      toast.error("Couldn't add favorite");
    }
  };
  const handleRemoveFavorite = async (): Promise<void> => {
    const result = await removeFavorite({ documentId: document.id });
    if (result?.serverError || result?.validationErrors) {
      toast.error("Couldn't remove favorite");
    }
  };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <Button
          type="button"
          variant="ghost"
          className="size-9"
          title="Open menu"
        >
          <MoreHorizontalIcon className="size-4 shrink-0" />
          <span className="sr-only">Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          className="cursor-pointer"
          onClick={handleCopyDocumentId}
        >
          Copy document ID
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer"
          onClick={handleCopyPageUrl}
        >
          Copy page URL
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {addedToFavorites ? (
          <DropdownMenuItem
            className="cursor-pointer"
            onClick={handleRemoveFavorite}
          >
            Remove favorite
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem
            className="cursor-pointer"
            onClick={handleAddFavorite}
          >
            Add favorite
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive! cursor-pointer"
          onClick={handleShowDeleteDocumentModal}
        >
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
