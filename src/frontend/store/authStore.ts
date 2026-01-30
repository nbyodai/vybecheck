import { create } from 'zustand';
import { UnlockableFeature } from '../../shared/types';

interface AuthStore {
  isSignedIn: boolean;
  isSigningIn: boolean;
  twitterUsername: string | null;
  featureUnlocks: UnlockableFeature[];
  signInWithTwitter: () => void;
  setSignedIn: (username: string) => void;
  getQuestionLimit: () => number;
  hasUpgradedQuestionLimit: () => boolean;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  isSignedIn: false,
  isSigningIn: false,
  twitterUsername: null,
  featureUnlocks: [],

  signInWithTwitter: () => {
    set({ isSigningIn: true });
    // TODO: Implement actual Twitter OAuth flow
    // For now, simulate sign-in after 2 seconds
    setTimeout(() => {
      set({
        isSigningIn: false,
        isSignedIn: true,
        twitterUsername: '@demo_user',
        featureUnlocks: [],
      });
    }, 2000);
  },

  setSignedIn: (username) => {
    set({ isSignedIn: true, twitterUsername: username });
  },

  hasUpgradedQuestionLimit: () => {
    return get().featureUnlocks.includes('QUESTION_LIMIT_10');
  },

  getQuestionLimit: () => {
    const hasUpgrade = get().hasUpgradedQuestionLimit();
    const defaultLimit = Number(import.meta.env.VITE_DEFAULT_QUESTION_LIMIT) || 5;
    const upgradedLimit = Number(import.meta.env.VITE_UPGRADED_QUESTION_LIMIT) || 10;
    return hasUpgrade ? upgradedLimit : defaultLimit;
  },
}));
