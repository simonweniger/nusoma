import { useNodeConnections, useReactFlow } from '@xyflow/react';
import { Loader2Icon, PlayIcon, RotateCcwIcon } from 'lucide-react';
import Image from 'next/image';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { mutate } from 'swr';

import { TableNodeLayout } from '@/components/nodes/table-layout';
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
import { getImageModelFields } from '@/lib/model-fields';
import { useProject } from '@/providers/project';
import type { ImageNodeProps } from '.';

type ImageTableNodeProps = ImageNodeProps & {
  title: string;
};

export const ImageTableNode = ({
  data,
  id,
  type,
  title,
}: ImageTableNodeProps) => {
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
    mediaType: 'image',
  });

  // Get model fields
  const modelFields = useMemo(() => {
    return getImageModelFields(data.model || data.falEndpoint);
  }, [data.model, data.falEndpoint]);

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
      handleError('Error uploading image', error);
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
      const prompt = data.instructions || 'Generate an image';

      await analytics.track('canvas', 'node', 'generate', {
        type,
        promptLength: prompt.length,
        model: data.model || data.falEndpoint,
      });

      // TODO: Implement actual generation logic
      toast.success('Image generation started!');

      setTimeout(() => mutate('credits'), 5000);
    } catch (error) {
      handleError('Error generating image', error);
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
      updateNodeData(id, { [fieldName]: value } as Record<string, unknown>);
    },
    [id, updateNodeData]
  );

  // Create toolbar
  const toolbar = useMemo(() => {
    const items: {
      tooltip?: string;
      children: React.ReactNode;
    }[] = [];

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
      value: (data as Record<string, unknown>)[field.name] ?? field.value,
      isConnected:
        field.isHandle &&
        connections.some((conn) => conn.source === id || conn.target === id),
    }));
  }, [modelFields, data, connections, id]);

  const renderContent = () => {
    if (isUploading) {
      return (
        <Skeleton className="flex aspect-video w-full animate-pulse items-center justify-center">
          <Loader2Icon
            className="size-4 animate-spin text-muted-foreground"
            size={16}
          />
        </Skeleton>
      );
    }

    if (data.generated?.url) {
      return (
        <Image
          alt="Generated image"
          className="w-full object-cover"
          height={200}
          src={data.generated.url}
          width={300}
        />
      );
    }

    if (data.content?.url) {
      return (
        <Image
          alt="Uploaded image"
          className="w-full object-cover"
          height={200}
          src={data.content.url}
          width={300}
        />
      );
    }

    // For primitive nodes (no connections), show dropzone
    if (connections.length === 0) {
      return (
        <Dropzone
          accept={{
            'image/*': [],
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
      <div className="flex aspect-video w-full items-center justify-center bg-secondary p-4">
        <p className="text-muted-foreground text-sm">
          Press <PlayIcon className="-translate-y-px inline" size={12} /> to
          create an image
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
