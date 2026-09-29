/**
 * Inactivity auto-logout (secretary portals + whole app).
 *
 * Policy: 20 minutes without any user activity signs the session out.
 * The last-activity timestamp lives in localStorage, so it is shared
 * across tabs -- activity in one tab keeps the others alive, and a tab
 * closed longer than the limit reopens signed out instead of resuming
 * a stale session.
 */
'use client';

export const IDLE_LIMIT_MS = 20 * 60 * 1000;
const ACTIVITY_KEY = 'sh_last_activity';
const CHECK_EVERY_MS = 30 * 1000;
const WRITE_THROTTLE_MS = 5 * 1000;

export function readLastActivity(): number {
  try {
    const raw = window.localStorage.getItem(ACTIVITY_KEY);
    const n = raw ? Number(raw) : NaN;
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

/** Record activity now (throttled to avoid storage spam on mousemove). */
export function touchActivity(force = false): void {
  try {
    const now = Date.now();
    if (!force && now - readLastActivity() < WRITE_THROTTLE_MS) return;
    window.localStorage.setItem(ACTIVITY_KEY, String(now));
  } catch {
    /* storage unavailable -- per-tab timers still apply below */
  }
}

const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'scroll', 'touchstart', 'click'] as const;

/**
 * Start the idle watcher. Returns a cleanup function. onIdle fires at
 * most once per idle episode (re-armed by the next touchActivity).
 */
export function startIdleWatcher(onIdle: () => void): () => void {
  let idleFired = false;

  const check = () => {
    const idleFor = Date.now() - readLastActivity();
    if (idleFor >= IDLE_LIMIT_MS) {
      if (!idleFired) {
        idleFired = true;
        onIdle();
      }
    } else {
      idleFired = false;
    }
  };

  const onActivity = () => {
    idleFired = false;
    touchActivity();
  };

  const onVisible = () => {
    if (document.visibilityState === 'visible') check();
  };

  touchActivity(true);
  for (const evt of ACTIVITY_EVENTS) window.addEventListener(evt, onActivity, { passive: true });
  document.addEventListener('visibilitychange', onVisible);
  const timer = window.setInterval(check, CHECK_EVERY_MS);

  return () => {
    window.clearInterval(timer);
    document.removeEventListener('visibilitychange', onVisible);
    for (const evt of ACTIVITY_EVENTS) window.removeEventListener(evt, onActivity);
  };
}
