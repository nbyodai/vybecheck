import { create } from 'zustand';
import type { UnlockableFeature, LedgerEntry } from '../../shared/types';

interface AuthStore {
  isSignedIn: boolean;
  isSigningIn: boolean;
  twitterUsername: string | null;
  featureUnlocks: UnlockableFeature[];
  vybesBalance: number;
  transactionHistory: LedgerEntry[];
  signInWithTwitter: () => void;
  setSignedIn: (username: string) => void;
  setVybesBalance: (balance: number) => void;
  addFeatureUnlock: (feature: UnlockableFeature) => void;
  setTransactionHistory: (transactions: LedgerEntry[]) => void;
  getQuestionLimit: () => number;
  hasUpgradedQuestionLimit: () => boolean;
  hasFeatureUnlock: (feature: UnlockableFeature) => boolean;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  isSignedIn: false,
  isSigningIn: false,
  twitterUsername: null,
  featureUnlocks: [],
  vybesBalance: 0,
  transactionHistory: [],

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

  setVybesBalance: (balance) => {
    set({ vybesBalance: balance });
  },

  addFeatureUnlock: (feature) => {
    set((state) => ({
      featureUnlocks: state.featureUnlocks.includes(feature)
        ? state.featureUnlocks
        : [...state.featureUnlocks, feature],
    }));
  },

  setTransactionHistory: (transactions) => {
    set({ transactionHistory: transactions });
  },

  hasUpgradedQuestionLimit: () => {
    return get().featureUnlocks.includes('QUESTION_LIMIT_10');
  },

  hasFeatureUnlock: (feature) => {
    return get().featureUnlocks.includes(feature);
  },

  getQuestionLimit: () => {
    const hasUpgrade = get().hasUpgradedQuestionLimit();
    const defaultLimit = Number(import.meta.env.VITE_DEFAULT_QUESTION_LIMIT) || 3;
    const upgradedLimit = Number(import.meta.env.VITE_UPGRADED_QUESTION_LIMIT) || 10;
    return hasUpgrade ? upgradedLimit : defaultLimit;
  },
}));
