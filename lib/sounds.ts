import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { useAppStore } from '@/lib/store';

const SOURCES = {
  correct: require('@/assets/sounds/correct.wav'),
  wrong: require('@/assets/sounds/wrong.wav'),
  pop: require('@/assets/sounds/pop.wav'),
  complete: require('@/assets/sounds/complete.wav'),
} as const;

export type SoundName = keyof typeof SOURCES;

const players: Partial<Record<SoundName, AudioPlayer>> = {};
let configured = false;

/**
 * Play a short UI sound unless the student turned sounds off. Sounds mix with music the
 * student is already playing and stay quiet when the phone is on silent.
 * Failures are ignored: sound is decoration, never part of saving progress.
 */
export function playSound(name: SoundName) {
  if (!useAppStore.getState().settings.soundEffects) return;
  try {
    if (!configured) {
      configured = true;
      void setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers', shouldPlayInBackground: false }).catch(() => undefined);
    }
    const player = players[name] ?? (players[name] = createAudioPlayer(SOURCES[name]));
    player.volume = 0.6;
    void player.seekTo(0).then(() => player.play()).catch(() => undefined);
  } catch {
    // Audio is unavailable (for example in an old build without the native module).
  }
}
