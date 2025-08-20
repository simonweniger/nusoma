import { useMemo } from 'react';
import db from '@/lib/instantdb';
import { useProject } from '@/providers/project';
import { useMediaPolling } from './use-media-polling';

type UseNodeMediaStatusProps = {
  nodeId: string;
  mediaType: 'image' | 'video' | 'music' | 'voiceover';
};

export const useNodeMediaStatus = ({
  nodeId,
  mediaType,
}: UseNodeMediaStatusProps) => {
  const { project } = useProject();

  // Query media items for this node
  const { data: queryResult } = db.useQuery({
    mediaItems: {
      $: {
        where: {
          'project.id': project?.id || '',
          mediaType,
        },
        order: { createdAt: 'desc' },
        limit: 1,
      },
    },
  });

  const latestMedia = queryResult?.mediaItems?.[0];

  // Poll the latest media item if it's not completed
  const { data: pollingData } = useMediaPolling({
    mediaItem: latestMedia,
    enabled:
      !!latestMedia &&
      latestMedia.status !== 'completed' &&
      latestMedia.status !== 'failed',
  });

  const status = useMemo(() => {
    if (!latestMedia) {
      return null;
    }

    return {
      id: latestMedia.id,
      status: latestMedia.status || 'pending',
      mediaType: latestMedia.mediaType,
      url: latestMedia.url,
      createdAt: latestMedia.createdAt,
      isGenerating:
        latestMedia.status === 'pending' || latestMedia.status === 'running',
      isCompleted: latestMedia.status === 'completed',
      isFailed: latestMedia.status === 'failed',
    };
  }, [latestMedia]);

  return {
    status,
    latestMedia,
    pollingData,
  };
};
