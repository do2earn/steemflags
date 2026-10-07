const API_BASE='https://steemflags.mehdiq.workers.dev';
export async function loadEarnSteemStats(){
  const earned=document.querySelectorAll('[data-earn-stats="total-earned"]');
  const players=document.querySelectorAll('[data-earn-stats="total-players"]');
  if(!earned.length&&!players.length)return;
  try{
    const response=await fetch(API_BASE+'/api/earn-stats?_='+Date.now(),{cache:'no-store',headers:{Accept:'application/json'}});
    if(!response.ok)throw Error('EARN_STATS_HTTP_'+response.status);
    const data=await response.json();
    if(!data?.success)throw Error('EARN_STATS_API_ERROR');
    earned.forEach(el=>el.textContent=Math.max(0,Number(data.totalEarnedD2E)||0).toLocaleString());
    players.forEach(el=>el.textContent=Math.max(0,Number(data.totalPlayers)||0).toLocaleString());
  }catch(error){console.error('Earn stats load failed:',error);}
}