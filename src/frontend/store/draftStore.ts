import { create } from 'zustand';

export interface DraftQuestion {
  id: string;
  prompt: string;
  options: [string, string];
  ownerResponse?: string; // Owner's answer to this question
}

interface DraftStore {
  draftQuestions: DraftQuestion[];
  addDraft: (prompt: string, options: [string, string], ownerResponse?: string) => void;
  removeDraft: (id: string) => void;
  setOwnerResponse: (id: string, response: string) => void;
  clearDrafts: () => void;
}

export const useDraftStore = create<DraftStore>((set) => ({
  draftQuestions: [],
  
  addDraft: (prompt, options, ownerResponse) => {
    const draft: DraftQuestion = {
      id: `draft-${Date.now()}`,
      prompt,
      options,
      ownerResponse,
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
  
  setOwnerResponse: (id, response) => {
    set((state) => ({
      draftQuestions: state.draftQuestions.map(q =>
        q.id === id ? { ...q, ownerResponse: response } : q
      ),
    }));
  },
  
  clearDrafts: () => set({ draftQuestions: [] }),
}));
