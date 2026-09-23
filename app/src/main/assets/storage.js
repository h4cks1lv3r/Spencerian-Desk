/* Atomic offline persistence. Large drawings live outside the small progress record.
 * Public load()/save() retain the schema-1 API; lazyImages is an internal UI option.
 * Provider credentials and temporary reference photographs never enter this database.
 */
(function(){
'use strict';
const FORMAT='SpencerianLab:2',IMAGES='sessionImages',IMPORTS='pendingImports';
let database=null,opening=null,queue=Promise.resolve(),cacheRevision=null;
let imageCache=new Map();
const runtime=Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
let sequence=0;
const unique=()=>runtime+'-'+(++sequence);
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const wrapper=x=>object(x)&&x.storageFormat===FORMAT&&Object.prototype.hasOwnProperty.call(x,'state')&&Array.isArray(x.images);
const copy=x=>JSON.parse(JSON.stringify(x));
const failure=(tx,fallback)=>tx.error||new Error(fallback||'Save canceled');
function serialized(run){const result=queue.catch(()=>{}).then(run);queue=result;return result}
function open(){
 if(opening)return opening;
 opening=new Promise((resolve,reject)=>{
  if(!window.indexedDB){reject(new Error('Device database unavailable'));return}
  const request=indexedDB.open('SpencerianLab',2);
  request.onupgradeneeded=()=>{
   const db=request.result;
   if(!db.objectStoreNames.contains('progress'))db.createObjectStore('progress');
   if(!db.objectStoreNames.contains(IMAGES))db.createObjectStore(IMAGES);
   if(!db.objectStoreNames.contains(IMPORTS))db.createObjectStore(IMPORTS);
   // Do not rewrite a legacy state here: the app must validate it first.
  };
  request.onsuccess=()=>{
   database=request.result;
   database.onversionchange=()=>{database.close();database=null;opening=null;cacheRevision=null;imageCache.clear()};
   // Unconfirmed imports from a previous app process are never published. Remove
   // their payloads on next open, without touching the current progress record.
   const tx=database.transaction([IMAGES,IMPORTS],'readwrite');
   const cursor=tx.objectStore(IMPORTS).openCursor();
   cursor.onsuccess=()=>{const row=cursor.result;if(!row)return;for(const ref of row.value.images||[])tx.objectStore(IMAGES).delete(ref.key);row.delete();row.continue()};
   tx.oncomplete=()=>resolve(database);
   tx.onerror=tx.onabort=()=>{const error=failure(tx,'Could not clean up an interrupted import');database.close();database=null;opening=null;reject(error)};
  };
  request.onerror=()=>{opening=null;reject(request.error)};
  request.onblocked=()=>reject(new Error('Close other app windows and retry.'));
 });
 return opening;
}
function checkRefs(record){
 const indices=new Set(),keys=new Set();
 for(const ref of record.images){
  if(!object(ref)||!Number.isInteger(ref.index)||ref.index<0||!Array.isArray(record.state.sessions)||ref.index>=record.state.sessions.length||!object(record.state.sessions[ref.index])||typeof ref.key!=='string'||!ref.key||indices.has(ref.index)||keys.has(ref.key))throw new Error('Saved drawing references need recovery');
  indices.add(ref.index);keys.add(ref.key);
 }
 return keys;
}
function lazyState(record){
 const state=copy(record.state);
 for(const ref of record.images){state.sessions[ref.index].image=null;state.sessions[ref.index].imageKey=ref.key}
 return state;
}
// Only metadata is cloned. Payload strings stay immutable and are never fed to
// JSON.stringify or structuredClone when a note or signature control changes.
function snapshot(state){
 if(!object(state)||!Array.isArray(state.sessions))return{state:copy(state),images:[]};
 const refs=[],occurrences=new Map();
 const reserved=new Set(state.sessions.filter(object).map(s=>s.imageKey).filter(key=>typeof key==='string'&&key));
 const metadata={...state,sessions:state.sessions.map((session,index)=>{
  if(!object(session))return session;
  const slot=typeof session.id==='string'?session.id:'index-'+index;
  const occurrence=occurrences.get(slot)||0;occurrences.set(slot,occurrence+1);
  if(typeof session.image==='string'&&session.image){
   const candidate='drawing:'+slot+':'+occurrence;
   const key=typeof session.imageKey==='string'&&session.imageKey?session.imageKey:reserved.has(candidate)?'drawing:'+unique():candidate;
   refs.push({index,key,image:session.image});
  }else if(session.image===null&&typeof session.imageKey==='string'&&session.imageKey){refs.push({index,key:session.imageKey})}
  else return session;
  const small={...session};delete small.image;delete small.imageKey;return small;
 })};
 const record={state:copy(metadata),images:refs};
 checkRefs(record);
 return record;
}
function writeSnapshot(record,{lazyImages=false}={}){
 return open().then(db=>new Promise((resolve,reject)=>{
  const tx=db.transaction(['progress',IMAGES],'readwrite'),progress=tx.objectStore('progress'),images=tx.objectStore(IMAGES);
  // A separate small manifest avoids re-reading a legacy aggregate image record
  // while migrating it, and keeps ordinary writes independent of history size.
  const previous=progress.get('imageManifest'),revision=unique(),nextCache=new Map();
  let detail;
  previous.onsuccess=()=>{
   const old=previous.result;
   const cacheMatches=old&&old.revision===cacheRevision;
   const retained=new Set(record.images.map(ref=>ref.key));
   if(old&&Array.isArray(old.images))for(const ref of old.images)if(!retained.has(ref.key))images.delete(ref.key);
   for(const ref of record.images){
    if(Object.prototype.hasOwnProperty.call(ref,'image')){
     if(!cacheMatches||imageCache.get(ref.key)!==ref.image)images.put(ref.image,ref.key);
     nextCache.set(ref.key,ref.image);
    }else{
     const existing=images.getKey(ref.key);
     existing.onsuccess=()=>{if(existing.result===undefined){detail=new Error('A saved drawing is missing. Previous progress is unchanged.');tx.abort()}};
     if(cacheMatches&&imageCache.has(ref.key))nextCache.set(ref.key,imageCache.get(ref.key));
    }
   }
   const stored={storageFormat:FORMAT,revision,state:record.state,images:record.images.map(({index,key})=>({index,key}))};
   progress.put(stored,'state');progress.put({revision,images:stored.images},'imageManifest');
  };
  tx.oncomplete=()=>{cacheRevision=revision;imageCache=lazyImages?new Map():nextCache;resolve(lazyImages?lazyState(record):true)};
  tx.onerror=tx.onabort=()=>reject(detail||failure(tx));
 }));
}
async function load({lazyImages=false}={}){
 await queue.catch(()=>{});
 const db=await open();
 return new Promise((resolve,reject)=>{
  const tx=db.transaction(['progress',IMAGES],'readonly'),request=tx.objectStore('progress').get('state');
  let result=null,revision=null,nextCache=new Map(),detail;
  request.onsuccess=()=>{
   const record=request.result;
   if(!wrapper(record)){result=record===undefined?null:record;return}
   try{checkRefs(record);result=lazyImages?lazyState(record):record.state;revision=record.revision}catch(error){detail=error;tx.abort();return}
   for(const ref of record.images){
    const imageRequest=lazyImages?tx.objectStore(IMAGES).getKey(ref.key):tx.objectStore(IMAGES).get(ref.key);
    imageRequest.onsuccess=()=>{
     if(imageRequest.result===undefined){detail=new Error('A saved drawing is missing. Stored progress has been kept.');tx.abort();return}
     if(!lazyImages){result.sessions[ref.index].image=imageRequest.result;nextCache.set(ref.key,imageRequest.result)}
    };
   }
  };
  tx.oncomplete=()=>{cacheRevision=revision;imageCache=nextCache;resolve(result)};
  tx.onerror=tx.onabort=()=>reject(detail||failure(tx,'Could not read progress'));
 });
}
async function getImage(key){
 if(typeof key!=='string'||!key)throw new Error('Invalid drawing reference');
 await queue.catch(()=>{});const db=await open();
 return new Promise((resolve,reject)=>{
  const tx=db.transaction(IMAGES,'readonly'),request=tx.objectStore(IMAGES).get(key);let value;
  request.onsuccess=()=>{value=request.result};
  tx.oncomplete=()=>value===undefined?reject(new Error('Saved drawing is missing')):resolve(value);
  tx.onerror=tx.onabort=()=>reject(failure(tx,'Could not read drawing'));
 });
}
function validImage(image){return typeof image==='string'&&image.length<12000000&&/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(image)}
function beginImport(metadata){
 let prepared;
 try{
  prepared=snapshot(metadata);
  if(!object(prepared.state)||!Array.isArray(prepared.state.sessions)||prepared.state.sessions.length>2000||prepared.images.some(ref=>Object.prototype.hasOwnProperty.call(ref,'image')))throw new Error('Import metadata must use drawing references');
 }catch(error){return Promise.reject(error)}
 return serialized(async()=>{
  const db=await open(),token='import:'+unique();
  const record={token,state:prepared.state,images:prepared.images.map(({index,key},i)=>({index,id:key,key:token+':'+i}))};
  await new Promise((resolve,reject)=>{
   const tx=db.transaction(IMPORTS,'readwrite');tx.objectStore(IMPORTS).add(record,token);
   tx.oncomplete=resolve;tx.onerror=tx.onabort=()=>reject(failure(tx,'Could not start import'));
  });return token;
 });
}
function stageImportImage(token,id,image){
 if(typeof token!=='string'||typeof id!=='string'||!validImage(image))return Promise.reject(new Error('Invalid imported drawing'));
 return serialized(async()=>{
  const db=await open();return new Promise((resolve,reject)=>{
   const tx=db.transaction([IMAGES,IMPORTS],'readwrite'),request=tx.objectStore(IMPORTS).get(token);let detail;
   request.onsuccess=()=>{
    const ref=request.result?.images.find(item=>item.id===id);
    if(!ref){detail=new Error('Unexpected imported drawing');tx.abort();return}
    // add, rather than put: a duplicated row is a malformed backup, not an overwrite.
    tx.objectStore(IMAGES).add(image,ref.key);
   };
   tx.oncomplete=()=>resolve(true);tx.onerror=tx.onabort=()=>reject(detail||failure(tx,'Duplicate or invalid imported drawing'));
  });
 });
}
function commitImport(token){
 return serialized(async()=>{
  const db=await open();return new Promise((resolve,reject)=>{
   const tx=db.transaction(['progress',IMAGES,IMPORTS],'readwrite'),imports=tx.objectStore(IMPORTS),images=tx.objectStore(IMAGES),progress=tx.objectStore('progress');
   const request=imports.get(token),revision=unique();let detail,result;
   request.onsuccess=()=>{
    const record=request.result;if(!record){detail=new Error('Import was canceled');tx.abort();return}
    const keep=new Set(record.images.map(ref=>ref.key));
    for(const ref of record.images){const image=images.getKey(ref.key);image.onsuccess=()=>{if(image.result===undefined){detail=new Error('Backup is missing a drawing. Previous progress is unchanged.');tx.abort()}}}
    const previous=progress.get('imageManifest');
    previous.onsuccess=()=>{if(previous.result&&Array.isArray(previous.result.images))for(const ref of previous.result.images)if(!keep.has(ref.key))images.delete(ref.key)};
    const stored={storageFormat:FORMAT,revision,state:record.state,images:record.images.map(({index,key})=>({index,key}))};
    result=lazyState(stored);progress.put(stored,'state');progress.put({revision,images:stored.images},'imageManifest');imports.delete(token);
   };
   tx.oncomplete=()=>{cacheRevision=revision;imageCache.clear();resolve(result)};
   tx.onerror=tx.onabort=()=>reject(detail||failure(tx,'Could not restore progress'));
  });
 });
}
function abortImport(token){
 return serialized(async()=>{
  const db=await open();return new Promise((resolve,reject)=>{
   const tx=db.transaction([IMAGES,IMPORTS],'readwrite'),imports=tx.objectStore(IMPORTS),request=imports.get(token);
   request.onsuccess=()=>{for(const ref of request.result?.images||[])tx.objectStore(IMAGES).delete(ref.key);imports.delete(token)};
   tx.oncomplete=()=>resolve(true);tx.onerror=tx.onabort=()=>reject(failure(tx,'Could not discard import'));
  });
 });
}
function clear(){
 return serialized(async()=>{
  const db=await open();return new Promise((resolve,reject)=>{
   const tx=db.transaction(['progress',IMAGES,IMPORTS],'readwrite');for(const name of ['progress',IMAGES,IMPORTS])tx.objectStore(name).clear();
   tx.oncomplete=()=>{cacheRevision=null;imageCache.clear();resolve(true)};
   tx.onerror=tx.onabort=()=>reject(failure(tx,'Could not erase progress'));
  });
 });
}
window.ProgressStore={load,save(state,options){let record;try{record=snapshot(state)}catch(error){return Promise.reject(error)}return serialized(()=>writeSnapshot(record,options))},flush:()=>queue,getImage,beginImport,stageImportImage,commitImport,abortImport,clear};
})();
