'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

import { authClient } from '@workspace/auth/client';
import { routes } from '@workspace/routes';
import { Button, type ButtonProps } from '@workspace/ui/components/button';

export function SignOutButton(props: ButtonProps): React.JSX.Element {
  const router = useRouter();
  const handleSignOut = async (): Promise<void> => {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push(routes.dashboard.auth.SignIn);
        }
      }
    });
  };
  return (
    <Button
      {...props}
      onClick={(e) => {
        props.onClick?.(e);
        handleSignOut();
      }}
    />
  );
}
