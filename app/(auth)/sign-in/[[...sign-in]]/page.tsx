import { SignIn } from '@clerk/nextjs';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign In | nusoma',
  description: 'Sign in to your nusoma account',
};

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <SignIn
        afterSignInUrl="/projects"
        appearance={{
          elements: {
            formButtonPrimary:
              'bg-primary text-primary-foreground hover:bg-primary/90',
            card: 'shadow-lg',
          },
        }}
        signUpUrl="/sign-up"
      />
    </div>
  );
}
