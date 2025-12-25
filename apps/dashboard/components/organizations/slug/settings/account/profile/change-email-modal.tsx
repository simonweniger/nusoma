'use client';

import NiceModal, { type NiceModalHocProps } from '@ebay/nice-modal-react';
import { type SubmitHandler } from 'react-hook-form';

import { authClient } from '@workspace/auth/client';
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
import { toast } from '@workspace/ui/components/sonner';
import { useMediaQuery } from '@workspace/ui/hooks/use-media-query';
import { MediaQueries } from '@workspace/ui/lib/media-queries';
import { cn } from '@workspace/ui/lib/utils';

import { useEnhancedModal } from '~/hooks/use-enhanced-modal';
import { useZodForm } from '~/hooks/use-zod-form';
import {
  requestEmailChangeSchema,
  type RequestEmailChangeSchema
} from '~/schemas/account/request-email-change-schema';

export type ChangeEmailModalProps = NiceModalHocProps & {
  currentEmail: string;
};

export const ChangeEmailModal = NiceModal.create<ChangeEmailModalProps>(
  ({ currentEmail }) => {
    const modal = useEnhancedModal();
    const mdUp = useMediaQuery(MediaQueries.MdUp, { ssr: false });
    const methods = useZodForm({
      schema: requestEmailChangeSchema,
      mode: 'onSubmit',
      defaultValues: {
        email: ''
      }
    });
    const title = 'Change email address';
    const description = 'Enter your new email address and verify it';
    const canSubmit =
      !methods.formState.isSubmitting &&
      (!methods.formState.isSubmitted || methods.formState.isDirty);

    const onSubmit: SubmitHandler<RequestEmailChangeSchema> = async (
      values
    ) => {
      if (!canSubmit) {
        return;
      }
      const { error } = await authClient.changeEmail({
        newEmail: values.email
      });
      if (!error) {
        toast.success('Change request sent');
        modal.hide();
      } else {
        if (error.code === 'USER_ALREADY_EXISTS') {
          methods.setError('email', {
            message: 'Email address is already taken.'
          });
        } else {
          toast.error(error.message || "Couldn't send request");
        }
      }
    };
    const renderForm = (
      <form
        className={cn('space-y-4', !mdUp && 'p-4')}
        onSubmit={methods.handleSubmit(onSubmit)}
      >
        <div className="flex flex-col gap-2 pt-2">
          <FormLabel required>Current email address</FormLabel>
          <Input
            type="email"
            required
            disabled
            value={currentEmail}
          />
        </div>
        <FormField
          control={methods.control}
          name="email"
          render={({ field }) => (
            <FormItem className="flex w-full flex-col">
              <FormLabel required>New email address</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  maxLength={255}
                  required
                  disabled={methods.formState.isSubmitting}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <p className="text-sm text-muted-foreground">
          We will send a change request to your new email address. After
          clicking on the link in the email, you will be automatically logged
          out and and will need to sign in again with your new email address.
        </p>
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
          Request change
        </Button>
      </>
    );
    return (
      <Form {...methods}>
        {mdUp ? (
          <Dialog open={modal.visible}>
            <DialogContent
              className="max-w-sm"
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
