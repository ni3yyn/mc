// src/store/useStore.js
import { create } from 'zustand';

export const useStore = create((set) => ({
  isDarkMode: false,
  toggleDarkMode: () => set((state) => ({ isDarkMode: !state.isDarkMode })),
}));