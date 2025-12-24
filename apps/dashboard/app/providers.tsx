'use client';

import * as React from 'react';
import NiceModal from '@ebay/nice-modal-react';
import { Analytics as VercelAnalytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { NuqsAdapter } from 'nuqs/adapters/next/app';

import { AnalyticsProvider } from '@workspace/analytics/hooks/use-analytics';
import { MonitoringProvider } from '@workspace/monitoring/hooks/use-monitoring';
import { TooltipProvider } from '@workspace/ui/components/tooltip';
import { ThemeProvider } from '@workspace/ui/hooks/use-theme';

export function Providers({
  children
}: React.PropsWithChildren): React.JSX.Element {
  return (
    <MonitoringProvider>
      <SpeedInsights />
      <VercelAnalytics />
      <AnalyticsProvider>
        <NuqsAdapter>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <TooltipProvider>
              <NiceModal.Provider>{children}</NiceModal.Provider>
            </TooltipProvider>
          </ThemeProvider>
        </NuqsAdapter>
      </AnalyticsProvider>
    </MonitoringProvider>
  );
}
