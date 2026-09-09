import { create } from 'zustand';
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
  setDailyGoal: (goal: number) => Promise<void>;
  updateSettings: (patch: Partial<Settings>) => Promise<void>;
  reset: () => Promise<void>;
  /** Stamp "studied just now" so Kwagi can balance study vs. rest advice. */
  markStudied: () => Promise<void>;
}

let settingsWriteQueue: Promise<void> = Promise.resolve();

function queueSettingsSave(settings: Settings): Promise<void> {
  const write = settingsWriteQueue.then(() => saveSettings(settings));
  settingsWriteQueue = write.catch(() => undefined);
  return write;
}

export const useAppStore = create<AppState>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  hydrated: false,

  hydrate: async () => {
    const settings = await loadSettings();
    set({ settings, hydrated: true });
  },

  setDailyGoal: async (goal) => {
    const settings = { ...get().settings, dailyGoal: goal };
    set({ settings });
    await queueSettingsSave(settings);
  },

  updateSettings: async (patch) => {
    const settings = { ...get().settings, ...patch };
    set({ settings });
    await queueSettingsSave(settings);
  },

  reset: async () => {
    const settings = { ...DEFAULT_SETTINGS };
    await queueSettingsSave(settings);
    set({ settings, hydrated: true });
  },

  markStudied: async () => {
    const settings = { ...get().settings, lastStudyAt: Date.now() };
    set({ settings });
    await queueSettingsSave(settings);
  },
}));
