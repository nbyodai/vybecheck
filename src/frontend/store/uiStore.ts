import { create } from 'zustand';

export type PageType = 'start' | 'lab' | 'quiz' | 'lobby' | 'vybes';

interface UIStore {
  activePage: PageType;
  notification: string;
  error: string;
  
  setActivePage: (page: PageType) => void;
  showNotification: (message: string, duration?: number) => void;
  showError: (message: string, duration?: number) => void;
  clearNotification: () => void;
  clearError: () => void;
}

export const useUIStore = create<UIStore>((set) => ({
  activePage: 'start',
  notification: '',
  error: '',
  
  setActivePage: (page) => set({ activePage: page }),
  
  showNotification: (message, duration = 3000) => {
    set({ notification: message });
    if (duration > 0) {
      setTimeout(() => set({ notification: '' }), duration);
    }
  },
  
  showError: (message, duration = 5000) => {
    set({ error: message });
    if (duration > 0) {
      setTimeout(() => set({ error: '' }), duration);
    }
  },
  
  clearNotification: () => set({ notification: '' }),
  
  clearError: () => set({ error: '' }),
}));
