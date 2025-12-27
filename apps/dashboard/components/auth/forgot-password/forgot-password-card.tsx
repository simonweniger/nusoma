'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircleIcon, MailIcon } from 'lucide-react';
import { type SubmitHandler } from 'react-hook-form';

import { authClient } from '@workspace/auth/client';
import { routes } from '@workspace/routes';
import { Alert, AlertDescription } from '@workspace/ui/components/alert';
import { Button } from '@workspace/ui/components/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  type CardProps
} from '@workspace/ui/components/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@workspace/ui/components/form';
import { InputWithAdornments } from '@workspace/ui/components/input-with-adornments';
import { Spinner } from '@workspace/ui/components/spinner';
import { cn } from '@workspace/ui/lib/utils';

import { useZodForm } from '~/hooks/use-zod-form';
import {
  sendResetPasswordInstructionsSchema,
  type SendResetPasswordInstructionsSchema
} from '~/schemas/auth/send-reset-password-instructions-schema';

export function ForgotPasswordCard({
  className,
  ...other
}: CardProps): React.JSX.Element {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = React.useState<string>();
  const methods = useZodForm({
    schema: sendResetPasswordInstructionsSchema,
    mode: 'onSubmit',
    defaultValues: {
      email: ''
    }
  });
  const canSubmit = !methods.formState.isSubmitting;
  const onSubmit: SubmitHandler<SendResetPasswordInstructionsSchema> = async (
    values
  ) => {
    if (!canSubmit) {
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (authClient as any).forgetPassword({
      email: values.email,
      redirectTo:
        window.location.origin +
        routes.dashboard.auth.resetPassword.Index.replace('[requestId]', '')
    });

    if (!error) {
      setErrorMessage(undefined);
      router.replace(
        `${routes.dashboard.auth.forgetPassword.Success}?email=${values.email}`
      );
    } else {
      setErrorMessage(error.message || "Couldn't request password change");
    }
  };
  return (
    <Card
      className={cn('w-full border-transparent dark:border-border', className)}
      {...other}
    >
      <CardHeader>
        <CardTitle className="text-base lg:text-lg">
          Forgot your password?
        </CardTitle>
        <CardDescription>
          No worries! We'll send you a link with instructions on how to reset
          your password.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...methods}>
          <form
            onSubmit={methods.handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
          >
            <FormField
              control={methods.control}
              name="email"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <InputWithAdornments
                      {...field}
                      type="email"
                      maxLength={255}
                      autoCapitalize="off"
                      autoComplete="username"
                      startAdornment={<MailIcon className="size-4 shrink-0" />}
                      disabled={methods.formState.isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {errorMessage && (
              <Alert variant="destructive">
                <AlertCircleIcon className="size-[18px] shrink-0" />
                <AlertDescription className="inline">
                  {errorMessage}
                </AlertDescription>
              </Alert>
            )}
            <Button
              type="submit"
              variant="default"
              className="w-full"
              disabled={!canSubmit}
              onClick={methods.handleSubmit(onSubmit)}
            >
              {methods.formState.isSubmitting && <Spinner />}
              {methods.formState.isSubmitting
                ? 'Sending instructions...'
                : 'Send instructions'}
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex justify-center gap-1 text-sm text-muted-foreground">
        <span>Remembered your password?</span>
        <Link
          href={routes.dashboard.auth.SignIn}
          className="text-foreground underline"
        >
          Sign in
        </Link>
      </CardFooter>
    </Card>
  );
}
