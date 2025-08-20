'use client';

import { Controls as FlowControls } from '@xyflow/react';
import { memo } from 'react';
import { ThemeSwitcher } from './theme-switcher';

export const ControlsInner = () => (
  <FlowControls
    className="flex-col! rounded-2xl border bg-card/90 p-1 shadow-none! drop-shadow-xs backdrop-blur-sm sm:flex-row!"
    orientation="horizontal"
    showInteractive={false}
  >
    <ThemeSwitcher />
  </FlowControls>
);

export const Controls = memo(ControlsInner);
