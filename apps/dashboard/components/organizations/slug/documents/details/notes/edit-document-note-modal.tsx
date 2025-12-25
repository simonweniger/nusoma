'use client';

import NiceModal, { type NiceModalHocProps } from '@ebay/nice-modal-react';
import { type SubmitHandler } from 'react-hook-form';

import { Button } from '@workspace/ui/components/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@workspace/ui/components/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle
} from '@workspace/ui/components/drawer';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage
} from '@workspace/ui/components/form';
import { toast } from '@workspace/ui/components/sonner';
import { Spinner } from '@workspace/ui/components/spinner';
import { TextEditor } from '@workspace/ui/components/text-editor';
import { useMediaQuery } from '@workspace/ui/hooks/use-media-query';
import { MediaQueries } from '@workspace/ui/lib/media-queries';
import { cn } from '@workspace/ui/lib/utils';

import { updateDocumentNote } from '~/actions/documents/update-document-note';
import { useEnhancedModal } from '~/hooks/use-enhanced-modal';
import { useZodForm } from '~/hooks/use-zod-form';
import { convertHtmlToMarkdown, convertMarkdownToHtml } from '~/lib/markdown';
import {
  updateDocumentNoteSchema,
  type UpdateDocumentNoteSchema
} from '~/schemas/documents/update-document-note-schema';
import type { DocumentNoteDto } from '~/types/dtos/document-note-dto';

export type EditDocumentNoteModalProps = NiceModalHocProps & {
  note: DocumentNoteDto;
};

export const EditDocumentNoteModal =
  NiceModal.create<EditDocumentNoteModalProps>(({ note }) => {
    const modal = useEnhancedModal();
    const mdUp = useMediaQuery(MediaQueries.MdUp, { ssr: false });
    const methods = useZodForm({
      schema: updateDocumentNoteSchema,
      mode: 'onSubmit',
      defaultValues: {
        id: note.id,
        text: note.text
      }
    });
    const title = 'Edit note';
    const description = 'Edit the note by changing the form fields below.';
    const canSubmit =
      !methods.formState.isSubmitting &&
      (!methods.formState.isSubmitted || methods.formState.isDirty);
    const onSubmit: SubmitHandler<UpdateDocumentNoteSchema> = async (
      values
    ) => {
      if (!canSubmit) {
        return;
      }
      const result = await updateDocumentNote(values);
      if (!result?.serverError && !result?.validationErrors) {
        toast.success('Note updated');
        modal.handleClose();
      } else {
        toast.error("Couldn't update note");
      }
    };
    const renderForm = (
      <form
        className={cn('space-y-4', !mdUp && 'p-4')}
        onSubmit={methods.handleSubmit(onSubmit)}
      >
        <input
          type="hidden"
          className="hidden"
          disabled={methods.formState.isSubmitting}
          {...methods.register('id')}
        />
        <FormField
          control={methods.control}
          name="text"
          render={({ field }) => (
            <FormItem className="flex w-full flex-col">
              <FormControl>
                <TextEditor
                  getText={() => convertMarkdownToHtml(field.value || '')}
                  setText={(value: string) =>
                    field.onChange(convertHtmlToMarkdown(value))
                  }
                  height="300px"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
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
          variant="default"
          onClick={methods.handleSubmit(onSubmit)}
        >
          {methods.formState.isSubmitting && <Spinner />}
          {methods.formState.isSubmitting ? 'Saving...' : 'Save'}
        </Button>
      </>
    );
    return (
      <Form {...methods}>
        {mdUp ? (
          <Dialog
            open={modal.visible}
            onOpenChange={modal.handleClose}
            onOpenChangeComplete={(open) => {
              if (!open) {
                modal.handleAnimationEndCapture();
              }
            }}
          >
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle>{title}</DialogTitle>
                <DialogDescription className="sr-only">
                  {description}
                </DialogDescription>
              </DialogHeader>
              {renderForm}
              <DialogFooter>{renderButtons}</DialogFooter>
            </DialogContent>
          </Dialog>
        ) : (
          <Drawer
            open={modal.visible}
            onOpenChange={modal.handleOpenChange}
          >
            <DrawerContent>
              <DrawerHeader className="text-left">
                <DrawerTitle>{title}</DrawerTitle>
                <DrawerDescription className="sr-only">
                  {description}
                </DrawerDescription>
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
