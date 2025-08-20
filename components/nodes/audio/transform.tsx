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
import { speechModels } from '@/lib/models/speech';
import {
  getDescriptionsFromImageNodes,
  getTextFromTextNodes,
} from '@/lib/xyflow';
import { useProject } from '@/providers/project';
import { ModelSelector } from '../model-selector';
import type { AudioNodeProps } from '.';
import { VoiceSelector } from './voice-selector';

type AudioTransformProps = AudioNodeProps & {
  title: string;
};

const getDefaultModel = (models: typeof speechModels) => {
  const defaultModel = Object.entries(models).find(
    ([_, model]) => model.default
  );

  if (!defaultModel) {
    throw new Error('No default model found');
  }

  return defaultModel[0];
};

export const AudioTransform = ({
  data,
  id,
  type,
  title,
}: AudioTransformProps) => {
  const { updateNodeData, getNodes, getEdges } = useReactFlow();
  const [loading, setLoading] = useState(false);
  const { project } = useProject();
  const { selectedMediaId, openMedia, closeMedia } = useMediaGallery();
  const { status: mediaStatus } = useNodeMediaStatus({
    nodeId: id,
    mediaType: 'voiceover',
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
  const { data: queryResult } = db.useQuery({
    mediaItems: {
      $: {
        where: {
          'project.id': project?.id || '',
          mediaType: 'voiceover',
        },
        order: { createdAt: 'desc' },
        limit: 1,
      },
    },
  });
  const modelId = data.model ?? getDefaultModel(speechModels);
  const model = speechModels[modelId];
  const analytics = useAnalytics();

  // FAL AI endpoints for voiceover generation
  const falVoiceoverModels = convertFalEndpointsToModels('voiceover');
  const selectedEndpoint =
    data.falEndpoint || Object.keys(falVoiceoverModels)[0];

  const handleGenerate = async () => {
    if (loading || !project?.id) {
      return;
    }

    try {
      const incomers = getIncomers({ id }, getNodes(), getEdges());
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
        voice: data.voice ?? null,
      });

      // Create FAL job - polling is now handled by useMediaPolling hook
      await createFalJob({
        endpointId: selectedEndpoint,
        prompt: text,
        projectId: project.id,
        nodeId: id,
        instructions,
        voice: data.voice,
      });

      toast.success(
        'Audio generation started! Check the status indicator for progress.'
      );

      setTimeout(() => mutate('credits'), 5000);
    } catch (error) {
      handleError('Error generating audio', error);
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
          options={falVoiceoverModels}
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

  if (model?.voices.length) {
    toolbar.push({
      children: (
        <VoiceSelector
          className="w-[200px] rounded-full"
          key={id}
          onChange={(value) => updateNodeData(id, { voice: value })}
          options={model.voices}
          value={data.voice ?? model.voices[0]}
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
            onClick={() => openMedia('latest')}
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
              generate audio
            </p>
          </div>
        )}
        {!loading && data.generated?.url && (
          // biome-ignore lint/a11y/useMediaCaption: we don't need a caption for audio
          <audio
            className="w-full rounded-none"
            controls
            src={data.generated.url}
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
          mediaType="voiceover"
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
