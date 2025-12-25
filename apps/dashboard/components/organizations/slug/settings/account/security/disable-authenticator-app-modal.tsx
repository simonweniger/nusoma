'use client';

import * as React from 'react';
import NiceModal, { type NiceModalHocProps } from '@ebay/nice-modal-react';

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
import { toast } from '@workspace/ui/components/sonner';
import { Spinner } from '@workspace/ui/components/spinner';
import { useMediaQuery } from '@workspace/ui/hooks/use-media-query';
import { MediaQueries } from '@workspace/ui/lib/media-queries';

import { disableAuthenticatorApp } from '~/actions/account/disable-authenticator-app';
import { useEnhancedModal } from '~/hooks/use-enhanced-modal';

export type DisableAuthenticatorAppModalProps = NiceModalHocProps;

export const DisableAuthenticatorAppModal =
  NiceModal.create<DisableAuthenticatorAppModalProps>(() => {
    const modal = useEnhancedModal();
    const mdUp = useMediaQuery(MediaQueries.MdUp, { ssr: false });
    const [isLoading, setIsLoading] = React.useState(false);
    const title = 'Disable authenticator app?';
    const description =
      'The authenticator app will be disabled, are you sure you want to continue?';
    const handleSubmit = async () => {
      setIsLoading(true);
      const result = await disableAuthenticatorApp();
      if (!result?.serverError && !result?.validationErrors) {
        toast.success('Authenticator app disabled');
        modal.handleClose();
      } else {
        toast.error("Couldn't disable authenticator app");
        setIsLoading(false);
      }
    };
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
          disabled={isLoading}
          onClick={handleSubmit}
        >
          {isLoading && <Spinner />}
          {isLoading ? 'Disabling...' : 'Yes, disable'}
        </Button>
      </>
    );
    return (
      <>
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
                <AlertDialogDescription>{description}</AlertDialogDescription>
              </AlertDialogHeader>
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
                <DrawerDescription>{description}</DrawerDescription>
              </DrawerHeader>
              <DrawerFooter className="flex-col-reverse pt-4">
                {renderButtons}
              </DrawerFooter>
            </DrawerContent>
          </Drawer>
        )}
      </>
    );
  });
