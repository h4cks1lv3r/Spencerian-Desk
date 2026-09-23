'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {IDBFactory,IDBObjectStore}=require('fake-indexeddb');
const code=fs.readFileSync(path.resolve(__dirname,'../../app/src/main/assets/storage.js'),'utf8');
const png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j9l8AAAAASUVORK5CYII=';
const copy=value=>JSON.parse(JSON.stringify(value));
const state=()=>({version:1,completed:{},bookmarks:[],sessions:[{id:'101',date:1,minutes:1,image:png,note:'First'}],signatures:[],dailyGoal:15,hand:'right',lessonNotes:{},quiz:{},signature:{name:'Writer'}});
function store(factory=new IDBFactory(),json=JSON){const context={indexedDB:factory,window:{indexedDB:factory},JSON:json};vm.runInNewContext(code,context);return context.window.ProgressStore}
function connect(factory,version){return new Promise((resolve,reject)=>{const req=factory.open('SpencerianLab',version);req.onupgradeneeded=()=>req.result.createObjectStore('progress');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}
async function readRaw(factory,name='progress',key='state'){const db=await connect(factory,2);try{return await new Promise((resolve,reject)=>{const tx=db.transaction(name,'readonly'),r=tx.objectStore(name).get(key);tx.oncomplete=()=>resolve(r.result);tx.onerror=()=>reject(tx.error)})}finally{db.close()}}
async function keys(factory,name){const db=await connect(factory,2);try{return await new Promise((resolve,reject)=>{const tx=db.transaction(name,'readonly'),r=tx.objectStore(name).getAllKeys();tx.oncomplete=()=>resolve(r.result);tx.onerror=()=>reject(tx.error)})}finally{db.close()}}
async function seedLegacy(factory,value){const db=await connect(factory,1);await new Promise((resolve,reject)=>{const tx=db.transaction('progress','readwrite');tx.objectStore('progress').put(value,'state');tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});db.close()}

test('v1 data is untouched by upgrade; validated save migrates atomically and hydrates losslessly',async()=>{
 const factory=new IDBFactory(),original=state();original.sessions.push({id:'101',date:2,minutes:3,image:png+'AA=='});
 await seedLegacy(factory,original);const progress=store(factory);
 assert.deepEqual(copy(await progress.load({lazyImages:true})),original);
 assert.deepEqual(await readRaw(factory),original,'opening does not silently normalize or overwrite a legacy record');
 const lazy=await progress.save(original,{lazyImages:true});
 assert.equal(lazy.sessions[0].image,null);assert.notEqual(lazy.sessions[0].imageKey,lazy.sessions[1].imageKey,'duplicate historical session IDs retain distinct drawings');
 assert.equal(await progress.getImage(lazy.sessions[0].imageKey),png);
 assert.deepEqual(copy(await progress.load()),original);
 assert.ok(!JSON.stringify(await readRaw(factory)).includes(png));
 assert.deepEqual(copy(await progress.load({lazyImages:true})),copy(lazy));
});

test('corrupt legacy progress remains unchanged for app recovery',async()=>{
 const factory=new IDBFactory(),damaged={version:7,sessions:[{id:'9',image:png}],malformed:'keep this'};
 await seedLegacy(factory,damaged);const progress=store(factory);
 assert.deepEqual(copy(await progress.load({lazyImages:true})),damaged);
 assert.deepEqual(await readRaw(factory),damaged);
});

test('30 queued metadata edits neither serialize nor rewrite 19 MB of unchanged drawings',async(t)=>{
 const factory=new IDBFactory();let serializedBytes=0,largestJson=0,imageWrites=0;
 const observedJson={parse:JSON.parse,stringify(...args){const text=JSON.stringify(...args);serializedBytes+=text.length;largestJson=Math.max(largestJson,text.length);return text}};
 const put=IDBObjectStore.prototype.put;
 IDBObjectStore.prototype.put=function(...args){if(this.name==='sessionImages')imageWrites++;return put.apply(this,args)};
 t.after(()=>{IDBObjectStore.prototype.put=put});
 const progress=store(factory,observedJson),large=state();large.sessions=Array.from({length:100},(_,i)=>({id:String(i),date:1,minutes:1,note:'',image:'data:image/png;base64,'+'A'.repeat(194600)+Buffer.from(String(i)).toString('base64')}));
 await progress.save(large);assert.equal(imageWrites,100);
 serializedBytes=0;largestJson=0;imageWrites=0;
 const saves=[];for(let i=0;i<30;i++){large.lessonNotes.lesson='x'.repeat(i+1);saves.push(progress.save(large))}await Promise.all(saves);
 assert.equal(imageWrites,0,'unchanged payloads are not submitted to IndexedDB put');
 assert.ok(largestJson<50000,'JSON serialization only sees metadata');assert.ok(serializedBytes<1500000,'total metadata snapshot work stays far below one image history');
 assert.equal((await progress.load()).lessonNotes.lesson,'x'.repeat(30));
});

test('a failed drawing transaction keeps old metadata and images; later save recovers',async(t)=>{
 const factory=new IDBFactory(),progress=store(factory),initial=state();await progress.save(initial);
 const original=IDBObjectStore.prototype.put;let fail=true;
 IDBObjectStore.prototype.put=function(...args){const result=original.apply(this,args);if(fail&&this.name==='sessionImages'){fail=false;queueMicrotask(()=>this.transaction.abort())}return result};
 t.after(()=>{IDBObjectStore.prototype.put=original});
 const changed=copy(initial);changed.sessions[0].image=png+'AA==';changed.lessonNotes.lesson='new';
 await assert.rejects(progress.save(changed));assert.deepEqual(copy(await progress.load()),initial);
 await progress.save(changed);assert.deepEqual(copy(await progress.load()),changed);
});

test('lazy metadata save preserves payloads and rejects missing references atomically',async()=>{
 const factory=new IDBFactory(),progress=store(factory),initial=state();const lazy=await progress.save(initial,{lazyImages:true});
 lazy.lessonNotes.lesson='saved without loading a drawing';await progress.save(lazy);
 assert.equal((await progress.load()).sessions[0].image,png);
 const corrupt=copy(lazy);corrupt.sessions[0].imageKey='missing';await assert.rejects(progress.save(corrupt),/missing/);
 assert.equal((await progress.load()).lessonNotes.lesson,lazy.lessonNotes.lesson);
 assert.equal((await progress.load()).sessions[0].image,png);
});

function incoming(){const value=state();value.sessions=[{id:'201',date:2,minutes:3,image:null,imageKey:'a'},{id:'202',date:2,minutes:3,image:null,imageKey:'b'}];value.lessonNotes.lesson='replacement';return value}

test('streamed import stays isolated until complete and commits without drawing copies',async()=>{
 const factory=new IDBFactory(),progress=store(factory),initial=state();await progress.save(initial);
 const token=await progress.beginImport(incoming());await progress.stageImportImage(token,'a',png);
 await assert.rejects(progress.commitImport(token),/missing/);assert.deepEqual(copy(await progress.load()),initial);
 await progress.stageImportImage(token,'b',png+'AA==');
 const payloadKeys=await keys(factory,'sessionImages');const lazy=await progress.commitImport(token);
 assert.equal(lazy.sessions[0].image,null);assert.equal(await progress.getImage(lazy.sessions[1].imageKey),png+'AA==');
 assert.ok(payloadKeys.includes(lazy.sessions[0].imageKey),'commit references the existing staged payload');
 assert.equal((await keys(factory,'sessionImages')).length,2,'old image is removed in the same commit');
 assert.equal((await keys(factory,'pendingImports')).length,0);
 assert.equal((await progress.load()).lessonNotes.lesson,'replacement');
});

test('duplicate, undeclared, malformed, and canceled import rows cannot replace saved progress',async()=>{
 const factory=new IDBFactory(),progress=store(factory),initial=state();await progress.save(initial);
 const token=await progress.beginImport(incoming());await progress.stageImportImage(token,'a',png);
 await assert.rejects(progress.stageImportImage(token,'a',png));await assert.rejects(progress.stageImportImage(token,'z',png),/Unexpected/);
 await assert.rejects(progress.stageImportImage(token,'b','not an image'),/Invalid/);
 assert.deepEqual(copy(await progress.load()),initial);
 await progress.abortImport(token);await assert.rejects(progress.commitImport(token),/canceled/);
 assert.deepEqual(copy(await progress.load()),initial);assert.equal((await keys(factory,'sessionImages')).length,1);
 const duplicate=incoming();duplicate.sessions[1].imageKey='a';await assert.rejects(progress.beginImport(duplicate),/references/);
});

test('opening after an interrupted import discards staging and preserves saved progress',async()=>{
 const factory=new IDBFactory(),progress=store(factory),initial=state();await progress.save(initial);
 const token=await progress.beginImport(incoming());await progress.stageImportImage(token,'a',png);
 const reopened=store(factory);assert.deepEqual(copy(await reopened.load()),initial);
 assert.equal((await keys(factory,'pendingImports')).length,0);assert.equal((await keys(factory,'sessionImages')).length,1);
});

test('explicit erase clears progress, all drawings, and pending import payloads',async()=>{
 const factory=new IDBFactory(),progress=store(factory);await progress.save(state());
 const token=await progress.beginImport(incoming());await progress.stageImportImage(token,'a',png);
 await progress.clear();await progress.flush();assert.equal(await progress.load(),null);
 assert.equal((await keys(factory,'sessionImages')).length,0);assert.equal((await keys(factory,'pendingImports')).length,0);
});


test('adding a duplicate session ID to lazy history preserves both distinct drawings',async()=>{
 const factory=new IDBFactory(),progress=store(factory),initial=state();const lazy=await progress.save(initial,{lazyImages:true});
 lazy.sessions.unshift({id:'101',date:2,minutes:1,image:png+'AA=='});
 const saved=await progress.save(lazy,{lazyImages:true});
 assert.notEqual(saved.sessions[0].imageKey,saved.sessions[1].imageKey);
 assert.equal(await progress.getImage(saved.sessions[0].imageKey),png+'AA==');
 assert.equal(await progress.getImage(saved.sessions[1].imageKey),png);
});
