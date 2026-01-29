import { create } from 'zustand';

interface AuthStore {
  isSignedIn: boolean;
  isSigningIn: boolean;
  twitterUsername: string | null;
  signInWithTwitter: () => void;
  setSignedIn: (username: string) => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  isSignedIn: false,
  isSigningIn: false,
  twitterUsername: null,
  
  signInWithTwitter: () => {
    set({ isSigningIn: true });
    // TODO: Implement actual Twitter OAuth flow
    // For now, simulate sign-in after 2 seconds
    setTimeout(() => {
      set({ 
        isSigningIn: false, 
        isSignedIn: true, 
        twitterUsername: '@demo_user' 
      });
    }, 2000);
  },
  
  setSignedIn: (username) => {
    set({ isSignedIn: true, twitterUsername: username });
  },
}));
