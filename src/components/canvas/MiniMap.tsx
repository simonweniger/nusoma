import React from "react";
import type { PlacedImage, PlacedVideo } from "@/types/canvas";
import { cn } from "@/lib/utils";

interface MiniMapProps {
  images: PlacedImage[];
  videos: PlacedVideo[];
  viewport: {
    x: number;
    y: number;
    scale: number;
  };
  canvasSize: {
    width: number;
    height: number;
  };
}

export const MiniMap: React.FC<MiniMapProps> = ({
  images,
  videos,
  viewport,
  canvasSize,
}) => {
  // Calculate bounds of all content
  let minX = Infinity,
    minY = Infinity;
  let maxX = -Infinity,
    maxY = -Infinity;

  // images
  images.forEach((img) => {
    minX = Math.min(minX, img.x);
    minY = Math.min(minY, img.y);
    maxX = Math.max(maxX, img.x + img.width);
    maxY = Math.max(maxY, img.y + img.height);
  });

  // videos
  videos.forEach((vid) => {
    minX = Math.min(minX, vid.x);
    minY = Math.min(minY, vid.y);
    maxX = Math.max(maxX, vid.x + vid.width);
    maxY = Math.max(maxY, vid.y + vid.height);
  });

  // If there are no elements, set default bounds
  if (
    minX === Infinity ||
    minY === Infinity ||
    maxX === -Infinity ||
    maxY === -Infinity
  ) {
    minX = 0;
    minY = 0;
    maxX = canvasSize.width;
    maxY = canvasSize.height;
  }

  const contentWidth = maxX - minX;
  const contentHeight = maxY - minY;
  const miniMapWidth = 192; // 48 * 4 (w-48 in tailwind)
  const miniMapHeight = 128; // 32 * 4 (h-32 in tailwind)

  // Calculate scale to fit content in minimap
  const scaleX = miniMapWidth / contentWidth;
  const scaleY = miniMapHeight / contentHeight;
  const scale = Math.min(scaleX, scaleY) * 0.9; // 90% to add padding

  // Center content in minimap
  const offsetX = (miniMapWidth - contentWidth * scale) / 2;
  const offsetY = (miniMapHeight - contentHeight * scale) / 2;

  return (
    <div
      className={cn(
        "absolute top-4 right-2 md:right-4 z-20 bg-background/95 rounded-2xl p-1 md:p-2 backdrop-blur",
        "shadow-[0_0_0_1px_rgba(50,50,50,0.16),0_4px_8px_-0.5px_rgba(50,50,50,0.08),0_8px_16px_-2px_rgba(50,50,50,0.04)]",
        "dark:shadow-none dark:border dark:border-border",
      )}
    >
      <div className="relative w-32 h-24 md:w-48 md:h-32 bg-muted rounded-xl overflow-hidden">
        {/* Render tiny versions of images */}
        {images.map((img) => (
          <div
            key={img.id}
            className="absolute bg-primary/50"
            style={{
              left: `${(img.x - minX) * scale + offsetX}px`,
              top: `${(img.y - minY) * scale + offsetY}px`,
              width: `${img.width * scale}px`,
              height: `${img.height * scale}px`,
            }}
          />
        ))}

        {videos.map((vid) => (
          <div
            key={vid.id}
            className="absolute bg-primary"
            style={{
              left: `${(vid.x - minX) * scale + offsetX}px`,
              top: `${(vid.y - minY) * scale + offsetY}px`,
              width: `${vid.width * scale}px`,
              height: `${vid.height * scale}px`,
            }}
          />
        ))}

        {/* Viewport indicator */}
        <div
          className="absolute border-2 border-blue-500 bg-blue-500/10"
          style={{
            left: `${(-viewport.x / viewport.scale - minX) * scale + offsetX}px`,
            top: `${(-viewport.y / viewport.scale - minY) * scale + offsetY}px`,
            width: `${(canvasSize.width / viewport.scale) * scale}px`,
            height: `${(canvasSize.height / viewport.scale) * scale}px`,
          }}
        />
      </div>
      <p className="text-xs text-muted-foreground mt-1 text-center">Mini-map</p>
    </div>
  );
};
