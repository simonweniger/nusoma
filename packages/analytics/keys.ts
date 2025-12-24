import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const keys = () =>
  createEnv({
    client: {
      // Google Analytics
      NEXT_PUBLIC_ANALYTICS_GA_MEASUREMENT_ID: z.string().optional(),
      NEXT_PUBLIC_ANALYTICS_GA_DISABLE_LOCALHOST_TRACKING: z.coerce.boolean(),
      NEXT_PUBLIC_ANALYTICS_GA_DISABLE_PAGE_VIEWS_TRACKING: z.coerce.boolean(),

      // PostHog
      NEXT_PUBLIC_ANALYTICS_POSTHOG_KEY: z.string().optional(),
      NEXT_PUBLIC_ANALYTICS_POSTHOG_HOST: z.string().optional(),
    },
    runtimeEnv: {
      // Google Analytics
      NEXT_PUBLIC_ANALYTICS_GA_MEASUREMENT_ID:
        process.env.NEXT_PUBLIC_ANALYTICS_GA_MEASUREMENT_ID,
      NEXT_PUBLIC_ANALYTICS_GA_DISABLE_LOCALHOST_TRACKING:
        process.env.NEXT_PUBLIC_ANALYTICS_GA_DISABLE_LOCALHOST_TRACKING,
      NEXT_PUBLIC_ANALYTICS_GA_DISABLE_PAGE_VIEWS_TRACKING:
        process.env.NEXT_PUBLIC_ANALYTICS_GA_DISABLE_PAGE_VIEWS_TRACKING,

      // PostHog
      NEXT_PUBLIC_ANALYTICS_POSTHOG_KEY:
        process.env.NEXT_PUBLIC_ANALYTICS_POSTHOG_KEY,
      NEXT_PUBLIC_ANALYTICS_POSTHOG_HOST:
        process.env.NEXT_PUBLIC_ANALYTICS_POSTHOG_HOST,
    }
  });
