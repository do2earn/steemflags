import {getLanguage,t} from './i18n.js?v=20261008-earn-i18n-02';

export async function loadEarnSteemCard(mountId='earnSteemCardMount') {
  const mount=document.getElementById(mountId);
  if(!mount)return;
  const response=await fetch(new URL('./earnsteem.html?v=20261008-card-source-01',document.baseURI).href,{cache:'no-store'});
  if(!response.ok)throw Error(`Unable to load Earn $STEEM card: ${response.status}`);
  const html=await response.text();
  const doc=new DOMParser().parseFromString(html,'text/html');
  const sourceCard=doc.querySelector('main.earn-card');
  if(!sourceCard)throw Error('Earn $STEEM card source not found.');
  if(!document.getElementById('earnSteemCardSourceStyles')){
    const style=doc.querySelector('style');
    if(style){
      const styleNode=document.createElement('style');
      styleNode.id='earnSteemCardSourceStyles';
      styleNode.textContent=style.textContent;
      document.head.appendChild(styleNode);
    }
  }
  const card=document.createElement('section');
  card.className=sourceCard.className;
  card.setAttribute('aria-labelledby','earnSteemTitleHome');
  const title=sourceCard.querySelector('h1');
  if(title)title.id='earnSteemTitleHome';
  card.innerHTML=sourceCard.innerHTML;
  const lang=getLanguage();
  card.querySelectorAll('[data-i18n]').forEach(element=>{element.textContent=t(element.dataset.i18n,lang)});
  mount.replaceWith(card);
}