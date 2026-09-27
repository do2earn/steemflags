import {showFlagSetting} from './flag-setting.js?v=20260923-flag-setting-01';

const API_BASE='https://steemflags.mehdiq.workers.dev';
const SESSION_KEY='steemFlagsAuthSession';
const FLAG_CODES=new Map();

async function fetchAccount(username){
  const response=await fetch(API_BASE+'/api/account?username='+encodeURIComponent(username),{cache:'no-store'});
  if(!response.ok)throw Error('ACCOUNT_API_'+response.status);
  const data=await response.json();
  if(!data?.success||!data.account)throw Error('ACCOUNT_API_INVALID');
  return data.account;
}
async function fetchFlagPlayers(flag){
  const response=await fetch(API_BASE+'/api/accounts?limit=10000&_='+Date.now(),{cache:'no-store',headers:{Accept:'application/json'}});
  if(!response.ok)throw Error('ACCOUNTS_API_'+response.status);
  const data=await response.json();
  if(!data?.success)throw Error('ACCOUNTS_API_'+(data?.error||'FAILED'));
  const rows=Array.isArray(data.accounts)?data.accounts:(Array.isArray(data.leaderboard)?data.leaderboard:[]);
  const wanted=String(flag||'').trim();
  return rows.filter(row=>String(row.Flag??row.flag??'').trim()===wanted).length;
}
function readUsername(){
  try{
    const session=JSON.parse(localStorage.getItem(SESSION_KEY)||'null');
    return String(session?.username||'').trim().toLowerCase();
  }catch{return ''}
}
function flagImageUrl(flag){
  const code=FLAG_CODES.get(String(flag||'').trim());
  return code?'https://raw.githubusercontent.com/hampusborgos/country-flags/master/svg/'+code+'.svg':'';
}
function escapeHtml(value){
  return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
async function loadFlagCodes(){
  if(FLAG_CODES.size)return;
  const module=await import('../data/countries.js');
  for(const [name,,code] of module.COUNTRIES)FLAG_CODES.set(name,code);
}
function loading(container){
  container.innerHTML='<section class="dailyRewardsCard card"><h2>📅 Daily Rewards</h2><hr><p class="muted">Loading daily rewards…</p></section>';
}
function noFlag(container,username){
  container.innerHTML='<section class="dailyRewardsCard card"><h2>📅 Daily Rewards</h2><hr><p class="dailyRewardLine">❌ You have no flag. <button id="setFlagButton" class="dailyFlagButton" type="button">Set Your Flag</button></p><p class="dailyRewardLine">❌ So you won\'t earn the daily rewards.</p></section>';
  document.getElementById('setFlagButton')?.addEventListener('click',async()=>{
    const updated=await showFlagSetting(username);
    if(updated?.Flag||updated?.flag)renderDailyRewards(container);
  });
}
export async function renderDailyRewards(container){
  if(!container)return;
  const username=readUsername();
  if(!username){
    container.innerHTML='<section class="dailyRewardsCard card"><h2>📅 Daily Rewards</h2><hr><p>❌ Please login to view your daily rewards.</p></section>';
    return;
  }
  loading(container);
  try{
    await loadFlagCodes();
    const account=await fetchAccount(username);
    const flag=String(account.Flag??account.flag??'').trim();
    if(!flag){noFlag(container,username);return}
    const count=await fetchFlagPlayers(flag);
    const image=flagImageUrl(flag);
    const imageHtml=image?'<img class="dailyFlagImage" src="'+image+'" alt="'+escapeHtml(flag)+' flag" loading="lazy">':'<span class="dailyFlagFallback" aria-label="'+escapeHtml(flag)+' flag">'+escapeHtml(flag)+'</span>';
    container.innerHTML='<section class="dailyRewardsCard card"><h2>📅 Daily Rewards</h2><hr><p class="dailyRewardLine">✅ '+imageHtml+' is your flag. <button id="changeFlagButton" class="dailyFlagButton" type="button">Change Your Flag</button></p><p class="dailyRewardLine">ℹ️ <strong>'+count.toLocaleString()+'</strong> players use this flag.</p><p class="dailyRewardLine">✅ So you will earn <strong>+'+count.toLocaleString()+' D2E</strong> daily</p></section>';
    document.getElementById('changeFlagButton')?.addEventListener('click',async()=>{
      const updated=await showFlagSetting(username,account);
      if(updated?.Flag||updated?.flag)renderDailyRewards(container);
    });
  }catch(error){
    console.error('Daily Rewards load failed:',error);
    container.innerHTML='<section class="dailyRewardsCard card"><h2>📅 Daily Rewards</h2><hr><p class="feedback bad">Unable to load daily rewards. Please refresh the page.</p></section>';
  }
}
