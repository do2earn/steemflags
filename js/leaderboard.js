const API_BASE='https://steemflags.mehdiq.workers.dev';
import { COUNTRIES } from '../data/countries.js';

const FLAG_CODES=new Map(COUNTRIES.map(([name,,code])=>[name,code]));

function avatarUrl(username){return `https://steemitimages.com/u/${encodeURIComponent(username)}/avatar`;}
function escapeHtml(value){return String(value).replace(/[&<>\\'\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
function displayUsername(username){const u=String(username||'—');return u.length>15?`${u.slice(0,15)}...`:u;}

async function readLeaderboard(){
  const section=document.getElementById('leaderboardSection');
  const limit=Math.max(1,Number(section?.dataset.limit)||100);
  const url=`${API_BASE}/api/accounts?limit=${limit}&_=${Date.now()}`;
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),10000);
  try{
    const response=await fetch(url,{method:'GET',cache:'no-store',headers:{Accept:'application/json'},signal:controller.signal});
    const text=await response.text();
    let data=null;
    try{data=JSON.parse(text)}catch{throw Error(`LEADERBOARD_BAD_JSON_${response.status}`)}
    if(!response.ok)throw Error(`LEADERBOARD_HTTP_${response.status}_${data?.error||'ERROR'}`);
    if(!data?.success)throw Error(`LEADERBOARD_API_${data?.error||'FAILED'}`);
    const rows=Array.isArray(data.accounts)?data.accounts:(Array.isArray(data.leaderboard)?data.leaderboard:[]);
    return rows.map(a=>({Username:a.Username??a.username??'',D2E:Number(a.D2E??a.d2e??a.points??a.sf??0)||0,Flag:a.Flag??a.flag??''})).filter(a=>a.Username);
  }catch(e){
    if(e?.name==='AbortError')throw Error('LEADERBOARD_TIMEOUT');
    throw e;
  }finally{clearTimeout(timer)}
}

function renderLeaderboard(accounts){
  const body=document.getElementById('leaderboardBody');if(!body)return;
  accounts.sort((a,b)=>(b.D2E-a.D2E)||String(a.Username).localeCompare(String(b.Username)));
  const section=document.getElementById('leaderboardSection');
  const limit=Math.max(1,Number(section?.dataset.limit)||accounts.length);
  accounts=accounts.slice(0,limit);
  body.innerHTML=accounts.map((a,i)=>{const u=String(a.Username||'—'),displayU=displayUsername(u),d=Math.max(0,Number(a.D2E)||0),flag=String(a.Flag||'').trim(),flagCode=FLAG_CODES.get(flag),medal=i===0?'🥇':i===1?'🥈':i===2?'🥉':String(i+1);const flagImage=flagCode?`<img class="leaderboardFictionalFlag" src="https://raw.githubusercontent.com/hampusborgos/country-flags/master/svg/${flagCode}.svg" alt="${escapeHtml(flag)} flag" loading="lazy" onerror="this.style.display='none'">`:!flag?'<img class="leaderboardFictionalFlag" src="assets/steem_fictional_flag_r2-1.png" alt="" aria-hidden="true">':'';return `<tr><td>${medal}</td><td><div class="leaderboardUser">${flagImage}<img class="leaderboardAvatar" src="${avatarUrl(u)}" alt="@${escapeHtml(u)}" loading="lazy" onerror="this.style.visibility='hidden'"><span>${escapeHtml(displayU)}</span></div></td><td>${d.toLocaleString()}</td></tr>`}).join('')||'<tr><td colspan="3" class="muted">No players yet.</td></tr>';
}

async function loadLeaderboard(){
  const status=document.getElementById('leaderboardStatus'),body=document.getElementById('leaderboardBody');
  if(!status||!body)return false;
  status.hidden=false;status.textContent='Loading leaderboard…';
  try{const accounts=await readLeaderboard();renderLeaderboard(accounts);status.hidden=true}
  catch(e){console.error('Leaderboard load failed:',e);status.hidden=false;status.textContent='Unable to load leaderboard. Please refresh the page.';body.innerHTML=''}
  return true;
}

function initLeaderboard(){
  if(document.getElementById('leaderboardStatus')&&document.getElementById('leaderboardBody')){loadLeaderboard();return true}
  return false;
}

let attempts=0;
const timer=setInterval(()=>{attempts++;if(initLeaderboard()||attempts>=60)clearInterval(timer)},250);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initLeaderboard,{once:true});else initLeaderboard();
window.addEventListener('steemflags:ready',initLeaderboard);
window.addEventListener('steemflags:show-home',loadLeaderboard);
window.addEventListener('steemflags:account-updated',loadLeaderboard);
