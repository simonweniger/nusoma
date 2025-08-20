import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { MediaItems } from '@/instant.schema';
import { fal } from '@/lib/fal';
import { getMediaUrlFromOutput } from '@/lib/fal-integration';
import db from '@/lib/instantdb';

type UseMediaPollingProps = {
  mediaItem: MediaItems | null | undefined;
  enabled?: boolean;
};

export const useMediaPolling = ({
  mediaItem,
  enabled = true,
}: UseMediaPollingProps) => {
  const isDone =
    !mediaItem ||
    mediaItem.status === 'completed' ||
    mediaItem.status === 'failed';

  return useQuery({
    queryKey: ['media-polling', mediaItem?.id || 'no-media'],
    queryFn: async () => {
      if (!mediaItem || mediaItem.kind === 'uploaded' || !mediaItem.requestId)
        return null;

      try {
        const queueStatus = await fal.queue.status(mediaItem.endpointId || '', {
          requestId: mediaItem.requestId,
        });

        // Update status to running if in progress
        if (
          queueStatus.status === 'IN_PROGRESS' &&
          mediaItem.status !== 'running'
        ) {
          await db.transact([
            db.tx.mediaItems[mediaItem.id].update({
              status: 'running',
              updatedAt: Date.now(),
            }),
          ]);
        }

        // Handle completion
        if (queueStatus.status === 'COMPLETED') {
          try {
            const result = await fal.queue.result(mediaItem.endpointId || '', {
              requestId: mediaItem.requestId,
            });

            // Extract URL from result
            const mediaUrl = getMediaUrlFromOutput(
              result,
              mediaItem.mediaType || 'image'
            );

            // Update media item with result
            await db.transact([
              db.tx.mediaItems[mediaItem.id].update({
                status: 'completed',
                output: result,
                url: mediaUrl,
                updatedAt: Date.now(),
              }),
            ]);

            toast.success(
              `${mediaItem.mediaType || 'Media'} generated successfully!`
            );
          } catch (error) {
            await db.transact([
              db.tx.mediaItems[mediaItem.id].update({
                status: 'failed',
                updatedAt: Date.now(),
              }),
            ]);
            toast.error(`Failed to generate ${mediaItem.mediaType || 'media'}`);
          }
        }

        // Handle failure
        if (queueStatus.status === 'FAILED') {
          await db.transact([
            db.tx.mediaItems[mediaItem.id].update({
              status: 'failed',
              updatedAt: Date.now(),
            }),
          ]);
          toast.error(`${mediaItem.mediaType || 'Media'} generation failed`);
        }

        return queueStatus;
      } catch (error) {
        console.error('Polling error:', error);
        return null;
      }
    },
    enabled:
      enabled &&
      !isDone &&
      !!mediaItem &&
      mediaItem.kind === 'generated' &&
      !!mediaItem.requestId,
    refetchInterval: (data, query) => {
      // Use longer intervals for video, shorter for images
      const baseInterval = mediaItem?.mediaType === 'video' ? 20_000 : 5000;

      // Exponential backoff for failed attempts
      const failureCount = query?.state?.errorUpdateCount || 0;
      return baseInterval * 1.5 ** Math.min(failureCount, 5);
    },
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30_000),
  });
};
