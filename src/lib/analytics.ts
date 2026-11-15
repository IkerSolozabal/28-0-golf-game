/**
 * Minimal analytics facade ("eventos básicos desde el día 1").
 * Phase 1 only logs to the console in development; plug a real provider into
 * `send` later without touching call sites.
 */
export type AnalyticsEvent = 'game_started' | 'game_finished' | 'game_shared';

/** Records an analytics event. */
export function track(event: AnalyticsEvent, props: Record<string, unknown> = {}): void {
  if (import.meta.env.DEV) console.debug('[analytics]', event, props);
}
