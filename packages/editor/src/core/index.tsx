'use client';

import { useContext, useEffect } from 'react';
import { Ai } from '@tiptap-pro/extension-ai';
import type { TiptapCollabProvider } from '@tiptap-pro/provider';
import { Collaboration, isChangeOrigin } from '@tiptap/extension-collaboration';
import { CollaborationCaret } from '@tiptap/extension-collaboration-caret';
import { Emoji, gitHubEmojis } from '@tiptap/extension-emoji';
import { Highlight } from '@tiptap/extension-highlight';
import { TaskItem, TaskList } from '@tiptap/extension-list';
import { Mathematics } from '@tiptap/extension-mathematics';
import { Mention } from '@tiptap/extension-mention';
import { Subscript } from '@tiptap/extension-subscript';
import { Superscript } from '@tiptap/extension-superscript';
import { TextAlign } from '@tiptap/extension-text-align';
import { Color, TextStyle } from '@tiptap/extension-text-style';
import { Typography } from '@tiptap/extension-typography';
import { UniqueID } from '@tiptap/extension-unique-id';
import { Placeholder, Selection } from '@tiptap/extensions';
import {
  EditorContent,
  EditorContext,
  useEditor,
  type Editor
} from '@tiptap/react';
// --- Tiptap Core Extensions ---
import { StarterKit } from '@tiptap/starter-kit';
import { createPortal } from 'react-dom';
import type { Doc as YDoc } from 'yjs';

import { NodeAlignment } from '@workspace/editor/components/tiptap-extension/node-alignment-extension';
import { NodeBackground } from '@workspace/editor/components/tiptap-extension/node-background-extension';
import { UiState } from '@workspace/editor/components/tiptap-extension/ui-state-extension';
// --- Custom Extensions ---
import { HorizontalRule } from '@workspace/editor/components/tiptap-node/horizontal-rule-node/horizontal-rule-node-extension';
import { Image } from '@workspace/editor/components/tiptap-node/image-node/image-node-extension';
// --- Tiptap Node ---
import { ImageUploadNode } from '@workspace/editor/components/tiptap-node/image-upload-node/image-upload-node-extension';
import { TableHandleExtension } from '@workspace/editor/components/tiptap-node/table-node/extensions/table-handle';
// --- Table Node ---
import { TableKit } from '@workspace/editor/components/tiptap-node/table-node/extensions/table-node-extension';
import { TableCellHandleMenu } from '@workspace/editor/components/tiptap-node/table-node/ui/table-cell-handle-menu';
import { TableExtendRowColumnButtons } from '@workspace/editor/components/tiptap-node/table-node/ui/table-extend-row-column-button';
import { TableHandle } from '@workspace/editor/components/tiptap-node/table-node/ui/table-handle/table-handle';
import {
  TableSelectionOverlay,
  type ResizeHandle
} from '@workspace/editor/components/tiptap-node/table-node/ui/table-selection-overlay';
import { useScrollToHash } from '@workspace/editor/components/tiptap-ui/copy-anchor-link-button/use-scroll-to-hash';
// --- Hooks ---
import { useUiEditorState } from '@workspace/editor/hooks/use-ui-editor-state';

import '@workspace/editor/components/tiptap-node/table-node/styles/prosemirror-table.scss';
import '@workspace/editor/components/tiptap-node/table-node/styles/table-node.scss';
import '@workspace/editor/components/tiptap-node/blockquote-node/blockquote-node.scss';
import '@workspace/editor/components/tiptap-node/code-block-node/code-block-node.scss';
import '@workspace/editor/components/tiptap-node/horizontal-rule-node/horizontal-rule-node.scss';
import '@workspace/editor/components/tiptap-node/list-node/list-node.scss';
import '@workspace/editor/components/tiptap-node/image-node/image-node.scss';
import '@workspace/editor/components/tiptap-node/heading-node/heading-node.scss';
import '@workspace/editor/components/tiptap-node/paragraph-node/paragraph-node.scss';

import { AiMenu } from '@workspace/editor/components/tiptap-ui/ai-menu';
import { DragContextMenu } from '@workspace/editor/components/tiptap-ui/drag-context-menu';
// --- Tiptap UI ---
import { EmojiDropdownMenu } from '@workspace/editor/components/tiptap-ui/emoji-dropdown-menu';
import { MentionDropdownMenu } from '@workspace/editor/components/tiptap-ui/mention-dropdown-menu';
import { SlashDropdownMenu } from '@workspace/editor/components/tiptap-ui/slash-dropdown-menu';
import { AiProvider, useAi } from '@workspace/editor/contexts/ai-context';
// --- Contexts ---
import { AppProvider } from '@workspace/editor/contexts/app-context';
import {
  CollabProvider,
  useCollab
} from '@workspace/editor/contexts/collab-context';
import { UserProvider, useUser } from '@workspace/editor/contexts/user-context';
import { TIPTAP_AI_APP_ID } from '@workspace/editor/lib/tiptap-collab-utils';
// --- Lib ---
import {
  handleImageUpload,
  MAX_FILE_SIZE
} from '@workspace/editor/lib/tiptap-utils';

// --- Styles ---
import './index.scss';

import { ListNormalizationExtension } from '@workspace/editor/components/tiptap-extension/list-normalization-extension';
// --- Content ---
import { NusomaEditorHeader } from '@workspace/editor/core/header';
import { MobileToolbar } from '@workspace/editor/core/mobile-toolbar';
import { NusomaToolbarFloating } from '@workspace/editor/core/toolbar-floating';

export interface NusomaEditorProps {
  room: string;
  placeholder?: string;
}

export interface EditorProviderProps {
  provider: TiptapCollabProvider;
  ydoc: YDoc;
  placeholder?: string;
  aiToken: string | null;
}

/**
 * Loading spinner component shown while connecting to the nusoma server
 */
export function LoadingSpinner({ text = 'Connecting...' }: { text?: string }) {
  return (
    <div className="spinner-container">
      <div className="spinner-content">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            cx="12"
            cy="12"
            r="10"
          ></circle>
          <path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <div className="spinner-loading-text">{text}</div>
      </div>
    </div>
  );
}

/**
 * EditorContent component that renders the actual editor
 */
export function EditorContentArea() {
  const { editor } = useContext(EditorContext)!;
  const {
    aiGenerationIsLoading,
    aiGenerationIsSelection,
    aiGenerationHasMessage,
    isDragging
  } = useUiEditorState(editor);

  // Selection based effect to handle AI generation acceptance
  useEffect(() => {
    if (!editor) return;

    if (
      !aiGenerationIsLoading &&
      aiGenerationIsSelection &&
      aiGenerationHasMessage
    ) {
      editor.chain().focus().aiAccept().run();
      editor.commands.resetUiState();
    }
  }, [
    aiGenerationHasMessage,
    aiGenerationIsLoading,
    aiGenerationIsSelection,
    editor
  ]);

  useScrollToHash();

  if (!editor) {
    return null;
  }

  return (
    <EditorContent
      editor={editor}
      role="presentation"
      className="nusoma-editor-content"
      style={{
        cursor: isDragging ? 'grabbing' : 'auto'
      }}
    >
      <DragContextMenu />
      <AiMenu />
      <EmojiDropdownMenu />
      <MentionDropdownMenu />
      <SlashDropdownMenu />
      <NusomaToolbarFloating />

      {createPortal(<MobileToolbar />, document.body)}
    </EditorContent>
  );
}

/**
 * Component that creates and provides the editor instance
 */
export function EditorProvider(props: EditorProviderProps) {
  const { provider, ydoc, placeholder = 'Start writing...', aiToken } = props;

  const { user } = useUser();

  const editor = useEditor({
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'nusoma-editor'
      }
    },
    extensions: [
      StarterKit.configure({
        undoRedo: false,
        horizontalRule: false,
        dropcursor: {
          width: 2
        },
        link: { openOnClick: false }
      }),
      HorizontalRule,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Collaboration.configure({ document: ydoc }),
      CollaborationCaret.configure({
        provider,
        user: { id: user.id, name: user.name, color: user.color }
      }),
      Placeholder.configure({
        placeholder,
        emptyNodeClass: 'is-empty with-slash'
      }),
      Mention,
      Emoji.configure({
        emojis: gitHubEmojis.filter(
          (emoji) => !emoji.name.includes('regional')
        ),
        forceFallbackImages: true
      }),
      TableKit.configure({
        table: {
          resizable: true,
          cellMinWidth: 120
        }
      }),
      NodeBackground,
      NodeAlignment,
      TextStyle,
      Mathematics,
      Superscript,
      Subscript,
      Color,
      TaskList,
      TaskItem.configure({ nested: true }),
      Highlight.configure({ multicolor: true }),
      Selection,
      Image,
      TableHandleExtension,
      ListNormalizationExtension,
      ImageUploadNode.configure({
        accept: 'image/*',
        maxSize: MAX_FILE_SIZE,
        limit: 3,
        upload: handleImageUpload,
        onError: (error) => console.error('Upload failed:', error)
      }),
      UniqueID.configure({
        types: [
          'table',
          'paragraph',
          'bulletList',
          'orderedList',
          'taskList',
          'heading',
          'blockquote',
          'codeBlock'
        ],
        filterTransaction: (transaction) => !isChangeOrigin(transaction)
      }),
      Typography,
      UiState,
      Ai.configure({
        appId: TIPTAP_AI_APP_ID,
        token: aiToken || undefined,
        autocompletion: false,
        showDecorations: true,
        hideDecorationsOnStreamEnd: false,
        onLoading: (context) => {
          context.editor.commands.aiGenerationSetIsLoading(true);
          context.editor.commands.aiGenerationHasMessage(false);
        },
        onChunk: (context) => {
          context.editor.commands.aiGenerationSetIsLoading(true);
          context.editor.commands.aiGenerationHasMessage(true);
        },
        onSuccess: (context) => {
          const hasMessage = !!context.response;
          context.editor.commands.aiGenerationSetIsLoading(false);
          context.editor.commands.aiGenerationHasMessage(hasMessage);
        }
      })
    ]
  });

  if (!editor) {
    return <LoadingSpinner />;
  }

  return (
    <div className="nusoma-editor-wrapper">
      <EditorContext.Provider value={{ editor }}>
        <NusomaEditorHeader />
        <EditorContentArea />

        <TableExtendRowColumnButtons />
        <TableHandle />
        <TableSelectionOverlay
          showResizeHandles={true}
          cellMenu={(props: {
            editor?: Editor | null;
            onResizeStart?: (
              handle: ResizeHandle
            ) => (event: React.MouseEvent) => void;
          }) => (
            <TableCellHandleMenu
              editor={props.editor}
              onMouseDown={(e: React.MouseEvent) =>
                props.onResizeStart?.('br')(e)
              }
            />
          )}
        />
      </EditorContext.Provider>
    </div>
  );
}

/**
 * Full editor with all necessary providers, ready to use with just a room ID
 */
export function NusomaEditor({
  room,
  placeholder = 'Start writing...'
}: NusomaEditorProps) {
  return (
    <UserProvider>
      <AppProvider>
        <CollabProvider room={room}>
          <AiProvider>
            <NusomaEditorContent placeholder={placeholder} />
          </AiProvider>
        </CollabProvider>
      </AppProvider>
    </UserProvider>
  );
}

/**
 * Internal component that handles the editor loading state
 */
export function NusomaEditorContent({ placeholder }: { placeholder?: string }) {
  const { provider, ydoc } = useCollab();
  const { aiToken } = useAi();

  if (!provider || !aiToken) {
    return <LoadingSpinner />;
  }

  return (
    <EditorProvider
      provider={provider}
      ydoc={ydoc}
      placeholder={placeholder}
      aiToken={aiToken}
    />
  );
}
