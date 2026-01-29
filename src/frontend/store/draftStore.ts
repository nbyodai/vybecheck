import { create } from 'zustand';

export interface DraftQuestion {
  id: string;
  prompt: string;
  options: [string, string];
}

interface DraftStore {
  draftQuestions: DraftQuestion[];
  addDraft: (prompt: string, options: [string, string]) => void;
  removeDraft: (id: string) => void;
  clearDrafts: () => void;
}

export const useDraftStore = create<DraftStore>((set) => ({
  draftQuestions: [],
  
  addDraft: (prompt, options) => {
    const draft: DraftQuestion = {
      id: `draft-${Date.now()}`,
      prompt,
      options,
    };
    set((state) => ({ 
      draftQuestions: [...state.draftQuestions, draft] 
    }));
  },
  
  removeDraft: (id) => {
    set((state) => ({
      draftQuestions: state.draftQuestions.filter(q => q.id !== id),
    }));
  },
  
  clearDrafts: () => set({ draftQuestions: [] }),
}));
