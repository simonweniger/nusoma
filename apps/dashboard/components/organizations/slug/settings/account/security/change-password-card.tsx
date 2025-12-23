'use client';

import * as React from 'react';
import { EyeIcon, LockIcon } from 'lucide-react';
import { type SubmitHandler } from 'react-hook-form';

import { authClient } from '@workspace/auth/client';
import { Alert, AlertDescription } from '@workspace/ui/components/alert';
import { Button } from '@workspace/ui/components/button';
import {
  Card,
  CardContent,
  CardFooter,
  type CardProps
} from '@workspace/ui/components/card';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormProvider
} from '@workspace/ui/components/form';
import { InputPassword } from '@workspace/ui/components/input-password';
import { InputWithAdornments } from '@workspace/ui/components/input-with-adornments';
import { Separator } from '@workspace/ui/components/separator';
import { toast } from '@workspace/ui/components/sonner';

import { PasswordFormMessage } from '~/components/auth/password-form-message';
import { useZodForm } from '~/hooks/use-zod-form';
import {
  changePasswordSchema,
  type ChangePasswordSchema
} from '~/schemas/account/change-password-schema';

type ChangePasswordCardProps = CardProps & {
  hasPasswordSet: boolean;
};

export function ChangePasswordCard({
  hasPasswordSet,
  ...other
}: ChangePasswordCardProps): React.JSX.Element {
  const methods = useZodForm({
    schema: changePasswordSchema,
    mode: 'onSubmit',
    defaultValues: {
      hasPasswordSet,
      currentPassword: '',
      newPassword: '',
      verifyPassword: ''
    }
  });

  const [errorMessage, setErrorMessage] = React.useState<string>();
  const canSubmit = !methods.formState.isSubmitting;

  const onSubmit: SubmitHandler<ChangePasswordSchema> = async (values) => {
    if (!canSubmit) {
      return;
    }
    const { error } = await authClient.changePassword({
      newPassword: values.newPassword,
      currentPassword: values.currentPassword || ''
    });

    if (!error) {
      toast.success(hasPasswordSet ? 'Password changed!' : 'Password set!');
      setErrorMessage('');
      methods.reset({
        hasPasswordSet: true,
        currentPassword: '',
        newPassword: '',
        verifyPassword: ''
      });
    } else {
      setErrorMessage(
        error.message || "Couldn't change password. Please try again."
      );
    }
  };

  return (
    <FormProvider {...methods}>
      <Card {...other}>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={methods.handleSubmit(onSubmit)}
          >
            <FormField
              control={methods.control}
              name="currentPassword"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Current password</FormLabel>
                  <FormControl>
                    {hasPasswordSet ? (
                      <InputPassword
                        maxLength={72}
                        autoCapitalize="off"
                        startAdornment={
                          <LockIcon className="size-4 shrink-0" />
                        }
                        disabled={methods.formState.isSubmitting}
                        {...field}
                      />
                    ) : (
                      <InputWithAdornments
                        disabled
                        type="password"
                        autoCapitalize="off"
                        placeholder="No password set yet."
                        startAdornment={
                          <LockIcon className="size-4 shrink-0" />
                        }
                        endAdornment={
                          <Button
                            disabled
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label="Toggle password visibility"
                            className="-mr-2.5 size-8"
                          >
                            <EyeIcon className="size-4 shrink-0" />
                          </Button>
                        }
                      />
                    )}
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={methods.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>New password</FormLabel>
                  <FormControl>
                    <InputPassword
                      maxLength={72}
                      autoCapitalize="off"
                      autoComplete="new-password"
                      startAdornment={<LockIcon className="size-4 shrink-0" />}
                      disabled={methods.formState.isSubmitting}
                      {...field}
                    />
                  </FormControl>
                  <PasswordFormMessage
                    password={methods.watch('newPassword')}
                  />
                </FormItem>
              )}
            />
            <FormField
              control={methods.control}
              name="verifyPassword"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Verify password</FormLabel>
                  <FormControl>
                    <InputPassword
                      maxLength={72}
                      autoCapitalize="off"
                      autoComplete="new-password"
                      startAdornment={<LockIcon className="size-4 shrink-0" />}
                      disabled={methods.formState.isSubmitting}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {errorMessage && (
              <Alert variant="destructive">
                <AlertDescription className="inline">
                  {errorMessage}
                </AlertDescription>
              </Alert>
            )}
          </form>
        </CardContent>
        <Separator />
        <CardFooter className="flex w-full justify-end">
          <Button
            type="button"
            variant="default"
            size="default"
            disabled={!canSubmit}
            loading={methods.formState.isSubmitting}
            onClick={methods.handleSubmit(onSubmit)}
          >
            Change
          </Button>
        </CardFooter>
      </Card>
    </FormProvider>
  );
}
