import { create } from 'zustand';
import type { BoardId } from '@/constants/boards';
import {
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
  type Settings,
} from '@/lib/storage/settings';

interface AppState {
  settings: Settings;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setActiveBoard: (board: BoardId) => void;
  setDailyGoal: (goal: number) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  /** Stamp "studied just now" so Kwagi can balance study vs. rest advice. */
  markStudied: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  hydrated: false,

  hydrate: async () => {
    const settings = await loadSettings();
    set({ settings, hydrated: true });
  },

  setActiveBoard: (board) => {
    const settings = { ...get().settings, activeBoard: board };
    set({ settings });
    void saveSettings(settings);
  },

  setDailyGoal: (goal) => {
    const settings = { ...get().settings, dailyGoal: goal };
    set({ settings });
    void saveSettings(settings);
  },

  updateSettings: (patch) => {
    const settings = { ...get().settings, ...patch };
    set({ settings });
    void saveSettings(settings);
  },

  markStudied: () => {
    const settings = { ...get().settings, lastStudyAt: Date.now() };
    set({ settings });
    void saveSettings(settings);
  },
}));
