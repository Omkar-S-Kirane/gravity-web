const STORAGE_KEY = 'instagram_auth_cookie_v1';

export async function loadInstagramAuthCookie(): Promise<string | null> {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v && v.trim().length > 0 ? v : null;
  } catch {
    return null;
  }
}

export async function saveInstagramAuthCookie(cookie: string): Promise<void> {
  localStorage.setItem(STORAGE_KEY, cookie);
}

export async function clearInstagramAuthCookie(): Promise<void> {
  localStorage.removeItem(STORAGE_KEY);
}
