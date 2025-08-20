'use client';

/**
 * Real-time credit counter component that displays user's remaining credits
 *
 * Features:
 * - Real-time updates via InstantDB queries
 * - Manual refresh button to sync with Stripe
 * - Displays remaining credits or overage
 * - Shows upgrade button for hobby plan users with no credits
 *
 * Credit tracking:
 * - Credits are stored in the user's profile in InstantDB
 * - Usage is tracked automatically when AI features are used
 * - Syncs with Stripe for billing purposes
 */

import NumberFlow from '@number-flow/react';
import { CoinsIcon, Loader2Icon, RefreshCwIcon } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { syncCredits } from '@/app/actions/credits/sync';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import db from '@/lib/instantdb';
import { useSubscription } from '@/providers/subscription';

const pluralize = (count: number) => (count === 1 ? 'credit' : 'credits');

const HOBBY_CREDITS = 200;

export const CreditCounter = () => {
  const subscription = useSubscription();
  const { isSignedIn, isLoaded } = useAuth();
  const instantUser = db.useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Query the current user's profile with credits info
  const { data: profileData, isLoading } = db.useQuery(
    isSignedIn && isLoaded && instantUser.user
      ? {
          profiles: {
            $: { where: { 'user.id': instantUser.user.id } },
          },
        }
      : {}
  );

  if (!isLoaded) {
    return <Loader2Icon className="size-4 animate-spin" size={16} />;
  }

  if (!isSignedIn) {
    return <Loader2Icon className="size-4 animate-spin" size={16} />;
  }

  if (isLoading) {
    return <Loader2Icon className="size-4 animate-spin" size={16} />;
  }

  const profile = profileData?.profiles?.[0];

  if (!profile) {
    return null;
  }

  // Calculate remaining credits
  const totalCredits = profile.credits ?? HOBBY_CREDITS;
  const usedCredits = profile.creditUsage ?? 0;
  const remainingCredits = totalCredits - usedCredits;

  const label = pluralize(Math.abs(remainingCredits));

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await syncCredits();
      // The real-time query will automatically update
    } catch (error) {
      console.error('Failed to sync credits:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="flex shrink-0 items-center gap-2 px-2 text-muted-foreground">
      <CoinsIcon size={16} />
      <NumberFlow
        className="text-nowrap text-sm"
        suffix={
          remainingCredits < 0 ? ` ${label} in overage` : ` ${label} remaining`
        }
        value={Math.abs(remainingCredits)}
      />
      <Button
        className="h-6 w-6 rounded-full"
        disabled={isRefreshing}
        onClick={handleRefresh}
        size="icon"
        title="Refresh credits"
        variant="ghost"
      >
        <RefreshCwIcon
          className={isRefreshing ? 'animate-spin' : ''}
          size={12}
        />
      </Button>
      {remainingCredits <= 0 && subscription.plan === 'hobby' && (
        <Button asChild className="-my-2 -mr-3 ml-1 rounded-full" size="sm">
          <Link href="/pricing">Upgrade</Link>
        </Button>
      )}
    </div>
  );
};
