import { useQuery, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import {
  CircleXIcon,
  GripVerticalIcon,
  HourglassIcon,
  ImageIcon,
  MicIcon,
  MusicIcon,
  VideoIcon,
} from 'lucide-react';
import {
  createElement,
  type DragEventHandler,
  Fragment,
  type HTMLAttributes,
} from 'react';
import { Badge } from '@/components/ui/badge';
import { LoadingIcon } from '@/components/ui/loading-icon';
import { db } from '@/data/db';
import { queryKeys } from '@/data/queries';
import { useProjectId, useVideoProjectStore } from '@/data/store';
import { useToast } from '@/hooks/use-toast';
import { fal } from '@/lib/fal';
import { getMediaMetadata } from '@/lib/ffmpeg';
import type { MediaItem } from '@/lib/types';
import { cn, resolveMediaUrl, trackIcons } from '@/lib/utils';

type MediaItemRowProps = {
  data: MediaItem;
  onOpen: (data: MediaItem) => void;
  draggable?: boolean;
} & HTMLAttributes<HTMLDivElement>;

export function MediaItemRow({
  data,
  className,
  onOpen,
  draggable = true,
  ...props
}: MediaItemRowProps) {
  const isDone = data.status === 'completed' || data.status === 'failed';
  const queryClient = useQueryClient();
  const projectId = useProjectId();
  const { toast } = useToast();
  useQuery({
    queryKey: queryKeys.projectMedia(projectId, data.id),
    queryFn: async () => {
      if (data.kind === 'uploaded') {
        return null;
      }
      const queueStatus = await fal.queue.status(data.endpointId, {
        requestId: data.requestId,
      });
      if (queueStatus.status === 'IN_PROGRESS') {
        await db.media.update(data.id, {
          ...data,
          status: 'running',
        });
        await queryClient.invalidateQueries({
          queryKey: queryKeys.projectMediaItems(data.projectId),
        });
      }
      let media: Partial<MediaItem> = {};

      if (queueStatus.status === 'COMPLETED') {
        try {
          const result = await fal.queue.result(data.endpointId, {
            requestId: data.requestId,
          });
          media = {
            ...data,
            output: result.data,
            status: 'completed',
          };

          await db.media.update(data.id, media);

          toast({
            title: 'Generation completed',
            description: `Your ${data.mediaType} has been generated successfully.`,
          });
        } catch {
          await db.media.update(data.id, {
            ...data,
            status: 'failed',
          });
          toast({
            title: 'Generation failed',
            description: `Failed to generate ${data.mediaType}.`,
          });
        } finally {
          await queryClient.invalidateQueries({
            queryKey: queryKeys.projectMediaItems(data.projectId),
          });
        }

        if (media.mediaType !== 'image') {
          const mediaMetadata = await getMediaMetadata(media as MediaItem);

          await db.media.update(data.id, {
            ...media,
            metadata: mediaMetadata?.media || {},
          });

          await queryClient.invalidateQueries({
            queryKey: queryKeys.projectMediaItems(data.projectId),
          });
        }
      }

      return null;
    },
    enabled: !isDone && data.kind === 'generated',
    refetchInterval: data.mediaType === 'video' ? 20_000 : 1000,
  });
  //const mediaUrl = resolveMediaUrl(data) ?? '';
  const mediaId = data.id.split('-')[0];
  const handleOnDragStart: DragEventHandler<HTMLDivElement> = (event) => {
    event.dataTransfer.setData('job', JSON.stringify(data));
    return true;
    // event.dataTransfer.dropEffect = "copy";
  };

  const coverImage =
    data.mediaType === 'video'
      ? data.metadata?.start_frame_url || data?.metadata?.end_frame_url
      : resolveMediaUrl(data);

  return (
    <div
      className={cn(
        'flex w-full items-start space-x-2 px-4 py-2 transition-all hover:bg-accent',
        className
      )}
      {...props}
      draggable={draggable && data.status === 'completed'}
      onClick={(e) => {
        e.stopPropagation();
        onOpen(data);
      }}
      onDragStart={handleOnDragStart}
    >
      {!!draggable && (
        <div
          className={cn(
            'flex h-full cursor-grab items-center text-muted-foreground',
            {
              'text-muted': data.status !== 'completed',
            }
          )}
        >
          <GripVerticalIcon className="h-4 w-4" />
        </div>
      )}
      <div className="relative aspect-square h-16 w-16 overflow-hidden rounded border border-transparent bg-accent transition-all hover:border-accent">
        {data.status === 'completed' ? (
          <>
            {(data.mediaType === 'image' || data.mediaType === 'video') &&
              (coverImage ? (
                <img
                  alt="Generated media"
                  className="h-full w-full object-cover"
                  src={coverImage}
                />
              ) : (
                <div className="absolute top-0 left-0 z-50 flex h-full w-full items-center justify-center p-2">
                  {data.mediaType === 'image' ? (
                    <ImageIcon className="h-7 w-7 text-muted-foreground" />
                  ) : (
                    <VideoIcon className="h-7 w-7 text-muted-foreground" />
                  )}
                </div>
              ))}
            {data.mediaType === 'music' && (
              <div className="absolute top-0 left-0 z-50 flex h-full w-full items-center justify-center p-2">
                <MusicIcon className="h-7 w-7 text-muted-foreground" />
              </div>
            )}
            {data.mediaType === 'voiceover' && (
              <div className="absolute top-0 left-0 z-50 flex h-full w-full items-center justify-center p-2">
                <MicIcon className="h-7 w-7 text-muted-foreground" />
              </div>
            )}
          </>
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-white/5 text-muted-foreground">
            {data.status === 'running' && <LoadingIcon className="h-8 w-8" />}
            {data.status === 'pending' && (
              <HourglassIcon className="h-8 w-8 animate-spin delay-700 duration-1000 ease-in-out" />
            )}
            {data.status === 'failed' && (
              <CircleXIcon className="h-8 w-8 text-rose-700" />
            )}
          </div>
        )}
      </div>
      <div className="flex h-full flex-1 flex-col gap-1">
        <div className="flex flex-col items-start justify-center">
          <div className="flex w-full justify-between">
            <h3 className="flex flex-row items-center gap-1 font-medium text-sm">
              {createElement(trackIcons[data.mediaType], {
                className: 'w-4 h-4 stroke-1',
              } as React.ComponentProps<
                (typeof trackIcons)[keyof typeof trackIcons]
              >)}
              <span>{data.kind === 'generated' ? 'Job' : 'File'}</span>
              <code className="text-muted-foreground">#{mediaId}</code>
            </h3>
            {data.status !== 'completed' && (
              <Badge
                className={cn({
                  'text-rose-700': data.status === 'failed',
                  'text-sky-500': data.status === 'running',
                  'text-muted-foreground': data.status === 'pending',
                })}
                variant="outline"
              >
                {data.status}
              </Badge>
            )}
          </div>
          <p className="line-clamp-1 text-sm opacity-40">
            {data.input?.prompt}
          </p>
        </div>
        <div className="flex flex-row justify-between gap-2">
          <span className="text-muted-foreground text-xs">
            {formatDistanceToNow(data.createdAt, { addSuffix: true })}
          </span>
        </div>
      </div>
    </div>
  );
}

type MediaItemsPanelProps = {
  data: MediaItem[];
  mediaType: string;
} & HTMLAttributes<HTMLDivElement>;

export function MediaItemPanel({
  className,
  data,
  mediaType,
}: MediaItemsPanelProps) {
  const setSelectedMediaId = useVideoProjectStore((s) => s.setSelectedMediaId);
  const handleOnOpen = (item: MediaItem) => {
    setSelectedMediaId(item.id);
  };

  return (
    <div
      className={cn(
        'flex flex-col divide-y divide-border overflow-hidden',
        className
      )}
    >
      {data
        .filter((media) => {
          if (mediaType === 'all') {
            return true;
          }
          return media.mediaType === mediaType;
        })
        .map((media) => (
          <Fragment key={media.id}>
            <MediaItemRow data={media} onOpen={handleOnOpen} />
          </Fragment>
        ))}
    </div>
  );
}
