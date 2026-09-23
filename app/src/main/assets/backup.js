/* Streaming backup codec. Each image is an independent bounded record; publication
 * is atomic and happens only after the user confirms a complete validated file. */
(function(){
'use strict';
const FORMAT='spencerian-desk-backup',VERSION=2,MAX_LINE=32000000,MAX_LEGACY=40000000;
async function* records(state,getImage){
 const imageSessions=[];
 const metadata={...state,sessions:state.sessions.map((s,i)=>{
  const row={...s,image:null};delete row.imageKey;
  if(s.image||s.imageKey){row.imageKey='image-'+i;imageSessions.push({session:s,key:row.imageKey})}
  return row;
 })};
 yield JSON.stringify({format:FORMAT,version:VERSION,state:metadata,images:imageSessions.length})+'\n';
 for(const item of imageSessions){
  const data=item.session.image||await getImage(item.session.imageKey);
  if(typeof data!=='string'||data.length>=12000000||!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(data))throw new Error('A saved drawing is missing or damaged. Current progress has not been changed.');
  yield JSON.stringify({type:'image',key:item.key,data})+'\n';
 }
 yield JSON.stringify({type:'end',images:imageSessions.length})+'\n';
}
function importer({store,validate,normalize,validImage}){
 let buffer='',legacy=false,detected=false,header=null,token=null,ended=false,closed=false,count=0,total=0;
 const received=new Set();
 async function line(text){
  if(closed)throw new Error('This import was canceled.');
  if(!text.trim())return;
  if(ended)throw new Error('Unexpected data after the end of the backup.');
  let row;try{row=JSON.parse(text)}catch{throw new Error('The backup contains an incomplete or invalid record.')}
  if(!header){
   if(row.format!==FORMAT||row.version!==VERSION||!validate(row.state,{allowImageRefs:true})||!Number.isInteger(row.images)||row.images<0||row.images>2000)throw new Error('This backup format or progress data is invalid.');
   const keys=row.state.sessions.filter(s=>s.imageKey).map(s=>s.imageKey);
   if(row.state.sessions.some(s=>s.image)||keys.length!==row.images||new Set(keys).size!==keys.length||keys.some(k=>!/^image-\d{1,4}$/.test(k)))throw new Error('The backup drawing index is invalid.');
   header={state:normalize(row.state,{allowImageRefs:true}),keys:new Set(keys),images:row.images};
   const started=await store.beginImport(header.state);
   if(closed){await store.abortImport(started);throw new Error('This import was canceled.')}
   token=started;return;
  }
  if(row.type==='end'){
   if(row.images!==header.images||count!==header.images)throw new Error('The backup is missing one or more drawings.');
   ended=true;return;
  }
  if(row.type!=='image'||!header.keys.has(row.key)||received.has(row.key)||!row.data||!validImage(row.data))throw new Error('The backup contains a missing, duplicate, or invalid drawing.');
  await store.stageImportImage(token,row.key,row.data);
  if(closed)throw new Error('This import was canceled.');
  received.add(row.key);count++;
 }
 async function push(text){
  if(closed)throw new Error('This import has ended.');
  if(typeof text!=='string'||text.length>262144)throw new Error('Import chunk is too large.');
  total+=text.length;
  buffer+=text;
  if(!detected){
   // New exports always start with the format field. Older schema-1 JSON remains supported.
   const first=/^\s*\{\s*"([^"]+)"\s*:/.exec(buffer);
   if(first){legacy=first[1]!=='format';detected=true}
   else{if(buffer.length>MAX_LINE)throw new Error('A backup record is too large.');return}
  }
  if(legacy){if(total>MAX_LEGACY)throw new Error('Legacy JSON backups are limited to 40 MB. Use the new streaming backup format for larger journals.');return}
  let end;
  while((end=buffer.indexOf('\n'))!==-1){const next=buffer.slice(0,end);buffer=buffer.slice(end+1);if(next.length>MAX_LINE)throw new Error('A backup record is too large.');await line(next)}
  if(buffer.length>MAX_LINE)throw new Error('A backup record is too large.');
 }
 async function finish(){
  if(closed)throw new Error('This import has ended.');
  if(legacy||!header){
   if(total>MAX_LEGACY)throw new Error('Legacy backup is too large.');
   let state;try{state=JSON.parse(buffer)}catch{throw new Error('This backup is not valid JSON.')}
   if(!validate(state))throw new Error('This backup is not valid for The Spencerian Desk.');
   closed=true;return {legacy:normalize(state),token:null};
  }
  if(buffer.trim())await line(buffer);
  if(!ended)throw new Error('This backup is incomplete. Current progress is unchanged.');
  closed=true;return {metadata:header.state,token};
 }
 async function cancel(){closed=true;buffer='';if(token){await store.abortImport(token);token=null}}
 return {push,finish,cancel};
}
window.BackupCodec={records,importer,format:FORMAT,version:VERSION};
})();
