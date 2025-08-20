import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CopyIcon,
  FilmIcon,
  ImagesIcon,
  ImageUpscale,
  MicIcon,
  MusicIcon,
  TrashIcon,
} from 'lucide-react';
import {
  type ComponentProps,
  type HTMLAttributes,
  type MouseEventHandler,
  type PropsWithChildren,
  useMemo,
} from 'react';
import { LoadingIcon } from '@/components/ui/loading-icon';
import {
  Sheet,
  SheetDescription,
  SheetHeader,
  SheetOverlay,
  SheetPanel,
  SheetPortal,
  SheetTitle,
} from '@/components/ui/sheet';
import { db } from '@/data/db';
import {
  queryKeys,
  refreshVideoCache,
  useProjectMediaItems,
} from '@/data/queries';
import type { MediaItem } from '@/data/schema';
import { useProjectId, useVideoProjectStore } from '@/data/store';
import { AVAILABLE_ENDPOINTS } from '@/lib/fal';
import { cn, resolveMediaUrl } from '@/lib/utils';
import { Button } from './ui/button';

type MediaGallerySheetProps = ComponentProps<typeof Sheet> & {
  selectedMediaId: string;
};

type AudioPlayerProps = {
  media: MediaItem;
} & HTMLAttributes<HTMLAudioElement>;

function AudioPlayer({ media, ...props }: AudioPlayerProps) {
  const src = resolveMediaUrl(media);
  if (!src) {
    return null;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex aspect-square flex-col items-center justify-center bg-accent text-muted-foreground">
        {media.mediaType === 'music' && <MusicIcon className="h-1/2 w-1/2" />}
        {media.mediaType === 'voiceover' && <MicIcon className="h-1/2 w-1/2" />}
      </div>
      <div>
        <audio src={src} {...props} className="rounded" controls />
      </div>
    </div>
  );
}

type MediaPropertyItemProps = {
  className?: string;
  label: string;
  value: string;
};

function MediaPropertyItem({
  children,
  className,
  label,
  value,
}: PropsWithChildren<MediaPropertyItemProps>) {
  return (
    <div
      className={cn(
        'group relative flex flex-col flex-wrap gap-1 overflow-hidden text-wrap rounded bg-black/50 p-3 text-sm',
        className
      )}
    >
      <div className="absolute top-2 right-2 opacity-30 transition-opacity group-hover:opacity-70">
        <Button
          onClick={() => {
            navigator.clipboard.writeText(value);
          }}
          size="icon"
          variant="ghost"
        >
          <CopyIcon className="h-4 w-4" />
        </Button>
      </div>
      <div className="font-medium text-muted-foreground">{label}</div>
      <div className="text-ellipsis font-semibold text-foreground">
        {children ?? value}
      </div>
    </div>
  );
}

const MEDIA_PLACEHOLDER: MediaItem = {
  id: 'placeholder',
  kind: 'generated',
  input: { prompt: 'n/a' },
  mediaType: 'image',
  status: 'pending',
  createdAt: 0,
  endpointId: 'n/a',
  projectId: '',
  requestId: '',
};

export function MediaGallerySheet({
  selectedMediaId,
  ...props
}: MediaGallerySheetProps) {
  const projectId = useProjectId();
  const { data: mediaItems = [] } = useProjectMediaItems(projectId);
  const selectedMedia =
    mediaItems.find((media) => media.id === selectedMediaId) ??
    MEDIA_PLACEHOLDER;
  const setSelectedMediaId = useVideoProjectStore((s) => s.setSelectedMediaId);
  const openGenerateDialog = useVideoProjectStore((s) => s.openGenerateDialog);
  const setGenerateData = useVideoProjectStore((s) => s.setGenerateData);
  const setEndpointId = useVideoProjectStore((s) => s.setEndpointId);
  const setGenerateMediaType = useVideoProjectStore(
    (s) => s.setGenerateMediaType
  );
  const onGenerate = useVideoProjectStore((s) => s.onGenerate);

  const handleUpscaleDialog = () => {
    setGenerateMediaType('video');
    const video = selectedMedia.output?.video?.url;

    // video upscale model
    setEndpointId('fal-ai/topaz/upscale/video');

    setGenerateData({
      ...(selectedMedia.input || {}),
      video_url: video,
    });
    setSelectedMediaId(null);
    openGenerateDialog();
  };

  const handleOpenGenerateDialog = () => {
    setGenerateMediaType('video');
    const image = selectedMedia.output?.images?.[0]?.url;

    const endpoint = AVAILABLE_ENDPOINTS.find(
      (endpoint) => endpoint.category === 'video'
    );

    setEndpointId(endpoint?.endpointId ?? AVAILABLE_ENDPOINTS[0].endpointId);

    setGenerateData({
      ...(selectedMedia.input || {}),
      image,
      duration: undefined,
    });
    setSelectedMediaId(null);
    openGenerateDialog();
  };

  const handleVary = () => {
    setGenerateMediaType(selectedMedia.mediaType);
    setEndpointId(selectedMedia.endpointId as string);
    setGenerateData(selectedMedia.input || {});
    setSelectedMediaId(null);
    onGenerate();
  };

  // Event handlers
  const preventClose: MouseEventHandler = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };
  const close = () => {
    setSelectedMediaId(null);
  };
  const mediaUrl = useMemo(
    () => resolveMediaUrl(selectedMedia),
    [selectedMedia]
  );
  const prompt = selectedMedia?.input?.prompt;

  const queryClient = useQueryClient();
  const deleteMedia = useMutation({
    mutationFn: () => db.media.delete(selectedMediaId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projectMediaItems(projectId),
      });
      refreshVideoCache(queryClient, projectId);
      close();
    },
  });
  return (
    <Sheet {...props}>
      <SheetOverlay className="pointer-events-none flex flex-col" />
      <SheetPortal>
        <div
          className="pointer-events-auto fixed inset-0 z-[51] mr-[42rem] flex flex-col items-center justify-center gap-4 px-32 py-16"
          onClick={close}
        >
          {!!mediaUrl && (
            <>
              {selectedMedia.mediaType === 'image' && (
                <img
                  className="h-auto max-h-[90%] w-auto max-w-[90%] animate-fade-scale-in object-contain transition-all"
                  onClick={preventClose}
                  src={mediaUrl}
                />
              )}
              {selectedMedia.mediaType === 'video' && (
                <video
                  className="h-auto max-h-[90%] w-auto max-w-[90%] animate-fade-scale-in object-contain transition-all"
                  controls
                  onClick={preventClose}
                  src={mediaUrl}
                />
              )}
              {(selectedMedia.mediaType === 'music' ||
                selectedMedia.mediaType === 'voiceover') && (
                <AudioPlayer media={selectedMedia} />
              )}
            </>
          )}
          <style jsx>{`
            @keyframes fadeScaleIn {
              from {
                opacity: 0;
                transform: scale(0.8);
              }
              to {
                opacity: 1;
                transform: scale(1);
              }
            }
            .animate-fade-scale-in {
              animation: fadeScaleIn 0.3s ease-out forwards;
            }
          `}</style>
        </div>
        <SheetPanel
          className="flex h-screen max-h-screen min-h-screen flex-col overflow-hidden sm:max-w-2xl"
          onPointerDownOutside={preventClose as any}
        >
          <SheetHeader>
            <SheetTitle>Media Gallery</SheetTitle>
            <SheetDescription className="sr-only">
              The b-roll for your video composition
            </SheetDescription>
          </SheetHeader>
          <div className="flex h-full max-h-full flex-1 flex-col gap-8 overflow-y-hidden">
            <div className="flex flex-col gap-4">
              <p className="text-muted-foreground">
                {prompt ?? <span className="italic">No description</span>}
              </p>
              <div />
            </div>
            <div className="flex flex-row gap-2">
              {selectedMedia?.mediaType === 'video' && (
                <Button
                  disabled={deleteMedia.isPending}
                  onClick={handleUpscaleDialog}
                  variant="secondary"
                >
                  <ImageUpscale className="h-4 w-4 opacity-50" />
                  Upscale Video
                </Button>
              )}
              {selectedMedia?.mediaType === 'image' && (
                <Button
                  disabled={deleteMedia.isPending}
                  onClick={handleOpenGenerateDialog}
                  variant="secondary"
                >
                  <FilmIcon className="h-4 w-4 opacity-50" />
                  Make Video
                </Button>
              )}
              <Button
                disabled={deleteMedia.isPending}
                onClick={handleVary}
                variant="secondary"
              >
                <ImagesIcon className="h-4 w-4 opacity-50" />
                Re-run
              </Button>
              <Button
                disabled={deleteMedia.isPending}
                onClick={() => deleteMedia.mutate()}
                variant="secondary"
              >
                {deleteMedia.isPending ? (
                  <LoadingIcon />
                ) : (
                  <TrashIcon className="h-4 w-4 opacity-50" />
                )}
                Delete
              </Button>
            </div>
            <div className="flex flex-1 flex-col justify-end gap-2">
              <MediaPropertyItem label="Media URL" value={mediaUrl ?? 'n/a'} />
              <MediaPropertyItem
                label="Model (fal endpoint)"
                value={selectedMedia.endpointId ?? 'n/a'}
              >
                <a
                  className="underline decoration-muted-foreground/70 decoration-dotted underline-offset-4"
                  href={`https://fal.ai/models/${selectedMedia.endpointId}`}
                  target="_blank"
                >
                  <code>{selectedMedia.endpointId}</code>
                </a>
              </MediaPropertyItem>
              <MediaPropertyItem
                label="Status"
                value={selectedMedia.status ?? 'n/a'}
              />
              <MediaPropertyItem
                label="Request ID"
                value={selectedMedia.requestId ?? 'n/a'}
              >
                <code>{selectedMedia.requestId}</code>
              </MediaPropertyItem>
            </div>
          </div>
        </SheetPanel>
      </SheetPortal>
    </Sheet>
  );
}
