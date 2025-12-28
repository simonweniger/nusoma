import type { Editor } from '@tiptap/react';

import { RefreshCcwIcon } from '@workspace/editor/components/tiptap-icons/refresh-ccw-icon';
// --- UI Primitive ---
import { Separator } from '@workspace/editor/components/tiptap-ui-primitive/separator';
// --- Tiptap UI ---
import { DeleteNodeButton } from '@workspace/editor/components/tiptap-ui/delete-node-button';
import { ImageAlignButton } from '@workspace/editor/components/tiptap-ui/image-align-button';
import { ImageCaptionButton } from '@workspace/editor/components/tiptap-ui/image-caption-button';
import { ImageDownloadButton } from '@workspace/editor/components/tiptap-ui/image-download-button';
import { ImageUploadButton } from '@workspace/editor/components/tiptap-ui/image-upload-button';
// --- Hooks ---
import { useTiptapEditor } from '@workspace/editor/hooks/use-tiptap-editor';
// --- Lib ---
import { isNodeTypeSelected } from '@workspace/editor/lib/tiptap-utils';

export function ImageNodeFloating({
  editor: providedEditor
}: {
  editor?: Editor | null;
}) {
  const { editor } = useTiptapEditor(providedEditor);
  const visible = isNodeTypeSelected(editor, ['image']);

  if (!editor || !visible) {
    return null;
  }

  return (
    <>
      <ImageAlignButton align="left" />
      <ImageAlignButton align="center" />
      <ImageAlignButton align="right" />
      <Separator />
      <ImageCaptionButton />
      <Separator />
      <ImageDownloadButton />
      <ImageUploadButton
        icon={RefreshCcwIcon}
        tooltip="Replace"
      />
      <Separator />
      <DeleteNodeButton />
    </>
  );
}
