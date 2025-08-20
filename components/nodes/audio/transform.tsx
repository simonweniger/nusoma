import { getIncomers, useReactFlow } from '@xyflow/react';
import {
  ClockIcon,
  DownloadIcon,
  Loader2Icon,
  PlayIcon,
  RotateCcwIcon,
} from 'lucide-react';
import { type ChangeEventHandler, type ComponentProps, useState } from 'react';
import { toast } from 'sonner';
import { mutate } from 'swr';
import { NodeLayout } from '@/components/nodes/layout';
import { Button } from '@/components/ui/button';

import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useAnalytics } from '@/hooks/use-analytics';
import { download } from '@/lib/download';
import { handleError } from '@/lib/error/handle';

import {
  convertFalEndpointsToModels,
  createFalJob,
  getMediaUrlFromOutput,
  pollFalJob,
} from '@/lib/fal-integration';
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

      // Create FAL job
      const { mediaItemId, requestId } = await createFalJob({
        endpointId: selectedEndpoint,
        prompt: text,
        projectId: project.id,
        nodeId: id,
        instructions,
        voice: data.voice,
      });

      // Poll for result
      const result = await pollFalJob(requestId, mediaItemId, selectedEndpoint);
      const generatedUrl = getMediaUrlFromOutput(result, 'voiceover');

      if (!generatedUrl) {
        throw new Error('No audio URL in response');
      }

      updateNodeData(id, {
        generated: {
          url: generatedUrl,
          type: 'audio/mp3',
        },
        updatedAt: new Date().toISOString(),
      });

      toast.success('Audio generated successfully');

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
    <NodeLayout data={data} id={id} title={title} toolbar={toolbar} type={type}>
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
  );
};
