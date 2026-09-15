window.addEventListener('steemflags:ready',()=>{
  const style=document.createElement('style');
  style.textContent='.homeTitle~#newGameButton,.earnSteemButton{display:block!important;width:40%!important;min-width:0!important;margin-left:auto!important;margin-right:auto!important}.gameStartInstructions{text-align:center!important}.gameStartInstructions>div{text-align:center!important}';
  document.head.appendChild(style);
},{once:true});
