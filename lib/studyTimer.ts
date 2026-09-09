/** Counts foreground study time; paused tabs and background time are excluded. */
export class StudyTimer {
  private accumulated = 0;
  private since: number | null = null;

  resume(now: number) { if (this.since === null) this.since = now; }
  pause(now: number) {
    this.accumulated = this.elapsed(now);
    this.since = null;
  }
  elapsed(now: number) {
    return this.accumulated + (this.since === null ? 0 : Math.max(0, now - this.since));
  }
}
