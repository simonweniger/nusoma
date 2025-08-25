import type { Editor } from '@tiptap/core';
import { useNodeConnections, useReactFlow } from '@xyflow/react';
import { Loader2Icon, PlayIcon, RotateCcwIcon, SquareIcon } from 'lucide-react';
import { useCallback, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';
import { mutate } from 'swr';
import { TableNodeLayout } from '@/components/nodes/table-layout';
import { Button } from '@/components/ui/button';
import { EditorProvider } from '@/components/ui/kibo-ui/editor';
import { Skeleton } from '@/components/ui/skeleton';
import { useAnalytics } from '@/hooks/use-analytics';
import { handleError } from '@/lib/error/handle';
import { getTextModelFields } from '@/lib/model-fields';
import { cn } from '@/lib/utils';
import { useProject } from '@/providers/project';
import type { TextNodeProps } from '.';

type TextTableNodeProps = TextNodeProps & {
  title: string;
};

export const TextTableNode = ({
  data,
  id,
  type,
  title,
}: TextTableNodeProps) => {
  const { updateNodeData } = useReactFlow();
  const { project } = useProject();
  const [loading, setLoading] = useState(false);
  const analytics = useAnalytics();
  const editor = useRef<Editor | null>(null);

  const connections = useNodeConnections({
    id,
    handleType: 'target',
  });

  // Get model fields
  const modelFields = useMemo(() => {
    return getTextModelFields(data.model);
  }, [data.model]);

  const handleGenerate = useCallback(async () => {
    if (loading || !project?.id) {
      return;
    }

    try {
      setLoading(true);

      // Get prompt from connections or instructions
      const prompt = data.instructions || data.text || 'Generate text';

      await analytics.track('canvas', 'node', 'generate', {
        type,
        promptLength: prompt.length,
        model: data.model,
      });

      // TODO: Implement actual generation logic
      toast.success('Text generation started!');

      setTimeout(() => mutate('credits'), 5000);
    } catch (error) {
      handleError('Error generating text', error);
    } finally {
      setLoading(false);
    }
  }, [
    loading,
    project?.id,
    data.instructions,
    data.text,
    analytics,
    type,
    data.model,
  ]);

  const handleFieldChange = useCallback(
    (fieldName: string, value: string | number | boolean) => {
      updateNodeData(id, { [fieldName]: value });
    },
    [id, updateNodeData]
  );

  const handleEditorUpdate = ({ editor }: { editor: Editor }) => {
    const json = editor.getJSON();
    const text = editor.getText();
    updateNodeData(id, { content: json, text });
  };

  const handleEditorCreate = (props: { editor: Editor }) => {
    editor.current = props.editor;
    if (project) {
      props.editor.chain().focus().run();
    }
  };

  // Create toolbar
  const toolbar = useMemo(() => {
    const items = [];

    if (loading) {
      items.push({
        tooltip: 'Generating...',
        children: (
          <Button className="rounded-full" disabled size="icon">
            <Loader2Icon className="animate-spin" size={12} />
          </Button>
        ),
      });
    } else {
      items.push({
        tooltip: data.generated?.text ? 'Regenerate' : 'Generate',
        children: (
          <Button
            className="rounded-full"
            disabled={loading || !project?.id}
            onClick={handleGenerate}
            size="icon"
          >
            {data.generated?.text ? (
              <RotateCcwIcon size={12} />
            ) : (
              <PlayIcon size={12} />
            )}
          </Button>
        ),
      });
    }

    return items;
  }, [loading, data.generated?.text, project?.id, handleGenerate]);

  // Update fields with current values
  const fieldsWithValues = useMemo(() => {
    return modelFields.map((field) => ({
      ...field,
      value: data[field.name] ?? field.value,
      isConnected:
        field.isHandle &&
        connections.some((conn) => conn.source === id || conn.target === id),
    }));
  }, [modelFields, data, connections, id]);

  const renderContent = () => {
    if (loading) {
      return (
        <div className="p-4">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-60 animate-pulse rounded-lg" />
            <Skeleton className="h-4 w-40 animate-pulse rounded-lg" />
            <Skeleton className="h-4 w-50 animate-pulse rounded-lg" />
          </div>
        </div>
      );
    }

    if (data.generated?.text) {
      return (
        <div className="max-h-48 overflow-auto p-4">
          <ReactMarkdown className="prose prose-sm dark:prose-invert">
            {data.generated.text}
          </ReactMarkdown>
        </div>
      );
    }

    // For primitive nodes (no connections), show editor
    if (connections.length === 0) {
      return (
        <div className="h-full max-h-48 overflow-auto">
          <EditorProvider
            className={cn(
              'prose prose-sm dark:prose-invert size-full p-4',
              '[&_p:first-child]:mt-0',
              '[&_p:last-child]:mb-0'
            )}
            content={data.content}
            immediatelyRender={false}
            onCreate={handleEditorCreate}
            onUpdate={handleEditorUpdate}
            placeholder="Start typing..."
          />
        </div>
      );
    }

    // For transform nodes, show generate button
    return (
      <div className="flex aspect-video w-full items-center justify-center bg-secondary p-4">
        <p className="text-muted-foreground text-sm">
          Press <PlayIcon className="-translate-y-px inline" size={12} /> to
          generate text
        </p>
      </div>
    );
  };

  return (
    <TableNodeLayout
      data={data}
      fields={fieldsWithValues}
      id={id}
      onFieldChange={handleFieldChange}
      title={title}
      toolbar={toolbar}
      type={type}
    >
      {renderContent()}
    </TableNodeLayout>
  );
};
