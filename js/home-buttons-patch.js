window.addEventListener('steemflags:ready',()=>{
  const style=document.createElement('style');
  style.textContent='.homeTitle~#newGameButton,.earnSteemButton{display:block!important;width:220px!important;max-width:100%;min-width:0!important;height:auto!important;min-height:0!important;padding:11px 12px!important;line-height:normal!important;box-sizing:border-box!important;margin-left:auto!important;margin-right:auto!important}.gameStartInstructions{text-align:center!important}.gameStartInstructions>div{text-align:center!important}';
  document.head.appendChild(style);
  const earnSteemButton=document.getElementById('earnSteemButton');
  if(earnSteemButton)earnSteemButton.href='./shop.html';
},{once:true});
