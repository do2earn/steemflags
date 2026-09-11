const app=document.getElementById('app');
async function startSteemFlags(){
  try{
    await import('./app-v2.js?v=20260911-menu-translation-01');
    await import('./wikipedia-flags.js?v=20260828-flags-01');
    await import('./asset-bar.js?v=20260903-assetbar-reward-fix-02');
    await import('./leaderboard.js?v=20260903-leaderboard-09');
    await import('./reward-ui.js?v=20260903-rewardmodal-06');
  }catch(error){
    console.error('Steem Flags module load failed:',error);
    if(app){
      const detail=String(error?.message||error||'Module failed to load').replace(/[<>&]/g,'');
      app.innerHTML='<main class="appShell"><section class="card hero"><p class="eyebrow">STEEM FLAGS</p><h1>Unable to load the game</h1><p class="muted">Module error: '+detail+'</p><p class="muted">Please refresh the page.</p></section></main>';
    }
  }
}
startSteemFlags();