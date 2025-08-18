'use client';

import { useClerk, useUser } from '@clerk/nextjs';
import { ArrowUpRight, ArrowUpRightIcon, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type MouseEventHandler, useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useSubscription } from '@/providers/subscription';
import { Profile } from './profile';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';

export const Menu = () => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const router = useRouter();
  const { user } = useUser();
  const { signOut } = useClerk();
  const { isSubscribed } = useSubscription();

  const logout = async () => {
    await signOut();
    router.push('/');
  };

  const handleOpenProfile: MouseEventHandler<HTMLDivElement> = (event) => {
    event.preventDefault();
    setDropdownOpen(false);

    // shadcn/ui issue: dropdown animation causes profile modal to close immediately after opening
    setTimeout(() => {
      setProfileOpen(true);
    }, 200);
  };

  if (!user) {
    return (
      <Button className="rounded-full" disabled size="icon" variant="ghost">
        <Loader2 className="animate-spin" size={16} />
      </Button>
    );
  }

  return (
    <>
      <DropdownMenu onOpenChange={setDropdownOpen} open={dropdownOpen}>
        <DropdownMenuTrigger asChild>
          <Button className="rounded-full" size="icon" variant="ghost">
            <Avatar>
              <AvatarImage src={user?.imageUrl} />
              <AvatarFallback className="bg-primary text-primary-foreground uppercase">
                {user.firstName?.[0] ??
                  user.primaryEmailAddress?.emailAddress?.[0] ??
                  '?'}
                {user.lastName?.[0] ?? ''}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-52"
          collisionPadding={8}
          side="bottom"
          sideOffset={16}
        >
          <DropdownMenuLabel>
            <Avatar>
              <AvatarImage src={user.imageUrl} />
              <AvatarFallback className="bg-primary text-primary-foreground uppercase">
                {user.firstName?.[0] ??
                  user.primaryEmailAddress?.emailAddress?.[0] ??
                  '?'}
                {user.lastName?.[0] ?? ''}
              </AvatarFallback>
            </Avatar>
            <p className="mt-2 truncate">
              {user.fullName ??
                user.primaryEmailAddress?.emailAddress ??
                user.id}
            </p>
            {user.fullName && user.primaryEmailAddress?.emailAddress && (
              <p className="truncate font-normal text-muted-foreground text-xs">
                {user.primaryEmailAddress.emailAddress}
              </p>
            )}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleOpenProfile}>
            Profile
          </DropdownMenuItem>
          {isSubscribed && (
            <DropdownMenuItem asChild className="justify-between">
              <a href="/api/portal" rel="noopener noreferrer" target="_blank">
                Billing{' '}
                <ArrowUpRightIcon className="text-muted-foreground" size={16} />
              </a>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem asChild>
            <Link className="flex items-center justify-between" href="/pricing">
              <span>Upgrade</span>
              <ArrowUpRight className="text-muted-foreground" size={16} />
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <a
              className="flex items-center justify-between"
              href="https://github.com/simonweniger/nusoma"
              rel="noopener noreferrer"
              target="_blank"
            >
              <span>Send feedback</span>
              <ArrowUpRight className="text-muted-foreground" size={16} />
            </a>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={logout}>Logout</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Profile open={profileOpen} setOpen={setProfileOpen} />
    </>
  );
};
