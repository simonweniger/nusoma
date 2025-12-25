'use client';

import * as React from 'react';
import { StarIcon } from 'lucide-react';

import { Button, type ButtonProps } from '@workspace/ui/components/button';
import { toast } from '@workspace/ui/components/sonner';
import { cn } from '@workspace/ui/lib/utils';

import { addFavorite } from '~/actions/favorites/add-favorite';
import { removeFavorite } from '~/actions/favorites/remove-favorite';
import type { DocumentDto } from '~/types/dtos/document-dto';

export type DocumentFavoriteToggleProps = ButtonProps & {
  document: DocumentDto;
  addedToFavorites: boolean;
};

export function DocumentFavoriteToggle({
  document,
  addedToFavorites,
  className,
  ...other
}: DocumentFavoriteToggleProps): React.JSX.Element {
  const description = addedToFavorites ? 'Remove favorite' : 'Add favorite';
  const handleToggleFavorite = async (): Promise<void> => {
    if (addedToFavorites) {
      const result = await removeFavorite({ documentId: document.id });
      if (result?.serverError || result?.validationErrors) {
        toast.error("Couldn't remove favorite");
      }
    } else {
      const result = await addFavorite({ documentId: document.id });
      if (result?.serverError || result?.validationErrors) {
        toast.error("Couldn't add favorite");
      }
    }
  };
  return (
    <Button
      type="button"
      variant="ghost"
      title={description}
      onClick={handleToggleFavorite}
      className={cn('size-9', className)}
      {...other}
    >
      <StarIcon
        className={cn('size-4 shrink-0', addedToFavorites && 'fill-primary')}
      />
      <span className="sr-only">{description}</span>
    </Button>
  );
}
