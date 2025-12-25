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
import { TextEditor } from '@workspace/ui/components/text-editor';
import { useMediaQuery } from '@workspace/ui/hooks/use-media-query';
import { MediaQueries } from '@workspace/ui/lib/media-queries';
import { cn } from '@workspace/ui/lib/utils';

import { addDocumentNote } from '~/actions/documents/add-document-note';
import { useEnhancedModal } from '~/hooks/use-enhanced-modal';
import { useZodForm } from '~/hooks/use-zod-form';
import { convertHtmlToMarkdown, convertMarkdownToHtml } from '~/lib/markdown';
import {
  addDocumentNoteSchema,
  type AddDocumentNoteSchema
} from '~/schemas/documents/add-document-note-schema';

export type AddDocumentNoteModalProps = NiceModalHocProps & {
  documentId: string;
};

export const AddDocumentNoteModal = NiceModal.create<AddDocumentNoteModalProps>(
  ({ documentId }) => {
    const modal = useEnhancedModal();
    const mdUp = useMediaQuery(MediaQueries.MdUp, { ssr: false });
    const methods = useZodForm({
      schema: addDocumentNoteSchema,
      mode: 'onSubmit',
      defaultValues: {
        documentId,
        text: ''
      }
    });
    const title = 'Add note';
    const description = 'Create a new note by filling out the form below.';
    const canSubmit =
      !methods.formState.isSubmitting &&
      (!methods.formState.isSubmitted || methods.formState.isDirty);
    const onSubmit: SubmitHandler<AddDocumentNoteSchema> = async (values) => {
      if (!canSubmit) {
        return;
      }
      const result = await addDocumentNote(values);
      if (!result?.serverError && !result?.validationErrors) {
        toast.success('Note added');
        modal.handleClose();
      } else {
        toast.error("Couldn't add note");
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
          {...methods.register('documentId')}
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
          disabled={!canSubmit}
          loading={methods.formState.isSubmitting}
          onClick={methods.handleSubmit(onSubmit)}
        >
          Save
        </Button>
      </>
    );
    return (
      <Form {...methods}>
        {mdUp ? (
          <Dialog open={modal.visible}>
            <DialogContent
              className="max-w-xl"
              onClose={modal.handleClose}
              onAnimationEndCapture={modal.handleAnimationEndCapture}
            >
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
  }
);
