/* Atomic offline progress persistence. API keys never enter this database. */
(function(){
'use strict';
let database=null,opening=null,queue=Promise.resolve();
function open(){if(opening)return opening;opening=new Promise((resolve,reject)=>{if(!window.indexedDB){reject(new Error('Device database unavailable'));return}const r=indexedDB.open('SpencerianLab',1);r.onupgradeneeded=()=>r.result.createObjectStore('progress');r.onsuccess=()=>{database=r.result;database.onversionchange=()=>{database.close();database=null;opening=null};resolve(database)};r.onerror=()=>reject(r.error);r.onblocked=()=>reject(new Error('Close other app windows and retry.'))});return opening;}
window.ProgressStore={
async load(){const db=await open();return new Promise((resolve,reject)=>{const tx=db.transaction('progress','readonly'),r=tx.objectStore('progress').get('state');r.onsuccess=()=>resolve(r.result||null);r.onerror=()=>reject(r.error)})},
save(state){const snapshot=JSON.parse(JSON.stringify(state));const run=()=>open().then(db=>new Promise((resolve,reject)=>{const tx=db.transaction('progress','readwrite');tx.objectStore('progress').put(snapshot,'state');tx.oncomplete=()=>resolve(true);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new Error('Save canceled'))}));queue=queue.catch(()=>{}).then(run);return queue;}
};
})();
