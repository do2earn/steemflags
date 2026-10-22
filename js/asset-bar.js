const API_BASE = 'https://steemflags.do2earn.workers.dev';
const ASSET_COMPONENT = './components/asset-bar.html?v=20261022-worker-url-fix-01';
let refreshSerial = 0;

function validUsername(value) { return /^[a-z0-9.-]{3,32}$/.test(String(value || '').trim().toLowerCase()); }
function getUsername() {
  try {
    const raw = localStorage.getItem('steemFlagsAuthSession');
    const session = raw ? JSON.parse(raw) : null;
    const sessionUsername = String(session?.username || '').trim().toLowerCase();
    if (validUsername(sessionUsername)) return sessionUsername;
    const stored = localStorage.getItem('steemflags.username');
    if (validUsername(stored)) return stored.trim().toLowerCase();
  } catch {}
  return null;
}

async function fetchAccount(username) {
  const response = await fetch(`${API_BASE}/api/account?username=${encodeURIComponent(username)}`, { cache: 'no-store' });
  if (!response.ok) throw new Error(`ACCOUNT_API_${response.status}`);
  const data = await response.json();
  if (!data?.success || !data.account) throw new Error('ACCOUNT_API_INVALID');
  return data.account;
}

async function fetchSteemBalance(username) {
  const body = JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'condenser_api.get_accounts', params: [[username]] });
  for (const endpoint of ['https://api.steemit.com', 'https://api.steem.house', 'https://api.steemyy.com', 'https://api.steemworld.org']) {
    try {
      const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, cache: 'no-store' });
      if (!response.ok) continue;
      const data = await response.json();
      const balance = data?.result?.[0]?.balance;
      if (typeof balance === 'string' && /\d/.test(balance)) return Math.floor(Number.parseFloat(balance) || 0);
    } catch {}
  }
  return null;
}

export async function loadAssetBar() {
  const mount = document.getElementById('assetBarMount');
  if (!mount) return null;
  if (!mount.innerHTML.trim()) {
    const response = await fetch(ASSET_COMPONENT, { cache: 'no-store' });
    if (!response.ok) throw new Error(`ASSET_BAR_${response.status}`);
    mount.innerHTML = await response.text();
  }
  return refreshAssetBar();
}

export async function refreshAssetBar(username = getUsername()) {
  const assets = document.getElementById('assetStats');
  if (!assets) return null;
  const serial = ++refreshSerial;
  if (!username || !validUsername(username)) { assets.hidden = true; return null; }
  try {
    const account = await fetchAccount(username);
    const energy = Math.max(0, Math.floor(Number(account.Energy) || 0));
    const d2e = Math.max(0, Math.floor(Number(account.D2E) || 0));
    const steem = await fetchSteemBalance(username);
    if (serial !== refreshSerial) return null;
    const energyEl = document.getElementById('energyValue');
    const d2eEl = document.getElementById('sfValue');
    const steemEl = document.getElementById('steemValue');
    const avatar = document.getElementById('userAvatar');
    if (energyEl) energyEl.textContent = String(energy);
    if (d2eEl) d2eEl.textContent = String(d2e);
    if (steemEl) steemEl.textContent = steem === null ? '—' : String(steem);
    if (avatar) {
      avatar.src = `https://steemitimages.com/u/${encodeURIComponent(username)}/avatar`;
      avatar.alt = `@${username} avatar`;
      avatar.hidden = false;
      avatar.onerror = () => { avatar.onerror = null; avatar.hidden = true; };
    }
    assets.hidden = false;
    assets.dataset.validated = 'true';
    assets.dataset.username = username;
    return { username, Energy: energy, D2E: d2e, STEEM: steem };
  } catch (error) {
    if (serial === refreshSerial) {
      console.warn('Asset bar validation failed', error);
      assets.dataset.validated = 'false';
    }
    return null;
  }
}

window.addEventListener('steemflags:account-updated', event => {
  const username = String(event?.detail?.username || getUsername()).trim().toLowerCase();
  if (validUsername(username)) void refreshAssetBar(username);
});
window.addEventListener('steemflags:show-home', () => {
  const username = getUsername();
  if (validUsername(username)) void refreshAssetBar(username);
});

const observer = new MutationObserver(() => {
  const mount = document.getElementById('assetBarMount');
  if (!mount || mount.dataset.assetInitialized === 'true') return;
  mount.dataset.assetInitialized = 'true';
  loadAssetBar().catch(error => { console.warn('Shared asset bar initialization failed', error); mount.dataset.assetInitialized = 'false'; });
});
observer.observe(document.documentElement, { childList: true, subtree: true });
if (document.getElementById('assetBarMount')) loadAssetBar().catch(console.warn);
