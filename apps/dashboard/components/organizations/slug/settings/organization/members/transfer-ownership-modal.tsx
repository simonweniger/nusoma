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
import { Form } from '@workspace/ui/components/form';
import { toast } from '@workspace/ui/components/sonner';
import { Spinner } from '@workspace/ui/components/spinner';
import { useMediaQuery } from '@workspace/ui/hooks/use-media-query';
import { MediaQueries } from '@workspace/ui/lib/media-queries';
import { cn } from '@workspace/ui/lib/utils';

import { transferOwnership } from '~/actions/members/transfer-ownership';
import { useEnhancedModal } from '~/hooks/use-enhanced-modal';
import { useZodForm } from '~/hooks/use-zod-form';
import {
  transferOwnershipSchema,
  type TransferOwnershipSchema
} from '~/schemas/members/transfer-ownership-schema';
import type { MemberDto } from '~/types/dtos/member-dto';

export type TransferOwnershipModalProps = NiceModalHocProps & {
  member: MemberDto;
};

export const TransferOwnershipModal =
  NiceModal.create<TransferOwnershipModalProps>(({ member }) => {
    const modal = useEnhancedModal();
    const mdUp = useMediaQuery(MediaQueries.MdUp, { ssr: false });
    const methods = useZodForm({
      schema: transferOwnershipSchema,
      mode: 'onSubmit',
      defaultValues: {
        targetId: member.id
      }
    });
    const title = 'Transfer ownership?';
    const canSubmit =
      !methods.formState.isSubmitting &&
      (!methods.formState.isSubmitted || methods.formState.isDirty);
    const onSubmit: SubmitHandler<TransferOwnershipSchema> = async (values) => {
      if (!canSubmit) {
        return;
      }
      const result = await transferOwnership(values);
      if (!result?.serverError && !result?.validationErrors) {
        toast.success('Ownership transfered');
        modal.handleClose();
      } else {
        toast.error("Couldn't transfer ownership");
      }
    };
    const renderDescription = (
      <>
        Are you sure you want to transfer ownership to{' '}
        <strong className="text-foreground font-medium">{member.name}</strong>?
        You will lose all owner privileges.
      </>
    );
    const renderForm = (
      <form
        className={cn('flex flex-col gap-4', !mdUp && 'p-4')}
        onSubmit={methods.handleSubmit(onSubmit)}
      >
        <input
          type="hidden"
          className="hidden"
          disabled={methods.formState.isSubmitting}
          {...methods.register('targetId')}
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
          {methods.formState.isSubmitting
            ? 'Transferring...'
            : 'Confirm transfer'}
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
                <DialogDescription>{renderDescription}</DialogDescription>
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
