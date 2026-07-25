/** One clock seam for due dates, invitation expiry, and activity retention. */
let clock: () => Date = () => new Date();

export function now(): Date {
  return clock();
}

/** Test hook. Production code always uses the system clock. */
export function setClockForTests(next?: () => Date): void {
  clock = next ?? (() => new Date());
}

export function parseCalendarDate(value: string): Date | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const parsed = new Date(`${value}T09:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}
