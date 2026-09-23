'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {TextEncoder, TextDecoder} = require('node:util');
const {JSDOM, VirtualConsole} = require('jsdom');
const {IDBFactory} = require('fake-indexeddb');

const assets = path.resolve(__dirname, '../../app/src/main/assets');
const read = file => fs.readFileSync(path.join(assets, file), 'utf8');
const curriculum = JSON.parse(read('curriculum.json'));
const atlas = JSON.parse(read('atlas.json'));
const lessons = curriculum.modules.flatMap(module => module.lessons);
const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j9l8AAAAASUVORK5CYII=';
const copy = value => JSON.parse(JSON.stringify(value));
const tick = () => new Promise(resolve => setImmediate(resolve));
async function settle() { for (let i = 0; i < 12; i++) await tick(); }
async function until(predicate, label) {
  for (let i = 0; i < 200; i++) { if (predicate()) return; await tick(); }
  throw new Error('Timed out waiting for ' + label);
}
function blankState() {
  return {version:1, completed:{}, bookmarks:[], sessions:[], signatures:[], dailyGoal:15,
    hand:'right', lessonNotes:{}, quiz:{}, lastLesson:null,
    signature:{name:'Test Writer',slant:52,spacing:1,flourish:1,capitalScale:1.15,seed:1}, ratings:{}};
}
function session(extra = {}) {
  return {id:'101',date:1700000000000,minutes:15,template:'Paper practice',kind:'paper',note:'Synthetic test sample', ...extra};
}

async function boot(t, {initial = null, legacy = null, native = false, storeAvailable = true, providersConfigured = true, view = null, draft = null} = {}) {
  const errors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', error => errors.push(error.message));
  const dom = new JSDOM(read('index.html'), {
    url:'https://spencerian.invalid/', runScripts:'outside-only', pretendToBeVisual:true, virtualConsole
  });
  t.after(() => dom.window.close());
  const w = dom.window;
  w.TextEncoder = TextEncoder;
  w.TextDecoder = TextDecoder;
  w.structuredClone = structuredClone;
  w.indexedDB = storeAvailable ? new IDBFactory() : undefined;
  w.scrollTo = () => {};
  w.ResizeObserver = class {observe(){} disconnect(){}};
  let now = 1000;
  Object.defineProperty(w.performance, 'now', {value:() => now});
  w.HTMLDialogElement.prototype.showModal = function() {this.open = true;};
  w.HTMLDialogElement.prototype.close = function() {this.open = false;this.dispatchEvent(new w.Event('close'));};
  const context = new Proxy({}, {get(target, key) {
    if (key === 'measureText') return text => ({width:String(text).length * 8});
    if (!(key in target)) target[key] = () => {};
    return target[key];
  }});
  w.HTMLCanvasElement.prototype.getContext = () => context;
  w.HTMLCanvasElement.prototype.toDataURL = () => png;
  w.HTMLCanvasElement.prototype.getBoundingClientRect = () => ({left:0,top:0,width:960,height:520,right:960,bottom:520});
  w.HTMLCanvasElement.prototype.setPointerCapture = () => {};
  w.HTMLCanvasElement.prototype.releasePointerCapture = () => {};
  w.fetch = async file => {
    assert.match(file, /^(curriculum|atlas|tools)\.json$/, 'only local course JSON may be fetched');
    return {ok:true,json:async()=>JSON.parse(read(file))};
  };
  const requests = [], exports = [];
  if (native) w.SpencerianNative = {
    getProviderStatus:() => JSON.stringify({providers:['openai','anthropic','gemini','custom'].map(id => ({id,configured:providersConfigured,model:'test-model',endpoint:''}))}),
    requestAI:(id, payload) => requests.push({id,...JSON.parse(payload)}),
    exportFile:(filename,mime,base64) => exports.push({filename,mime,base64}),
    saveProvider:() => JSON.stringify({ok:true}), deleteProvider:() => JSON.stringify({ok:true}),
    importImage(){},importBackup(){},finishApp(){}
  };
  for (const file of ['storage.js','backup.js','practice.js','zaner-glyphs.js','signature.js']) w.eval(read(file));
  if (initial && storeAvailable) await w.ProgressStore.save(initial);
  if (legacy !== null) w.localStorage.setItem('spencerian-lab-v1',legacy);
  if(view)w.localStorage.setItem('spencerian-desk-view-v1',JSON.stringify(view));if(draft)w.localStorage.setItem('spencerian-desk-practice-draft-v1',JSON.stringify(draft));w.eval(read('app.js'));
  await until(() => w.document.querySelector('#main'), 'app startup');
  const q = selector => w.document.querySelector(selector);
  const qa = selector => [...w.document.querySelectorAll(selector)];
  async function click(selector) {
    const element = typeof selector === 'string' ? q(selector) : selector;
    assert.ok(element, 'Missing click target: ' + selector);
    element.click();
    await settle();
  }
  async function input(selector, value, event = 'input') {
    const element = q(selector);
    assert.ok(element, 'Missing input: ' + selector);
    if (element.type === 'checkbox') element.checked = value;
    else element.value = value;
    element.dispatchEvent(new w.Event(event,{bubbles:true}));
    await settle();
    await w.SpencerianApp.flush();
  }
  function emit(name, detail) {w.dispatchEvent(new w.CustomEvent(name,{detail}));}
  function draw() {
    const canvas = q('.pl-canvas');
    for (const [type,x,y] of [['pointerdown',510,220],['pointermove',475,260],['pointerup',420,342]]) {
      const event = new w.MouseEvent(type,{bubbles:true,clientX:x,clientY:y,button:0});
      Object.defineProperties(event,{pointerId:{value:1},pointerType:{value:'pen'},pressure:{value:0.4}});
      canvas.dispatchEvent(event);
    }
  }
  return {w,q,qa,click,input,emit,draw,requests,exports,errors,
    advance:ms=>{now+=ms;},state:()=>copy(w.SpencerianApp.getState()),
    route:to=>w.SpencerianApp.navigate(to)};
}

test('Back returns through lesson module and focuses each page heading', async t => {
 const h=await boot(t,{native:true});const back=[];h.w.SpencerianNative.setCanGoBack=v=>back.push(v);
 h.route('course');await h.click('[data-action="module"]');const moduleTitle=h.q('h1').textContent;
 await h.click('[data-action="open-lesson"]');const title=h.q('h1').textContent;
 assert.equal(h.w.document.activeElement,h.q('h1'));assert.ok(h.w.document.title.includes(title));
 await h.click('[data-action="lesson-practice"]');h.emit('native-back');assert.equal(h.q('h1').textContent,title);
 h.emit('native-back');assert.equal(h.q('h1').textContent,moduleTitle);h.emit('native-back');assert.ok(h.q('[data-action="module"]'));
 h.emit('native-back');assert.equal(back.at(-1),false);assert.match(h.q('h1').textContent,/Make every stroke/);
});

test('practice drawing and last lesson route survive a new WebView', async t => {
 const h=await boot(t);await h.click('[data-action="open-lesson"]');const title=h.q('h1').textContent;
 await h.click('[data-action="lesson-practice"]');h.draw();h.draw();
 const draft=JSON.parse(h.w.localStorage.getItem('spencerian-desk-practice-draft-v1'));
 const view=JSON.parse(h.w.localStorage.getItem('spencerian-desk-view-v1'));
 assert.equal(draft.strokes.length,2);assert.ok(!JSON.stringify(draft).includes('data:image'));
 const restored=await boot(t,{view,draft});assert.equal(restored.q('.pl-count').textContent,'2');
 restored.emit('native-back');assert.equal(restored.q('h1').textContent,title);
 restored.route('practice');assert.equal(restored.q('.pl-count').textContent,'2');
 await restored.click('.pl-clear');assert.equal(JSON.parse(restored.w.localStorage.getItem('spencerian-desk-practice-draft-v1')).strokes.length,0);
});

test('invalid remembered route cannot prevent course startup', async t => {
 const h=await boot(t,{view:{view:{route:'lesson',lessonId:'not-a-lesson'},history:[]}});
 assert.match(h.q('h1').textContent,/Make every stroke/);assert.deepEqual(h.errors,[]);
});

test('route headings do not skip levels and selected tab follows nested pages', async t => {
 const h=await boot(t);
 for(const route of ['course','practice','progress','atlas','signature','settings','privacy']){
  h.route(route);let previous=0;for(const heading of h.qa('#main h1,#main h2,#main h3')){const level=Number(heading.tagName[1]);assert.ok(level<=previous+1,route+': '+heading.textContent);previous=level;}
  assert.equal(h.w.document.activeElement,h.q('h1'));assert.equal(h.qa('.nav [aria-current="page"]').length,1);
 }
});

test('cancel stops the active native request and late feedback is ignored', async t => {
 const h=await boot(t,{native:true,initial:blankState()});const canceled=[];h.w.SpencerianNative.cancelAI=id=>canceled.push(id);
 h.route('signature');await h.input('#ai-consent',true,'change');await h.click('[data-action="ask-ai"]');
 const id=h.requests[0].id;assert.equal(h.q('[data-action="cancel-ai"]').hidden,false);
 await h.click('[data-action="cancel-ai"]');assert.deepEqual(canceled,[id]);assert.match(h.q('#ai-result').textContent,/canceled/);
 h.emit('native-ai-result',{id,ok:true,text:'LATE RESULT'});assert.doesNotMatch(h.q('#ai-result').textContent,/LATE/);
});

test('truncated AI result explains the limit and cannot apply a partial design', async t => {
 const h=await boot(t,{native:true,initial:blankState()});h.route('signature');await h.input('#ai-consent',true,'change');await h.click('[data-action="ask-ai"]');
 h.emit('native-ai-result',{id:h.requests[0].id,ok:true,truncated:true,text:'{"concepts":[]'});
 assert.match(h.q('#ai-result').textContent,/output limit/);assert.equal(h.q('[data-action="apply-ai-concept"]'),null);
});

test('erase all requires typed confirmation and removes progress drafts and credentials', async t => {
 const initial=blankState();initial.sessions=[session()];const h=await boot(t,{native:true,initial});let erased=0;
 h.w.SpencerianNative.eraseCredentials=()=>{erased++;return JSON.stringify({ok:true})};
 h.w.localStorage.setItem('spencerian-desk-practice-draft-v1','{}');h.route('settings');
 await h.click('[data-action="erase-all"]');await h.click('[data-action="confirm-erase-all"]');assert.equal(erased,0);assert.equal(h.state().sessions.length,1);
 await h.input('#erase-confirm','ERASE');await h.click('[data-action="confirm-erase-all"]');
 assert.equal(erased,1);assert.equal(h.state().sessions.length,0);assert.equal(h.w.localStorage.getItem('spencerian-desk-practice-draft-v1'),null);
 assert.equal(await h.w.ProgressStore.load(),null);assert.match(h.q('h1').textContent,/Make every stroke/);
});

test('failed storage writes do not claim that a session or signature was deleted', async t => {
 const initial=blankState();initial.sessions=[session()];initial.signatures=[{...initial.signature,id:'202',date:1700000000000}];
 const h=await boot(t,{initial});const realSave=h.w.ProgressStore.save;
 h.w.ProgressStore.save=()=>Promise.reject(new Error('Synthetic storage failure'));
 h.route('progress');await h.click('[data-action="delete-session"]');await h.click('[data-action="confirm-delete-session"]');
 assert.equal(h.state().sessions.length,1);assert.equal(h.q('#modal').open,true);
 assert.equal(h.qa('.journal-card').length,1);
 await h.click('[data-action="close-modal"]');h.route('signature');await h.click('[data-action="sig-delete"]');
 assert.equal(h.state().signatures.length,1);assert.equal(h.qa('#saved-signatures .card').length,1);
 assert.equal((await h.w.ProgressStore.load()).sessions.length,1);
 h.w.ProgressStore.save=realSave;
});

test('journal and concept actions target one row when legacy IDs are duplicated', async t => {
 const initial=blankState(),first=png,second='data:image/png;base64,'+'B'.repeat(128);
 initial.sessions=[session({image:first,note:'Keep this drawing'}),session({image:second,note:'Delete this drawing'})];
 initial.signatures=[{...initial.signature,id:'202',date:1700000000000,name:'First Writer'},
  {...initial.signature,id:'202',date:1700000000001,name:'Second Writer'}];
 const h=await boot(t,{initial});h.route('progress');
 await h.click(h.qa('.journal-card [data-action="delete-session"]')[1]);await h.click('[data-action="confirm-delete-session"]');
 assert.equal(h.state().sessions.length,1);assert.equal(h.state().sessions[0].note,'Keep this drawing');
 assert.equal(await h.w.ProgressStore.getImage(h.state().sessions[0].imageKey),first);
 h.route('signature');await h.click(h.qa('#saved-signatures [data-action="sig-delete"]')[1]);
 assert.equal(h.state().signatures.length,1);assert.equal(h.state().signatures[0].name,'First Writer');
});

test('journal loads drawing bytes only when a row enters the viewport', async t => {
 const initial=blankState();initial.sessions=[session({id:'1',image:png}),session({id:'2',image:png})];
 const h=await boot(t,{initial});let observed=[],notify,disconnected=false,reads=0;
 h.w.IntersectionObserver=class {constructor(callback){notify=callback}observe(image){observed.push(image)}unobserve(){}disconnect(){disconnected=true}};
 const getImage=h.w.ProgressStore.getImage;h.w.ProgressStore.getImage=async key=>{reads++;return getImage(key)};
 h.route('progress');assert.equal(observed.length,2);assert.equal(reads,0);
 notify([{target:observed[0],isIntersecting:true}]);await until(()=>observed[0].src.startsWith('data:image/png'),'visible drawing load');
 assert.equal(reads,1);
 assert.equal(observed[1].getAttribute('src'),null);
 h.route('home');assert.equal(disconnected,true);
});

test('settings request screenshot protection and privacy text discloses optional provider sharing', async t => {
 const h=await boot(t,{native:true});const sensitive=[];h.w.SpencerianNative.setSensitiveScreen=v=>sensitive.push(v);
 h.route('settings');assert.equal(sensitive.at(-1),true);await h.click('[data-route="privacy"]');assert.equal(sensitive.at(-1),false);
 assert.match(h.q('#main').textContent,/not included in backups/);assert.match(h.q('#main').textContent,/cannot recall information/);
});

test('closing restore confirmation before the save flush finishes preserves current progress', async t => {
 const before=blankState();before.sessions=[session()];const h=await boot(t,{native:true,initial:before});
 h.route('settings');const imported=blankState();imported.dailyGoal=30;
 h.emit('native-import',{text:JSON.stringify(imported)});await settle();
 const realFlush=h.w.ProgressStore.flush;let unblock;h.w.ProgressStore.flush=()=>new Promise(resolve=>{unblock=resolve});
 h.q('[data-action="confirm-restore"]').click();await settle();assert.ok(unblock);
 h.q('[data-action="close-modal"]').click();await settle();unblock();await settle();h.w.ProgressStore.flush=realFlush;
 assert.equal(h.state().sessions.length,1,'Canceled restore must retain the original session');assert.equal(h.state().dailyGoal,15);
 assert.equal((await h.w.ProgressStore.load()).sessions.length,1);
});

test('restore commit blocks Back and dialog cancellation until its atomic save completes', async t => {
 const before=blankState();before.sessions=[session()];const h=await boot(t,{native:true,initial:before});h.route('settings');
 const imported=blankState();imported.dailyGoal=30;h.emit('native-import',{text:JSON.stringify(imported)});await settle();
 const realSave=h.w.ProgressStore.save;let commit;h.w.ProgressStore.save=(value,options)=>new Promise((resolve,reject)=>{commit=()=>realSave(value,options).then(resolve,reject)});
 h.q('[data-action="confirm-restore"]').click();await settle();assert.ok(commit);
 h.emit('native-back');assert.equal(h.q('#modal').open,true);
 const cancel=new h.w.Event('cancel',{cancelable:true});h.q('#modal').dispatchEvent(cancel);assert.equal(cancel.defaultPrevented,true);
 assert.equal(h.q('[data-action="close-modal"]').disabled,true);h.q('[data-action="close-modal"]').click();assert.equal(h.q('#modal').open,true);
 await commit();await settle();h.w.ProgressStore.save=realSave;
 assert.equal(h.state().dailyGoal,30);assert.equal(h.q('#modal').open,false);assert.equal((await h.w.ProgressStore.load()).dailyGoal,30);
});

test('new lesson practice cannot revive the previous drawing after recreation', async t => {
 const h=await boot(t);h.route('practice');h.draw();assert.ok(h.w.localStorage.getItem('spencerian-desk-practice-draft-v1'));
 h.route('home');await h.click('[data-action="open-lesson"]');await h.click('[data-action="lesson-practice"]');
 assert.equal(h.q('.pl-count').textContent,'0');assert.equal(h.w.localStorage.getItem('spencerian-desk-practice-draft-v1'),null);
 const view=JSON.parse(h.w.localStorage.getItem('spencerian-desk-view-v1'));const restored=await boot(t,{view});
 assert.equal(restored.q('.pl-count').textContent,'0');assert.equal(restored.q('.pl-template').value,h.q('.pl-template').value);
});

test('oversized runtime strokes remain whole when leaving and reopening practice', async t => {
 const h=await boot(t);const mount=h.w.PracticeLab.mount;let practice;
 h.w.PracticeLab.mount=(...args)=>(practice=mount(...args));h.route('practice');
 h.draw();assert.ok(h.w.localStorage.getItem('spencerian-desk-practice-draft-v1'));
 const canvas=h.q('.pl-canvas');function point(type,x){const event=new h.w.MouseEvent(type,{bubbles:true,clientX:x,clientY:260,button:0});Object.defineProperties(event,{pointerId:{value:1},pointerType:{value:'pen'},pressure:{value:.4}});canvas.dispatchEvent(event)}
 point('pointerdown',450);for(let i=0;i<12005;i++)point('pointermove',450+(i%2)*20);point('pointerup',470);
 const count=practice.getDrawing().strokes[1].points.length;assert.ok(count>12000);assert.match(h.q('#toast').textContent,/too large for automatic draft recovery/);
 assert.equal(h.w.localStorage.getItem('spencerian-desk-practice-draft-v1'),null,'An older partial draft must not appear as the final work after restart');
 h.route('home');h.route('practice');assert.equal(practice.getDrawing().strokes[1].points.length,count,'A runtime draft must not be silently truncated');
 const view=JSON.parse(h.w.localStorage.getItem('spencerian-desk-view-v1'));
 const restarted=await boot(t,{view});assert.equal(restarted.q('.pl-count').textContent,'0');
});

test('invalid persistent drawing is rejected whole and retained for recovery', async t => {
 const draft={version:1,template:'straight',guideMode:'movement',slant:52,duration:10,strokes:[{pointerType:'pen',pressureVerified:true,points:[{x:.3,y:.4,p:.5,t:100}]},{pointerType:'pen',pressureVerified:true,points:[{x:8,y:.4,p:.5,t:100}]}]};
 const h=await boot(t,{view:{view:{route:'practice'},history:[]},draft});
 assert.equal(h.q('.pl-count').textContent,'0');assert.deepEqual(JSON.parse(h.w.localStorage.getItem('spencerian-desk-practice-draft-v1')),draft);
 assert.deepEqual(h.errors,[]);
});
