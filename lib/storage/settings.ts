import AsyncStorage from '@react-native-async-storage/async-storage';
import type { BoardId } from '@/constants/boards';

export type ThemePref = 'light' | 'dark' | 'system';

export interface Settings {
  activeBoard: BoardId;
  dailyGoal: number;
  kwagiAnimations: boolean;
  dialogueLanguage: 'taglish' | 'filipino' | 'english';
  aiEnabled: boolean;
  themePref: ThemePref;
  /** Epoch ms of the most recent study activity — powers Kwagi's coaching. */
  lastStudyAt: number | null;
}

export const DEFAULT_SETTINGS: Settings = {
  activeBoard: 'NLE',
  dailyGoal: 50,
  kwagiAnimations: true,
  dialogueLanguage: 'taglish',
  aiEnabled: false,
  themePref: 'dark',
  lastStudyAt: null,
};

const KEY = 'kwagi.settings.v1';

export async function loadSettings(): Promise<Settings> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<Settings>) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: Settings): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(settings));
}
