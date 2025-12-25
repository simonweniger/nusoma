'use client';

import NiceModal, { type NiceModalHocProps } from '@ebay/nice-modal-react';
import { type SubmitHandler } from 'react-hook-form';

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@workspace/ui/components/alert-dialog';
import { Button } from '@workspace/ui/components/button';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle
} from '@workspace/ui/components/drawer';
import { Form } from '@workspace/ui/components/form';
import { toast } from '@workspace/ui/components/sonner';
import { Spinner } from '@workspace/ui/components/spinner';
import { useMediaQuery } from '@workspace/ui/hooks/use-media-query';
import { MediaQueries } from '@workspace/ui/lib/media-queries';

import { deleteDocuments } from '~/actions/documents/delete-documents';
import { useEnhancedModal } from '~/hooks/use-enhanced-modal';
import { useZodForm } from '~/hooks/use-zod-form';
import {
  deleteDocumentsSchema,
  type DeleteDocumentsSchema
} from '~/schemas/documents/delete-documents-schema';
import type { DocumentDto } from '~/types/dtos/document-dto';

export type DeleteDocumentsModalProps = NiceModalHocProps & {
  documents: DocumentDto[];
};

export const DeleteDocumentsModal = NiceModal.create<DeleteDocumentsModalProps>(
  ({ documents }) => {
    const modal = useEnhancedModal();
    const mdUp = useMediaQuery(MediaQueries.MdUp, { ssr: false });
    const methods = useZodForm({
      schema: deleteDocumentsSchema,
      mode: 'all',
      defaultValues: {
        ids: documents.map((document) => document.id)
      }
    });
    const amount = documents.length;
    const subject = amount === 1 ? 'Document' : 'Documents';
    const title = `Delete ${subject.toLowerCase()}?`;
    const canSubmit =
      !methods.formState.isSubmitting && methods.formState.isValid;
    const onSubmit: SubmitHandler<DeleteDocumentsSchema> = async (values) => {
      if (!canSubmit) {
        return;
      }
      const result = await deleteDocuments(values);
      if (!result?.serverError && !result?.validationErrors) {
        toast.success(`${subject} deleted`);
        modal.handleClose();
      } else {
        toast.error(`${subject} couldn't be deleted`);
      }
    };
    const renderDescription = (
      <>
        You're about to delete{' '}
        <strong className="text-foreground font-medium">{`${amount} ${subject.toLowerCase()}`}</strong>
        . This action cannot be undone.
      </>
    );
    const renderForm = (
      <form
        className="hidden"
        onSubmit={methods.handleSubmit(onSubmit)}
      >
        <input
          type="hidden"
          className="hidden"
          {...methods.register('ids')}
        />
      </form>
    );
    const renderButtons = (
      <>
        <Button
          type="button"
          variant="outline"
          onClick={modal.handleClose}
        >
          Cancel
        </Button>
        <Button
          type="button"
          variant="destructive"
          disabled={!canSubmit}
          onClick={methods.handleSubmit(onSubmit)}
        >
          {methods.formState.isSubmitting && <Spinner />}
          {methods.formState.isSubmitting ? 'Deleting...' : 'Yes, delete'}
        </Button>
      </>
    );
    return (
      <Form {...methods}>
        {mdUp ? (
          <AlertDialog
            open={modal.visible}
            onOpenChange={modal.handleClose}
            onOpenChangeComplete={(open) => {
              if (!open) {
                modal.handleAnimationEndCapture();
              }
            }}
          >
            <AlertDialogContent className="max-w-sm">
              <AlertDialogHeader>
                <AlertDialogTitle>{title}</AlertDialogTitle>
                <AlertDialogDescription>
                  {renderDescription}
                </AlertDialogDescription>
              </AlertDialogHeader>
              {renderForm}
              <AlertDialogFooter>{renderButtons}</AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : (
          <Drawer
            open={modal.visible}
            onOpenChange={modal.handleOpenChange}
          >
            <DrawerContent>
              <DrawerHeader className="text-left">
                <DrawerTitle>{title}</DrawerTitle>
                <DrawerDescription>{renderDescription}</DrawerDescription>
              </DrawerHeader>
              {renderForm}
              <DrawerFooter className="flex-col-reverse pt-4">
                {renderButtons}
              </DrawerFooter>
            </DrawerContent>
          </Drawer>
        )}
      </Form>
    );
  }
);
