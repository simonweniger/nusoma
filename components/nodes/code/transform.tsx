import { useChat } from '@ai-sdk/react';
import Editor from '@monaco-editor/react';
import { getIncomers, useReactFlow } from '@xyflow/react';
import { ClockIcon, PlayIcon, RotateCcwIcon, SquareIcon } from 'lucide-react';
import {
  type ChangeEventHandler,
  type ComponentProps,
  useCallback,
  useMemo,
} from 'react';
import { toast } from 'sonner';
import { mutate } from 'swr';
import {
  mapChatStatusToNodeStatus,
  NodeLayout,
} from '@/components/nodes/layout';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useAnalytics } from '@/hooks/use-analytics';
import { handleError } from '@/lib/error/handle';
import { textModels } from '@/lib/models/text';
import {
  getCodeFromCodeNodes,
  getDescriptionsFromImageNodes,
  getTextFromTextNodes,
  getTranscriptionFromAudioNodes,
} from '@/lib/xyflow';
import { useProject } from '@/providers/project';
import { ModelSelector } from '../model-selector';
import type { CodeNodeProps } from '.';
import { LanguageSelector } from './language-selector';

type CodeTransformProps = CodeNodeProps & {
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

export const CodeTransform = ({
  data,
  id,
  type,
  title,
}: CodeTransformProps) => {
  const { updateNodeData, getNodes, getEdges } = useReactFlow();
  const { project } = useProject();
  const modelId = data.model ?? getDefaultModel(textModels);
  const language = data.generated?.language ?? 'javascript';
  const analytics = useAnalytics();
  const { sendMessage, messages, setMessages, status, stop } = useChat({
    onError: (error) => handleError('Error generating code', error),
    onFinish: ({ message }) => {
      const text = message.parts
        .filter((part) => part.type === 'text')
        .map((part) => ('text' in part ? part.text : ''))
        .join('');

      updateNodeData(id, {
        generated: {
          text,
          language,
        },
        updatedAt: new Date().toISOString(),
      });

      toast.success('Code generated successfully');

      setTimeout(() => mutate('credits'), 5000);
    },
  });

  const handleGenerate = useCallback(() => {
    const incomers = getIncomers({ id }, getNodes(), getEdges());
    const textPrompts = getTextFromTextNodes(incomers);
    const audioPrompts = getTranscriptionFromAudioNodes(incomers);
    const codePrompts = getCodeFromCodeNodes(incomers);
    const imageDescriptions = getDescriptionsFromImageNodes(incomers);

    if (
      !(
        textPrompts.length ||
        audioPrompts.length ||
        codePrompts.length ||
        imageDescriptions.length ||
        data.instructions
      )
    ) {
      handleError('Error generating code', 'No prompts found');
      return;
    }

    const content = [
      '--- Instructions ---',
      data.instructions ?? 'None.',
      '--- Text Prompts ---',
      ...textPrompts.join('\n'),
      '--- Audio Prompts ---',
      ...audioPrompts.join('\n'),
      '--- Image Descriptions ---',
      ...imageDescriptions.join('\n'),
      '--- Code Prompts ---',
      ...codePrompts.map(
        (code, index) =>
          `--- Prompt ${index + 1} ---
            Language: ${code.language}
            Code: ${code.text}
            `
      ),
    ];

    analytics.track('canvas', 'node', 'generate', {
      type,
      promptLength: content.join('\n').length,
      model: modelId,
      instructionsLength: data.instructions?.length ?? 0,
    });

    setMessages([]);
    sendMessage(
      {
        role: 'user',
        parts: [{ type: 'text', text: content.join('\n') }],
      },
      {
        body: { modelId, language },
      } as unknown as never
    );
  }, [
    data.instructions,
    id,
    getNodes,
    getEdges,
    sendMessage,
    setMessages,
    analytics,
    modelId,
    type,
    language,
  ]);

  const handleInstructionsChange: ChangeEventHandler<HTMLTextAreaElement> = (
    event
  ) => updateNodeData(id, { instructions: event.target.value });

  const handleCodeChange = (value: string | undefined) => {
    updateNodeData(id, {
      generated: { text: value, language },
    });
  };

  const handleLanguageChange = useCallback(
    (value: string) => {
      updateNodeData(id, {
        generated: { text: data.generated?.text, language: value },
      });
    },
    [data.generated?.text, id, updateNodeData]
  );

  const toolbar = useMemo(() => {
    const items: ComponentProps<typeof NodeLayout>['toolbar'] = [
      {
        children: (
          <LanguageSelector
            className="w-[200px]"
            onChange={handleLanguageChange}
            value={language}
          />
        ),
      },
      {
        children: (
          <ModelSelector
            className="w-[200px]"
            key={id}
            onChange={(value) => updateNodeData(id, { model: value })}
            options={textModels}
            value={modelId}
          />
        ),
      },
    ];

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
    id,
    updateNodeData,
    stop,
    data,
    handleGenerate,
    handleLanguageChange,
    status,
    messages,
    project?.id,
    modelId,
    language,
  ]);

  const nonUserMessages = messages.filter((message) => message.role !== 'user');

  return (
    <NodeLayout
      data={data}
      id={id}
      status={mapChatStatusToNodeStatus(status)}
      title={title}
      toolbar={toolbar}
      type={type}
    >
      <Editor
        className="aspect-square w-full overflow-hidden"
        language={language}
        loading={
          <div className="dark aspect-square size-full">
            <Skeleton className="size-full" />
          </div>
        }
        onChange={handleCodeChange}
        options={{
          readOnly: true,
          minimap: {
            enabled: false,
          },
        }}
        theme="vs-dark"
        value={
          nonUserMessages.length
            ? nonUserMessages[0].parts
                .filter((part) => part.type === 'text')
                .map((part) => ('text' in part ? part.text : ''))
                .join('')
            : data.generated?.text
        }
      />
      <Textarea
        className="shrink-0 resize-none rounded-none border-none bg-transparent! p-0 shadow-none focus-visible:ring-0"
        onChange={handleInstructionsChange}
        placeholder="Enter instructions"
        value={data.instructions ?? ''}
      />
    </NodeLayout>
  );
};
