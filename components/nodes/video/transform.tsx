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
import { describeImageAction } from '@/app/actions/image/describe';
import { MediaGallerySheet } from '@/components/media-gallery';
import { NodeLayout } from '@/components/nodes/layout';
import { StatusIndicator } from '@/components/status-indicator';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useAnalytics } from '@/hooks/use-analytics';
import { useMediaGallery } from '@/hooks/use-media-gallery';
import { useNodeMediaStatus } from '@/hooks/use-node-media-status';
import { download } from '@/lib/download';
import { handleError } from '@/lib/error/handle';
import {
  convertFalEndpointsToModels,
  createFalJob,
} from '@/lib/fal-integration';
import db from '@/lib/instantdb';
import { videoModels } from '@/lib/models/video';
import { getImagesFromImageNodes, getTextFromTextNodes } from '@/lib/xyflow';
import { useProject } from '@/providers/project';
import { ModelSelector } from '../model-selector';
import type { VideoNodeProps } from '.';

type VideoTransformProps = VideoNodeProps & {
  title: string;
};

const getDefaultModel = (models: typeof videoModels) => {
  const defaultModel = Object.entries(models).find(
    ([_, model]) => model.default
  );

  if (!defaultModel) {
    throw new Error('No default model found');
  }

  return defaultModel[0];
};

export const VideoTransform = ({
  data,
  id,
  type,
  title,
}: VideoTransformProps) => {
  const { updateNodeData, getNodes, getEdges } = useReactFlow();
  const [loading, setLoading] = useState(false);
  const [analyzingImage, setAnalyzingImage] = useState(false);
  const { project } = useProject();
  const { selectedMediaId, selectedNodeIds, openMedia, closeMedia } =
    useMediaGallery();
  const { status: mediaStatus } = useNodeMediaStatus({
    nodeId: id,
    mediaType: 'video',
  });

  // Update node data when generation completes
  useEffect(() => {
    if (mediaStatus?.isCompleted && mediaStatus.url && !data.generated?.url) {
      updateNodeData(id, {
        generated: {
          url: mediaStatus.url,
          type: 'video/mp4',
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
                mediaType: 'video',
              },
              order: { createdAt: 'desc' },
              limit: 1,
            },
          },
        }
      : {}
  );
  const modelId = data.model ?? getDefaultModel(videoModels);
  const analytics = useAnalytics();

  // Combine original video models with FAL AI endpoints
  const falVideoModels = convertFalEndpointsToModels('video');
  const allVideoModels = { ...videoModels, ...falVideoModels };
  const selectedEndpoint = data.falEndpoint || Object.keys(falVideoModels)[0];

  const handleGenerate = async () => {
    if (loading || !project?.id) {
      return;
    }

    try {
      const incomers = getIncomers({ id }, getNodes(), getEdges());
      const textPrompts = getTextFromTextNodes(incomers);
      const images = getImagesFromImageNodes(incomers);

      if (!(textPrompts.length || images.length || data.instructions)) {
        throw new Error('No prompts found');
      }

      setLoading(true);

      analytics.track('canvas', 'node', 'generate', {
        type,
        promptLength: textPrompts.join('\n').length,
        endpoint: selectedEndpoint,
        instructionsLength: data.instructions?.length ?? 0,
        imageCount: images.length,
      });

      let prompt = [data.instructions ?? '', ...textPrompts].join('\n').trim();
      const imageUrl = images.length > 0 ? images[0].url : undefined;

      // If no prompt is provided but we have an image, use AI to describe it
      if (!prompt && imageUrl) {
        setAnalyzingImage(true);
        toast.info('Analyzing image to generate video prompt...');

        try {
          const result = await describeImageAction(imageUrl);

          if (result.success) {
            prompt = result.description;
            toast.success('Image analyzed! Generating video...');
          } else {
            console.error('Failed to describe image:', result.error);
            prompt =
              'Create a dynamic video with natural motion and camera movement';
            toast.warning('Could not analyze image, using default prompt');
          }
        } finally {
          setAnalyzingImage(false);
        }
      } else if (!prompt) {
        // Fallback for no image and no prompt
        prompt =
          'Create a dynamic video with natural motion and camera movement';
      }

      // Create FAL job - polling is now handled by useMediaPolling hook
      await createFalJob({
        endpointId: selectedEndpoint,
        prompt,
        projectId: project.id,
        nodeId: id,
        instructions: data.instructions,
        imageUrl,
      });

      toast.success(
        'Video generation started! Check the status indicator for progress.'
      );

      setTimeout(() => mutate('credits'), 5000);
    } catch (error) {
      handleError('Error generating video', error);
    } finally {
      setLoading(false);
    }
  };

  const toolbar: ComponentProps<typeof NodeLayout>['toolbar'] = [
    {
      children: (
        <ModelSelector
          className="w-[200px]"
          onChange={(value) => {
            // Check if it's a FAL model or original model
            if (falVideoModels[value]) {
              updateNodeData(id, { falEndpoint: value, model: undefined });
            } else {
              updateNodeData(id, { model: value, falEndpoint: undefined });
            }
          }}
          options={allVideoModels}
          value={data.falEndpoint || modelId}
        />
      ),
    },
    // Add status indicator
    ...(mediaStatus?.isGenerating
      ? [
          {
            tooltip: `Status: ${mediaStatus.status}`,
            children: (
              <StatusIndicator
                size="md"
                status={
                  mediaStatus.status as
                    | 'pending'
                    | 'running'
                    | 'completed'
                    | 'failed'
                }
              />
            ),
          },
        ]
      : []),
    loading || analyzingImage
      ? {
          tooltip: analyzingImage ? 'Analyzing image...' : 'Generating...',
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
              disabled={loading || analyzingImage || !project?.id}
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
        },
  ];

  if (data.generated?.url) {
    toolbar.push({
      tooltip: 'Download',
      children: (
        <Button
          className="rounded-full"
          onClick={() => download(data.generated, id, 'mp4')}
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
              openMedia(latestMedia.id, nodeIds);
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
          <Skeleton className="flex aspect-video w-full animate-pulse items-center justify-center">
            <Loader2Icon
              className="size-4 animate-spin text-muted-foreground"
              size={16}
            />
          </Skeleton>
        )}
        {!(loading || data.generated?.url) && (
          <div className="flex aspect-video w-full items-center justify-center bg-secondary">
            <p className="text-muted-foreground text-sm">
              Press <PlayIcon className="-translate-y-px inline" size={12} /> to
              generate video
            </p>
          </div>
        )}
        {data.generated?.url && !loading && (
          <video
            autoPlay
            className="w-full object-cover"
            height={data.height ?? 450}
            loop
            muted
            playsInline
            src={data.generated.url}
            width={data.width ?? 800}
          />
        )}
        <Textarea
          className="shrink-0 resize-none rounded-none border-none bg-transparent! shadow-none focus-visible:ring-0"
          onChange={handleInstructionsChange}
          placeholder="Enter instructions"
          value={data.instructions ?? ''}
        />
      </NodeLayout>

      {project?.id && selectedMediaId && (
        <MediaGallerySheet
          mediaType="video"
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
