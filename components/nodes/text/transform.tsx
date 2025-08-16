import { useChat } from '@ai-sdk/react';
import { getIncomers, useReactFlow } from '@xyflow/react';
import {
  ClockIcon,
  CopyIcon,
  PlayIcon,
  RotateCcwIcon,
  SquareIcon,
} from 'lucide-react';
import {
  type ChangeEventHandler,
  type ComponentProps,
  useCallback,
  useEffect,
  useMemo,
} from 'react';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';
import { mutate } from 'swr';
import { NodeLayout } from '@/components/nodes/layout';
import { Button } from '@/components/ui/button';
import {
  AIMessage,
  AIMessageContent,
} from '@/components/ui/kibo-ui/ai/message';
import { AIResponse } from '@/components/ui/kibo-ui/ai/response';
import {
  AISource,
  AISources,
  AISourcesContent,
  AISourcesTrigger,
} from '@/components/ui/kibo-ui/ai/source';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useAnalytics } from '@/hooks/use-analytics';
import { useReasoning } from '@/hooks/use-reasoning';
import { handleError } from '@/lib/error/handle';
import { textModels } from '@/lib/models/text';
import {
  getDescriptionsFromImageNodes,
  getFilesFromFileNodes,
  getImagesFromImageNodes,
  getTextFromTextNodes,
  getTranscriptionFromAudioNodes,
  getTweetContentFromTweetNodes,
} from '@/lib/xyflow';
import { useProject } from '@/providers/project';
import { ReasoningTunnel } from '@/tunnels/reasoning';
import { ModelSelector } from '../model-selector';
import type { TextNodeProps } from '.';

type TextTransformProps = TextNodeProps & {
  title: string;
};

const getDefaultModel = (models: typeof textModels) => {
  const defaultModel = Object.entries(models).find(
    ([_, model]) => model.default
  );

  if (!defaultModel) {
    throw new Error('No default model found');
  }

  return defaultModel[0];
};

export const TextTransform = ({
  data,
  id,
  type,
  title,
}: TextTransformProps) => {
  const { updateNodeData, getNodes, getEdges } = useReactFlow();
  const project = useProject();
  const modelId = data.model ?? getDefaultModel(textModels);
  const analytics = useAnalytics();
  const [reasoning, setReasoning] = useReasoning();
  const { sendMessage, messages, setMessages, status, stop } = useChat({
    onError: (error) => handleError('Error generating text', error),
    onFinish: ({ message }) => {
      const text = message.parts
        .filter((part) => part.type === 'text')
        .map((part) => ('text' in part ? part.text : ''))
        .join('');

      updateNodeData(id, {
        generated: {
          text,
        },
        updatedAt: new Date().toISOString(),
      });

      setReasoning((oldReasoning) => ({
        ...oldReasoning,
        isGenerating: false,
      }));

      toast.success('Text generated successfully');

      setTimeout(() => mutate('credits'), 5000);
    },
  });

  const handleGenerate = useCallback(() => {
    const incomers = getIncomers({ id }, getNodes(), getEdges());
    const textPrompts = getTextFromTextNodes(incomers);
    const audioPrompts = getTranscriptionFromAudioNodes(incomers);
    const images = getImagesFromImageNodes(incomers);
    const imageDescriptions = getDescriptionsFromImageNodes(incomers);
    const tweetContent = getTweetContentFromTweetNodes(incomers);
    const files = getFilesFromFileNodes(incomers);

    if (!(textPrompts.length || audioPrompts.length || data.instructions)) {
      handleError('Error generating text', 'No prompts found');
      return;
    }

    const content: string[] = [];

    if (data.instructions) {
      content.push('--- Instructions ---', data.instructions);
    }

    if (textPrompts.length) {
      content.push('--- Text Prompts ---', ...textPrompts);
    }

    if (audioPrompts.length) {
      content.push('--- Audio Prompts ---', ...audioPrompts);
    }

    if (imageDescriptions.length) {
      content.push('--- Image Descriptions ---', ...imageDescriptions);
    }

    if (tweetContent.length) {
      content.push('--- Tweet Content ---', ...tweetContent);
    }

    analytics.track('canvas', 'node', 'generate', {
      type,
      promptLength: content.join('\n').length,
      model: modelId,
      instructionsLength: data.instructions?.length ?? 0,
      imageCount: images.length,
      fileCount: files.length,
    });

    setMessages([]);
    const parts: Array<
      | { type: 'text'; text: string }
      | { type: 'file'; url: string; mediaType: string; name?: string }
    > = [
      { type: 'text', text: content.join('\n') },
      ...images.map((image) => ({
        type: 'file' as const,
        url: image.url,
        mediaType: image.type,
      })),
      ...files.map((file) => ({
        type: 'file' as const,
        url: file.url,
        mediaType: file.type,
        name: file.name,
      })),
    ];

    sendMessage(
      {
        role: 'user',
        parts,
      },
      {
        body: { modelId },
      } as unknown as never
    );
  }, [
    sendMessage,
    data.instructions,
    getEdges,
    getNodes,
    id,
    modelId,
    type,
    analytics.track,
    setMessages,
  ]);

  const handleInstructionsChange: ChangeEventHandler<HTMLTextAreaElement> = (
    event
  ) => updateNodeData(id, { instructions: event.target.value });

  const handleCopy = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  }, []);

  const toolbar = useMemo(() => {
    const items: ComponentProps<typeof NodeLayout>['toolbar'] = [];

    items.push({
      children: (
        <ModelSelector
          className="w-[200px] rounded-full"
          key={id}
          onChange={(value) => updateNodeData(id, { model: value })}
          options={textModels}
          value={modelId}
        />
      ),
    });

    if (status === 'submitted' || status === 'streaming') {
      items.push({
        tooltip: 'Stop',
        children: (
          <Button
            className="rounded-full"
            disabled={!project?.id}
            onClick={stop}
            size="icon"
          >
            <SquareIcon size={12} />
          </Button>
        ),
      });
    } else if (messages.length || data.generated?.text) {
      const text = messages.length
        ? messages
            .filter((message) => message.role === 'assistant')
            .map((message) =>
              message.parts
                .filter((part) => part.type === 'text')
                .map((part) => ('text' in part ? part.text : ''))
                .join('')
            )
            .join('\n')
        : data.generated?.text;

      items.push({
        tooltip: 'Regenerate',
        children: (
          <Button
            className="rounded-full"
            disabled={!project?.id}
            onClick={handleGenerate}
            size="icon"
          >
            <RotateCcwIcon size={12} />
          </Button>
        ),
      });
      items.push({
        tooltip: 'Copy',
        children: (
          <Button
            className="rounded-full"
            disabled={!text}
            onClick={() => handleCopy(text ?? '')}
            size="icon"
            variant="ghost"
          >
            <CopyIcon size={12} />
          </Button>
        ),
      });
    } else {
      items.push({
        tooltip: 'Generate',
        children: (
          <Button
            className="rounded-full"
            disabled={!project?.id}
            onClick={handleGenerate}
            size="icon"
          >
            <PlayIcon size={12} />
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
          <Button className="rounded-full" size="icon" variant="ghost">
            <ClockIcon size={12} />
          </Button>
        ),
      });
    }

    return items;
  }, [
    data.generated?.text,
    data.updatedAt,
    handleGenerate,
    updateNodeData,
    modelId,
    id,
    messages,
    project?.id,
    status,
    stop,
    handleCopy,
  ]);

  const nonUserMessages = messages.filter((message) => message.role !== 'user');

  useEffect(() => {
    const hasReasoning = messages.some((message) =>
      message.parts.some((part) => part.type === 'reasoning')
    );

    if (hasReasoning && !reasoning.isReasoning && status === 'streaming') {
      setReasoning({ isReasoning: true, isGenerating: true });
    }
  }, [messages, reasoning, status, setReasoning]);

  return (
    <NodeLayout data={data} id={id} title={title} toolbar={toolbar} type={type}>
      <div className="nowheel h-full max-h-[30rem] flex-1 overflow-auto rounded-t-3xl rounded-b-xl bg-secondary p-4">
        {status === 'submitted' && (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-60 animate-pulse rounded-lg" />
            <Skeleton className="h-4 w-40 animate-pulse rounded-lg" />
            <Skeleton className="h-4 w-50 animate-pulse rounded-lg" />
          </div>
        )}
        {data.generated?.text &&
          !nonUserMessages.length &&
          status !== 'submitted' && (
            <ReactMarkdown>{data.generated.text}</ReactMarkdown>
          )}
        {!(data.generated?.text || nonUserMessages.length) &&
          status !== 'submitted' && (
            <div className="flex aspect-video w-full items-center justify-center bg-secondary">
              <p className="text-muted-foreground text-sm">
                Press <PlayIcon className="-translate-y-px inline" size={12} />{' '}
                to generate text
              </p>
            </div>
          )}
        {Boolean(nonUserMessages.length) &&
          status !== 'submitted' &&
          nonUserMessages.map((message) => (
            <AIMessage
              className="p-0 [&>div]:max-w-none"
              from={message.role === 'assistant' ? 'assistant' : 'user'}
              key={message.id}
            >
              <div>
                {message.parts.filter(
                  (part) =>
                    part.type === 'source-url' ||
                    part.type === 'source-document'
                )?.length && (
                  <AISources>
                    <AISourcesTrigger
                      count={
                        message.parts.filter(
                          (part) =>
                            part.type === 'source-url' ||
                            part.type === 'source-document'
                        ).length
                      }
                    />
                    <AISourcesContent>
                      {message.parts
                        .filter(
                          (part) =>
                            part.type === 'source-url' ||
                            part.type === 'source-document'
                        )
                        .map((part, index) => {
                          let url: string | undefined;
                          if ('url' in part) {
                            url = part.url;
                          }
                          let title: string;
                          if ('title' in part && part.title) {
                            title = part.title;
                          } else if (url) {
                            title = new URL(url).hostname;
                          } else {
                            title = 'Source';
                          }
                          return (
                            <AISource
                              href={url ?? '#'}
                              key={url ?? String(index)}
                              title={title}
                            />
                          );
                        })}
                    </AISourcesContent>
                  </AISources>
                )}
                <AIMessageContent className="bg-transparent p-0">
                  <AIResponse>
                    {message.parts
                      .filter((part) => part.type === 'text')
                      .map((part) => ('text' in part ? part.text : ''))
                      .join('')}
                  </AIResponse>
                </AIMessageContent>
              </div>
            </AIMessage>
          ))}
      </div>
      <Textarea
        className="shrink-0 resize-none rounded-none border-none bg-transparent! shadow-none focus-visible:ring-0"
        onChange={handleInstructionsChange}
        placeholder="Enter instructions"
        value={data.instructions ?? ''}
      />
      <ReasoningTunnel.In>
        {messages.flatMap((message) =>
          message.parts
            .filter((part) => part.type === 'reasoning')
            .map((part) => ('text' in part ? part.text : ''))
        )}
      </ReasoningTunnel.In>
    </NodeLayout>
  );
};
