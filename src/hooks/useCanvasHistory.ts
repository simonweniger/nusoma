import { useState, useCallback, useEffect } from "react";
import { db } from "@/lib/db";
import { id } from "@instantdb/react";
import type { PlacedImage, PlacedVideo } from "@/types/canvas";

export interface HistoryState {
  images: PlacedImage[];
  videos?: PlacedVideo[]; // Optional for backward compatibility
  selectedIds: string[];
  timestamp?: Date; // Optional timestamp from database
}

interface UseCanvasHistoryProps {
  projectId: string | null;
  images: any[];
  videos: any[];
  selectedIds: string[];
  onRestore: (state: HistoryState) => void;
}

export function useCanvasHistory({
  projectId,
  images,
  videos,
  selectedIds,
  onRestore,
}: UseCanvasHistoryProps) {
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState(-1);

  const { data: historyData } = db.useQuery(
    projectId
      ? {
          canvasHistory: {
            $: {
              where: { "project.id": projectId },
              order: { order: "asc" },
            },
          },
        }
      : { canvasHistory: { $: { where: { id: "__none__" } } } },
  );

  const history =
    historyData?.canvasHistory?.map((snapshot: any) => ({
      ...(snapshot.snapshotData as HistoryState),
      timestamp: snapshot.timestamp,
    })) || [];

  const historyIndex =
    currentHistoryIndex === -1 && history.length > 0
      ? history.length - 1
      : currentHistoryIndex;

  const saveToHistory = useCallback(async () => {
    if (!projectId) return;

    const newState: HistoryState = {
      images: [...images],
      videos: [...videos],
      selectedIds: [...selectedIds],
    };

    try {
      const existingSnapshots = await db.queryOnce({
        canvasHistory: {
          $: {
            where: { "project.id": projectId },
            order: { order: "asc" },
          },
        },
      });

      const currentHistory = existingSnapshots.data.canvasHistory;
      const currentIndex =
        currentHistoryIndex >= 0
          ? currentHistoryIndex
          : currentHistory.length - 1;

      // Truncate history if we're not at the end (removing "redo" items)
      if (currentIndex < currentHistory.length - 1) {
        const toDelete = currentHistory.slice(currentIndex + 1);
        if (toDelete.length > 0) {
          const deleteTxs = toDelete.map((snapshot: any) =>
            db.tx.canvasHistory[snapshot.id].delete(),
          );
          await db.transact(deleteTxs);
        }
      }

      // Limit history to last 50 snapshots to avoid excessive data
      const MAX_HISTORY_SNAPSHOTS = 50;
      const remainingHistory = currentHistory.slice(0, currentIndex + 1);
      if (remainingHistory.length >= MAX_HISTORY_SNAPSHOTS) {
        const toRemove = remainingHistory.length - MAX_HISTORY_SNAPSHOTS + 1;
        const deleteTxs = remainingHistory
          .slice(0, toRemove)
          .map((snapshot: any) => db.tx.canvasHistory[snapshot.id].delete());
        await db.transact(deleteTxs);
      }

      // Add new snapshot
      const snapshotId = id();
      const newOrder =
        Math.max(...currentHistory.map((s: any) => s.order || 0), -1) + 1;

      await db.transact([
        db.tx.canvasHistory[snapshotId].update({
          snapshotData: newState,
          timestamp: new Date(),
          order: newOrder,
        }),
        db.tx.canvasHistory[snapshotId].link({ project: projectId }),
      ]);

      // Update current index to point to the new snapshot
      setCurrentHistoryIndex(newOrder);
    } catch (error) {
      console.error("Failed to save history:", error);
    }
  }, [images, videos, selectedIds, projectId, currentHistoryIndex]);

  // Undo - just update the index and restore state from InstantDB history
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1];
      if (prevState) {
        onRestore(prevState);
        setCurrentHistoryIndex(historyIndex - 1);
      }
    }
  }, [history, historyIndex, onRestore]);

  // Redo - just update the index and restore state from InstantDB history
  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      if (nextState) {
        onRestore(nextState);
        setCurrentHistoryIndex(historyIndex + 1);
      }
    }
  }, [history, historyIndex, onRestore]);

  // Restore to a specific history index
  const restoreHistory = useCallback(
    (index: number) => {
      if (index >= 0 && index < history.length) {
        const state = history[index];
        if (state) {
          onRestore(state);
          setCurrentHistoryIndex(index);
        }
      }
    },
    [history, onRestore],
  );

  // Initialize history index when history loads from DB
  useEffect(() => {
    if (currentHistoryIndex === -1 && history.length > 0) {
      setCurrentHistoryIndex(history.length - 1);
    }
  }, [history.length, currentHistoryIndex]);

  // Save initial state
  useEffect(() => {
    if (history.length === 0 && projectId) {
      saveToHistory();
    }
  }, [history.length, projectId, saveToHistory]);

  return {
    history,
    historyIndex,
    saveToHistory,
    undo,
    redo,
    restoreHistory,
    canUndo: historyIndex > 0,
    canRedo: historyIndex < history.length - 1,
  };
}
