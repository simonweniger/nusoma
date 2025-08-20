import { getIncomers, useReactFlow } from '@xyflow/react';
import {
  ClockIcon,
  DownloadIcon,
  ExternalLinkIcon,
  Loader2Icon,
  PlayIcon,
  RotateCcwIcon,
} from 'lucide-react';
import {
  type ChangeEventHandler,
  type ComponentProps,
  useEffect,
  useState,
} from 'react';
import { toast } from 'sonner';
import { mutate } from 'swr';
import { MediaGallerySheet } from '@/components/media-gallery';
import { NodeLayout } from '@/components/nodes/layout';
import { StatusIndicator } from '@/components/status-indicator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useAnalytics } from '@/hooks/use-analytics';
import { useMediaGallery } from '@/hooks/use-media-gallery';
import { useNodeMediaStatus } from '@/hooks/use-node-media-status';
import { download } from '@/lib/download';
import { handleError } from '@/lib/error/handle';
import { AVAILABLE_ENDPOINTS } from '@/lib/fal';
import {
  convertFalEndpointsToModels,
  createFalJob,
} from '@/lib/fal-integration';
import db from '@/lib/instantdb';
import {
  getAudioFromAudioNodes,
  getAudioFromMusicNodes,
  getDescriptionsFromImageNodes,
  getTextFromTextNodes,
} from '@/lib/xyflow';
import { useProject } from '@/providers/project';
import { ModelSelector } from '../model-selector';
import type { MusicNodeProps } from '.';

type MusicTransformProps = MusicNodeProps & {
  title: string;
};

export const MusicTransform = ({
  data,
  id,
  type,
  title,
}: MusicTransformProps) => {
  const { updateNodeData, getNodes, getEdges } = useReactFlow();
  const [loading, setLoading] = useState(false);
  const { project } = useProject();
  const { selectedMediaId, selectedNodeIds, openMedia, closeMedia } =
    useMediaGallery();
  const { status: mediaStatus } = useNodeMediaStatus({
    nodeId: id,
    mediaType: 'music',
  });

  // Update node data when generation completes
  useEffect(() => {
    if (mediaStatus?.isCompleted && mediaStatus.url && !data.generated?.url) {
      updateNodeData(id, {
        generated: {
          url: mediaStatus.url,
          type: 'audio/mp3',
        },
        updatedAt: new Date().toISOString(),
      });
    }
  }, [mediaStatus, data.generated?.url, id, updateNodeData]);

  // Query media items generated for this node
  const { data: queryResult } = db.useQuery(
    project?.id
      ? {
          mediaItems: {
            $: {
              where: {
                'project.id': project.id,
                mediaType: 'music',
              },
              order: { createdAt: 'desc' },
              limit: 1,
            },
          },
        }
      : {}
  );
  const analytics = useAnalytics();

  // Get connected audio files to determine available models
  const incomers = getIncomers({ id }, getNodes(), getEdges());
  const audioFiles = getAudioFromAudioNodes(incomers);
  const musicFiles = getAudioFromMusicNodes(incomers);
  const allAudioFiles = [...audioFiles, ...musicFiles];
  const hasReferenceAudio = allAudioFiles.length > 0;

  // FAL AI endpoints for music generation
  const allMusicModels = convertFalEndpointsToModels('music');

  // Filter models based on whether reference audio is available
  const falMusicModels = Object.fromEntries(
    Object.entries(allMusicModels).filter(([endpointId]) => {
      const endpointConfig = AVAILABLE_ENDPOINTS.find(
        (ep) => ep.endpointId === endpointId
      );
      // Show model if it doesn't require audio OR if we have reference audio
      return (
        !endpointConfig?.inputAsset?.includes('audio') || hasReferenceAudio
      );
    })
  );

  // Default to stable-audio since it doesn't require reference audio, or fallback if current selection is not available
  const selectedEndpoint =
    data.falEndpoint && falMusicModels[data.falEndpoint]
      ? data.falEndpoint
      : 'fal-ai/stable-audio';

  const handleGenerate = async () => {
    if (loading || !project?.id) {
      return;
    }

    try {
      const textPrompts = getTextFromTextNodes(incomers);
      const imagePrompts = getDescriptionsFromImageNodes(incomers);

      if (!(textPrompts.length || imagePrompts.length || data.instructions)) {
        throw new Error('No prompts found');
      }

      setLoading(true);

      let text = [...textPrompts, ...imagePrompts].join('\n');
      let instructions = data.instructions;

      if (data.instructions && !text.length) {
        text = data.instructions;
        instructions = undefined;
      }

      analytics.track('canvas', 'node', 'generate', {
        type,
        promptLength: text.length,
        endpoint: selectedEndpoint,
        instructionsLength: data.instructions?.length ?? 0,
        duration: data.duration ?? 30,
      });

      // Create FAL job - polling is now handled by useMediaPolling hook
      await createFalJob({
        endpointId: selectedEndpoint,
        prompt: text,
        projectId: project.id,
        nodeId: id,
        instructions,
        duration: data.duration,
        audioUrl: allAudioFiles.length > 0 ? allAudioFiles[0].url : undefined,
      });

      toast.success(
        'Music generation started! Check the status indicator for progress.'
      );

      setTimeout(() => mutate('credits'), 5000);
    } catch (error) {
      handleError('Error generating music', error);
    } finally {
      setLoading(false);
    }
  };

  const toolbar: ComponentProps<typeof NodeLayout>['toolbar'] = [
    {
      children: (
        <ModelSelector
          className="w-[200px]"
          onChange={(value) => updateNodeData(id, { falEndpoint: value })}
          options={falMusicModels}
          value={selectedEndpoint}
        />
      ),
    },
  ];

  // Add status indicator
  if (mediaStatus?.isGenerating) {
    toolbar.push({
      tooltip: `Status: ${mediaStatus.status}`,
      children: (
        <StatusIndicator
          size="md"
          status={
            mediaStatus.status as 'pending' | 'running' | 'completed' | 'failed'
          }
        />
      ),
    });
  }

  toolbar.push(
    loading
      ? {
          tooltip: 'Generating...',
          children: (
            <Button className="rounded-full" disabled size="icon">
              <Loader2Icon className="animate-spin" size={12} />
            </Button>
          ),
        }
      : {
          tooltip: data.generated?.url ? 'Regenerate' : 'Generate',
          children: (
            <Button
              className="rounded-full"
              disabled={loading || !project?.id}
              onClick={handleGenerate}
              size="icon"
            >
              {data.generated?.url ? (
                <RotateCcwIcon size={12} />
              ) : (
                <PlayIcon size={12} />
              )}
            </Button>
          ),
        }
  );

  if (data.generated) {
    toolbar.push({
      tooltip: 'Download',
      children: (
        <Button
          className="rounded-full"
          onClick={() => download(data.generated, id, 'mp3')}
          size="icon"
          variant="ghost"
        >
          <DownloadIcon size={12} />
        </Button>
      ),
    });

    // Add media gallery button if we have generated content
    const latestMedia = queryResult?.mediaItems?.[0];
    if (latestMedia) {
      toolbar.push({
        tooltip: 'View in Gallery',
        children: (
          <Button
            className="rounded-full"
            onClick={() => {
              // Get all selected nodes from the canvas
              const selectedNodes = getNodes().filter((node) => node.selected);
              const nodeIds =
                selectedNodes.length > 1
                  ? selectedNodes.map((n) => n.id)
                  : [id];
              openMedia('latest', nodeIds);
            }}
            size="icon"
            variant="ghost"
          >
            <ExternalLinkIcon size={12} />
          </Button>
        ),
      });
    }
  }

  if (data.updatedAt) {
    toolbar.push({
      tooltip: `Last updated: ${new Intl.DateTimeFormat('en-US', {
        dateStyle: 'short',
        timeStyle: 'short',
      }).format(new Date(data.updatedAt))}`,
      children: (
        <Button className="rounded-full" size="icon" variant="ghost">
          <ClockIcon size={12} />
        </Button>
      ),
    });
  }

  const handleInstructionsChange: ChangeEventHandler<HTMLTextAreaElement> = (
    event
  ) => updateNodeData(id, { instructions: event.target.value });

  const handleDurationChange: ChangeEventHandler<HTMLInputElement> = (event) =>
    updateNodeData(id, { duration: Number.parseInt(event.target.value, 10) });

  return (
    <>
      <NodeLayout
        data={data}
        id={id}
        title={title}
        toolbar={toolbar}
        type={type}
      >
        {loading && (
          <Skeleton className="flex h-[50px] w-full animate-pulse items-center justify-center">
            <Loader2Icon
              className="size-4 animate-spin text-muted-foreground"
              size={16}
            />
          </Skeleton>
        )}
        {!(loading || data.generated?.url) && (
          <div className="flex h-[50px] w-full items-center justify-center rounded-full bg-secondary">
            <p className="text-muted-foreground text-sm">
              Press <PlayIcon className="-translate-y-px inline" size={12} /> to
              generate music
            </p>
          </div>
        )}
        {!loading && data.generated?.url && (
          <audio
            className="w-full rounded-none"
            controls
            src={data.generated.url}
          />
        )}
        <div className="flex items-center gap-2 p-2">
          <Label className="text-xs" htmlFor={`duration-${id}`}>
            Duration:
          </Label>
          <Input
            className="w-16 text-xs"
            id={`duration-${id}`}
            max={120}
            min={5}
            onChange={handleDurationChange}
            type="number"
            value={data.duration || 30}
          />
          <span className="text-muted-foreground text-xs">seconds</span>
        </div>
        <Textarea
          className="shrink-0 resize-none rounded-none border-none bg-transparent! shadow-none focus-visible:ring-0"
          onChange={handleInstructionsChange}
          placeholder="Enter music description or style"
          value={data.instructions ?? ''}
        />
      </NodeLayout>

      {project?.id && selectedMediaId && (
        <MediaGallerySheet
          mediaType="music"
          nodeIds={selectedNodeIds.length > 0 ? selectedNodeIds : undefined}
          onClose={closeMedia}
          open={Boolean(selectedMediaId)}
          projectId={project.id}
          selectedMediaId={selectedMediaId === 'latest' ? '' : selectedMediaId}
        />
      )}
    </>
  );
};
