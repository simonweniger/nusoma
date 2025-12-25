'use client';

import NiceModal, { type NiceModalHocProps } from '@ebay/nice-modal-react';
import { BuildingIcon, UserIcon } from 'lucide-react';
import { type SubmitHandler } from 'react-hook-form';

import { DocumentRecord } from '@workspace/database/schema';
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
  FormLabel,
  FormMessage
} from '@workspace/ui/components/form';
import { Input } from '@workspace/ui/components/input';
import { RadioCardItem, RadioCards } from '@workspace/ui/components/radio-card';
import { toast } from '@workspace/ui/components/sonner';
import { Spinner } from '@workspace/ui/components/spinner';
import { useMediaQuery } from '@workspace/ui/hooks/use-media-query';
import { MediaQueries } from '@workspace/ui/lib/media-queries';
import { cn } from '@workspace/ui/lib/utils';

import { addDocument } from '~/actions/documents/add-document';
import { useEnhancedModal } from '~/hooks/use-enhanced-modal';
import { useZodForm } from '~/hooks/use-zod-form';
import { documentRecordLabel } from '~/lib/labels';
import {
  addDocumentSchema,
  type AddDocumentSchema
} from '~/schemas/documents/add-document-schema';

export type AddDocumentModalProps = NiceModalHocProps;

export const AddDocumentModal = NiceModal.create<AddDocumentModalProps>(() => {
  const modal = useEnhancedModal();
  const mdUp = useMediaQuery(MediaQueries.MdUp, { ssr: false });
  const methods = useZodForm({
    schema: addDocumentSchema,
    mode: 'onSubmit',
    defaultValues: {
      record: DocumentRecord.PERSON,
      name: '',
      email: '',
      phone: ''
    }
  });
  const title = 'Add document';
  const description = 'Create a new document by filling out the form below.';
  const canSubmit =
    !methods.formState.isSubmitting &&
    (!methods.formState.isSubmitted || methods.formState.isDirty);
  const onSubmit: SubmitHandler<AddDocumentSchema> = async (values) => {
    if (!canSubmit) {
      return;
    }
    const result = await addDocument(values);
    if (!result?.serverError && !result?.validationErrors) {
      toast.success('Document added');
      modal.handleClose();
    } else {
      toast.error("Couldn't add document");
    }
  };
  const renderForm = (
    <form
      className={cn('space-y-4', !mdUp && 'p-4')}
      onSubmit={methods.handleSubmit(onSubmit)}
    >
      <FormField
        control={methods.control}
        name="record"
        render={({ field }) => (
          <FormItem className="flex w-full flex-col">
            <FormLabel>Record</FormLabel>
            <FormControl>
              <RadioCards
                value={field.value}
                onValueChange={field.onChange}
                className="grid grid-cols-1 gap-4 sm:grid-cols-2"
                disabled={methods.formState.isSubmitting}
              >
                {records.map((record) => (
                  <RadioCardItem
                    key={record.value}
                    value={record.value}
                    className="p-3"
                  >
                    <div className="flex flex-row items-center gap-2 px-2 text-sm font-medium">
                      {record.icon}
                      {record.label}
                    </div>
                  </RadioCardItem>
                ))}
              </RadioCards>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={methods.control}
        name="name"
        render={({ field }) => (
          <FormItem className="flex w-full flex-col">
            <FormLabel required>Name</FormLabel>
            <FormControl>
              <Input
                type="text"
                maxLength={64}
                required
                disabled={methods.formState.isSubmitting}
                {...field}
              />
            </FormControl>
            {(methods.formState.touchedFields.name ||
              methods.formState.submitCount > 0) && <FormMessage />}
          </FormItem>
        )}
      />
      <FormField
        control={methods.control}
        name="email"
        render={({ field }) => (
          <FormItem className="flex w-full flex-col">
            <FormLabel>Email</FormLabel>
            <FormControl>
              <Input
                type="email"
                maxLength={255}
                disabled={methods.formState.isSubmitting}
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={methods.control}
        name="phone"
        render={({ field }) => (
          <FormItem className="flex w-full flex-col">
            <FormLabel>Phone</FormLabel>
            <FormControl>
              <Input
                type="tel"
                maxLength={32}
                disabled={methods.formState.isSubmitting}
                {...field}
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
          <DialogContent className="max-w-sm">
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

const records = [
  {
    value: DocumentRecord.PERSON,
    label: documentRecordLabel[DocumentRecord.PERSON],
    icon: <UserIcon className="size-4 shrink-0 text-muted-foreground" />
  },
  {
    value: DocumentRecord.COMPANY,
    label: documentRecordLabel[DocumentRecord.COMPANY],
    icon: <BuildingIcon className="size-4 shrink-0 text-muted-foreground" />
  }
];
