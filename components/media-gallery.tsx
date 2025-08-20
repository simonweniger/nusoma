/** biome-ignore-all lint/a11y/noNoninteractiveElementInteractions: <explanation> */
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
  //useMemo,
  useState,
} from 'react';
import { toast } from 'sonner';
import {
  Sheet,
  SheetDescription,
  SheetHeader,
  SheetOverlay,
  SheetPanel,
  SheetPortal,
  SheetTitle,
} from '@/components/ui/sheet';
import type { MediaItems } from '@/instant.schema';
import { AVAILABLE_ENDPOINTS } from '@/lib/fal';
import { getMediaUrlFromOutput } from '@/lib/fal-integration';
import db from '@/lib/instantdb';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';

type MediaGallerySheetProps = ComponentProps<typeof Sheet> & {
  selectedMediaId: string;
  projectId: string;
  mediaType?: string; // Filter by specific media type
  onClose: () => void;
};

type AudioPlayerProps = {
  media: MediaItems;
} & HTMLAttributes<HTMLAudioElement>;

function AudioPlayer({ media, ...props }: AudioPlayerProps) {
  const src = media.url;
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

const MEDIA_PLACEHOLDER: MediaItems = {
  id: 'placeholder',
  kind: 'generated',
  input: { prompt: 'n/a' },
  mediaType: 'image',
  status: 'pending',
  createdAt: 0,
  endpointId: 'n/a',
  requestId: '',
};

export function MediaGallerySheet({
  selectedMediaId,
  projectId,
  mediaType,
  onClose,
  ...props
}: MediaGallerySheetProps) {
  // Query media items for this project using InstantDB, filtering by media type if provided
  const whereClause = mediaType
    ? { 'project.id': projectId, mediaType }
    : { 'project.id': projectId };

  const { data: queryResult } = db.useQuery({
    mediaItems: {
      $: {
        where: whereClause,
        order: { createdAt: 'desc' },
      },
    },
  });

  const mediaItems = queryResult?.mediaItems || [];

  // If selectedMediaId is empty/not provided, show the latest media item
  const selectedMedia =
    selectedMediaId && selectedMediaId !== ''
      ? mediaItems.find((media) => media.id === selectedMediaId)
      : null;

  // Always show latest media if no specific selection or if media not found
  const mediaToShow =
    selectedMedia ||
    (mediaItems.length > 0 ? mediaItems[0] : MEDIA_PLACEHOLDER);

  const [isDeleting, setIsDeleting] = useState(false);

  const handleUpscaleDialog = () => {
    // TODO: Implement video upscaling with FAL
    toast.info('Video upscaling not yet implemented');
  };

  const handleOpenGenerateDialog = () => {
    // TODO: Implement image to video conversion with FAL
    toast.info('Image to video conversion not yet implemented');
  };

  const handleVary = async () => {
    // Re-run the same generation with the same parameters
    try {
      const endpoint = AVAILABLE_ENDPOINTS.find(
        (ep) => ep.endpointId === mediaToShow.endpointId
      );

      if (!endpoint) {
        toast.error('Endpoint not found');
        return;
      }

      // Create a new media item with the same input
      const newMediaId = crypto.randomUUID();

      await db.transact([
        db.tx.mediaItems[newMediaId]
          .update({
            kind: 'generated',
            endpointId: mediaToShow.endpointId,
            mediaType: mediaToShow.mediaType,
            status: 'pending',
            input: mediaToShow.input,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          })
          .link({ project: projectId }),
      ]);

      toast.success('Starting new generation...');
      onClose();
    } catch {
      toast.error('Failed to start generation');
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await db.transact([db.tx.mediaItems[mediaToShow.id].delete()]);
      toast.success('Media item deleted');
      onClose();
    } catch {
      toast.error('Failed to delete media item');
    } finally {
      setIsDeleting(false);
    }
  };

  // Event handlers
  const preventClose: MouseEventHandler = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const close = () => {
    onClose();
  };

  // Get URL from url field or extract from output if missing
  let mediaUrl: string | undefined = mediaToShow?.url;
  if (!mediaUrl && mediaToShow?.output) {
    // Try to extract URL from output for existing items that don't have url field set
    const extractedUrl = getMediaUrlFromOutput(
      mediaToShow.output,
      mediaToShow.mediaType || 'image'
    );
    mediaUrl = extractedUrl || undefined;
  }

  const prompt = mediaToShow?.input?.prompt as string;

  return (
    <Sheet {...props}>
      <SheetOverlay className="pointer-events-none flex flex-col" />
      <SheetPortal>
        <div
          className="pointer-events-auto fixed inset-0 z-[51] mr-[42rem] flex flex-col items-center justify-center gap-4 bg-black/20 px-8 py-16"
          onClick={close}
        >
          <div className="text-sm text-white">{mediaToShow.mediaType}</div>

          {!!mediaUrl && (
            <>
              {mediaToShow.mediaType === 'image' && (
                <img
                  alt="Generated content"
                  className="h-auto max-h-[90%] w-auto max-w-[90%] animate-fade-scale-in object-contain transition-all"
                  onClick={preventClose}
                  src={mediaUrl}
                />
              )}
              {mediaToShow.mediaType === 'video' && (
                <video
                  className="h-auto max-h-[90%] w-auto max-w-[90%] animate-fade-scale-in object-contain transition-all"
                  controls
                  onClick={preventClose}
                  src={mediaUrl}
                />
              )}
              {(mediaToShow.mediaType === 'music' ||
                mediaToShow.mediaType === 'voiceover') && (
                <AudioPlayer media={mediaToShow} />
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
              The media library for your project
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
              {mediaToShow?.mediaType === 'video' && (
                <Button
                  disabled={isDeleting}
                  onClick={handleUpscaleDialog}
                  variant="secondary"
                >
                  <ImageUpscale className="h-4 w-4 opacity-50" />
                  Upscale Video
                </Button>
              )}
              {mediaToShow?.mediaType === 'image' && (
                <Button
                  disabled={isDeleting}
                  onClick={handleOpenGenerateDialog}
                  variant="secondary"
                >
                  <FilmIcon className="h-4 w-4 opacity-50" />
                  Make Video
                </Button>
              )}
              <Button
                disabled={isDeleting}
                onClick={handleVary}
                variant="secondary"
              >
                <ImagesIcon className="h-4 w-4 opacity-50" />
                Re-run
              </Button>
              <Button
                disabled={isDeleting}
                onClick={handleDelete}
                variant="secondary"
              >
                <TrashIcon className="h-4 w-4 opacity-50" />
                Delete
              </Button>
            </div>
            <div className="flex flex-1 flex-col justify-end gap-2">
              <MediaPropertyItem label="Media URL" value={mediaUrl ?? 'n/a'} />
              <MediaPropertyItem
                label="Model (fal endpoint)"
                value={mediaToShow.endpointId ?? 'n/a'}
              >
                <a
                  className="underline decoration-muted-foreground/70 decoration-dotted underline-offset-4"
                  href={`https://fal.ai/models/${mediaToShow.endpointId}`}
                  target="_blank"
                >
                  <code>{mediaToShow.endpointId}</code>
                </a>
              </MediaPropertyItem>
              <MediaPropertyItem
                label="Status"
                value={mediaToShow.status ?? 'n/a'}
              />
              <MediaPropertyItem
                label="Request ID"
                value={mediaToShow.requestId ?? 'n/a'}
              >
                <code>{mediaToShow.requestId}</code>
              </MediaPropertyItem>
            </div>
          </div>
        </SheetPanel>
      </SheetPortal>
    </Sheet>
  );
}
