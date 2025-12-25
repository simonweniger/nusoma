'use client';

import NiceModal, { type NiceModalHocProps } from '@ebay/nice-modal-react';
import { type SubmitHandler } from 'react-hook-form';

import { DocumentTaskStatus } from '@workspace/database/schema';
import { Button } from '@workspace/ui/components/button';
import { DatePicker } from '@workspace/ui/components/date-picker';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@workspace/ui/components/select';
import { toast } from '@workspace/ui/components/sonner';
import { Textarea } from '@workspace/ui/components/textarea';
import { useMediaQuery } from '@workspace/ui/hooks/use-media-query';
import { MediaQueries } from '@workspace/ui/lib/media-queries';
import { cn } from '@workspace/ui/lib/utils';

import { updateDocumentTask } from '~/actions/documents/update-document-task';
import { useEnhancedModal } from '~/hooks/use-enhanced-modal';
import { useZodForm } from '~/hooks/use-zod-form';
import {
  updateDocumentTaskSchema,
  type UpdateDocumentTaskSchema
} from '~/schemas/documents/update-document-task-schema';
import type { DocumentTaskDto } from '~/types/dtos/document-task-dto';

export type EditDocumentTaskModalProps = NiceModalHocProps & {
  task: DocumentTaskDto;
};

export const EditDocumentTaskModal =
  NiceModal.create<EditDocumentTaskModalProps>(({ task }) => {
    const modal = useEnhancedModal();
    const mdUp = useMediaQuery(MediaQueries.MdUp, { ssr: false });
    const methods = useZodForm({
      schema: updateDocumentTaskSchema,
      mode: 'onSubmit',
      defaultValues: {
        id: task.id,
        title: task.title,
        dueDate: task.dueDate,
        status: task.status,
        description: task.description ?? ''
      }
    });
    const title = 'Edit task';
    const description = 'Edit the task by changing the form fields below.';
    const canSubmit =
      !methods.formState.isSubmitting &&
      (!methods.formState.isSubmitted || methods.formState.isDirty);
    const onSubmit: SubmitHandler<UpdateDocumentTaskSchema> = async (
      values
    ) => {
      if (!canSubmit) {
        return;
      }
      const result = await updateDocumentTask(values);
      if (!result?.serverError && !result?.validationErrors) {
        toast.success('Task udpated');
        modal.handleClose();
      } else {
        toast.error("Couldn't update task");
      }
    };
    const renderForm = (
      <form
        className={cn('space-y-4', !mdUp && 'p-4')}
        onSubmit={methods.handleSubmit(onSubmit)}
      >
        <FormField
          control={methods.control}
          name="title"
          render={({ field }) => (
            <FormItem className="flex w-full flex-col">
              <FormLabel required>Title</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="text"
                  maxLength={64}
                  required
                  disabled={methods.formState.isSubmitting}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex flex-row space-x-4">
          <FormField
            control={methods.control}
            name="status"
            render={({ field }) => (
              <FormItem className="flex w-full flex-col">
                <FormLabel>Status</FormLabel>
                <FormControl>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={methods.formState.isSubmitting}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={DocumentTaskStatus.OPEN}>
                        <div className="flex flex-row items-center gap-1.5">
                          <div className="size-2 shrink-0 rounded-full bg-red-600" />
                          <span>Open</span>
                        </div>
                      </SelectItem>
                      <SelectItem value={DocumentTaskStatus.COMPLETED}>
                        <div className="flex flex-row items-center gap-1.5">
                          <div className="size-2 shrink-0 rounded-full bg-green-600" />
                          <span>Completed</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={methods.control}
            name="dueDate"
            render={({ field }) => (
              <FormItem className="flex w-full flex-col">
                <FormLabel>Due date</FormLabel>
                <FormControl>
                  <DatePicker
                    date={field.value}
                    onDateChange={field.onChange}
                    disabled={methods.formState.isSubmitting}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={methods.control}
          name="description"
          render={({ field }) => (
            <FormItem className="flex w-full flex-col">
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  maxLength={8000}
                  required
                  rows={4}
                  disabled={methods.formState.isSubmitting}
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
              className="max-w-md"
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
  });
