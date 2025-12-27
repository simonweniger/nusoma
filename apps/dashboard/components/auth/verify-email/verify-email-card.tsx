'use client';

import * as React from 'react';

import { authClient } from '@workspace/auth/client';
import { routes } from '@workspace/routes';
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
import { toast } from '@workspace/ui/components/sonner';
import { cn } from '@workspace/ui/lib/utils';

export type VerifyEmailCardProps = CardProps & {
  email: string;
};

export function VerifyEmailCard({
  email,
  className,
  ...other
}: VerifyEmailCardProps): React.JSX.Element {
  // Resending email
  const [isResendingEmailVerification, setIsResendingEmailVerification] =
    React.useState<boolean>(false);
  const handleResendEmailVerification = async (): Promise<void> => {
    setIsResendingEmailVerification(true);
    const { error } = await authClient.sendVerificationEmail({
      email,
      callbackURL: routes.dashboard.organizations.Index
    });
    if (!error) {
      toast.success('Email verification resent');
    } else {
      toast.error("Couldn't resend verification");
    }
    setIsResendingEmailVerification(false);
  };

  return (
    <Card
      className={cn('w-full  border-transparent dark:border-border', className)}
      {...other}
    >
      <CardHeader className="px-4 pt-4">
        <CardTitle className="text-base lg:text-lg">
          Please check your email
        </CardTitle>
        <CardDescription>
          Your registration has been successful. We have sent you an email with
          a verification link.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <p className="text-sm text-muted-foreground">
          Click the link in the email to verify your account.
        </p>
      </CardContent>
      <CardFooter className="flex justify-center gap-1 text-sm text-muted-foreground">
        Didn't receive an email?
        <Button
          type="button"
          variant="link"
          className="h-fit px-0.5 py-0 text-foreground underline"
          disabled={isResendingEmailVerification}
          onClick={handleResendEmailVerification}
        >
          Resend
        </Button>
      </CardFooter>
    </Card>
  );
}
