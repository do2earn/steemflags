const STEEM_RPC_ENDPOINTS = [
  'https://steemflags.mehdiq.workers.dev/api/steem-rpc',
  'https://api.steemit.com',
  'https://api.justyy.com',
  'https://api3.justyy.com',
  'https://steemd.steemworld.org',
  'https://api.steemyy.com',
  'https://api2.justyy.com',
  'https://api.steemitdev.com',
  'https://steem.senior.workers.dev',
  'https://steem.justyy.com',
  'https://api.steem.fans'
];
const RPC_TIMEOUT_MS = 15000;
const AUTH_TIMEOUT_MS = 40000;
const DSTEEM_SOURCES = [
  'https://unpkg.com/@esteemapp/dsteem@0.11.5/dist/dsteem.js',
  'https://cdn.jsdelivr.net/npm/@esteemapp/dsteem@0.11.5/dist/dsteem.js',
  'https://raw.githubusercontent.com/jnordberg/dsteem/master/dist/dsteem.js'
];
let dsteemPromise = null;

function loadScript(src){
  return new Promise((resolve,reject)=>{
    const existing=[...document.scripts].find(script=>script.src===src);
    if(existing){
      if(globalThis.dsteem?.PrivateKey)return resolve(globalThis.dsteem);
      let settled=false;
      const finish=(fn,value)=>{if(settled)return;settled=true;clearTimeout(timer);existing.removeEventListener('load',onLoad);existing.removeEventListener('error',onError);fn(value)};
      const onLoad=()=>globalThis.dsteem?.PrivateKey?finish(resolve,globalThis.dsteem):finish(reject,new Error('AUTH_LIBRARY_INVALID'));
      const onError=()=>finish(reject,new Error('AUTH_LIBRARY_LOAD_FAILED'));
      const timer=setTimeout(()=>finish(reject,new Error('AUTH_LIBRARY_TIMEOUT')),10000);
      existing.addEventListener('load',onLoad,{once:true});
      existing.addEventListener('error',onError,{once:true});
      return;
    }
    const script=document.createElement('script');
    script.src=src;
    script.async=true;
    const timer=setTimeout(()=>{script.remove();reject(new Error('AUTH_LIBRARY_TIMEOUT'))},10000);
    script.onload=()=>{clearTimeout(timer);globalThis.dsteem?.PrivateKey?resolve(globalThis.dsteem):reject(new Error('AUTH_LIBRARY_INVALID'))};
    script.onerror=()=>{clearTimeout(timer);script.remove();reject(new Error('AUTH_LIBRARY_LOAD_FAILED'))};
    document.head.appendChild(script);
  });
}

async function getDsteem(){
  if(globalThis.dsteem?.PrivateKey)return globalThis.dsteem;
  if(!dsteemPromise){
    dsteemPromise=Promise.any(DSTEEM_SOURCES.map(source=>loadScript(source))).catch(error=>{dsteemPromise=null;throw new Error(`AUTH_LIBRARY_UNAVAILABLE: ${error?.message||'dsteem could not be loaded'}`)});
  }
  return dsteemPromise;
}

function normalizeKey(value){return String(value??'').trim().toUpperCase()}

async function rpcRequest(body){
  const requests=STEEM_RPC_ENDPOINTS.map((endpoint,index)=>{
    const controller=new AbortController();
    const timeout=index===0?RPC_TIMEOUT_MS:10000;
    const timer=setTimeout(()=>controller.abort(),timeout);
    return fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body,cache:'no-store',signal:controller.signal})
      .then(async response=>{
        if(!response.ok)throw new Error(`HTTP_${response.status}`);
        const payload=await response.json();
        if(payload?.error)throw new Error(payload.error.message||'RPC_ERROR');
        const accounts=payload?.result;
        if(Array.isArray(accounts)&&accounts.length>0&&accounts[0])return accounts[0];
        throw new Error('ACCOUNT_NOT_FOUND');
      })
      .finally(()=>clearTimeout(timer));
  });
  try{return await Promise.any(requests)}catch(error){
    const errors=Array.isArray(error?.errors)?error.errors:[];
    if(errors.some(item=>item?.message==='ACCOUNT_NOT_FOUND'))throw new Error('ACCOUNT_NOT_FOUND');
    throw new Error('STEEM_RPC_UNAVAILABLE');
  }
}

async function getAccount(accountName){
  const body=JSON.stringify({jsonrpc:'2.0',method:'condenser_api.get_accounts',params:[[accountName]],id:1});
  try{return await rpcRequest(body)}catch(error){
    if(error?.message==='ACCOUNT_NOT_FOUND')throw error;
    console.warn('Steem RPC failed on all endpoints',error);
    throw new Error('STEEM_RPC_UNAVAILABLE');
  }
}

export async function verifyPostingKey(username,postingKey){
  const accountName=String(username??'').trim().toLowerCase();
  const keyValue=String(postingKey??'').trim();
  if(!accountName)throw new Error('USERNAME_EMPTY');
  if(!keyValue)throw new Error('POSTING_KEY_EMPTY');

  const authPromise=(async()=>{
    const dsteem=await getDsteem();
    let privateKey;
    try{privateKey=dsteem.PrivateKey.fromString(keyValue)}catch{throw new Error('POSTING_KEY_FORMAT')}
    let publicKey;
    try{publicKey=privateKey.createPublic().toString()}catch{throw new Error('POSTING_KEY_PUBLIC_KEY_ERROR')}

    const account=await getAccount(accountName);
    const authority=account?.posting;
    if(!authority)throw new Error('POSTING_AUTHORITY_MISSING');

    const threshold=Number(authority.weight_threshold??1);
    const keyAuths=Array.isArray(authority.key_auths)?authority.key_auths:[];
    const matchingWeight=keyAuths.reduce((sum,entry)=>{
      const authorityKey=Array.isArray(entry)?entry[0]:entry?.key;
      const weight=Number(Array.isArray(entry)?entry[1]:entry?.weight??0);
      return normalizeKey(authorityKey)===normalizeKey(publicKey)?sum+weight:sum;
    },0);

    if(matchingWeight<threshold)throw new Error(`POSTING_KEY_UNAUTHORIZED: public key does not match posting authority (weight ${matchingWeight}/${threshold})`);
    return {username:account.name,publicKey};
  })();

  let timeoutId;
  const timeout=new Promise((_,reject)=>{timeoutId=setTimeout(()=>reject(new Error('AUTH_TIMEOUT')),AUTH_TIMEOUT_MS)});
  try{return await Promise.race([authPromise,timeout])}finally{clearTimeout(timeoutId)}
}

async function verifyKeychainSignature(username,message,signature){
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(message));
  const hash=[...new Uint8Array(digest)].map(byte=>byte.toString(16).padStart(2,'0')).join('');
  const body=JSON.stringify({jsonrpc:'2.0',method:'database_api.verify_signatures',params:{hash,signatures:[signature],required_owner:[],required_active:[],required_posting:[username],required_other:[]},id:1});
  const requests=STEEM_RPC_ENDPOINTS.map((endpoint,index)=>{
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),index===0?RPC_TIMEOUT_MS:10000);
    return fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body,cache:'no-store',signal:controller.signal})
      .then(async response=>{
        if(!response.ok)throw new Error(`HTTP_${response.status}`);
        const payload=await response.json();
        if(payload?.error)throw new Error(payload.error.message||'RPC_ERROR');
        if(payload?.result?.valid===true)return true;
        throw new Error('KEYCHAIN_SIGNATURE_INVALID');
      })
      .finally(()=>clearTimeout(timer));
  });
  try{return await Promise.any(requests)}catch(error){
    const errors=Array.isArray(error?.errors)?error.errors:[];
    if(errors.some(item=>item?.message==='KEYCHAIN_SIGNATURE_INVALID'))throw new Error('KEYCHAIN_SIGNATURE_INVALID');
    throw new Error('STEEM_RPC_UNAVAILABLE');
  }
}

export async function verifyKeychainLogin(username){
  const accountName=String(username??'').trim().toLowerCase();
  if(!accountName)throw new Error('USERNAME_EMPTY');
  if(!globalThis.steem_keychain)throw new Error('KEYCHAIN_NOT_INSTALLED');
  if(typeof globalThis.steem_keychain.requestSignBuffer!=='function')throw new Error('KEYCHAIN_API_UNAVAILABLE');
  const message=`Steem Flags Login\nAccount: ${accountName}\nNonce: ${crypto.randomUUID()}\nTimestamp: ${Date.now()}`;
  const signature=await new Promise((resolve,reject)=>{
    let settled=false;
    const finish=(fn,value)=>{if(settled)return;settled=true;fn(value)};
    try{
      globalThis.steem_keychain.requestSignBuffer(accountName,message,'Posting',response=>{
        if(response?.success&&response?.result)return finish(resolve,response.result);
        finish(reject,new Error(response?.message||response?.error||'KEYCHAIN_LOGIN_REJECTED'));
      });
    }catch(error){finish(reject,error)}
  });
  await verifyKeychainSignature(accountName,message,signature);
  return {username:accountName};
}
