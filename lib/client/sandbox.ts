"use client";

const KEY = "vidare-sandbox";
/** Must match DEFAULT_SANDBOX on the server: what we use when the browser can't store an id. */
const SHARED = "shared";

/**
 * The id of this visitor's private demo world. Kept in localStorage, which the website and the app in
 * its iframe share (same origin), so both always talk about the same taxi and the same claim.
 */
export function getSandboxId(): string {
  try {
    let id = window.localStorage.getItem(KEY);
    if (!id || !/^[A-Za-z0-9_-]{6,64}$/.test(id)) {
      id = crypto.randomUUID();
      window.localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    // Storage blocked (some private modes): everyone on this browser shares the public sandbox,
    // which at least keeps the website and its iframe in agreement.
    return SHARED;
  }
}
