/**
 * Generates Kwagi's short UI sounds as 16-bit mono WAV files in assets/sounds.
 * They are synthesized here (soft sine "bubble" tones) so the app ships no third-party audio.
 *
 *   node scripts/generate-sounds.mjs
 */
import { writeFileSync } from 'node:fs';

const RATE = 22_050;

/** A note: frequency glide from `from` to `to` Hz, starting at `at` seconds. */
function render(notes, seconds, volume) {
  const samples = new Float32Array(Math.ceil(seconds * RATE));
  for (const { from, to = from, at, length, gain = 1 } of notes) {
    const start = Math.floor(at * RATE);
    const count = Math.floor(length * RATE);
    let phase = 0;
    for (let i = 0; i < count && start + i < samples.length; i++) {
      const t = i / count;
      const frequency = from + (to - from) * t;
      phase += (2 * Math.PI * frequency) / RATE;
      // Quick attack and smooth decay read as a soft "bubble" rather than a beep.
      const envelope = Math.min(1, i / (0.008 * RATE)) * Math.pow(1 - t, 2.2);
      // A little second harmonic adds warmth.
      samples[start + i] += gain * envelope * (Math.sin(phase) + 0.18 * Math.sin(2 * phase));
    }
  }
  const peak = samples.reduce((max, value) => Math.max(max, Math.abs(value)), 0) || 1;
  const pcm = Buffer.alloc(samples.length * 2);
  samples.forEach((value, i) => pcm.writeInt16LE(Math.round((value / peak) * volume * 32_767), i * 2));
  const header = Buffer.alloc(44);
  header.write('RIFF', 0); header.writeUInt32LE(36 + pcm.length, 4); header.write('WAVE', 8);
  header.write('fmt ', 12); header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20); header.writeUInt16LE(1, 22);
  header.writeUInt32LE(RATE, 24); header.writeUInt32LE(RATE * 2, 28); header.writeUInt16LE(2, 32); header.writeUInt16LE(16, 34);
  header.write('data', 36); header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

const sounds = {
  // Two rising bubbles.
  correct: render([{ from: 660, to: 740, at: 0, length: 0.12 }, { from: 990, to: 1110, at: 0.09, length: 0.2 }], 0.32, 0.55),
  // A gentle low "bloop", not a buzzer.
  wrong: render([{ from: 330, to: 250, at: 0, length: 0.16 }, { from: 262, to: 200, at: 0.12, length: 0.22 }], 0.36, 0.4),
  // One soft pop for flips and ratings.
  pop: render([{ from: 520, to: 880, at: 0, length: 0.07 }], 0.08, 0.35),
  // A short rising arpeggio for finishing a session.
  complete: render([
    { from: 523, at: 0, length: 0.18 }, { from: 659, at: 0.1, length: 0.18 },
    { from: 784, at: 0.2, length: 0.2 }, { from: 1047, at: 0.3, length: 0.45, gain: 1.1 },
  ], 0.78, 0.5),
};

for (const [name, data] of Object.entries(sounds)) {
  writeFileSync(new URL(`../assets/sounds/${name}.wav`, import.meta.url), data);
  console.log(`assets/sounds/${name}.wav ${data.length} bytes`);
}
