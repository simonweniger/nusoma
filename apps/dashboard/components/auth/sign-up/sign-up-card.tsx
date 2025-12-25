'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircleIcon, LockIcon, MailIcon, UserIcon } from 'lucide-react';
import { type SubmitHandler } from 'react-hook-form';

import { authClient } from '@workspace/auth/client';
import { routes } from '@workspace/routes';
import { Alert, AlertDescription } from '@workspace/ui/components/alert';
import {
  GoogleIcon,
  MicrosoftIcon
} from '@workspace/ui/components/brand-icons';
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
import { InputPassword } from '@workspace/ui/components/input-password';
import { InputWithAdornments } from '@workspace/ui/components/input-with-adornments';
import { toast } from '@workspace/ui/components/sonner';
import { Spinner } from '@workspace/ui/components/spinner';
import { cn } from '@workspace/ui/lib/utils';

import { OrContinueWith } from '~/components/auth/or-continue-with';
import { PasswordFormMessage } from '~/components/auth/password-form-message';
import { useZodForm } from '~/hooks/use-zod-form';
import { signUpSchema, type SignUpSchema } from '~/schemas/auth/sign-up-schema';

export function SignUpCard({
  className,
  ...other
}: CardProps): React.JSX.Element {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = React.useState<string>();
  const methods = useZodForm({
    schema: signUpSchema,
    mode: 'onSubmit',
    defaultValues: {
      name: '',
      email: '',
      password: ''
    }
  });
  const password = methods.watch('password');
  const onSubmit: SubmitHandler<SignUpSchema> = async (values) => {
    setErrorMessage(undefined);
    const { error } = await authClient.signUp.email({
      email: values.email,
      password: values.password,
      name: values.name,
      callbackURL: routes.dashboard.organizations.Index
    });

    if (error) {
      setErrorMessage(error.message || 'An error occurred during sign up.');
    } else {
      router.push(
        `${routes.dashboard.auth.verifyEmail.Index}?email=${values.email}`
      );
    }
  };

  const handleSignInWithGoogle = async (): Promise<void> => {
    const { error } = await authClient.signIn.social({
      provider: 'google',
      callbackURL: routes.dashboard.organizations.Index
    });
    if (error) {
      toast.error(error.message || 'An error occurred during Google sign up.');
    }
  };

  const handleSignInWithMicrosoft = async (): Promise<void> => {
    const { error } = await authClient.signIn.social({
      provider: 'microsoft',
      callbackURL: routes.dashboard.organizations.Index
    });
    if (error) {
      toast.error(
        error.message || 'An error occurred during Microsoft sign up.'
      );
    }
  };

  return (
    <Card
      className={cn('w-full border-transparent dark:border-border', className)}
      {...other}
    >
      <CardHeader>
        <CardTitle className="text-base lg:text-lg">
          Create your account
        </CardTitle>
        <CardDescription>
          Please fill in the details to get started.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Form {...methods}>
          <form
            className="flex flex-col gap-4"
            onSubmit={methods.handleSubmit(onSubmit)}
          >
            <FormField
              control={methods.control}
              name="name"
              render={({ field }) => (
                <FormItem className="flex w-full flex-col">
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <InputWithAdornments
                      type="text"
                      maxLength={64}
                      autoComplete="name"
                      disabled={methods.formState.isSubmitting}
                      startAdornment={<UserIcon className="size-4 shrink-0" />}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
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
                    <InputWithAdornments
                      type="email"
                      maxLength={255}
                      autoComplete="username"
                      disabled={methods.formState.isSubmitting}
                      startAdornment={<MailIcon className="size-4 shrink-0" />}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex flex-col">
              <FormField
                control={methods.control}
                name="password"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <InputPassword
                        maxLength={72}
                        autoCapitalize="off"
                        autoComplete="current-password"
                        disabled={methods.formState.isSubmitting}
                        startAdornment={
                          <LockIcon className="size-4 shrink-0" />
                        }
                        {...field}
                      />
                    </FormControl>
                    <PasswordFormMessage password={password} />
                  </FormItem>
                )}
              />
            </div>
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
              className="w-full"
              disabled={methods.formState.isSubmitting}
            >
              {methods.formState.isSubmitting ? (
                <div className="flex items-center gap-2">
                  <Spinner size="small" />
                  <span>Creating account...</span>
                </div>
              ) : (
                <span>Create account</span>
              )}
            </Button>
          </form>
        </Form>
        <OrContinueWith />
        <div className="flex gap-4">
          <Button
            type="button"
            variant="outline"
            className="flex flex-1 items-center gap-2"
            disabled={methods.formState.isSubmitting}
            onClick={handleSignInWithGoogle}
          >
            <GoogleIcon
              width="20"
              height="20"
            />
            Google
          </Button>
          <Button
            type="button"
            variant="outline"
            className="flex flex-1 items-center gap-2"
            disabled={methods.formState.isSubmitting}
            onClick={handleSignInWithMicrosoft}
          >
            <MicrosoftIcon
              width="20"
              height="20"
            />
            Microsoft
          </Button>
        </div>
      </CardContent>
      <CardFooter className="flex items-center justify-center gap-2">
        <span>Already have an account? </span>
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
