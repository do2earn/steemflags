const API_BASE = 'https://steemflags.do2earn.workers.dev';

export async function saveGameResult({username, score, perfect=false, eventId}) {
  const account = String(username ?? '').trim().toLowerCase();
  const amount = Number(score);
  const id = String(eventId ?? '').trim();
  if (!/^[a-z0-9.-]{3,32}$/.test(account) || !Number.isInteger(amount) || amount < -20 || amount > 20 || !id) {
    return { success: false, error: 'Invalid game result' };
  }
  let lastError = 'Unable to save game result';
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(`${API_BASE}/api/game/result`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ username: account, score: amount, perfect: perfect === true, eventId: id }),
        cache: 'no-store'
      });
      const text = await response.text();
      let data = null;
      try { data = JSON.parse(text); } catch {}
      if (response.ok && data?.success) return data;
      lastError = data?.detail || data?.error || `GAME_RESULT_${response.status}`;
      if (response.status >= 400 && response.status < 500) break;
    } catch (error) {
      console.error('Unable to save game result', error);
      lastError = 'GAME_RESULT_NETWORK_ERROR';
    }
    if (attempt < 3) await new Promise(resolve => setTimeout(resolve, 500 * attempt));
  }
  return { success: false, error: lastError };
}
