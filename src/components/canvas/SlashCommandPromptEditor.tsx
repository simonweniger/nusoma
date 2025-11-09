"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
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
import { Textarea } from "@/components/ui/textarea";
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

interface SlashCommandPromptEditorProps {
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

interface MenuItem {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  icon: React.ReactNode;
  action: () => void;
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

interface InsertedItem {
  id: string;
  title: string;
  type: "style" | "template";
  icon: React.ReactNode;
  value: string; // The actual prompt value
}

export function SlashCommandPromptEditor({
  generationSettings,
  setGenerationSettings,
  selectedIds,
  images,
  isGenerating,
  previousStyleId,
  handleRun,
  handleFileUpload,
  toast,
}: SlashCommandPromptEditorProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [insertedItems, setInsertedItems] = useState<InsertedItem[]>([]);
  const [userPrompt, setUserPrompt] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Build menu items
  const menuItems: MenuItem[] = [
    // Styles
    ...styleModels.map((style) => ({
      id: `style-${style.id}`,
      title: style.name,
      subtitle: style.prompt,
      category: "🎨 Styles",
      icon: <Wand2 className="h-4 w-4" />,
      action: () => {
        // Remove any existing style
        setInsertedItems((prev) =>
          prev.filter((item) => item.type !== "style"),
        );

        // Add new style as a chip
        setInsertedItems((prev) => [
          ...prev,
          {
            id: `style-${style.id}`,
            title: style.name,
            type: "style",
            icon: <Wand2 className="h-4 w-4" />,
            value: style.prompt,
          },
        ]);

        setGenerationSettings({
          ...generationSettings,
          styleId: style.id,
          loraUrl: style.loraUrl || "",
        });
        closeMenu();
      },
    })),
    // Templates
    ...promptTemplates.map((template) => ({
      id: `template-${template.id}`,
      title: template.name,
      subtitle: template.description,
      category: `✨ Templates: ${template.category.charAt(0).toUpperCase() + template.category.slice(1)}`,
      icon: getCategoryIcon(template.category),
      action: () => {
        // Add template as a chip (allow multiple templates)
        setInsertedItems((prev) => [
          ...prev,
          {
            id: `template-${template.id}-${Date.now()}`,
            title: template.name,
            type: "template",
            icon: getCategoryIcon(template.category),
            value: template.content,
          },
        ]);
        closeMenu();
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

  const closeMenu = () => {
    setShowMenu(false);
    setSearchQuery("");
    setSelectedIndex(0);
  };

  // Compute combined prompt from inserted items and user prompt
  const combinedPrompt = useMemo(() => {
    const stylePrompts = insertedItems
      .filter((item) => item.type === "style")
      .map((item) => item.value);
    const templatePrompts = insertedItems
      .filter((item) => item.type === "template")
      .map((item) => item.value);

    const parts = [...stylePrompts, ...templatePrompts, userPrompt].filter(
      Boolean,
    );
    return parts.join(", ");
  }, [insertedItems, userPrompt]);

  // Update generationSettings.prompt when combinedPrompt changes
  useEffect(() => {
    if (combinedPrompt !== generationSettings.prompt) {
      setGenerationSettings({
        ...generationSettings,
        prompt: combinedPrompt,
      });
    }
  }, [combinedPrompt]);

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setUserPrompt(value);

    // Detect slash command
    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = value.substring(0, cursorPos);
    const lastSlashIndex = textBeforeCursor.lastIndexOf("/");

    if (lastSlashIndex !== -1) {
      const textAfterSlash = textBeforeCursor.substring(lastSlashIndex + 1);
      // Only show menu if slash is at start of line or after a space/comma
      const charBeforeSlash = textBeforeCursor[lastSlashIndex - 1];
      const shouldShow =
        !charBeforeSlash ||
        charBeforeSlash === " " ||
        charBeforeSlash === "," ||
        charBeforeSlash === "\n";

      if (shouldShow) {
        setSearchQuery(textAfterSlash);
        setShowMenu(true);
        setSelectedIndex(0);
      }
    } else {
      closeMenu();
    }
  };

  const removeItem = (id: string) => {
    setInsertedItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
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
        closeMenu();
      }
    } else {
      // Handle Cmd/Ctrl+Enter to run
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        // Check if we have either user prompt or inserted items
        if (!isGenerating && (userPrompt.trim() || insertedItems.length > 0)) {
          handleRun();
        }
      }
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 md:absolute md:bottom-4 md:left-1/2 md:transform md:-translate-x-1/2 z-20 p-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] md:p-0 md:pb-0 md:max-w-[648px]">
      <div
        className={cn(
          "backdrop-blur-2xl rounded-[26px] p-1.5 transition-all",
          selectedIds.length > 0
            ? "bg-blue-500/10 shadow-[0_0_0_1px_rgba(59,130,246,0.2),0_4px_8px_-0.5px_rgba(59,130,246,0.08),0_8px_16px_-2px_rgba(59,130,246,0.04)] dark:shadow-none"
            : "bg-orange-500/10 shadow-[0_0_0_1px_rgba(249,115,22,0.2),0_4px_8px_-0.5px_rgba(249,115,22,0.08),0_8px_16px_-2px_rgba(249,115,22,0.04)] dark:shadow-none",
        )}
      >
        <div
          className={cn(
            "bg-background/90 backdrop-blur-xl rounded-3xl",
            "shadow-[0_0_0_1px_rgba(50,50,50,0.16),0_4px_8px_-0.5px_rgba(50,50,50,0.08),0_8px_16px_-2px_rgba(50,50,50,0.04)]",
            "dark:shadow-none dark:outline-1 dark:outline-border",
          )}
        >
          <div className="flex flex-col gap-3 px-3 md:px-3 py-2 md:py-3 relative">
            <div className="relative">
              {/* Inserted Items Chips */}
              {insertedItems.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2 px-2">
                  {insertedItems.map((item) => (
                    <div
                      key={item.id}
                      className={cn(
                        "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all",
                        item.type === "style"
                          ? "bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30"
                          : "bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30",
                      )}
                    >
                      <div className="shrink-0 opacity-70">{item.icon}</div>
                      <span className="font-medium">{item.title}</span>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="shrink-0 ml-1 hover:bg-black/10 dark:hover:bg-white/10 rounded-full p-0.5 transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <Textarea
                ref={textareaRef}
                value={userPrompt}
                onChange={handleTextareaChange}
                onKeyDown={handleKeyDown}
                placeholder={`Type / for commands... (${checkOS("Win") || checkOS("Linux") ? "Ctrl" : "⌘"}+Enter to run)`}
                className="w-full h-20 resize-none border-none p-2 pr-36"
                style={{ fontSize: "16px" }}
              />

              {/* Selected images preview */}
              {selectedIds.length > 0 && (
                <div className="absolute top-1 right-2 flex items-center justify-end">
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

            {/* Bottom controls */}
            <div className="flex items-center justify-between">
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
                      isGenerating ||
                      (!userPrompt.trim() && insertedItems.length === 0)
                    }
                    className={cn(
                      "gap-2 font-medium transition-all",
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

      {/* Slash Command Dialog */}
      <Dialog open={showMenu} onOpenChange={setShowMenu}>
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
                {} as Record<string, MenuItem[]>,
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
                          closeMenu();
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
    </div>
  );
}
