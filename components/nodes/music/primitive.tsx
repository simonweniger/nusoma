import { useReactFlow } from '@xyflow/react';
import { Loader2Icon } from 'lucide-react';
import { useState } from 'react';
import { NodeLayout } from '@/components/nodes/layout';
import {
  Dropzone,
  DropzoneContent,
  DropzoneEmptyState,
} from '@/components/ui/kibo-ui/dropzone';
import { Skeleton } from '@/components/ui/skeleton';
import { handleError } from '@/lib/error/handle';
import { createUploadFileFunction } from '@/lib/fal-integration';
import type { MusicNodeProps } from '.';

type MusicPrimitiveProps = MusicNodeProps & {
  title: string;
};

export const MusicPrimitive = ({
  data,
  id,
  type,
  title,
}: MusicPrimitiveProps) => {
  const { updateNodeData } = useReactFlow();
  const [files, setFiles] = useState<File[] | undefined>();
  const [isUploading, setIsUploading] = useState(false);
  const uploadFile = createUploadFileFunction();

  const handleDrop = async (files: File[]) => {
    if (isUploading) {
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

  return (
    <NodeLayout data={data} id={id} title={title} type={type}>
      {isUploading && (
        <Skeleton className="flex h-[50px] w-full animate-pulse items-center justify-center">
          <Loader2Icon
            className="size-4 animate-spin text-muted-foreground"
            size={16}
          />
        </Skeleton>
      )}
      {!isUploading && data.content && (
        <audio
          className="w-full rounded-none"
          controls
          src={data.content.url}
        />
      )}
      {!(isUploading || data.content) && (
        <Dropzone
          accept={{
            'audio/*': [],
          }}
          className="rounded-none border-none bg-transparent shadow-none hover:bg-transparent dark:bg-transparent dark:hover:bg-transparent"
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
      )}
    </NodeLayout>
  );
};
