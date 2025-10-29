import { useCallback } from "react";
import { PlacedImage, PlacedVideo } from "@/types/canvas";

interface UseCanvasAssetsProps {
  images: PlacedImage[];
  videos: PlacedVideo[];
  viewport: { x: number; y: number; scale: number };
  canvasSize: { width: number; height: number };
  setViewport: (viewport: { x: number; y: number; scale: number }) => void;
  setSelectedIds: React.Dispatch<React.SetStateAction<string[]>>;
}

export function useCanvasAssets({
  images,
  videos,
  viewport,
  canvasSize,
  setViewport,
  setSelectedIds,
}: UseCanvasAssetsProps) {
  // Function to navigate to an asset (focus viewport on it)
  const handleAssetNavigation = useCallback(
    (id: string, x: number, y: number) => {
      // Calculate the center of the canvas
      const centerX = canvasSize.width / 2;
      const centerY = canvasSize.height / 2;

      // Find the asset to get its dimensions
      const asset = [...images, ...videos].find((item) => item.id === id);
      if (!asset) return;

      // Calculate the new viewport position to center the asset
      const assetCenterX = x + asset.width / 2;
      const assetCenterY = y + asset.height / 2;

      // Set viewport to center the asset
      setViewport({
        x: centerX - assetCenterX * viewport.scale,
        y: centerY - assetCenterY * viewport.scale,
        scale: viewport.scale,
      });
    },
    [images, videos, viewport.scale, canvasSize, setViewport],
  );

  // Handle asset selection from sidebar
  const handleAssetSelect = useCallback(
    (id: string, isMultiSelect: boolean) => {
      if (isMultiSelect) {
        setSelectedIds((prev) =>
          prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
        );
      } else {
        setSelectedIds([id]);
      }
    },
    [setSelectedIds],
  );

  return {
    handleAssetNavigation,
    handleAssetSelect,
  };
}
