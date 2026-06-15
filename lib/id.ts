/**
 * Lightweight unique-id generator for local rows.
 * Not cryptographically secure — fine for offline, single-device data.
 */
export function uid(prefix = ''): string {
  const rand = Math.random().toString(36).slice(2, 10);
  const time = Date.now().toString(36);
  return `${prefix}${time}${rand}`;
}
