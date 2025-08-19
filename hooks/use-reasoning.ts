import { create } from 'zustand';

type ReasoningState = {
  isReasoning: boolean;
  isGenerating: boolean;
  setIsReasoning: (isReasoning: boolean) => void;
  setIsGenerating: (isGenerating: boolean) => void;
};

export const useReasoning = create<ReasoningState>((set) => ({
  isReasoning: false,
  isGenerating: false,
  setIsReasoning: (isReasoning) => set({ isReasoning }),
  setIsGenerating: (isGenerating) => set({ isGenerating }),
}));
