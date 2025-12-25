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
import { useMediaQuery } from '@workspace/ui/hooks/use-media-query';
import { MediaQueries } from '@workspace/ui/lib/media-queries';

import { deleteDocumentComment } from '~/actions/documents/delete-document-comment';
import { useEnhancedModal } from '~/hooks/use-enhanced-modal';
import { useZodForm } from '~/hooks/use-zod-form';
import { deleteDocumentCommentSchema } from '~/schemas/documents/delete-document-comment-schema';
import { type DeleteDocumentSchema } from '~/schemas/documents/delete-document-schema';
import type { DocumentCommentDto } from '~/types/dtos/document-comment-dto';

export type DeleteDocumentCommentModalProps = NiceModalHocProps & {
  comment: DocumentCommentDto;
};

export const DeleteDocumentCommentModal =
  NiceModal.create<DeleteDocumentCommentModalProps>(({ comment }) => {
    const modal = useEnhancedModal();
    const mdUp = useMediaQuery(MediaQueries.MdUp, { ssr: false });
    const methods = useZodForm({
      schema: deleteDocumentCommentSchema,
      mode: 'all',
      defaultValues: {
        id: comment.id
      }
    });
    const title = 'Delete this comment?';
    const canSubmit =
      !methods.formState.isSubmitting && methods.formState.isValid;
    const onSubmit: SubmitHandler<DeleteDocumentSchema> = async (values) => {
      if (!canSubmit) {
        return;
      }
      const result = await deleteDocumentComment(values);
      if (!result?.serverError && !result?.validationErrors) {
        toast.success('Comment deleted');
        modal.handleClose();
      } else {
        toast.error("Comment couldn't be deleted");
      }
    };
    const renderDescription = (
      <>
        The comment by{' '}
        <strong className="text-foreground font-medium">
          {comment.sender.name}
        </strong>{' '}
        will be permanently deleted, are you sure you want to continue?
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
          disabled={methods.formState.isSubmitting}
          {...methods.register('id')}
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
          loading={methods.formState.isSubmitting}
          onClick={methods.handleSubmit(onSubmit)}
        >
          Yes, delete
        </Button>
      </>
    );
    return (
      <Form {...methods}>
        {mdUp ? (
          <AlertDialog open={modal.visible}>
            <AlertDialogContent
              className="max-w-sm"
              onClose={modal.handleClose}
              onAnimationEndCapture={modal.handleAnimationEndCapture}
            >
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
  });
