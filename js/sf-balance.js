const API_BASE = 'https://steemflags.do2earn.workers.dev';

// Read the logged-in user's D2E balance from Cloudflare D1.
export async function loadLeaderboardSF(username) {
  const name = String(username || '').trim().toLowerCase();
  if (!name) return 0;

  try {
    const response = await fetch(`${API_BASE}/api/account?username=${encodeURIComponent(name)}`, {
      cache: 'no-store'
    });
    if (!response.ok) throw new Error(`Account request failed: ${response.status}`);

    const data = await response.json();
    const value = data?.account?.D2E;
    return Number.isFinite(Number(value)) ? Number(value) : 0;
  } catch (error) {
    console.warn('Unable to load D2E balance from Cloudflare D1', error);
    return 0;
  }
}

export async function refreshLeaderboardSF(username, element) {
  if (!element) return 0;
  const balance = await loadLeaderboardSF(username);
  element.textContent = String(balance);
  return balance;
}
