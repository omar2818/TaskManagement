// The JWT lives in localStorage so the session survives a page refresh.
// Trade-off (explained in the README): localStorage is readable by any script on the page (XSS risk),
// but it keeps the app simple and works with the Authorization header the API expects.
const TOKEN_KEY = "tm.token";
const EXPIRY_KEY = "tm.token.expiresAt";

export function setToken(token: string, expiresAtUtc: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(EXPIRY_KEY, expiresAtUtc);
  } catch {
    /* storage unavailable (private mode): session just won't survive a refresh */
  }
}

export function clearToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(EXPIRY_KEY);
  } catch {
    /* ignore */
  }
}

/** Returns the stored token, or null if missing or already expired (expired tokens are discarded). */
export function getToken(): string | null {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return null;
    const expiry = localStorage.getItem(EXPIRY_KEY);
    if (expiry && new Date(expiry).getTime() <= Date.now()) {
      clearToken();
      return null;
    }
    return token;
  } catch {
    return null;
  }
}
