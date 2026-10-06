import { saveGameResult } from './reward.js';

const REWARD_STATE_KEY='steemFlagsPendingRewards';
const API_BASE='https://steemflags.mehdiq.workers.dev';
let lastShown='';
function readRewards(){try{const raw=localStorage.getItem(REWARD_STATE_KEY);const data=raw?JSON.parse(raw):null;return data?.username?data:null}catch{return null}}
function writeRewards(data){try{localStorage.setItem(REWARD_STATE_KEY,JSON.stringify(data))}catch{}}
function clearRewards(){try{localStorage.removeItem(REWARD_STATE_KEY);sessionStorage.removeItem('steemFlagsSponsorContext');sessionStorage.removeItem('steemFlagsSponsorReward')}catch{}}
async function refreshAccount(username){
  try{
    const response=await fetch(`${API_BASE}/api/account?username=${encodeURIComponent(username)}`,{cache:'no-store'});
    const data=await response.json();
    if(!response.ok||!data?.success||!data.account)throw Error('ACCOUNT_REFRESH_FAILED');
    const account=data.account;
    const energy=document.getElementById('energyValue'),d2e=document.getElementById('sfValue');
    if(energy)energy.textContent=String(Math.max(0,Math.floor(Number(account.Energy)||0)));
    if(d2e)d2e.textContent=String(Math.max(0,Math.floor(Number(account.D2E)||0)));
    window.dispatchEvent(new CustomEvent('steemflags:account-updated',{detail:{username,account}}));
    return account;
  }catch(error){console.warn('Reward account refresh failed',error);return null}
}
function showRewards(data){
  const modal=document.getElementById('rewardModal'),lines=document.getElementById('rewardLines'),ok=document.getElementById('rewardOkButton'),ad=document.getElementById('sponsorAdButton');
  if(!modal||!lines||!ok)return;
  const key=JSON.stringify(data);if(lastShown===key&&!modal.hidden)return;lastShown=key;
  const gameReward=Number(data.gameReward)||0;
  const perfectBonusRaw=Number(data.perfectBonus);
  const perfectBonus=(perfectBonusRaw>0?perfectBonusRaw:(data.perfect===true||gameReward===20?4:0));
  const adReward=Number(data.adReward)||0;
  const total=gameReward+perfectBonus+adReward;
  lines.innerHTML=`<div class="rewardLine"><span>✅ Quiz Rewards</span><strong>${gameReward>0?'+':''}${gameReward} D2E</strong></div><div class="rewardLine"><span>✅ Rewards for getting all answers correct</span><strong>${perfectBonus>0?'+':''}${perfectBonus} D2E</strong></div><div class="rewardLine"><span>✅ Sponsor Ad Rewards</span><strong>${adReward>0?'+':''}${adReward} D2E</strong></div><div class="rewardLine rewardTotal"><span>💰 Total Rewards</span><strong>${total>0?'+':''}${total} D2E</strong></div>`;
  if(ad){ad.hidden=false;ad.disabled=true;ad.setAttribute('aria-disabled','true');ad.textContent='📣 Watch a Sponsor Ad for +2 D2E';ad.onclick=null;ad.style.background='#6b7280';ad.style.color='#d1d5db';ad.style.cursor='default';ad.style.opacity='0.65'}
  ok.onclick=async()=>{
    if(ok.dataset.busy==='1')return;
    ok.dataset.busy='1';ok.disabled=true;ok.setAttribute('aria-busy','true');
    try{
      const current=readRewards()||data;
      if(current.pendingSave){
        const result=await saveGameResult({username:current.username,score:Number(current.score??current.gameReward)||0,perfect:current.perfect===true||Number(current.gameReward)===20,eventId:String(current.eventId||'').trim()});
        if(!result?.success)throw Error(result?.error||'Unable to save game result.');
        current.pendingSave=false;
        current.gameReward=Number(result.score)||Number(current.gameReward)||0;
        current.perfectBonus=Number(result.perfectBonus)||(current.perfect===true?4:0);
        writeRewards(current);
      }
      await refreshAccount(current.username);
      clearRewards();
      modal.hidden=true;
      const login=document.getElementById('loginView'),home=document.getElementById('homeView'),board=document.getElementById('leaderboardSection'),game=document.getElementById('gameView');
      if(login)login.hidden=true;if(home)home.hidden=false;if(board)board.hidden=false;if(game)game.hidden=true;
      window.dispatchEvent(new CustomEvent('steemflags:show-home'));
    }catch(error){
      console.error('Unable to finalize game reward',error);
      const message=String(error?.message||'Unable to save game reward. Please try again.');
      const notice=document.getElementById('rewardError')||document.createElement('div');
      notice.id='rewardError';notice.className='feedback bad';notice.textContent=`⚠️ ${message}`;
      if(!notice.parentNode)lines.appendChild(notice);
      modal.hidden=false;
    }finally{ok.dataset.busy='0';ok.disabled=false;ok.removeAttribute('aria-busy')}
  };
  modal.hidden=false;
}
function check(){
  const q=new URLSearchParams(location.search);
  if(q.get('sponsorReward')==='2'){
    const data=readRewards();
    if(data){data.adReward=2;data.pendingSave=false;writeRewards(data)}
    window.history.replaceState({},document.title,location.pathname+location.hash);
  }
  const data=readRewards();
  const modal=document.getElementById('rewardModal');
  if(data&&modal)showRewards(data);
}
function startRewardUI(){check();setInterval(check,500);window.addEventListener('steemflags:reward-ready',check)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',startRewardUI,{once:true});else startRewardUI();