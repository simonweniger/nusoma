import { useCallback, useState } from "react";
import type { PlacedImage, PlacedVideo } from "@/types/canvas";

interface SnapGuide {
  lineGuide: number;
  offset: number;
  orientation: "V" | "H";
  snap: "start" | "center" | "end";
}

interface SnappingEdge {
  guide: number;
  offset: number;
  snap: "start" | "center" | "end";
}

interface SnappingResult {
  guides: SnapGuide[];
  snappedX?: number;
  snappedY?: number;
}

const GUIDELINE_OFFSET = 5; // Snap when within 5 pixels in world coordinates

export function useCanvasSnapping(
  images: PlacedImage[],
  videos: PlacedVideo[],
  canvasSize: { width: number; height: number },
  viewport: { x: number; y: number; scale: number },
) {
  const [guideLines, setGuideLines] = useState<SnapGuide[]>([]);

  // Get all possible snap points (stage edges, centers, and object edges/centers)
  const getLineGuideStops = useCallback(
    (skipId: string): { vertical: number[]; horizontal: number[] } => {
      // Start with stage borders and center (in world coordinates)
      const vertical = [0, canvasSize.width / 2, canvasSize.width];
      const horizontal = [0, canvasSize.height / 2, canvasSize.height];

      // Add edges and centers of all objects except the one being dragged
      const allObjects = [...images, ...videos].filter(
        (obj) => obj.id !== skipId,
      );

      allObjects.forEach((obj) => {
        // Left edge, center, right edge
        vertical.push(obj.x, obj.x + obj.width / 2, obj.x + obj.width);
        // Top edge, center, bottom edge
        horizontal.push(obj.y, obj.y + obj.height / 2, obj.y + obj.height);
      });

      return {
        vertical: vertical.flat(),
        horizontal: horizontal.flat(),
      };
    },
    [images, videos, canvasSize, viewport],
  );

  // Get snapping edges for the object being dragged
  const getObjectSnappingEdges = useCallback(
    (
      obj: PlacedImage | PlacedVideo,
    ): { vertical: SnappingEdge[]; horizontal: SnappingEdge[] } => {
      return {
        vertical: [
          {
            guide: Math.round(obj.x),
            offset: 0,
            snap: "start",
          },
          {
            guide: Math.round(obj.x + obj.width / 2),
            offset: Math.round(-obj.width / 2),
            snap: "center",
          },
          {
            guide: Math.round(obj.x + obj.width),
            offset: Math.round(-obj.width),
            snap: "end",
          },
        ],
        horizontal: [
          {
            guide: Math.round(obj.y),
            offset: 0,
            snap: "start",
          },
          {
            guide: Math.round(obj.y + obj.height / 2),
            offset: Math.round(-obj.height / 2),
            snap: "center",
          },
          {
            guide: Math.round(obj.y + obj.height),
            offset: Math.round(-obj.height),
            snap: "end",
          },
        ],
      };
    },
    [],
  );

  // Find the closest snapping guides
  const getGuides = useCallback(
    (
      lineGuideStops: { vertical: number[]; horizontal: number[] },
      itemBounds: { vertical: SnappingEdge[]; horizontal: SnappingEdge[] },
    ): SnapGuide[] => {
      const resultV: Array<SnapGuide & { diff: number }> = [];
      const resultH: Array<SnapGuide & { diff: number }> = [];

      // Scale the guideline offset based on viewport scale
      // When zoomed out (scale < 1), increase threshold in world coordinates
      // When zoomed in (scale > 1), decrease threshold
      const scaledOffset = GUIDELINE_OFFSET / viewport.scale;

      lineGuideStops.vertical.forEach((lineGuide) => {
        itemBounds.vertical.forEach((itemBound) => {
          const diff = Math.abs(lineGuide - itemBound.guide);
          if (diff < scaledOffset) {
            resultV.push({
              lineGuide: lineGuide,
              diff: diff,
              snap: itemBound.snap,
              offset: itemBound.offset,
              orientation: "V",
            });
          }
        });
      });

      lineGuideStops.horizontal.forEach((lineGuide) => {
        itemBounds.horizontal.forEach((itemBound) => {
          const diff = Math.abs(lineGuide - itemBound.guide);
          if (diff < scaledOffset) {
            resultH.push({
              lineGuide: lineGuide,
              diff: diff,
              snap: itemBound.snap,
              offset: itemBound.offset,
              orientation: "H",
            });
          }
        });
      });

      const guides: SnapGuide[] = [];

      // Find closest vertical snap
      const minV = resultV.sort((a, b) => a.diff - b.diff)[0];
      if (minV) {
        guides.push({
          lineGuide: minV.lineGuide,
          offset: minV.offset,
          orientation: "V",
          snap: minV.snap,
        });
      }

      // Find closest horizontal snap
      const minH = resultH.sort((a, b) => a.diff - b.diff)[0];
      if (minH) {
        guides.push({
          lineGuide: minH.lineGuide,
          offset: minH.offset,
          orientation: "H",
          snap: minH.snap,
        });
      }

      return guides;
    },
    [viewport.scale],
  );

  // Calculate snapping for an object during drag
  const getSnapping = useCallback(
    (obj: PlacedImage | PlacedVideo): SnappingResult => {
      const lineGuideStops = getLineGuideStops(obj.id);
      const itemBounds = getObjectSnappingEdges(obj);
      const guides = getGuides(lineGuideStops, itemBounds);

      if (!guides.length) {
        return { guides: [] };
      }

      let snappedX = obj.x;
      let snappedY = obj.y;

      guides.forEach((guide) => {
        if (guide.orientation === "V") {
          snappedX = guide.lineGuide + guide.offset;
        } else if (guide.orientation === "H") {
          snappedY = guide.lineGuide + guide.offset;
        }
      });

      return { guides, snappedX, snappedY };
    },
    [getLineGuideStops, getObjectSnappingEdges, getGuides],
  );

  // Update guide lines
  const updateGuideLines = useCallback((guides: SnapGuide[]) => {
    setGuideLines(guides);
  }, []);

  // Clear guide lines
  const clearGuideLines = useCallback(() => {
    setGuideLines([]);
  }, []);

  return {
    guideLines,
    getSnapping,
    updateGuideLines,
    clearGuideLines,
  };
}
