import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemePref = 'light' | 'dark' | 'system';
export type AnimationPreference = 'system' | 'on' | 'off';

export interface Settings {
  studentName: string;
  course: string;
  yearLevel: string;
  onboardingComplete: boolean;
  dailyGoal: number;
  animationPreference: AnimationPreference;
  dialogueLanguage: 'taglish' | 'filipino' | 'english';
  themePref: ThemePref;
  /** Epoch ms of the most recent study activity — powers Kwagi's coaching. */
  lastStudyAt: number | null;
}

export const DEFAULT_SETTINGS: Settings = {
  studentName: '',
  course: '',
  yearLevel: '',
  onboardingComplete: false,
  dailyGoal: 20,
  animationPreference: 'system',
  dialogueLanguage: 'taglish',
  themePref: 'dark',
  lastStudyAt: null,
};

const KEY = 'kwagi.settings.v1';

export async function loadSettings(): Promise<Settings> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<Settings> & { kwagiAnimations?: boolean };
    const animationPreference = parsed.animationPreference
      ?? (parsed.kwagiAnimations === false ? 'off' : 'system');
    return { ...DEFAULT_SETTINGS, ...parsed, animationPreference };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: Settings): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(settings));
}

export async function resetSettings(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}
