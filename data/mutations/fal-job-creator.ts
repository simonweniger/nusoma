/** biome-ignore-all lint/suspicious/noExplicitAny: needed here */

import { id } from '@instantdb/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/data/query-keys';
import { fal } from '@/lib/fal';
import db from '@/lib/instantdb';

type JobCreatorParams = {
  projectId: string;
  endpointId: string;
  mediaType: 'video' | 'image' | 'voiceover' | 'music';
  input: Record<string, any>;
};

export const useJobCreator = ({
  projectId,
  endpointId,
  mediaType,
  input,
}: JobCreatorParams) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      fal.queue.submit(endpointId, {
        input,
      }),
    onSuccess: async (data) => {
      const mediaItemId = id();

      await db.transact([
        db.tx.mediaItems[mediaItemId]
          .update({
            kind: 'generated',
            endpointId,
            requestId: data.request_id,
            mediaType,
            status: 'pending',
            input,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          })
          .link({ project: projectId }),
      ]);

      queryClient.invalidateQueries({
        queryKey: queryKeys.projectMediaItems(projectId),
      });
    },
  });
};
