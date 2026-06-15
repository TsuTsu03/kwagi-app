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
