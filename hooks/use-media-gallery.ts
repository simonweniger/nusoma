import { create } from 'zustand';

type MediaGalleryState = {
  selectedMediaId: string | null;
  selectedNodeIds: string[];
  openMedia: (mediaId: string, nodeIds?: string[]) => void;
  closeMedia: () => void;
};

export const useMediaGallery = create<MediaGalleryState>((set) => ({
  selectedMediaId: null,
  selectedNodeIds: [],
  openMedia: (mediaId, nodeIds = []) =>
    set({ selectedMediaId: mediaId, selectedNodeIds: nodeIds }),
  closeMedia: () => set({ selectedMediaId: null, selectedNodeIds: [] }),
}));
