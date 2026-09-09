const DAYS_FIL = [
  'Linggo',
  'Lunes',
  'Martes',
  'Miyerkules',
  'Huwebes',
  'Biyernes',
  'Sabado',
];

const MONTHS_FIL = [
  'Enero',
  'Pebrero',
  'Marso',
  'Abril',
  'Mayo',
  'Hunyo',
  'Hulyo',
  'Agosto',
  'Setyembre',
  'Oktubre',
  'Nobyembre',
  'Disyembre',
];

/** e.g. "Martes, Hunyo 16" */
export function filipinoDate(d = new Date()): string {
  return `${DAYS_FIL[d.getDay()]}, ${MONTHS_FIL[d.getMonth()]} ${d.getDate()}`;
}

const DAYS_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS_EN = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/** App-chrome date in professional English, e.g. "Tuesday, June 16". */
export function formatDate(d = new Date()): string {
  return `${DAYS_EN[d.getDay()]}, ${MONTHS_EN[d.getMonth()]} ${d.getDate()}`;
}

export type DayPart = 'morning' | 'afternoon' | 'evening' | 'late';

export function dayPart(d = new Date()): DayPart {
  const h = d.getHours();
  if (h >= 5 && h < 12) return 'morning';
  if (h >= 12 && h < 18) return 'afternoon';
  if (h >= 18 && h < 22) return 'evening';
  return 'late';
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

/** Local calendar key used for daily study records. */
export function localDateKey(d = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Count consecutive local calendar dates ending today or yesterday. */
export function calculateStreak(active: Set<string>, now = new Date()): number {
  if (active.size === 0) return 0;

  let streak = 0;
  const cursor = new Date(now);
  // Noon avoids missing or duplicated local hours at daylight-saving transitions.
  cursor.setHours(12, 0, 0, 0);

  if (!active.has(localDateKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!active.has(localDateKey(cursor))) return 0;
  }

  while (active.has(localDateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
