import { create } from 'zustand';
import type { QuizState, MatchResult } from '../../shared/types';

interface QuizStore {
  sessionId: string;
  participantId: string;
  isOwner: boolean;
  quizState: QuizState | null;
  matches: MatchResult[];
  
  setSessionId: (sessionId: string) => void;
  setParticipantId: (participantId: string) => void;
  setIsOwner: (isOwner: boolean) => void;
  setQuizState: (quizState: QuizState | null) => void;
  updateQuizState: (updater: (prev: QuizState | null) => QuizState | null) => void;
  setMatches: (matches: MatchResult[]) => void;
  reset: () => void;
}

export const useQuizStore = create<QuizStore>((set) => ({
  sessionId: '',
  participantId: '',
  isOwner: false,
  quizState: null,
  matches: [],
  
  setSessionId: (sessionId) => set({ sessionId }),
  
  setParticipantId: (participantId) => set({ participantId }),
  
  setIsOwner: (isOwner) => set({ isOwner }),
  
  setQuizState: (quizState) => set({ quizState }),
  
  updateQuizState: (updater) => set((state) => ({ 
    quizState: updater(state.quizState) 
  })),
  
  setMatches: (matches) => set({ matches }),
  
  reset: () => set({
    sessionId: '',
    participantId: '',
    isOwner: false,
    quizState: null,
    matches: [],
  }),
}));
