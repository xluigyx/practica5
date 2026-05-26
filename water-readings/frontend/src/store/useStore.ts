import create from 'zustand';
import { Theme } from 'react-native-paper';
import { DefaultTheme, DarkTheme } from 'react-native-paper';
import { Reading } from '../types';

export type AppState = {
  // UI theme (light/dark)
  isDark: boolean;
  theme: Theme;
  toggleTheme: () => void;

  // Auth (simplified, token stored in AsyncStorage)
  token: string | null;
  setToken: (t: string | null) => void;

  // Lecturas en cola offline
  offlineQueue: Reading[];
  addToQueue: (r: Reading) => void;
  clearQueue: () => void;
};

export const useStore = create<AppState>((set, get) => ({
  isDark: false,
  theme: DefaultTheme,
  toggleTheme: () => {
    const dark = !get().isDark;
    set({
      isDark: dark,
      theme: dark ? DarkTheme : DefaultTheme,
    });
  },

  token: null,
  setToken: (t) => set({ token: t }),

  offlineQueue: [],
  addToQueue: (r) => set({ offlineQueue: [...get().offlineQueue, r] }),
  clearQueue: () => set({ offlineQueue: [] }),
});
