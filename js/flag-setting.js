import { COUNTRIES } from '../data/countries.js';

const API_BASE='https://steemflags.mehdiq.workers.dev';

function closeModal(modal){
  modal?.remove();
}

async function saveFlag(username, flag){
  const response=await fetch(`${API_BASE}/api/account`,{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({username,Flag:flag}),
    cache:'no-store'
  });
  let data=null;
  try{data=await response.json()}catch{}
  if(!response.ok||!data?.success||!data.account) throw Error(data?.error||'Unable to save country flag.');
  return data.account;
}

export async function showFlagSetting(username, currentAccount=null){
  if(!username) return currentAccount;
  const existing=document.getElementById('flagSettingModal');
  if(existing) existing.remove();

  const modal=document.createElement('div');
  modal.id='flagSettingModal';
  modal.className='flagSettingModal';
  modal.setAttribute('role','dialog');
  modal.setAttribute('aria-modal','true');
  modal.setAttribute('aria-labelledby','flagSettingTitle');

  const countries=COUNTRIES.map(([name])=>name);
  const options=countries.map(name=>`<option value="${name.replace(/"/g,'&quot;')}">${name}</option>`).join('');

  modal.innerHTML=`
    <div class="flagSettingBackdrop"></div>
    <section class="flagSettingCard">
      <h2 id="flagSettingTitle">Flag Setting</h2>
      <label class="flagSettingLabel" for="flagSettingSelect">👉 Set Your Country Flag:</label>
      <select id="flagSettingSelect" class="flagSettingSelect" aria-label="Set Your Country Flag">
        <option value="">Select a country</option>
        ${options}
      </select>
      <p id="flagSettingFeedback" class="flagSettingFeedback" aria-live="polite"></p>
      <div class="flagSettingActions">
        <button type="button" id="flagSettingCancel" class="flagSettingCancel">❌ Cancel</button>
        <button type="button" id="flagSettingSave" class="flagSettingSave">✅ Save</button>
      </div>
    </section>`;

  document.body.appendChild(modal);

  const select=modal.querySelector('#flagSettingSelect');
  const feedback=modal.querySelector('#flagSettingFeedback');
  const cancel=modal.querySelector('#flagSettingCancel');
  const save=modal.querySelector('#flagSettingSave');

  cancel.onclick=()=>closeModal(modal);
  modal.querySelector('.flagSettingBackdrop').onclick=()=>closeModal(modal);

  save.onclick=async()=>{
    const selected=String(select.value||'').trim();
    if(!selected){
      feedback.textContent='Please select a country.';
      feedback.className='flagSettingFeedback bad';
      return;
    }
    save.disabled=true;
    cancel.disabled=true;
    feedback.textContent='Saving...';
    feedback.className='flagSettingFeedback';
    try{
      const updated=await saveFlag(username,selected);
      closeModal(modal);
      return updated;
    }catch(error){
      feedback.textContent=error?.message||'Unable to save country flag.';
      feedback.className='flagSettingFeedback bad';
      save.disabled=false;
      cancel.disabled=false;
      return null;
    }
  };

  select.focus();

  return await new Promise(resolve=>{
    const originalCancel=cancel.onclick;
    cancel.onclick=()=>{originalCancel();resolve(currentAccount)};
    const originalSave=save.onclick;
    save.onclick=async()=>{
      const selected=String(select.value||'').trim();
      if(!selected){
        feedback.textContent='Please select a country.';
        feedback.className='flagSettingFeedback bad';
        return;
      }
      save.disabled=true;
      cancel.disabled=true;
      feedback.textContent='Saving...';
      feedback.className='flagSettingFeedback';
      try{
        const updated=await saveFlag(username,selected);
        closeModal(modal);
        resolve(updated);
      }catch(error){
        feedback.textContent=error?.message||'Unable to save country flag.';
        feedback.className='flagSettingFeedback bad';
        save.disabled=false;
        cancel.disabled=false;
      }
    };
  });
}
