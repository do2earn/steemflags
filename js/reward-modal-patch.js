const REWARD_MODAL_PATCH_ID='steemFlagsRewardModalPatch';
function patchRewardModal(){
  const dialog=document.querySelector('#rewardModal .rewardDialog');
  const sponsor=document.getElementById('sponsorAdButton');
  if(!dialog||!sponsor)return;
  sponsor.style.background='#5b7cfa';
  sponsor.style.color='#fff';
  sponsor.style.marginTop='8px';
  let earn=document.getElementById('rewardEarnSteemButton');
  if(!earn){
    earn=document.createElement('a');
    earn.id='rewardEarnSteemButton';
    earn.className='rewardEarnSteemButton';
    earn.href='./earnsteem.html';
    earn.textContent='Earn $STEEM by Steem Flags game';
    earn.target='_self';
    earn.style.display='block';
    earn.style.width='100%';
    earn.style.boxSizing='border-box';
    earn.style.margin='10px 0 0';
    earn.style.padding='13px 12px';
    earn.style.borderRadius='11px';
    earn.style.background='#16a34a';
    earn.style.color='#fff';
    earn.style.textAlign='center';
    earn.style.textDecoration='none';
    earn.style.fontSize='16px';
    earn.style.fontWeight='800';
    earn.style.lineHeight='1.2';
    sponsor.insertAdjacentElement('afterend',earn);
  }else if(sponsor.nextElementSibling!==earn){
    sponsor.insertAdjacentElement('afterend',earn);
  }
}
function startRewardModalPatch(){
  patchRewardModal();
  const observer=new MutationObserver(patchRewardModal);
  observer.observe(document.body,{childList:true,subtree:true});
  window.addEventListener('steemflags:reward-ready',patchRewardModal);
  window.addEventListener('languagechange',patchRewardModal);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',startRewardModalPatch,{once:true});else startRewardModalPatch();