"use client";

import React, {
  useEffect,
  useState,
  useCallback,
  memo,
  useRef,
  useDeferredValue,
} from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import {
  PlayIcon,
  Wand2,
  Camera,
  Lightbulb,
  Grid3x3,
  Palette,
  Sparkles,
  X,
  Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { styleModels } from "@/lib/models";
import { promptTemplates, PromptTemplate } from "@/lib/prompt-templates";
import {
  type GenerationType,
  generationTypeConfigs,
  getSelectableGenerationTypes,
  getGenerationModeForContext,
  getGenerationTypeColor,
} from "@/lib/generation-types";
import { checkOS } from "@/utils/os-utils";
import { ShortcutBadge } from "@/components/canvas/ShortcutBadge";
import type { GenerationSettings, PlacedImage } from "@/types/canvas";
import {
  TooltipTrigger,
  TooltipContent,
  Tooltip,
} from "@/components/ui/tooltip";
import { Dialog, DottedDialogContent } from "@/components/ui/dialog";
import { Matrix, loader, pulse } from "@/components/ui/matrix";
import { Button } from "@/components/ui/button";

type GenerationState = "submitting" | "running" | "success";

interface PromptEditorProps {
  generationSettings: GenerationSettings;
  setGenerationSettings: (settings: GenerationSettings) => void;
  selectedIds: string[];
  images: PlacedImage[];
  isGenerating: boolean;
  generationState?: GenerationState;
  previousStyleId: string;
  handleRun: () => void;
  handleFileUpload: (files: FileList | null) => void;
  toast: any;
}

const getCategoryIcon = (category: PromptTemplate["category"]) => {
  switch (category) {
    case "camera":
      return <Camera className="h-4 w-4" />;
    case "lighting":
      return <Lightbulb className="h-4 w-4" />;
    case "composition":
      return <Grid3x3 className="h-4 w-4" />;
    case "mood":
      return <Palette className="h-4 w-4" />;
    case "effects":
      return <Sparkles className="h-4 w-4" />;
  }
};

// Custom chip node component
const ChipNodeView = ({ node, deleteNode }: any) => {
  const { chipType, title, icon } = node.attrs;

  return (
    <NodeViewWrapper className="inline-block">
      <span
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium transition-all cursor-default mx-1",
          chipType === "style"
            ? "bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30"
            : "bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30",
        )}
        contentEditable={false}
      >
        <span className="shrink-0 opacity-70 inline-flex">
          {chipType === "style" ? (
            <Wand2 className="h-4 w-4" />
          ) : icon === "camera" ? (
            <Camera className="h-4 w-4" />
          ) : icon === "lighting" ? (
            <Lightbulb className="h-4 w-4" />
          ) : icon === "composition" ? (
            <Grid3x3 className="h-4 w-4" />
          ) : icon === "mood" ? (
            <Palette className="h-4 w-4" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
        </span>
        <span className="font-medium">{title}</span>
        <button
          onClick={deleteNode}
          className="shrink-0 hover:bg-black/10 dark:hover:bg-white/10 rounded-full p-0.5 transition-colors"
        >
          <X className="h-3 w-3" />
        </button>
      </span>
    </NodeViewWrapper>
  );
};

// Define the Chip custom node
const ChipNode = Node.create({
  name: "chip",
  group: "inline",
  inline: true,
  atom: true,

  addAttributes() {
    return {
      chipType: {
        default: "template",
      },
      title: {
        default: "",
      },
      value: {
        default: "",
      },
      styleId: {
        default: null,
      },
      loraUrl: {
        default: null,
      },
      icon: {
        default: "camera",
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "span[data-chip]",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes, { "data-chip": "" })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ChipNodeView);
  },
});

// Build generation type options from global config
const selectableGenerationTypes = getSelectableGenerationTypes();

interface GenerationTypeOption {
  id: GenerationType;
  label: string;
  icon: React.ReactNode;
  color: string;
  disabled?: boolean;
}

// Build options from the global config
const generationTypeOptions: GenerationTypeOption[] = Object.values(
  generationTypeConfigs,
).map((config) => {
  const IconComponent = config.icon;
  const isEnabled = selectableGenerationTypes.some((t) => t.id === config.id);
  return {
    id: config.id,
    label: config.label,
    icon: <IconComponent />, // Size controlled by .tactile-btn__icon [&_svg]:size-4
    color: getGenerationTypeColor(config.id),
    disabled: !isEnabled,
  };
});

// Tactile 3D Button Component
const TactileButton = memo(function TactileButton({
  isActive,
  onClick,
  icon,
  color,
  disabled,
}: {
  isActive: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  color: string;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "tactile-btn relative",
        "size-9 rounded-md", // Match button.tsx icon size
        "transition-all duration-150 ease-out",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        disabled && "opacity-40 cursor-not-allowed",
        isActive ? "tactile-btn--active" : "tactile-btn--inactive",
      )}
      style={
        isActive
          ? ({ "--tactile-glow-color": color } as React.CSSProperties)
          : undefined
      }
    >
      <span className="tactile-btn__icon absolute inset-0 flex items-center justify-center [&_svg]:size-4">
        {icon}
      </span>
    </button>
  );
});

// Tactile Button Group Container
const TactileButtonGroup = memo(function TactileButtonGroup({
  options,
  activeId,
  onChange,
}: {
  options: GenerationTypeOption[];
  activeId: GenerationType;
  onChange: (id: GenerationType) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      {options.map((option) => (
        <Tooltip key={option.id}>
          <TooltipTrigger
            render={
              <TactileButton
                isActive={activeId === option.id}
                onClick={() => !option.disabled && onChange(option.id)}
                icon={option.icon}
                color={option.color}
                disabled={option.disabled}
              />
            }
          />
          <TooltipContent>
            <span>
              {option.label}
              {option.disabled && " (coming soon)"}
            </span>
          </TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
});

// Matrix toolbar constants
const MATRIX_ROWS = 10;
const MATRIX_COLS = 110;
const MATRIX_DOT_SIZE = 2;
const MATRIX_GAP = 2;

// Pre-computed background pattern (static, no need for useMemo)
const BACKGROUND_PATTERN: number[][] = Array.from({ length: MATRIX_ROWS }, () =>
  new Array(MATRIX_COLS).fill(0),
);

// Full-width Matrix toolbar background with content overlay
const MatrixToolbar = memo(function MatrixToolbar({
  isGenerating,
  state,
  generationType,
  hasInputAsset,
}: {
  isGenerating: boolean;
  state: GenerationState;
  generationType: GenerationType;
  hasInputAsset: boolean;
}) {
  // Get the current generation mode based on context
  const currentMode = getGenerationModeForContext(
    generationType,
    hasInputAsset,
    hasInputAsset ? "image" : undefined, // For now, assume image input
  );

  const statusText = isGenerating
    ? state === "submitting"
      ? "Submitting..."
      : state === "success"
        ? "Complete!"
        : "Generating..."
    : currentMode?.shortLabel || "Generate";

  const color =
    state === "success" && isGenerating
      ? "rgb(34, 197, 94)" // green-500
      : getGenerationTypeColor(generationType);

  const toolbarWidth =
    MATRIX_COLS * (MATRIX_DOT_SIZE + MATRIX_GAP) - MATRIX_GAP;
  const toolbarHeight =
    MATRIX_ROWS * (MATRIX_DOT_SIZE + MATRIX_GAP) - MATRIX_GAP;

  return (
    <div
      className="relative w-full flex items-center px-6 justify-start"
      style={{
        height: toolbarHeight,
        minWidth: toolbarWidth,
      }}
    >
      {/* Background Matrix - spans full width */}
      <Matrix
        rows={MATRIX_ROWS}
        cols={MATRIX_COLS}
        pattern={BACKGROUND_PATTERN}
        size={MATRIX_DOT_SIZE}
        gap={MATRIX_GAP}
        palette={{ on: color, off: "var(--muted-foreground)" }}
        brightness={1}
        className="absolute inset-0 m-auto"
      />

      {/* Content overlay - centered */}
      <div className="relative z-10 flex items-center gap-4">
        {/* Animated icon */}
        <Matrix
          rows={7}
          cols={7}
          frames={isGenerating ? (state === "success" ? pulse : loader) : pulse}
          fps={isGenerating ? (state === "success" ? 16 : 12) : 10}
          autoplay
          loop
          size={MATRIX_DOT_SIZE}
          gap={MATRIX_GAP}
          palette={{ on: color, off: "transparent" }}
          brightness={1}
        />

        {/* Text label */}
        <span
          className="text-lg font-extrabold font-dotted tracking-wide"
          style={{ color }}
        >
          {statusText}
        </span>
      </div>
    </div>
  );
});

export const PromptEditor = memo(function PromptEditor({
  generationSettings,
  setGenerationSettings,
  selectedIds,
  images,
  isGenerating,
  generationState = "running",
  previousStyleId,
  handleRun,
  handleFileUpload,
  toast,
}: PromptEditorProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [generationType, setGenerationType] = useState<GenerationType>("image");
  const slashPositionRef = useRef<number | null>(null);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Defer the generation state for non-critical updates
  const deferredGenerationState = useDeferredValue(generationState);

  // Memoize whether we're in image mode
  const isImageMode = selectedIds.length > 0;

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false,
        blockquote: false,
        codeBlock: false,
        horizontalRule: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
      }),
      ChipNode,
      Placeholder.configure({
        placeholder: `Type / for commands... (${checkOS("Win") || checkOS("Linux") ? "Ctrl" : "⌘"}+Enter to run)`,
      }),
    ],
    editorProps: {
      attributes: {
        class: "outline-none min-h-20 p-2 pr-36",
        style: "font-size: 16px",
      },
    },
    onUpdate: ({ editor }) => {
      handleEditorUpdate(editor);
    },
  });

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, []);

  const handleEditorUpdate = useCallback(
    (editor: any) => {
      // Extract text and chip values
      const json = editor.getJSON();
      const parts: string[] = [];

      const extractContent = (node: any) => {
        if (node.type === "chip") {
          parts.push(node.attrs.value);
        } else if (node.type === "text") {
          // Add text content (trim to avoid extra spaces)
          const text = node.text?.trim();
          if (text) parts.push(text);
        } else if (node.content) {
          node.content.forEach(extractContent);
        }
      };

      json.content?.forEach(extractContent);

      const combinedPrompt = parts.filter(Boolean).join(", ");

      // Debounce the settings update to avoid excessive re-renders
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      updateTimeoutRef.current = setTimeout(() => {
        setGenerationSettings({
          ...generationSettings,
          prompt: combinedPrompt,
        });
      }, 16); // ~1 frame at 60fps

      // Detect slash command at cursor position
      const { from } = editor.state.selection;
      const textBeforeCursor = editor.state.doc.textBetween(0, from, "\n");

      // If menu is already open, update search query based on saved slash position
      if (showMenu && slashPositionRef.current !== null) {
        const textAfterSlash = textBeforeCursor.substring(
          slashPositionRef.current + 1,
        );

        // Close menu if user typed space or moved cursor away from slash
        if (textAfterSlash.includes(" ") || from < slashPositionRef.current) {
          setShowMenu(false);
          slashPositionRef.current = null;
          setSearchQuery("");
        } else {
          setSearchQuery(textAfterSlash);
        }
        return;
      }

      // Look for new slash command
      const lastSlashIndex = textBeforeCursor.lastIndexOf("/");

      if (lastSlashIndex !== -1) {
        const textAfterSlash = textBeforeCursor.substring(lastSlashIndex + 1);
        const charBeforeSlash = textBeforeCursor[lastSlashIndex - 1];

        // Only show if slash is at word boundary and we haven't typed a space yet
        const shouldShow =
          (!charBeforeSlash ||
            charBeforeSlash === " " ||
            charBeforeSlash === "," ||
            charBeforeSlash === "\n") &&
          !textAfterSlash.includes(" ") &&
          from > lastSlashIndex;

        if (shouldShow) {
          slashPositionRef.current = lastSlashIndex;
          setSearchQuery(textAfterSlash);
          setShowMenu(true);
          setSelectedIndex(0);
        }
      }
    },
    [showMenu, generationSettings, setGenerationSettings],
  );

  const insertStyleChip = (style: any) => {
    if (!editor || slashPositionRef.current === null) return;

    // Remove any existing style chips
    editor.state.doc.descendants((node: any, pos: number) => {
      if (node.type.name === "chip" && node.attrs.chipType === "style") {
        editor.commands.deleteRange({ from: pos, to: pos + node.nodeSize });
      }
    });

    // Delete the slash and search query
    const { from } = editor.state.selection;
    editor
      .chain()
      .deleteRange({ from: slashPositionRef.current, to: from })
      .insertContent({
        type: "chip",
        attrs: {
          chipType: "style",
          title: style.name,
          value: style.prompt,
          styleId: style.id,
          loraUrl: style.loraUrl || "",
        },
      })
      .insertContent(" ") // Add space after chip
      .focus()
      .run();

    setGenerationSettings({
      ...generationSettings,
      styleId: style.id,
      loraUrl: style.loraUrl || "",
    });

    // Reset menu state
    slashPositionRef.current = null;
    setShowMenu(false);
    setSearchQuery("");
  };

  const insertTemplateChip = (template: any) => {
    if (!editor || slashPositionRef.current === null) return;

    // Delete the slash and search query
    const { from } = editor.state.selection;
    editor
      .chain()
      .deleteRange({ from: slashPositionRef.current, to: from })
      .insertContent({
        type: "chip",
        attrs: {
          chipType: "template",
          title: template.name,
          value: template.content,
          icon: template.category,
        },
      })
      .insertContent(" ") // Add space after chip
      .focus()
      .run();

    // Reset menu state
    slashPositionRef.current = null;
    setShowMenu(false);
    setSearchQuery("");
  };

  const menuItems = [
    ...styleModels.map((style) => ({
      id: `style-${style.id}`,
      title: style.name,
      subtitle: style.prompt,
      category: "🎨 Styles",
      icon: <Wand2 className="h-4 w-4" />,
      action: () => {
        insertStyleChip(style);
        setShowMenu(false);
      },
    })),
    ...promptTemplates.map((template) => ({
      id: `template-${template.id}`,
      title: template.name,
      subtitle: template.description,
      category: `✨ Templates: ${template.category.charAt(0).toUpperCase() + template.category.slice(1)}`,
      icon: getCategoryIcon(template.category),
      action: () => {
        insertTemplateChip(template);
        setShowMenu(false);
      },
    })),
  ];

  const filteredItems = menuItems.filter((item) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      item.title.toLowerCase().includes(query) ||
      item.subtitle.toLowerCase().includes(query) ||
      item.category.toLowerCase().includes(query)
    );
  });

  useEffect(() => {
    if (!editor) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (showMenu) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < filteredItems.length - 1 ? prev + 1 : prev,
          );
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        } else if (e.key === "Enter") {
          e.preventDefault();
          if (filteredItems[selectedIndex]) {
            filteredItems[selectedIndex].action();
          }
        } else if (e.key === "Escape") {
          e.preventDefault();

          // Delete the slash and search query
          if (editor && slashPositionRef.current !== null) {
            const { from } = editor.state.selection;
            editor
              .chain()
              .deleteRange({ from: slashPositionRef.current, to: from })
              .focus()
              .run();
          }

          setShowMenu(false);
          slashPositionRef.current = null;
          setSearchQuery("");
        }
      } else {
        if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
          e.preventDefault();
          if (!isGenerating && generationSettings.prompt.trim()) {
            handleRun();
          }
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [
    showMenu,
    filteredItems,
    selectedIndex,
    isGenerating,
    generationSettings,
  ]);

  if (!editor) {
    return null;
  }

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 md:absolute md:bottom-4 md:left-1/2 md:transform md:-translate-x-1/2 z-20 p-2 md:p-0 md:pb-0 md:max-w-[648px]">
        <div
          className="p-4 transition-all ease-in-out duration-100"
          style={{
            filter: "url(#gooey)",
            backgroundColor: `color-mix(in srgb, ${getGenerationTypeColor(generationType)} 8%, transparent)`,
          }}
        >
          {/* Editor section */}
          <div
            className={cn(
              "bg-background rounded-3xl",
              "shadow-[0_0_0_1px_rgba(50,50,50,0.16),0_4px_8px_-0.5px_rgba(50,50,50,0.08),0_8px_16px_-2px_rgba(50,50,50,0.04)]",
            )}
          >
            <div className="relative px-3 md:px-3 py-2 md:py-3">
              <EditorContent editor={editor} />

              {/* Selected images preview */}
              {selectedIds.length > 0 && (
                <div className="absolute top-4 right-4 flex items-center justify-end">
                  <div className="relative h-12 w-20">
                    {selectedIds.slice(0, 3).map((id, index) => {
                      const image = images.find((img) => img.id === id);
                      if (!image) return null;

                      const isLast =
                        index === Math.min(selectedIds.length - 1, 2);
                      const offset = index * 8;
                      const size = 40 - index * 4;
                      const topOffset = index * 2;

                      return (
                        <div
                          key={id}
                          className="absolute rounded-lg border border-border/20 bg-background overflow-hidden"
                          style={{
                            right: `${offset}px`,
                            top: `${topOffset}px`,
                            zIndex: 3 - index,
                            width: `${size}px`,
                            height: `${size}px`,
                          }}
                        >
                          <img
                            src={image.src}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                          {isLast && selectedIds.length > 3 && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                              <span className="text-white text-xs font-medium">
                                +{selectedIds.length - 3}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="tactile-group shadow-inner rounded-[22px] border border-border p-2 flex items-center gap-2">
            <div
              className="flex items-center gap-2 w-full"
              style={{ isolation: "isolate" }} // Isolate buttons from gooey filter
            >
              {/* Left: Generation type selector */}
              <TactileButtonGroup
                options={generationTypeOptions}
                activeId={generationType}
                onChange={setGenerationType}
              />

              <div
                className={cn(
                  "relative flex-1 rounded-xl overflow-hidden",
                  "flex items-center justify-center",
                  "bg-background border border-border/80 shadow-inner box-shadow-xs",
                )}
              >
                <MatrixToolbar
                  isGenerating={isGenerating}
                  state={deferredGenerationState}
                  generationType={generationType}
                  hasInputAsset={isImageMode}
                />
              </div>

              {/* Right: Action buttons */}
              <div className="flex items-center gap-1.5">
                {/* Upload button */}
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        variant="tactileSecondary"
                        size="icon"
                        onClick={() => {
                          const input = document.createElement("input");
                          input.type = "file";
                          input.accept = "image/*";
                          input.multiple = true;

                          input.style.position = "fixed";
                          input.style.top = "-1000px";
                          input.style.left = "-1000px";
                          input.style.opacity = "0";
                          input.style.pointerEvents = "none";
                          input.style.width = "1px";
                          input.style.height = "1px";

                          input.onchange = (e) => {
                            try {
                              handleFileUpload(
                                (e.target as HTMLInputElement).files,
                              );
                            } catch (error) {
                              console.error("File upload error:", error);
                              toast({
                                title: "Upload failed",
                                description: "Failed to process selected files",
                                variant: "destructive",
                              });
                            } finally {
                              if (input.parentNode) {
                                document.body.removeChild(input);
                              }
                            }
                          };

                          input.onerror = () => {
                            console.error("File input error");
                            if (input.parentNode) {
                              document.body.removeChild(input);
                            }
                          };

                          document.body.appendChild(input);

                          setTimeout(() => {
                            try {
                              input.click();
                            } catch (error) {
                              console.error(
                                "Failed to trigger file dialog:",
                                error,
                              );
                              toast({
                                title: "Upload unavailable",
                                description:
                                  "File upload is not available. Try using drag & drop instead.",
                                variant: "destructive",
                              });
                              if (input.parentNode) {
                                document.body.removeChild(input);
                              }
                            }
                          }, 10);

                          setTimeout(() => {
                            if (input.parentNode) {
                              document.body.removeChild(input);
                            }
                          }, 30000);
                        }}
                      >
                        <Upload className="h-4 w-4" />
                      </Button>
                    }
                  />
                  <TooltipContent>
                    <span>Upload images</span>
                  </TooltipContent>
                </Tooltip>

                {/* Run button */}
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        variant="tactilePrimary"
                        size="icon"
                        onClick={handleRun}
                        disabled={
                          isGenerating || !generationSettings.prompt.trim()
                        }
                      >
                        {isGenerating ? (
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        ) : (
                          <PlayIcon
                            className="h-4 w-4"
                            fill="currentColor"
                            strokeWidth={0}
                          />
                        )}
                        {/* <span>Run</span> */}
                      </Button>
                    }
                  />
                  <TooltipContent>
                    <div className="flex items-center gap-2">
                      <ShortcutBadge
                        variant="default"
                        size="xs"
                        shortcut={
                          checkOS("Win") || checkOS("Linux")
                            ? "ctrl+enter"
                            : "meta+enter"
                        }
                      />
                    </div>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Slash Command Dialog */}
      <Dialog
        open={showMenu}
        onOpenChange={(open) => {
          if (!open && editor && slashPositionRef.current !== null) {
            // Delete the slash and search query when dialog is closed
            const { from } = editor.state.selection;
            editor
              .chain()
              .deleteRange({ from: slashPositionRef.current, to: from })
              .focus()
              .run();

            slashPositionRef.current = null;
            setSearchQuery("");
          }
          setShowMenu(open);
        }}
      >
        <DottedDialogContent
          className="overflow-hidden p-0 w-full max-w-[95vw] sm:max-w-[90vw] lg:max-w-4xl"
          showCloseButton={false}
        >
          <div className="overflow-y-auto max-h-[80vh]">
            {Object.entries(
              filteredItems.reduce(
                (acc, item) => {
                  if (!acc[item.category]) acc[item.category] = [];
                  acc[item.category].push(item);
                  return acc;
                },
                {} as Record<string, any[]>,
              ),
            ).map(([category, items]) => (
              <div key={category}>
                <div className="px-4 py-3 text-sm font-semibold text-muted-foreground bg-muted/50 backdrop-blur-2xl sticky top-0 z-10">
                  {category}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 p-4">
                  {items.map((item) => {
                    const globalIndex = filteredItems.indexOf(item);
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          item.action();
                        }}
                        className={cn(
                          "text-left p-4 rounded-lg border hover:bg-accent transition-colors flex items-start gap-3",
                          globalIndex === selectedIndex &&
                            "bg-accent border-primary",
                        )}
                      >
                        <div className="mt-1 text-muted-foreground shrink-0">
                          {item.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm mb-1">
                            {item.title}
                          </div>
                          <div className="text-xs text-muted-foreground line-clamp-2">
                            {item.subtitle}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </DottedDialogContent>
      </Dialog>

      {/* Tiptap Styles */}
      <style jsx global>{`
        .ProseMirror {
          outline: none;
        }
        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: hsl(var(--muted-foreground));
          opacity: 0.5;
          pointer-events: none;
          height: 0;
        }

        /* ========================================
           Tactile Button Styles
           ======================================== */

        /* Container */
        .tactile-group {
          background: linear-gradient(180deg, #2a2a30 0%, #1a1a1f 100%);
          box-shadow:
            inset 0 1px 1px rgba(255, 255, 255, 0.05),
            inset 0 -1px 2px rgba(0, 0, 0, 0.3),
            0 1px 3px rgba(0, 0, 0, 0.2);
        }

        /* Button base */
        .tactile-btn {
          position: relative;
          cursor: pointer;
          background: linear-gradient(180deg, #3a3a42 0%, #2a2a32 100%);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        /* Icon styling */
        .tactile-btn__icon {
          z-index: 10;
          pointer-events: none;
          transition: all 0.15s ease;
        }

        /* ---- INACTIVE STATE ---- */
        .tactile-btn--inactive {
          transform: translateY(0);
          box-shadow:
            0 2px 4px rgba(0, 0, 0, 0.3),
            0 4px 8px rgba(0, 0, 0, 0.2),
            inset 0 1px 0 rgba(255, 255, 255, 0.1);
        }

        .tactile-btn--inactive .tactile-btn__icon {
          color: rgba(255, 255, 255, 0.45);
        }

        .tactile-btn--inactive:hover {
          background: linear-gradient(180deg, #424249 0%, #32323a 100%);
        }

        .tactile-btn--inactive:hover .tactile-btn__icon {
          color: rgba(255, 255, 255, 0.65);
        }

        /* ---- ACTIVE STATE (pressed) ---- */
        .tactile-btn--active {
          transform: translateY(1px);
          background: linear-gradient(180deg, #28282e 0%, #1e1e24 100%);
          box-shadow:
            inset 0 2px 4px rgba(0, 0, 0, 0.4),
            inset 0 1px 2px rgba(0, 0, 0, 0.3),
            0 1px 1px rgba(0, 0, 0, 0.2);
          border-color: rgba(0, 0, 0, 0.2);
        }

        /* Glowing icon */
        .tactile-btn--active .tactile-btn__icon {
          color: var(--tactile-glow-color, hsl(var(--primary)));
          filter: drop-shadow(0 0 3px var(--tactile-glow-color))
            drop-shadow(0 0 6px var(--tactile-glow-color))
            drop-shadow(
              0 0 10px
                color-mix(in srgb, var(--tactile-glow-color) 60%, transparent)
            );
          animation: tactile-glow 2.5s ease-in-out infinite;
        }

        @keyframes tactile-glow {
          0%,
          100% {
            filter: drop-shadow(0 0 2px var(--tactile-glow-color))
              drop-shadow(0 0 4px var(--tactile-glow-color))
              drop-shadow(
                0 0 8px
                  color-mix(in srgb, var(--tactile-glow-color) 50%, transparent)
              );
          }
          50% {
            filter: drop-shadow(0 0 4px var(--tactile-glow-color))
              drop-shadow(0 0 8px var(--tactile-glow-color))
              drop-shadow(
                0 0 14px
                  color-mix(in srgb, var(--tactile-glow-color) 70%, transparent)
              );
          }
        }

        @media (prefers-reduced-motion) {
          .tactile-btn {
            transition: none !important;
          }
          .tactile-btn--active .tactile-btn__icon {
            animation: none !important;
            filter: drop-shadow(0 0 4px var(--tactile-glow-color));
          }
        }
      `}</style>

      {/* SVG Gooey Filter for liquid melting effect */}
      <svg style={{ width: 0, height: 0, position: "absolute" }}>
        <defs>
          <filter id="gooey" x="-50%" y="-50%" width="250%" height="250%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur">
              <animate
                attributeName="stdDeviation"
                values="1.5;2;3.5;2;1.5"
                dur="3s"
                timing-function="linear"
                repeatCount="indefinite"
              />
            </feGaussianBlur>
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 54 -10"
              result="gooey"
            />
            <feComposite in="SourceGraphic" in2="gooey" operator="atop" />
          </filter>
        </defs>
      </svg>
    </>
  );
});
