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

const style=document.createElement('style');
style.textContent=`
.flagSettingModal{position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;padding:18px;box-sizing:border-box}
.flagSettingBackdrop{position:absolute;inset:0;background:rgba(0,0,0,.72)}
.flagSettingCard{position:relative;width:min(100%,430px);box-sizing:border-box;padding:22px;border:1px solid rgba(255,255,255,.18);border-radius:16px;background:#101827;color:#fff;box-shadow:0 18px 55px rgba(0,0,0,.45)}
.flagSettingCard h2{margin:0 0 18px;text-align:center;font-size:22px}
.flagSettingLabel{display:block;margin:0 0 9px;font-weight:700}
.flagSettingSelect{width:100%;height:44px;padding:0 12px;border:1px solid rgba(255,255,255,.25);border-radius:9px;background:#fff;color:#111;font-size:15px;box-sizing:border-box}
.flagSettingFeedback{min-height:20px;margin:8px 0 4px;text-align:center;font-size:13px}
.flagSettingFeedback.bad{color:#ff6b6b}
.flagSettingActions{display:flex;justify-content:center;gap:16px;margin-top:16px}
.flagSettingActions button{min-width:125px;padding:10px 16px;border:0;border-radius:9px;font-weight:800;font-size:14px;cursor:pointer}
.flagSettingCancel{background:#f2c94c;color:#111}
.flagSettingSave{background:#2e9b57;color:#fff}
.flagSettingActions button:disabled{opacity:.55;cursor:not-allowed}
`;
document.head.appendChild(style);
