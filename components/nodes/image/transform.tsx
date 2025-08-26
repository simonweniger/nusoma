import { getIncomers, useReactFlow } from '@xyflow/react';
import {
  ClockIcon,
  DownloadIcon,
  ExternalLinkIcon,
  Loader2Icon,
  PlayIcon,
  RotateCcwIcon,
} from 'lucide-react';
import Image from 'next/image';
import {
  type ChangeEventHandler,
  type ComponentProps,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { toast } from 'sonner';
import { mutate } from 'swr';
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
import { imageModels } from '@/lib/models/image';
import { getImagesFromImageNodes, getTextFromTextNodes } from '@/lib/xyflow';
import { useProject } from '@/providers/project';
import { ModelSelector } from '../model-selector';
import type { ImageNodeProps } from '.';
import { ImageSizeSelector } from './image-size-selector';

type ImageTransformProps = ImageNodeProps & {
  title: string;
};

const getDefaultModel = (models: typeof imageModels) => {
  const defaultModel = Object.entries(models).find(
    ([_, model]) => model.default
  );

  if (!defaultModel) {
    throw new Error('No default model found');
  }

  return defaultModel[0];
};

export const ImageTransform = ({
  data,
  id,
  type,
  title,
}: ImageTransformProps) => {
  const { updateNodeData, getNodes, getEdges } = useReactFlow();
  const [loading, setLoading] = useState(false);
  const { project } = useProject();
  const { selectedMediaId, selectedNodeIds, openMedia, closeMedia } =
    useMediaGallery();
  const { status: mediaStatus } = useNodeMediaStatus({
    nodeId: id,
    mediaType: 'image',
  });

  // Update node data when generation completes
  useEffect(() => {
    if (mediaStatus?.isCompleted && mediaStatus.url && !data.generated?.url) {
      updateNodeData(id, {
        generated: {
          url: mediaStatus.url,
          type: 'image/png',
        },
        updatedAt: new Date().toISOString(),
      });
    }
  }, [mediaStatus, data.generated?.url, id, updateNodeData]);

  //const hasIncomingImageNodes =
  //  getImagesFromImageNodes(getIncomers({ id }, getNodes(), getEdges()))
  //    .length > 0;
  const modelId = data.model ?? getDefaultModel(imageModels);
  const analytics = useAnalytics();
  const selectedModel = imageModels[modelId];
  const size = data.size ?? selectedModel?.sizes?.at(0);

  // Combine original image models with FAL AI endpoints
  const falImageModels = convertFalEndpointsToModels('image');
  const allImageModels = { ...imageModels, ...falImageModels };
  const selectedEndpoint = data.falEndpoint || Object.keys(falImageModels)[0];

  const handleGenerate = useCallback(async () => {
    if (loading || !project?.id) {
      return;
    }

    const incomers = getIncomers({ id }, getNodes(), getEdges());
    const textNodes = getTextFromTextNodes(incomers);
    const imageNodes = getImagesFromImageNodes(incomers);

    try {
      if (!(textNodes.length || imageNodes.length || data.instructions)) {
        throw new Error('No input provided');
      }

      setLoading(true);

      analytics.track('canvas', 'node', 'generate', {
        type,
        textPromptsLength: textNodes.length,
        imagePromptsLength: imageNodes.length,
        endpoint: selectedEndpoint,
        instructionsLength: data.instructions?.length ?? 0,
      });

      const prompt = textNodes.join('\n');
      const imageUrl = imageNodes.length > 0 ? imageNodes[0].url : undefined;

      // Create FAL job - polling is now handled by useMediaPolling hook
      await createFalJob({
        endpointId: selectedEndpoint,
        prompt,
        projectId: project.id,
        nodeId: id,
        instructions: data.instructions,
        imageUrl,
        size,
      });

      toast.success(
        'Image generation started! Check the status indicator for progress.'
      );

      setTimeout(() => mutate('credits'), 5000);
    } catch (error) {
      handleError('Error generating image', error);
    } finally {
      setLoading(false);
    }
  }, [
    loading,
    project?.id,
    size,
    id,
    analytics,
    type,
    data.instructions,
    getEdges,
    selectedEndpoint,
    getNodes,
    updateNodeData,
  ]);

  const handleInstructionsChange: ChangeEventHandler<HTMLTextAreaElement> = (
    event
  ) => updateNodeData(id, { instructions: event.target.value });

  const toolbar = useMemo<ComponentProps<typeof NodeLayout>['toolbar']>(() => {
    const items: ComponentProps<typeof NodeLayout>['toolbar'] = [
      {
        children: (
          <ModelSelector
            className="w-[200px]"
            onChange={(value) => {
              // Check if it's a FAL model or original model
              if (falImageModels[value]) {
                updateNodeData(id, { falEndpoint: value, model: undefined });
              } else {
                updateNodeData(id, { model: value, falEndpoint: undefined });
              }
            }}
            options={allImageModels}
            value={data.falEndpoint || modelId}
          />
        ),
      },
    ];

    // Add status indicator
    if (mediaStatus?.isGenerating) {
      items.push({
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
      });
    }

    if (selectedModel?.sizes?.length) {
      items.push({
        children: (
          <ImageSizeSelector
            className="w-[200px] rounded-full"
            id={id}
            onChange={(value) => updateNodeData(id, { size: value })}
            options={selectedModel?.sizes ?? []}
            value={size ?? ''}
          />
        ),
      });
    }

    // No more play/generate button in toolbar - moved to content area

    return items;
  }, [
    id,
    updateNodeData,
    selectedModel?.sizes,
    size,
    allImageModels,
    selectedEndpoint,
    modelId,
    mediaStatus,
  ]);

  // Create utility buttons for header
  const utilityButtons = useMemo(() => {
    const items: ComponentProps<typeof NodeLayout>['utilityButtons'] = [];

    if (data.generated) {
      items.push({
        tooltip: 'Download',
        children: (
          <Button
            className="rounded-full text-muted-foreground/60 hover:text-muted-foreground"
            onClick={() => download(data.generated, id, 'png')}
            size="icon"
            variant="ghost"
          >
            <DownloadIcon size={12} />
          </Button>
        ),
      });

      // Add media gallery button if we have generated content
      items.push({
        tooltip: 'View in Gallery',
        children: (
          <Button
            className="rounded-full text-muted-foreground/60 hover:text-muted-foreground"
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

    if (data.updatedAt) {
      items.push({
        tooltip: `Last updated: ${new Intl.DateTimeFormat('en-US', {
          dateStyle: 'short',
          timeStyle: 'short',
        }).format(new Date(data.updatedAt))}`,
        children: (
          <Button
            className="rounded-full text-muted-foreground/60"
            size="icon"
            variant="ghost"
          >
            <ClockIcon size={12} />
          </Button>
        ),
      });
    }

    return items;
  }, [data.generated, data.updatedAt, id, getNodes, openMedia]);

  const aspectRatio = useMemo(() => {
    if (!data.size) {
      return '1/1';
    }

    const [width, height] = data.size.split('x').map(Number);
    return `${width}/${height}`;
  }, [data.size]);

  return (
    <>
      <NodeLayout
        data={data}
        id={id}
        title={title}
        toolbar={toolbar}
        type={type}
        utilityButtons={utilityButtons}
      >
        {loading && (
          <Skeleton
            className="flex w-full animate-pulse items-center justify-center"
            style={{ aspectRatio }}
          >
            <Loader2Icon
              className="size-4 animate-spin text-muted-foreground"
              size={16}
            />
          </Skeleton>
        )}
        {!(loading || data.generated?.url) && (
          <div
            className="flex w-full flex-col items-center justify-center gap-4 bg-secondary p-4"
            style={{ aspectRatio }}
          >
            <Button
              className="rounded-full"
              disabled={loading || !project?.id}
              onClick={handleGenerate}
              size="icon"
            >
              <PlayIcon size={12} />
            </Button>
            <p className="text-center text-muted-foreground text-sm">
              Press <PlayIcon className="-translate-y-px inline" size={12} /> to
              create an image
            </p>
          </div>
        )}
        {!loading && data.generated?.url && (
          <Image
            alt="Generated image"
            className="w-full object-cover"
            height={1000}
            src={data.generated.url}
            width={1000}
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
          mediaType="image"
          nodeIds={selectedNodeIds.length > 0 ? selectedNodeIds : undefined}
          onClose={closeMedia}
          open={!!selectedMediaId}
          projectId={project.id}
          selectedMediaId={
            selectedMediaId === 'latest' ? '' : selectedMediaId || ''
          }
        />
      )}
    </>
  );
};
