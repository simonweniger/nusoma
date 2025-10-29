"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ImageIcon, VideoIcon, FileIcon, PanelLeftClose } from "lucide-react";
import { PlacedImage, PlacedVideo } from "@/types/canvas";
import { cn } from "@/lib/utils";
import { Logo, LogoIcon } from "@/components/icons";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
  SheetHeader,
} from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";

interface CanvasLeftSidebarProps {
  images: PlacedImage[];
  videos: PlacedVideo[];
  selectedIds: string[];
  onAssetClick: (id: string, x: number, y: number) => void;
  onAssetSelect: (id: string, isMultiSelect: boolean) => void;
  projectName?: string;
  folderName?: string;
}

export function CanvasLeftSidebar({
  images,
  videos,
  selectedIds,
  onAssetClick,
  onAssetSelect,
  projectName = "Untitled",
  folderName = "Drafts",
}: CanvasLeftSidebarProps) {
  const allAssets = [
    ...images.map((img) => ({ ...img, type: "image" as const })),
    ...videos.map((vid) => ({ ...vid, type: "video" as const })),
  ].sort((a, b) => {
    // Sort by creation time if available, otherwise by ID
    return a.id.localeCompare(b.id);
  });

  return (
    <Sheet>
      <SheetTrigger
        render={(triggerProps) => (
          <Button
            {...triggerProps}
            className="hidden lg:flex items-center gap-2 fixed top-4 left-4 z-30 p-3 rounded-xl bg-background/95 border border-border shadow-sm hover:bg-muted"
          >
            <LogoIcon className="h-5 w-5" />
            <div className="flex flex-col items-start  min-w-0">
              <div
                className="text-sm font-semibold truncate"
                title={projectName}
              >
                {projectName || "Untitled"}
              </div>
              <div
                className="text-[11px] text-muted-foreground truncate"
                title={folderName || "Drafts"}
              >
                {folderName || "Drafts"}
              </div>
            </div>
          </Button>
        )}
      />

      <SheetContent side="left">
        <SheetHeader>
          <div className="flex items-center gap-2">
            <Logo className="h-6 w-auto shrink-0 text-foreground" />
            <SheetClose
              className="ml-auto inline-flex items-center justify-center h-7 w-7 rounded-md hover:bg-muted text-muted-foreground"
              aria-label="Hide sidebar"
              title="Hide sidebar"
            >
              <PanelLeftClose className="h-4 w-4" />
            </SheetClose>
          </div>
          <div className="flex flex-col min-w-0 mt-6">
            <div className="text-md font-semibold truncate" title={projectName}>
              {projectName || "Untitled"}
            </div>
            <div
              className="text-sm text-muted-foreground truncate"
              title={folderName || "Drafts"}
            >
              {folderName || "Drafts"}
            </div>
          </div>
        </SheetHeader>
        {/* Section Header: Assets */}
        <div className="px-4 py-2 border-y border-border">
          <div className="flex items-center gap-2">
            <FileIcon className="w-4 h-4 text-muted-foreground" />
            <h2 className="font-medium text-xs">Assets</h2>
            <span className="ml-auto text-[11px] text-muted-foreground">
              {allAssets.length}
            </span>
          </div>
        </div>

        {/* Assets List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {allAssets.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-4">
              <ImageIcon className="w-12 h-12 text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">No assets yet</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Upload or generate images to get started
              </p>
            </div>
          ) : (
            allAssets.map((asset) => (
              <motion.button
                key={asset.id}
                onClick={(e) => {
                  if (e.shiftKey || e.metaKey || e.ctrlKey) {
                    onAssetSelect(asset.id, true);
                  } else {
                    onAssetSelect(asset.id, false);
                    onAssetClick(asset.id, asset.x, asset.y);
                  }
                }}
                className={cn(
                  "w-full p-2 rounded-lg border transition-all duration-200 hover:border-primary/50",
                  "flex items-center gap-3 group",
                  selectedIds.includes(asset.id)
                    ? "border-primary bg-primary/10"
                    : "border-border bg-card hover:bg-muted/50",
                )}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {/* Thumbnail */}
                <div className="relative w-12 h-12 rounded-md overflow-hidden bg-muted flex-shrink-0">
                  {asset.type === "image" ? (
                    <img
                      src={asset.src}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="relative w-full h-full">
                      <video
                        src={asset.src}
                        className="w-full h-full object-cover"
                        muted
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                        <VideoIcon className="w-4 h-4 text-white" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center gap-1 mb-1">
                    {asset.type === "image" ? (
                      <ImageIcon className="w-3 h-3 text-muted-foreground" />
                    ) : (
                      <VideoIcon className="w-3 h-3 text-muted-foreground" />
                    )}
                    <span className="text-xs font-medium truncate">
                      {asset.type === "image" ? "Image" : "Video"}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    <div>
                      {Math.round(asset.width)} × {Math.round(asset.height)}
                    </div>
                    <div className="truncate">
                      x: {Math.round(asset.x)}, y: {Math.round(asset.y)}
                    </div>
                  </div>
                </div>
              </motion.button>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
