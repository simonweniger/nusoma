import { useNodeConnections, useReactFlow } from '@xyflow/react';
import { Loader2Icon, PlayIcon, RotateCcwIcon } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { mutate } from 'swr';

import {
  type TableField,
  TableNodeLayout,
} from '@/components/nodes/table-layout';
import { Button } from '@/components/ui/button';
import {
  Dropzone,
  DropzoneContent,
  DropzoneEmptyState,
} from '@/components/ui/kibo-ui/dropzone';
import { Skeleton } from '@/components/ui/skeleton';

import { useAnalytics } from '@/hooks/use-analytics';
import { useNodeMediaStatus } from '@/hooks/use-node-media-status';
import { handleError } from '@/lib/error/handle';
import { createUploadFileFunction } from '@/lib/fal-integration';
import { getAudioModelFields } from '@/lib/model-fields';
import { useProject } from '@/providers/project';
import type { AudioNodeProps } from '.';

type AudioTableNodeProps = AudioNodeProps & {
  title: string;
};

export const AudioTableNode = ({
  data,
  id,
  type,
  title,
}: AudioTableNodeProps) => {
  const { updateNodeData } = useReactFlow();
  const { project } = useProject();
  const [files, setFiles] = useState<File[] | undefined>();
  const [isUploading, setIsUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const uploadFile = createUploadFileFunction();
  const analytics = useAnalytics();

  const connections = useNodeConnections({
    id,
    handleType: 'target',
  });

  const { status: mediaStatus } = useNodeMediaStatus({
    nodeId: id,
    mediaType: 'voiceover',
  });

  // Get model fields
  const modelFields = useMemo(() => {
    return getAudioModelFields(data.model || data.falEndpoint);
  }, [data.model, data.falEndpoint]);

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

  const handleDrop = async (files: File[]) => {
    if (isUploading || !project?.id) {
      return;
    }

    try {
      if (!files.length) {
        throw new Error('No file selected');
      }

      setIsUploading(true);
      setFiles(files);
      const [file] = files;

      const { url, type } = await uploadFile(file, 'files');

      updateNodeData(id, {
        content: {
          url,
          type,
        },
      });
    } catch (error) {
      handleError('Error uploading audio', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleGenerate = useCallback(async () => {
    if (loading || !project?.id) {
      return;
    }

    try {
      setLoading(true);

      // Get prompt from connections or instructions
      const prompt = data.instructions || 'Generate audio';

      analytics.track('canvas', 'node', 'generate', {
        type,
        promptLength: prompt.length,
        model: data.model || data.falEndpoint,
      });

      // TODO: Implement actual generation logic
      toast.success('Audio generation started!');

      setTimeout(() => mutate('credits'), 5000);
    } catch (error) {
      handleError('Error generating audio', error);
    } finally {
      setLoading(false);
    }
  }, [
    loading,
    project?.id,
    data.instructions,
    analytics,
    type,
    data.model,
    data.falEndpoint,
  ]);

  const handleFieldChange = useCallback(
    (fieldName: string, value: string | number | boolean) => {
      updateNodeData(id, { [fieldName]: value });
    },
    [id, updateNodeData]
  );

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
      });
    }

    return items;
  }, [loading, data.generated?.url, project?.id, handleGenerate]);

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
    if (isUploading) {
      return (
        <Skeleton className="flex h-[50px] w-full animate-pulse items-center justify-center">
          <Loader2Icon
            className="size-4 animate-spin text-muted-foreground"
            size={16}
          />
        </Skeleton>
      );
    }

    if (data.generated?.url) {
      return (
        <audio
          className="w-full rounded-none"
          controls
          src={data.generated.url}
        />
      );
    }

    if (data.content?.url) {
      return (
        <audio
          className="w-full rounded-none"
          controls
          src={data.content.url}
        />
      );
    }

    // For primitive nodes (no connections), show dropzone
    if (connections.length === 0) {
      return (
        <Dropzone
          accept={{
            'audio/*': [],
          }}
          className="rounded-none border-none bg-transparent p-4 shadow-none hover:bg-transparent dark:bg-transparent dark:hover:bg-transparent"
          maxFiles={1}
          maxSize={1024 * 1024 * 10}
          minSize={1024}
          multiple={false}
          onDrop={handleDrop}
          onError={console.error}
          src={files}
        >
          <DropzoneEmptyState />
          <DropzoneContent />
        </Dropzone>
      );
    }

    // For transform nodes, show generate button
    return (
      <div className="flex h-[50px] w-full items-center justify-center rounded-full bg-secondary">
        <p className="text-muted-foreground text-sm">
          Press <PlayIcon className="-translate-y-px inline" size={12} /> to
          generate audio
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
