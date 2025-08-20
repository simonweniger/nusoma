import { create } from 'zustand';

type MediaGalleryState = {
  selectedMediaId: string | null;
  openMedia: (mediaId: string) => void;
  closeMedia: () => void;
};

export const useMediaGallery = create<MediaGalleryState>((set) => ({
  selectedMediaId: null,
  openMedia: (mediaId) => set({ selectedMediaId: mediaId }),
  closeMedia: () => set({ selectedMediaId: null }),
}));
