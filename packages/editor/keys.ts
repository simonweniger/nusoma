import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const keys = () =>
  createEnv({
    client: {
      NEXT_PUBLIC_TIPTAP_COLLAB_DOC_PREFIX: z.string().optional(),
      NEXT_PUBLIC_TIPTAP_COLLAB_APP_ID: z.string().optional(),
      NEXT_PUBLIC_TIPTAP_COLLAB_TOKEN: z.string().optional(),
      NEXT_PUBLIC_TIPTAP_AI_APP_ID: z.string().optional(),
      NEXT_PUBLIC_TIPTAP_AI_TOKEN: z.string().optional(),
      NEXT_PUBLIC_TIPTAP_USE_JWT_TOKEN_API_ENDPOINT: z.string().optional()
    },
    runtimeEnv: {
      NEXT_PUBLIC_TIPTAP_COLLAB_DOC_PREFIX:
        process.env.NEXT_PUBLIC_TIPTAP_COLLAB_DOC_PREFIX,
      NEXT_PUBLIC_TIPTAP_COLLAB_APP_ID:
        process.env.NEXT_PUBLIC_TIPTAP_COLLAB_APP_ID,
      NEXT_PUBLIC_TIPTAP_COLLAB_TOKEN:
        process.env.NEXT_PUBLIC_TIPTAP_COLLAB_TOKEN,
      NEXT_PUBLIC_TIPTAP_AI_APP_ID: process.env.NEXT_PUBLIC_TIPTAP_AI_APP_ID,
      NEXT_PUBLIC_TIPTAP_AI_TOKEN: process.env.NEXT_PUBLIC_TIPTAP_AI_TOKEN,
      NEXT_PUBLIC_TIPTAP_USE_JWT_TOKEN_API_ENDPOINT:
        process.env.NEXT_PUBLIC_TIPTAP_USE_JWT_TOKEN_API_ENDPOINT
    }
  });
