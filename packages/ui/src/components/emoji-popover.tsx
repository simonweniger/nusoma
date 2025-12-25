'use client';

import * as React from 'react';
import EmojiPicker, {
  EmojiStyle,
  SkinTones,
  Theme,
  type EmojiClickData
} from 'emoji-picker-react';
import { SmileIcon } from 'lucide-react';

import { Button } from './button';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { Tooltip, TooltipContent, TooltipTrigger } from './tooltip';

export type EmojiPopoverProps = {
  onEmojiSelected: (data: string) => void;
};

export function EmojiPopover({
  onEmojiSelected
}: EmojiPopoverProps): React.JSX.Element {
  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger
          render={
            <PopoverTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 rounded-full"
                >
                  <SmileIcon className="size-5 shrink-0" />
                </Button>
              }
            />
          }
        />
        <TooltipContent>Add emoji</TooltipContent>
      </Tooltip>
      <PopoverContent className="w-fit border-0 p-0">
        <style>
          {`
            .EmojiPickerReact {
              --epr-emoji-size: 20px !important;
            }
          `}
        </style>
        <EmojiPicker
          onEmojiClick={(data: EmojiClickData) => {
            onEmojiSelected?.(data.emoji);
          }}
          autoFocusSearch={false}
          theme={Theme.LIGHT}
          previewConfig={{ showPreview: false }}
          skinTonesDisabled
          defaultSkinTone={SkinTones.NEUTRAL}
          emojiStyle={EmojiStyle.NATIVE}
        />
      </PopoverContent>
    </Popover>
  );
}
