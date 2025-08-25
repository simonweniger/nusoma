import type { JSONContent } from '@tiptap/core';
import { TextTableNode } from './table-node';

export type TextNodeProps = {
  type: string;
  data: {
    generated?: {
      text: string;
    };
    model?: string;
    updatedAt?: string;
    instructions?: string;

    // Tiptap generated JSON content
    content?: JSONContent;

    // Tiptap text content
    text?: string;
  };
  id: string;
};

export const TextNode = (props: TextNodeProps) => (
  <TextTableNode {...props} title="Text" />
);
