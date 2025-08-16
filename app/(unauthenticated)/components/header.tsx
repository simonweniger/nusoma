import Link from 'next/link';
import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';
import { currentUser } from '@/lib/auth';

export const Header = async () => {
  const user = await currentUser();

  return (
    <header className="flex items-center justify-between px-8">
      <Link className="flex items-center gap-2" href="/">
        <Logo className="h-6 w-auto" title="nusoma" />
        <span className="mb-1 font-semibold text-xl tracking-tight">
          nusoma
        </span>
      </Link>
      <div className="flex items-center gap-2">
        <Button asChild className="text-muted-foreground" variant="link">
          <Link href="/pricing">Pricing</Link>
        </Button>
        {user ? (
          <Button asChild variant="outline">
            <Link href="/">Go to app</Link>
          </Button>
        ) : (
          <>
            <Button asChild variant="outline">
              <Link href="/auth/login">Login</Link>
            </Button>
            <Button asChild>
              <Link href="/auth/sign-up">Sign up</Link>
            </Button>
          </>
        )}
      </div>
    </header>
  );
};
