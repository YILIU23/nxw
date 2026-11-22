export type Attempt = { failures: number; window_started: Date; blocked_until: Date | null };
export function rateOptions() {
  return { max: Number(process.env.LOGIN_MAX_FAILURES || 20), window: Number(process.env.LOGIN_WINDOW_MINUTES || 15) * 60_000, cooldown: Number(process.env.LOGIN_COOLDOWN_MINUTES || 5) * 60_000 };
}
export function normalizeAttempt(state: Attempt, now: Date, window: number): Attempt {
  if (state.blocked_until && state.blocked_until.getTime() <= now.getTime()) return { failures: 0, window_started: now, blocked_until: null };
  if (!state.blocked_until && now.getTime() - state.window_started.getTime() >= window) return { failures: 0, window_started: now, blocked_until: null };
  return state;
}
export function failedAttempt(state: Attempt, now: Date, options = rateOptions()): Attempt {
  const current = normalizeAttempt(state, now, options.window);
  const failures = current.failures + 1;
  return { ...current, failures, blocked_until: failures >= options.max ? new Date(now.getTime() + options.cooldown) : null };
}
