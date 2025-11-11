"use client";

import React, { useEffect, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import { Button } from "@/components/ui/Button";
import {
  PlayIcon,
  Paperclip,
  ImageIcon,
  Wand2,
  Camera,
  Lightbulb,
  Grid3x3,
  Palette,
  Sparkles,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SpinnerIcon } from "@/components/icons";
import { styleModels } from "@/lib/models";
import { promptTemplates, PromptTemplate } from "@/lib/prompt-templates";
import { checkOS } from "@/utils/os-utils";
import { ShortcutBadge } from "@/components/canvas/ShortcutBadge";
import type { GenerationSettings, PlacedImage } from "@/types/canvas";
import {
  TooltipTrigger,
  TooltipContent,
  Tooltip,
} from "@/components/ui/Tooltip";
import { Dialog, DialogContent } from "@/components/ui/Dialog";

interface PromptEditorProps {
  generationSettings: GenerationSettings;
  setGenerationSettings: (settings: GenerationSettings) => void;
  selectedIds: string[];
  images: PlacedImage[];
  isGenerating: boolean;
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

export function PromptEditor({
  generationSettings,
  setGenerationSettings,
  selectedIds,
  images,
  isGenerating,
  previousStyleId,
  handleRun,
  handleFileUpload,
  toast,
}: PromptEditorProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const slashPositionRef = React.useRef<number | null>(null);

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

  const handleEditorUpdate = (editor: any) => {
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

    setGenerationSettings({
      ...generationSettings,
      prompt: combinedPrompt,
    });

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
  };

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
      <div className="fixed bottom-0 left-0 right-0 md:absolute md:bottom-4 md:left-1/2 md:transform md:-translate-x-1/2 z-20 p-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] md:p-0 md:pb-0 md:max-w-[648px]">
        <div
          className={cn(
            "backdrop-blur-2xl rounded-[26px] p-1.5 transition-all",
            selectedIds.length > 0
              ? "bg-blue-500/10 shadow-[0_0_0_1px_rgba(59,130,246,0.2),0_4px_8px_-0.5px_rgba(59,130,246,0.08),0_8px_16px_-2px_rgba(59,130,246,0.04)] dark:shadow-none"
              : "bg-orange-500/10 shadow-[0_0_0_1px_rgba(249,115,22,0.2),0_4px_8px_-0.5px_rgba(249,115,22,0.08),0_8px_16px_-2px_rgba(249,115,22,0.04)] dark:shadow-none",
          )}
        >
          <div style={{ filter: "url(#gooey)" }}>
            {/* Editor section */}
            <div className={cn("bg-background backdrop-blur-xl rounded-3xl")}>
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

            {/* Bottom controls - separate section */}
            <div
              className={cn("bg-background backdrop-blur-xl rounded-3xl mt-1")}
            >
              <div className="flex items-center justify-between px-3 py-2">
                {/* Mode indicator badge */}
                <div
                  className={cn(
                    "py-1 rounded-xl overflow-clip flex items-center px-3",
                    "pointer-events-none select-none",
                    selectedIds.length > 0
                      ? "bg-blue-500/10 dark:bg-blue-500/15 shadow-[0_0_0_1px_rgba(59,130,246,0.2),0_4px_8px_-0.5px_rgba(59,130,246,0.08),0_8px_16px_-2px_rgba(59,130,246,0.04)] dark:shadow-none dark:border dark:border-blue-500/30"
                      : "bg-orange-500/10 dark:bg-orange-500/15 shadow-[0_0_0_1px_rgba(249,115,22,0.2),0_4px_8px_-0.5px_rgba(249,115,22,0.08),0_8px_16px_-2px_rgba(249,115,22,0.04)] dark:shadow-none dark:border dark:border-orange-500/30",
                  )}
                >
                  {selectedIds.length > 0 ? (
                    <div className="flex items-center gap-2 text-xs font-medium">
                      <ImageIcon className="w-4 h-4 text-blue-600 dark:text-blue-500" />
                      <span className="text-blue-600 dark:text-blue-500">
                        Image to Image
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-xs font-medium">
                      <span className="text-orange-600 dark:text-orange-500 font-bold text-sm">
                        G
                      </span>
                      <span className="text-orange-600 dark:text-orange-500">
                        Generate Image
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {/* Attachment button */}
                  <Tooltip>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="border-none"
                      render={<TooltipTrigger />}
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
                      title="Upload images"
                    >
                      <Paperclip className="h-4 w-4" />
                    </Button>
                    <TooltipContent>
                      <span>Upload</span>
                    </TooltipContent>
                  </Tooltip>

                  {/* Run button */}
                  <Tooltip>
                    <Button
                      onClick={handleRun}
                      variant="default"
                      size="icon"
                      disabled={
                        isGenerating || !generationSettings.prompt.trim()
                      }
                      className={cn(
                        "gap-2 font-medium transition-all rounded-full",
                        isGenerating && "bg-secondary",
                      )}
                      render={<TooltipTrigger />}
                    >
                      {isGenerating ? (
                        <SpinnerIcon className="h-4 w-4 animate-spin text-white" />
                      ) : (
                        <PlayIcon className="h-4 w-4 text-white fill-white" />
                      )}
                    </Button>
                    <TooltipContent>
                      <div className="flex items-center gap-2">
                        <span>Run</span>
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
        <DialogContent
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
        </DialogContent>
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
      `}</style>

      {/* SVG Gooey Filter for liquid melting effect */}
      <svg style={{ width: 0, height: 0, position: "absolute" }}>
        <defs>
          <filter id="gooey" colorInterpolationFilters="sRGB">
            <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -8"
              result="gooey"
            />
            <feBlend in="SourceGraphic" in2="gooey" mode="normal" />
          </filter>
        </defs>
      </svg>
    </>
  );
}
