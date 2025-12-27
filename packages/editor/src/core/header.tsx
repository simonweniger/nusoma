import { ButtonGroup } from '@workspace/editor/components/tiptap-ui-primitive/button';
import { Separator } from '@workspace/editor/components/tiptap-ui-primitive/separator';
// --- UI Primitives ---
import { Spacer } from '@workspace/editor/components/tiptap-ui-primitive/spacer';
// --- Tiptap UI ---
import { UndoRedoButton } from '@workspace/editor/components/tiptap-ui/undo-redo-button';
import { ThemeToggle } from '@workspace/editor/core/theme-toggle';

// --- Styles ---
import './header.scss';

import { CollaborationUsers } from '@workspace/editor/core/users';

export function NusomaEditorHeader() {
  return (
    <header className="nusoma-editor-header">
      <Spacer />
      <div className="nusoma-editor-header-actions">
        <ButtonGroup orientation="horizontal">
          <UndoRedoButton action="undo" />
          <UndoRedoButton action="redo" />
        </ButtonGroup>

        <Separator />

        <ThemeToggle />

        <Separator />

        <CollaborationUsers />
      </div>
    </header>
  );
}
