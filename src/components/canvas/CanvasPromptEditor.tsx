"use client";

import React from "react";
import { Button } from "@/components/ui/Button";
import {
  X,
  ChevronDown,
  Plus,
  ImageIcon,
  Paperclip,
  PlayIcon,
  ExternalLink,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SpinnerIcon } from "@/components/icons";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/textarea";
import {
  TooltipTrigger,
  TooltipContent,
  Tooltip,
} from "@/components/ui/Tooltip";
import { styleModels } from "@/lib/models";
import { checkOS } from "@/utils/os-utils";
import { ShortcutBadge } from "@/components/canvas/ShortcutBadge";
import type { GenerationSettings, PlacedImage } from "@/types/canvas";

interface CanvasPromptEditorProps {
  generationSettings: GenerationSettings;
  setGenerationSettings: (settings: GenerationSettings) => void;
  selectedIds: string[];
  images: PlacedImage[];
  isGenerating: boolean;
  previousStyleId: string;
  handleRun: () => void;
  handleFileUpload: (files: FileList | null) => void;
  setIsStyleDialogOpen: (open: boolean) => void;
  canvasStorage: any;
  setImages: React.Dispatch<React.SetStateAction<PlacedImage[]>>;
  setViewport: (viewport: { x: number; y: number; scale: number }) => void;
  toast: any;
}

export function CanvasPromptEditor({
  generationSettings,
  setGenerationSettings,
  selectedIds,
  images,
  isGenerating,
  previousStyleId,
  handleRun,
  handleFileUpload,
  setIsStyleDialogOpen,
  canvasStorage,
  setImages,
  setViewport,
  toast,
}: CanvasPromptEditorProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 md:absolute md:bottom-4 md:left-1/2 md:transform md:-translate-x-1/2 z-20 p-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] md:p-0 md:pb-0 md:max-w-[648px]">
      <div
        className={cn(
          "bg-card/95 backdrop-blur-lg rounded-3xl",
          "shadow-[0_0_0_1px_rgba(50,50,50,0.16),0_4px_8px_-0.5px_rgba(50,50,50,0.08),0_8px_16px_-2px_rgba(50,50,50,0.04)]",
          "dark:shadow-none dark:outline-1 dark:outline-border",
        )}
      >
        <div className="flex flex-col gap-3 px-3 md:px-3 py-2 md:py-3 relative">
          {/* Action buttons row */}
          <div className="flex items-center gap-1">
            <div className="flex items-center gap-3">
              {/* Mode indicator badge */}
              <div
                className={cn(
                  "h-9 rounded-xl overflow-clip flex items-center px-3",
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
                      T
                    </span>
                    <span className="text-orange-600 dark:text-orange-500">
                      Text to Image
                    </span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex-1" />
            <div className="flex items-center gap-2">
              {/* Clear button */}
              <Tooltip>
                <Button
                  variant="secondary"
                  size="icon-sm"
                  onClick={async () => {
                    if (
                      confirm("Clear all saved data? This cannot be undone.")
                    ) {
                      await canvasStorage.clearAll();
                      setImages([]);
                      setViewport({ x: 0, y: 0, scale: 1 });
                      toast({
                        title: "Storage cleared",
                        description: "All saved data has been removed",
                      });
                    }
                  }}
                  className="bg-destructive/10 text-destructive hover:bg-destructive/20"
                  title="Clear storage"
                  render={<TooltipTrigger />}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
                <TooltipContent className="text-destructive">
                  <span>Clear</span>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>

          <div className="relative">
            <Textarea
              value={generationSettings.prompt}
              onChange={(e) =>
                setGenerationSettings({
                  ...generationSettings,
                  prompt: e.target.value,
                })
              }
              placeholder={`Enter a prompt... (${checkOS("Win") || checkOS("Linux") ? "Ctrl" : "⌘"}+Enter to run)`}
              className="w-full h-20 resize-none border-none p-2 pr-36"
              style={{ fontSize: "16px" }}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                  e.preventDefault();
                  if (!isGenerating && generationSettings.prompt.trim()) {
                    handleRun();
                  }
                }
              }}
            />

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

          {generationSettings.styleId === "custom" && (
            <div className="w-full flex items-center gap-2">
              <Input
                value={generationSettings.loraUrl}
                onChange={(e) =>
                  setGenerationSettings({
                    ...generationSettings,
                    loraUrl: e.target.value,
                  })
                }
                placeholder="Kontext LoRA URL (optional)"
                style={{ fontSize: "16px" }}
              />
              <Button
                variant="ghost"
                size="icon"
                className="flex items-center gap-2"
                onClick={() => {
                  window.open(
                    "https://huggingface.co/collections/kontext-community/flux-kontext-loras-687e8779f8ed40a611a3925f",
                    "_blank",
                  );
                }}
                title="Browse Kontext LoRAs"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
              {generationSettings.styleId === "custom" && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="flex items-center gap-2"
                  onClick={() => {
                    const prevStyle = styleModels.find(
                      (model) => model.id === previousStyleId,
                    );

                    if (prevStyle) {
                      setGenerationSettings({
                        ...generationSettings,
                        styleId: prevStyle.id,
                        prompt: prevStyle.prompt,
                        loraUrl: prevStyle.loraUrl || "",
                      });
                    }
                  }}
                  title="Go back to previous style"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}

          {/* Style dropdown and Run button */}
          <div className="flex items-center justify-between">
            {/* Style selector button */}
            <Button
              variant="secondary"
              className="flex items-center gap-2"
              onClick={() => setIsStyleDialogOpen(true)}
            >
              {(() => {
                if (generationSettings.styleId === "custom") {
                  return (
                    <>
                      <div className="w-5 h-5 flex items-center justify-center">
                        <Plus className="w-4 h-4" />
                      </div>
                      <span className="text-sm">Custom</span>
                    </>
                  );
                }
                const selectedModel =
                  styleModels.find(
                    (m) => m.id === generationSettings.styleId,
                  ) || styleModels.find((m) => m.id === "simpsons");
                return (
                  <>
                    <img
                      src={selectedModel?.imageSrc}
                      alt={selectedModel?.name}
                      className="w-5 h-5 rounded-xl object-cover"
                    />
                    <span className="text-sm">
                      {selectedModel?.name || "Simpsons Style"}
                    </span>
                  </>
                );
              })()}
              <ChevronDown className="h-4 w-4" />
            </Button>
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
                        handleFileUpload((e.target as HTMLInputElement).files);
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
                        console.error("Failed to trigger file dialog:", error);
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
                  disabled={isGenerating || !generationSettings.prompt.trim()}
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
  );
}
