import { create } from 'zustand';
import type { QuizState, MatchResult, MatchTier } from '../../shared/types';

interface MatchState {
  matches: MatchResult[];
  tier: MatchTier;
  cost: number;
  isLoading: boolean;
}

interface QuestionLimitState {
  isAtLimit: boolean;
  current: number;
  max: number;
  upgradeCost: number;
}

interface QuizStore {
  sessionId: string;
  participantId: string;
  isOwner: boolean;
  quizState: QuizState | null;
  matchState: MatchState;
  questionLimitState: QuestionLimitState | null;
  
  setSessionId: (sessionId: string) => void;
  setParticipantId: (participantId: string) => void;
  setIsOwner: (isOwner: boolean) => void;
  setQuizState: (quizState: QuizState | null) => void;
  updateQuizState: (updater: (prev: QuizState | null) => QuizState | null) => void;
  setMatchState: (state: Partial<MatchState>) => void;
  setMatchesLoading: (isLoading: boolean) => void;
  setQuestionLimitState: (state: QuestionLimitState | null) => void;
  clearQuestionLimitState: () => void;
  reset: () => void;
  
  // Legacy compatibility
  matches: MatchResult[];
  setMatches: (matches: MatchResult[]) => void;
}

const initialMatchState: MatchState = {
  matches: [],
  tier: 'PREVIEW',
  cost: 0,
  isLoading: false,
};

export const useQuizStore = create<QuizStore>((set, get) => ({
  sessionId: '',
  participantId: '',
  isOwner: false,
  quizState: null,
  matchState: initialMatchState,
  questionLimitState: null,
  
  // Legacy compatibility getter
  get matches() {
    return get().matchState.matches;
  },
  
  setSessionId: (sessionId) => set({ sessionId }),
  
  setParticipantId: (participantId) => set({ participantId }),
  
  setIsOwner: (isOwner) => set({ isOwner }),
  
  setQuizState: (quizState) => set({ quizState }),
  
  updateQuizState: (updater) => set((state) => ({ 
    quizState: updater(state.quizState) 
  })),
  
  setMatchState: (newState) => set((state) => ({
    matchState: { ...state.matchState, ...newState },
  })),
  
  setMatchesLoading: (isLoading) => set((state) => ({
    matchState: { ...state.matchState, isLoading },
  })),
  
  // Legacy compatibility setter
  setMatches: (matches) => set((state) => ({
    matchState: { ...state.matchState, matches },
  })),
  
  setQuestionLimitState: (questionLimitState) => set({ questionLimitState }),
  
  clearQuestionLimitState: () => set({ questionLimitState: null }),
  
  reset: () => set({
    sessionId: '',
    participantId: '',
    isOwner: false,
    quizState: null,
    matchState: initialMatchState,
    questionLimitState: null,
  }),
}));
