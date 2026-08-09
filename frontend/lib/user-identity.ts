/**
 * User identity utility.
 *
 * Generates and persists a stable anonymous UUID v4 in localStorage so that
 * the same user is recognised across sessions. SSR-safe: returns a placeholder
 * when `window` is not available.
 */

const KEY = 'vidya_user_id';

export function getUserId(): string {
  if (typeof window === 'undefined') {
    // Server-side render — no localStorage available.
    return 'server-side';
  }

  let id = localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
  }
  return id;
}
