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
  for (let i = 0; i < 1200; i++) { if (predicate()) return; await tick(); }
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

async function boot(t, {initial = null, legacy = null, native = false, storeAvailable = true, providersConfigured = true} = {}) {
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
  w.eval(read('app.js'));
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

test('curriculum is complete and every lesson points to real atlas assets', () => {
  assert.equal(curriculum.modules.length,10);
  assert.equal(lessons.length,80);
  assert.equal(new Set(lessons.map(lesson=>lesson.id)).size,80);
  const sources = new Set(curriculum.sources.map(source=>source.id));
  const plateIds = new Set(atlas.plates.map(plate=>plate.id));
  const examples = new Map(atlas.examples.map(example=>[example.id,example]));
  const checkedArtwork = new Set();
  function checkArtwork(file) {
    if (checkedArtwork.has(file)) return;
    checkedArtwork.add(file);
    assert.match(file,/^examples\/[a-z0-9-]+\.svg$/,file+' is local vector artwork');
    const svg = read(file);
    assert.match(svg,/<svg\b/,file+' contains an SVG');
    assert.match(svg,/<path\b/,file+' contains traced ink');
    assert.doesNotMatch(svg,/<(?:[\w-]+:)?(?:image|script|foreignObject)\b|data:image\//i,file+' has no embedded scan or executable content');
  }
  const templates = new Set(['free','straight','oval','underturn','overturn','loop','compound','capital','flourish']);
  for (const lesson of lessons) {
    assert.ok(lesson.sections.length >= 2,lesson.id);
    assert.ok(lesson.drills.length && lesson.checklist.length && lesson.objectives.length,lesson.id);
    assert.ok(lesson.quiz.answer >= 0 && lesson.quiz.answer < lesson.quiz.options.length,lesson.id);
    assert.equal(new Set(lesson.quiz.options).size,lesson.quiz.options.length,lesson.id);
    assert.ok(templates.has(lesson.practiceTemplate),lesson.id);
    assert.ok(lesson.exemplarIds.length,lesson.id);
    const modelIds = atlas.lessonExamples[lesson.id];
    assert.ok(modelIds?.length,lesson.id+' has focused models');
    for (const id of modelIds) {
      const model = examples.get(id);
      assert.ok(model,lesson.id+' missing focused model '+id);
      assert.ok(model.title && model.focus && model.source && (model.sourceKind==='image'?model.sourceFile&&model.sourceDetail:model.physicalPage >= 1),id+' has a teaching focus and a valid source');
      checkArtwork(model.file);
      for (const panel of model.panels||[]) checkArtwork(panel.file);
    }
    for (const id of lesson.exemplarIds) assert.ok(plateIds.has(id),lesson.id+' missing '+id);
    for (const ref of lesson.sourceRefs) assert.ok(sources.has(ref.sourceId),lesson.id+' missing '+ref.sourceId);
  }
  for (const plate of atlas.plates) {
    assert.ok(fs.existsSync(path.join(assets,plate.file)),plate.file);
    assert.ok((plate.sourceKind==='image'?plate.sourceFile:plate.physicalPage >= 1) && plate.width > 0 && plate.height > 0,plate.id);
    assert.ok(plate.exampleIds?.length,plate.id+' has focused examples');
    for (const id of plate.exampleIds) assert.ok(examples.has(id),plate.id+' missing model '+id);
    checkArtwork(plate.file);
  }
  const focus = lessons.map(lesson=>lesson.focusGlyphs).join('');
  for (const glyph of 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789') assert.ok(focus.includes(glyph),'Missing curriculum glyph '+glyph);
});

test('all routes and every lesson render without DOM errors', async t => {
  const h = await boot(t);
  for (const route of ['home','course','practice','signature','progress','more','settings','atlas','tools']) {
    h.route(route);
    assert.ok(h.q('#main h1')?.textContent.trim(),route+' has a heading');
    assert.ok(h.q('#main').textContent.length > 60,route+' has content');
  }
  for (const lesson of lessons) {
    h.w.SpencerianApp.navigate('lesson',{lesson:lesson.id});
    assert.equal(h.q('#main h1').textContent,lesson.title);
    assert.equal(h.qa('.lesson-plate').length,lesson.exemplarIds.length);
    assert.deepEqual(h.qa('.lesson-study [data-action="example"]').map(button=>button.dataset.id),atlas.lessonExamples[lesson.id],lesson.id+' displays its assigned models');
    for (const button of h.qa('.lesson-study [data-action="example"]')) {
      const model = atlas.examples.find(example=>example.id===button.dataset.id);
      const img = button.querySelector('img');
      assert.equal(img.getAttribute('src'),model.file,lesson.id+' points to its shipped model image');
      assert.ok(img.getAttribute('alt').trim(),lesson.id+' gives its model a text label');
    }
  }
  assert.deepEqual(h.errors,[]);
});

test('the writing desk advances to the next lesson and its matching model after completion', async t => {
  const h = await boot(t);
  const first = lessons[0], next = lessons[1];
  const firstModel = atlas.examples.find(model=>model.id===atlas.lessonExamples[first.id][0]);
  assert.equal(h.q('.hero [data-action="open-lesson"]').dataset.id,first.id);
  assert.equal(h.q('.hero-art [data-action="example"]').dataset.id,firstModel.id);
  assert.equal(h.q('.hero-art img').getAttribute('src'),firstModel.panels?.[0].file||firstModel.file);
  await h.click('.hero [data-action="open-lesson"]');
  await h.click(`[data-action="answer"][data-answer="${first.quiz.answer}"]`);
  for (const item of h.qa('[data-check]')) {
    item.checked = true;
    item.dispatchEvent(new h.w.Event('change',{bubbles:true}));
  }
  await h.click('[data-action="complete-lesson"]');
  await h.click('[data-action="close-modal"]');
  h.route('home');
  const nextModel = atlas.examples.find(model=>model.id===atlas.lessonExamples[next.id][0]);
  assert.ok(h.state().completed[first.id]);
  assert.equal(h.q('.hero [data-action="open-lesson"]').dataset.id,next.id);
  assert.equal(h.q('.hero-art [data-action="example"]').dataset.id,nextModel.id);
  assert.notEqual(nextModel.id,firstModel.id,'the next lesson has its own model');
  assert.equal(h.q('.hero-art img').getAttribute('src'),nextModel.panels?.[0].file||nextModel.file);
});

test('a lesson model enlarges with its source page, resets zoom on reopening, and preserves progress', async t => {
  const h = await boot(t);
  h.w.SpencerianApp.navigate('lesson',{lesson:'l01'});
  await settle();
  const model = atlas.examples.find(example=>example.id===atlas.lessonExamples.l01[0]);
  const before = h.state();
  const storedBefore = copy(await h.w.ProgressStore.load());
  const opener = `.lesson-study [data-action="example"][data-id="${model.id}"]`;
  await h.click(opener);
  assert.equal(h.q('#modal').open,true);
  assert.equal(h.q('#modal h2').textContent,model.title);
  assert.equal(h.q('#artwork-image').getAttribute('src'),model.file);
  const pages = model.sourcePages||[model.physicalPage];
  assert.ok(h.q('#modal .source-ref').textContent.includes(model.source));
  assert.ok(h.q('#modal .source-ref').textContent.includes(`PDF ${pages.length>1?'pages':'page'} ${pages.join(', ')}`));
  assert.equal(h.q('#artwork-scale').min,'100');
  assert.equal(h.q('#artwork-scale').max,'300');
  for (const scale of [200,300]) {
    await h.input('#artwork-scale',String(scale));
    assert.equal(h.q('#artwork-image').style.width,scale+'%');
    assert.equal(h.q('#artwork-percent').textContent,scale+'%');
  }
  await h.click('[data-action="close-modal"]');
  assert.equal(h.q('#modal').open,false);
  assert.deepEqual(h.state(),before,'studying an image does not complete or change a lesson');
  assert.deepEqual(copy(await h.w.ProgressStore.load()),storedBefore,'stored progress is unchanged');
  await h.click(opener);
  assert.equal(h.q('#artwork-scale').value,'100');
  assert.equal(h.q('#artwork-percent').textContent,'100%');
  assert.ok(['','100%'].includes(h.q('#artwork-image').style.width),'the previous enlarged width does not survive reopening');
  await h.click('[data-action="close-modal"]');
  assert.deepEqual(h.errors,[]);
});

test('an atlas collection opens its own focused models and permits individual enlargement', async t => {
  const h = await boot(t);
  h.route('atlas');
  const collection = atlas.plates.find(plate=>plate.id==='numeral-models');
  const before = h.state();
  await h.click(`[data-action="plate"][data-id="${collection.id}"]`);
  assert.equal(h.q('#modal').open,true);
  assert.equal(h.q('#modal h2').textContent,collection.title);
  assert.deepEqual(h.qa('#modal [data-action="example"]').map(button=>button.dataset.id),collection.exampleIds);
  const selectedId = collection.exampleIds[collection.exampleIds.length-1];
  const selected = atlas.examples.find(model=>model.id===selectedId);
  await h.click(`#modal [data-action="example"][data-id="${selectedId}"]`);
  assert.equal(h.q('#modal h2').textContent,selected.title);
  assert.equal(h.q('#artwork-image').getAttribute('src'),selected.file);
  await h.input('#artwork-scale','250');
  assert.equal(h.q('#artwork-image').style.width,'250%');
  await h.click('[data-action="close-modal"]');
  assert.deepEqual(h.state(),before);
  assert.deepEqual(h.errors,[]);
});

test('all level filters expose their modules, including Foundations', async t => {
  const h = await boot(t);
  h.route('course');
  for (const [level,count] of [['All',10],['Foundations',2],['Beginner',2],['Intermediate',2],['Advanced',2],['Expert',2]]) {
    await h.click(`[data-action="filter"][data-filter="${level}"]`);
    assert.equal(h.qa('#course-results [data-action="module"]').length,count,level);
  }
});

test('lesson completion requires the knowledge check and each practice item', async t => {
  const h = await boot(t);
  const lesson = lessons[0];
  h.w.SpencerianApp.navigate('lesson',{lesson:lesson.id});
  await h.click('[data-action="complete-lesson"]');
  assert.equal(h.state().completed[lesson.id],undefined);
  await h.click(`[data-action="answer"][data-answer="${(lesson.quiz.answer+1)%lesson.quiz.options.length}"]`);
  for (const item of h.qa('[data-check]')) {item.checked = true; item.dispatchEvent(new h.w.Event('change',{bubbles:true}));}
  await h.click('[data-action="complete-lesson"]');
  assert.equal(h.state().completed[lesson.id],undefined);
  await h.click(`[data-action="answer"][data-answer="${lesson.quiz.answer}"]`);
  await h.click('[data-action="complete-lesson"]');
  assert.ok(h.state().completed[lesson.id] > 0);
  assert.equal(h.state().quiz[lesson.id],true);
  assert.equal(h.q('#modal').open,true);
  assert.ok((await h.w.ProgressStore.load()).completed[lesson.id]);
});

test('bookmarks and notes persist and Saved filter finds the lesson', async t => {
  const h = await boot(t);
  const lesson = lessons[0];
  h.w.SpencerianApp.navigate('lesson',{lesson:lesson.id});
  await h.click('[data-action="bookmark"]');
  await h.input('#lesson-note','Synthetic practice reflection');
  h.route('course');
  await h.click('[data-action="filter"][data-filter="Saved"]');
  assert.equal(h.qa('#course-results .lesson-row').length,1);
  assert.equal(h.q('.lesson-row').dataset.id,lesson.id);
  const stored = await h.w.ProgressStore.load();
  assert.equal(stored.lessonNotes[lesson.id],'Synthetic practice reflection');
  assert.ok(stored.bookmarks.includes(lesson.id));
});

test('every paper self-rating can save, restore, and display including zero', async t => {
  const h = await boot(t);
  h.route('progress');
  await h.click('[data-action="log-paper"]');
  const ratings = h.qa('#paper-rating option').map(option=>({value:option.value,label:option.textContent}));
  await h.click('[data-action="close-modal"]');
  for (const rating of ratings) {
    await h.click('[data-action="log-paper"]');
    await h.input('#paper-minutes','12');
    await h.input('#paper-rating',rating.value,'change');
    await h.input('#paper-note','Synthetic rating '+rating.value);
    await h.click('[data-action="save-paper"]');
    assert.equal(!!h.w.SpencerianApp.validBackup(await h.w.ProgressStore.load()),true,'UI rating '+rating.value+' produces valid state');
    const card = h.qa('.journal-card')[0];
    assert.match(card.textContent,new RegExp('Self-rating '+rating.value+'(?:/3|\\s|·)'),'rating is visible and uses current scale');
    const restored = h.w.SpencerianApp.normalizeBackup(h.state());
    assert.equal(restored.sessions[0].rating,Number(rating.value));
  }
  assert.equal(h.state().sessions.length,ratings.length);
});

test('repeated digital saves update one session and do not double-count time', async t => {
  const h = await boot(t);
  h.route('practice');
  h.draw();
  h.advance(120000);
  await h.click('.pl-save');
  assert.equal(h.state().sessions.length,1);
  assert.equal(h.state().sessions[0].minutes,2);
  h.advance(60000);
  h.draw();
  await h.click('.pl-save');
  assert.equal(h.state().sessions.length,1);
  assert.equal(h.state().sessions[0].minutes,3);
  assert.match(await h.w.ProgressStore.getImage(h.state().sessions[0].imageKey),/^data:image\/png;base64,/);
  assert.equal(!!h.w.SpencerianApp.validBackup(await h.w.ProgressStore.load()),true);
});

test('clearing a saved sheet starts a new session without replacing the previous drawing', async t => {
  const h=await boot(t);h.route('practice');h.draw();await h.click('.pl-save');
  const firstKey=h.state().sessions[0].imageKey;
  assert.equal(await h.w.ProgressStore.getImage(firstKey),png);
  const secondPng='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGNgLdgNAAGuATG4GkNOAAAAAElFTkSuQmCC';
  h.w.HTMLCanvasElement.prototype.toDataURL=()=>secondPng;
  await h.click('.pl-clear');h.draw();await h.click('.pl-save');
  assert.equal(h.state().sessions.length,2);
  const secondKey=h.state().sessions[0].imageKey;
  assert.notEqual(secondKey,firstKey,'the new drawing needs a distinct storage key');
  assert.equal(await h.w.ProgressStore.getImage(firstKey),png);
  assert.equal(await h.w.ProgressStore.getImage(secondKey),secondPng);
  const restored=await h.w.ProgressStore.load();
  assert.equal(restored.sessions.length,2);
  assert.equal(restored.sessions[0].image,secondPng);
  assert.equal(restored.sessions[1].image,png);
});

test('malformed and adversarial backups are rejected before entering the DOM', async t => {
  const h = await boot(t);
  const bad = [
    ['null signature', x=>x.signature=null], ['null notes',x=>x.lessonNotes=null],
    ['null quiz',x=>x.quiz=null], ['null sessions',x=>x.sessions=null],
    ['HTML slant',x=>x.signature.slant='<img src=x onerror="test()">'],
    ['string seed',x=>x.signature.seed='onload="test()"'],
    ['infinite angle',x=>x.signature.slant=Infinity], ['negative goal',x=>x.dailyGoal=-1],
    ['object goal',x=>x.dailyGoal={bad:true}], ['oversized name',x=>x.signature.name='x'.repeat(49)],
    ['bad bookmark',x=>x.bookmarks=['missing-lesson']],
    ['unknown completed lesson',x=>x.completed={unknown:1700000000000}],
    ['unsafe session ID',x=>x.sessions=[session({id:'" onpointerdown="test()'})]],
    ['unsafe saved concept ID',x=>x.signatures=[{...x.signature,id:'" onclick="test()',date:1700000000000}]],
    ['invalid image type',x=>x.sessions=[session({image:'data:image/svg+xml;base64,PHN2Zz4='})]],
    ['image URL',x=>x.sessions=[session({image:'https://attacker.invalid/a.png'})]],
    ['object image',x=>x.sessions=[session({image:{bad:true}})]],
    ['excess minutes',x=>x.sessions=[session({minutes:181})]],
    ['negative date',x=>x.sessions=[session({date:-1})]],
    ['excess notes',x=>x.lessonNotes={f01:'x'.repeat(10001)}]
  ];
  for (const [label, mutate] of bad) {
    const state = blankState(); mutate(state);
    assert.equal(!!h.w.SpencerianApp.validBackup(state),false,label);
  }
});

test('normalization strips unknown fields and treats text HTML as literal content', async t => {
  const state = blankState();
  state.signature.name='<img src=x onerror=test()> Test';
  state.signatures=[{...state.signature,id:'102',date:1700000000000,untrusted:'discard me'}];
  state.sessions=[session({note:'<svg onload="test()">',metrics:{angle:'<img onerror="test()">',nested:{bad:true}},untrusted:'discard me'})];
  state.lessonNotes.f01='<script>test()</script>';
  state.unexpectedTopLevel='discard me';
  const h = await boot(t,{initial:state});
  assert.equal(h.state().unexpectedTopLevel,undefined);
  assert.equal(h.state().sessions[0].untrusted,undefined);
  assert.deepEqual(h.state().sessions[0].metrics,{targetAngle:52},'only a safe guide target is restored; untrusted angle and nested data are removed');
  assert.equal(h.state().signatures[0].untrusted,undefined);
  for (const route of ['signature','progress','lesson']) {
    h.route(route);
    assert.equal(h.qa('[onerror],[onload],[onclick],#main script').length,0,'no executable markup in '+route);
  }
});

test('valid backup restoration replaces progress and invalid import leaves it intact', async t => {
  const h = await boot(t);
  const state = blankState();
  state.sessions=[session()]; state.completed.f01=1700000000000; state.quiz.f01=true;
  h.emit('native-import',{text:JSON.stringify(state)});
  await settle();
  assert.equal(h.q('#modal').open,true);
  await h.click('[data-action="confirm-restore"]');
  assert.equal(h.state().sessions.length,1);
  assert.equal(h.state().completed.f01,1700000000000);
  const before = h.state();
  h.emit('native-import',{text:JSON.stringify({...state,signature:null})});
  await settle();
  assert.deepEqual(h.state(),before);
  assert.match(h.q('#toast').textContent,/not valid/);
});

test('failed paper save can be retried without duplicating a session', async t => {
  const h = await boot(t);
  h.route('progress');
  await h.click('[data-action="log-paper"]');
  const save = h.w.ProgressStore.save;
  h.w.ProgressStore.save = () => Promise.reject(new Error('Synthetic quota failure'));
  await h.click('[data-action="save-paper"]');
  assert.equal(h.q('#modal').open,true,'failed save remains editable');
  assert.doesNotMatch(h.q('#toast').textContent,/Paper practice saved/);
  h.w.ProgressStore.save = save;
  await h.click('[data-action="save-paper"]');
  assert.equal(h.state().sessions.length,1,'retry must not duplicate the unsaved session');
});

test('failed restore keeps current state and leaves backup available for retry', async t => {
  const h = await boot(t);
  const before = h.state(), incoming = blankState();
  incoming.sessions=[session()];
  h.emit('native-import',{text:JSON.stringify(incoming)});
  await settle();
  const save = h.w.ProgressStore.save;
  h.w.ProgressStore.save = () => Promise.reject(new Error('Synthetic quota failure'));
  await h.click('[data-action="confirm-restore"]');
  assert.deepEqual(h.state(),before,'failed restore must not replace in-memory state');
  h.w.ProgressStore.save=save;
  await h.click('[data-action="confirm-restore"]');
  assert.equal(h.state().sessions.length,1,'restoration can be retried');
});

test('AI draft survives a visit to connection settings', async t => {
  const h = await boot(t,{native:true});
  h.route('signature');
  await h.input('#ai-brief','Synthetic brief: a simple initial and readable surname.');
  await h.input('#ai-provider','anthropic','change');
  await h.input('#ai-goal','drill','change');
  await h.click('#main [data-action="settings"]');
  h.route('signature');
  assert.equal(h.q('#ai-brief').value,'Synthetic brief: a simple initial and readable surname.');
  assert.equal(h.q('#ai-provider').value,'anthropic');
  assert.equal(h.q('#ai-goal').value,'drill');
});

test('AI requires consent, sends the selected provider, and renders responses as text', async t => {
  const h = await boot(t,{native:true});
  h.route('signature');
  await h.input('#sig-name','Test Writer');
  await h.input('#ai-provider','gemini','change');
  await h.input('#ai-brief','Synthetic coaching request');
  await h.click('[data-action="ask-ai"]');
  assert.equal(h.requests.length,0);
  await h.input('#ai-consent',true,'change');
  await h.click('[data-action="ask-ai"]');
  assert.equal(h.requests.length,1);
  assert.equal(h.requests[0].provider,'gemini');
  assert.match(h.requests[0].prompt,/Synthetic coaching request/);
  await h.click('[data-action="ask-ai"]');
  assert.equal(h.requests.length,1,'pending request prevents duplicate calls');
  h.emit('native-ai-result',{id:h.requests[0].id,ok:true,text:'<img src=x onerror="test()">'});
  assert.equal(h.q('#ai-result').textContent,'<img src=x onerror="test()">');
  assert.equal(h.q('#ai-result img'),null);
  assert.equal(h.q('[data-action="ask-ai"]').disabled,false);
});

test('attaching a photo updates consent disclosure and resets consent', async t => {
  const h = await boot(t,{native:true});
  h.route('signature');
  await h.input('#ai-consent',true,'change');
  h.emit('native-image',{dataUrl:png});
  assert.equal(h.q('#ai-consent').checked,false);
  assert.match(h.q('#ai-consent').parentElement.textContent,/image|photo/i,'photo disclosure must match the payload');
});

test('structured AI concepts render safe previews and apply only bounded settings', async t => {
  const h = await boot(t,{native:true});
  h.route('signature');
  await h.input('#sig-name','Test Writer');
  const name = h.state().signature.name;
  await h.input('#ai-consent',true,'change');
  await h.click('[data-action="ask-ai"]');
  const response = {
    summary:'<svg onload="test()"> Synthetic summary',
    concepts:[{title:'<img onerror="test()"> Test concept',rationale:'Synthetic rationale',practice:'Ten light repetitions',
      slant:52,spacing:1.1,flourish:1,capitalScale:1,seed:23}],
    drills:['<img onerror="test()"> is plain text']
  };
  h.emit('native-ai-result',{id:h.requests[0].id,ok:true,text:JSON.stringify(response)});
  assert.equal(h.qa('[data-action="apply-ai-concept"]').length,1);
  assert.equal(h.qa('#ai-result [onerror],#ai-result [onload]').length,0);
  await h.click('[data-action="apply-ai-concept"]');
  assert.equal(h.state().signature.name,name);
  assert.equal(h.state().signature.slant,52);
  assert.equal(h.state().signature.flourish,1);
  assert.equal(!!h.w.SpencerianApp.validBackup(await h.w.ProgressStore.load()),true);
});

test('malformed AI concept geometry cannot become an Apply action', async t => {
  const h = await boot(t,{native:true});
  h.route('signature');
  await h.input('#sig-name','Test Writer');
  await h.input('#ai-consent',true,'change');
  await h.click('[data-action="ask-ai"]');
  const response = {concepts:[{title:'Invalid geometry',rationale:'Test',practice:'Test',
    slant:'<img src=x onerror="test()">',spacing:999,flourish:2,capitalScale:1.2,seed:23}]};
  h.emit('native-ai-result',{id:h.requests[0].id,ok:true,text:JSON.stringify(response)});
  assert.equal(h.qa('[data-action="apply-ai-concept"]').length,0);
  assert.equal(h.qa('#ai-result img,#ai-result [onerror]').length,0);
  assert.match(h.q('#ai-result').textContent,/Invalid geometry/);
});

test('storage unavailable mode keeps lessons open and reports its limitation', async t => {
  const h = await boot(t,{storeAvailable:false});
  assert.match(h.q('#toast').textContent,/Saved progress could not be read/i);
  h.route('course');
  assert.equal(h.qa('.module-card').length,10);
  assert.match(h.q('#storage-notice').textContent,/Saved progress could not be read.*Changes cannot be saved/);
  assert.match(h.q('#storage-notice').textContent,/not the unreadable stored progress/);
  assert.ok(h.q('#storage-notice [data-action="export-backup"]'));
  assert.deepEqual(h.errors,[]);
});


test('chosen reference is accessible from home, attributed as a photograph, and preserves the beginner lesson', async t => {
  const h=await boot(t);
  assert.equal(h.q('.hero [data-action="open-lesson"]').dataset.id,'f01');
  assert.equal(h.q('.hero-art [data-action="example"]').dataset.id,'f01-1');
  const before=h.state();
  await h.click('.reference-style [data-action="plate"]');
  assert.equal(h.qa('#modal [data-action="example"]').length,4);
  await h.click('#modal [data-action="example"][data-id="ref-greeting"]');
  assert.equal(h.q('#artwork-image').getAttribute('src'),'examples/ref-greeting.svg');
  assert.match(h.q('#modal .source-ref').textContent,/supplied photograph/);
  assert.doesNotMatch(h.q('#modal .source-ref').textContent,/PDF|undefined/);
  await h.input('#artwork-scale','300');
  assert.equal(h.q('#artwork-image').style.width,'300%');
  await h.click('[data-action="close-modal"]');
  assert.deepEqual(h.state(),before);
  h.w.SpencerianApp.navigate('lesson',{lesson:'a01'});
  assert.equal(h.q('.lesson-study [data-action="example"]').dataset.id,atlas.lessonExamples.a01[0]);
  const shown = h.qa('.lesson-study [data-action="example"]').map(button=>button.dataset.id);
  assert.deepEqual(shown,atlas.lessonExamples.a01,'the complete assigned sequence is rendered');
  assert.ok(shown.includes('ref-greeting') && shown.includes('a01-1'),'the chosen capital study accompanies the new full greeting');
  assert.equal(atlas.examples.find(model=>model.id==='a01-1').sourceFile,'ornamental-penmanship-1920-highres.pdf');
  assert.deepEqual(h.errors,[]);
});

test('AI uses the chosen style description with consent without automatically sending the reference photo',async t=>{
  const h=await boot(t,{native:true});
  h.route('signature');
  await h.input('#sig-name','Test Writer');
  assert.ok(h.q('.reference-style'));
  await h.click('[data-action="ask-ai"]');
  assert.equal(h.requests.length,0,'consent still required');
  await h.input('#ai-consent',true,'change');
  await h.click('[data-action="ask-ai"]');
  assert.equal(h.requests.length,1);
  assert.match(h.requests[0].prompt,/broad, open capital ovals/);
  assert.match(h.requests[0].prompt,/own initials and name/);
  assert.match(h.requests[0].prompt,/No writing image is attached/);
  assert.equal(h.requests[0].image,undefined);
  assert.deepEqual(h.errors,[]);
});


test('signature studio uses all 52 bundled source letters and retains the source paths', async t => {
  const h = await boot(t);
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  const pack = h.w.ZanerGlyphs;
  assert.equal(Object.keys(pack.glyphs).length,52);
  assert.equal(pack.sourceSlant,50);
  const scripts = [...h.w.document.querySelectorAll('script[src]')].map(script=>script.getAttribute('src'));
  assert.ok(scripts.indexOf('zaner-glyphs.js') >= 0,'the shipped page loads its source pack');
  assert.ok(scripts.indexOf('zaner-glyphs.js') < scripts.indexOf('signature.js'),'source pack loads before its renderer');
  const holder = h.w.document.createElement('div');
  holder.innerHTML = h.w.SignatureLab.render(alphabet,{slant:52,flourish:0});
  const groups = [...holder.querySelectorAll('[data-source-glyph]')];
  assert.equal(groups.map(group=>group.dataset.sourceGlyph).join(''),alphabet);
  const metadata = JSON.parse(holder.querySelector('metadata').textContent);
  assert.equal(metadata.lettering,'source-based-ornamental');
  assert.equal(metadata.sourceSlant,50);
  assert.equal(metadata.style.slant,52,'personal slant is distinct from the source slant');
  assert.equal(metadata.canonical,false,'a composed design is not a certified historical specimen');
  for (const group of groups) {
    const ch = group.dataset.sourceGlyph;
    const source = h.w.document.createElement('div');
    source.innerHTML = '<svg>'+pack.glyphs[ch].svg+'</svg>';
    const sourcePath = source.querySelector('path').getAttribute('d');
    assert.ok([...group.querySelectorAll('path')].some(path=>path.getAttribute('d')===sourcePath),ch+' keeps its bundled ink contour');
  }
  assert.equal(holder.querySelector('image,script,foreignObject'),null);
  h.route('signature');
  await h.input('#sig-name','Reuben Royal');
  assert.equal(h.qa('#sig-preview [data-source-glyph]').map(group=>group.dataset.sourceGlyph).join(''),'ReubenRoyal');
  const original = pack.glyphs.R;
  delete pack.glyphs.R;
  assert.match(h.w.SignatureLab.render('Royal'),/Source lettering is unavailable/,'missing glyphs cannot silently fall back to a different alphabet');
  pack.glyphs.R = original;
  assert.deepEqual(h.errors,[]);
});

test('lesson practice uses the source slant and keeps the selected angle in saved progress', async t => {
  const h = await boot(t);
  for (const [id,angle] of [['e02',50],['f06',52]]) {
    h.w.SpencerianApp.navigate('lesson',{lesson:id});
    await h.click('[data-action="lesson-practice"]');
    assert.equal(h.q('.pl-slant').value,String(angle),id+' uses its lesson slant');
    assert.equal(h.q('.pl-target-angle').textContent,angle+'°');
    assert.match(h.q('.pl-canvas').getAttribute('aria-label'),new RegExp(angle+' degree'));
    h.draw();
    h.advance(60000);
    await h.click('.pl-save');
    const saved = h.state().sessions[0];
    assert.equal(saved.slant,angle,'the saved session retains its guide angle');
    assert.equal(saved.metrics.targetAngle,angle,'the feedback target follows the guides');
    const restored = h.w.SpencerianApp.normalizeBackup(h.state());
    assert.equal(restored.sessions[0].slant,angle,'backup restoration retains the guide angle');
    assert.equal(restored.sessions[0].metrics.targetAngle,angle,'backup restoration retains the feedback target');
  }
  await h.input('.pl-slant','50','change');
  assert.equal(h.q('.pl-target-angle').textContent,'50°','the learner can change the guide angle');
  await h.click('.pl-save');
  assert.equal(h.state().sessions[0].metrics.targetAngle,50);
  assert.deepEqual(h.errors,[]);
});

test('Signature Lab creates typed-name choices offline and saves the selected form through reload', async t => {
  const h = await boot(t);
  h.route('signature');
  assert.equal(h.q('#sig-name').value,'','a new user must not receive a placeholder name as a saved signature');
  await h.input('#sig-name','Reuben Royal');
  await h.click('[data-action="create-signatures"]');
  assert.equal(h.qa('#signature-drafts [data-action="choose-signature"]').length,3);
  assert.equal(h.requests.length,0,'typed-name generation works without any AI provider');
  assert.ok(h.qa('#signature-drafts svg [data-source-glyph]').length > 0,'the cards show real source-letter previews');
  await h.click('#signature-drafts [data-action="choose-signature"][data-id="daily"]');
  const chosen = copy(h.state().signature);
  assert.equal(chosen.name,'Reuben Royal');
  assert.equal(chosen.slant,52);
  assert.ok(chosen.flourish>=1 && chosen.flourish<=3,'the selected ornamental finish is retained');
  await h.click('[data-action="sig-save"]');
  assert.equal(h.state().signatures.length,1);
  assert.equal(h.state().signatures[0].name,'Reuben Royal');
  const stored = copy(await h.w.ProgressStore.load());
  const restored = await boot(t,{initial:stored});
  restored.route('signature');
  assert.equal(restored.state().signatures.length,1);
  await restored.input('#sig-name','Other Name');
  await restored.click('[data-action="sig-load"]');
  for (const key of ['name','slant','spacing','flourish','capitalScale','seed']) assert.equal(restored.state().signature[key],chosen[key],key+' survives save and reload');
  assert.equal(restored.q('#sig-name').value,'Reuben Royal');
  assert.deepEqual(h.errors,[]);
  assert.deepEqual(restored.errors,[]);
});

test('a changed spelling requires review before any signature draft is generated', async t => {
  const h = await boot(t);
  h.route('signature');
  await h.input('#sig-name','José Álvarez');
  await h.click('[data-action="create-signatures"]');
  assert.equal(h.qa('#signature-drafts [data-action="choose-signature"]').length,0);
  assert.equal(h.q('#sig-name').value,'José Álvarez','the original user text is not silently replaced');
  assert.ok(h.q('#sig-name-review'));
  assert.match(h.q('#sig-name-review').textContent || h.q('#sig-name-review').value,/Jose Alvarez/);
  await h.click('[data-action="confirm-signature-name"]');
  assert.equal(h.q('#sig-name').value,'Jose Alvarez');
  assert.equal(h.qa('#signature-drafts [data-action="choose-signature"]').length,3);
  assert.equal(h.requests.length,0);
});

test('uploading a current signature stays local and image-only use explains the manual name path', async t => {
  const h = await boot(t,{native:true,providersConfigured:false});
  h.route('signature');
  h.emit('native-image',{dataUrl:png});
  await settle();
  assert.equal(h.requests.length,0,'adding an image does not send it to a provider');
  assert.equal(h.q('#sample-view img').getAttribute('src'),png);
  assert.equal(h.q('#sig-name').value,'','upload must not guess the signing name');
  await h.click('[data-action="create-signatures"]');
  assert.equal(h.qa('#signature-drafts [data-action="choose-signature"]').length,0);
  assert.match(h.q('#main').textContent,/type|enter|transcri/i,'the name can be provided by hand');
  await h.input('#ai-consent',true,'change');
  await h.click('[data-action="read-signature"]');
  assert.equal(h.requests.length,0,'an unconfigured provider cannot receive a photo');
  assert.match(h.q('#toast').textContent,/connect|provider|name|type/i);
  await h.input('#sig-name','Reuben Royal');
  await h.click('[data-action="create-signatures"]');
  assert.equal(h.qa('#signature-drafts [data-action="choose-signature"]').length,3,'typing the desired name works without vision');
  assert.equal(h.requests.length,0);
  assert.ok(!JSON.stringify(await h.w.ProgressStore.load()).includes(png),'a temporary reference photo does not enter a progress backup');
  assert.deepEqual(h.errors,[]);
});

test('Signature Lab changes preserve prior course progress and saved signatures', async t => {
  const old = blankState();
  old.completed.f01=1700000000000;
  old.quiz.f01=true;
  old.bookmarks=['f01','e02'];
  old.lessonNotes.f01='Keep the grip light.';
  old.sessions=[session()];
  old.signatures=[{...old.signature,id:'201',date:1700000000000}];
  const h = await boot(t,{initial:old});
  h.route('signature');
  await h.input('#sig-name','Reuben Royal');
  await h.click('[data-action="create-signatures"]');
  await h.click('#signature-drafts [data-action="choose-signature"][data-id="short"]');
  assert.equal(h.state().signature.name,'R Royal');
  await h.click('[data-action="sig-save"]');
  const after = h.state();
  assert.deepEqual(after.completed,old.completed);
  assert.deepEqual(after.quiz,old.quiz);
  assert.deepEqual(after.bookmarks,old.bookmarks);
  assert.deepEqual(after.lessonNotes,old.lessonNotes);
  assert.equal(after.sessions.length,1);
  assert.equal(after.sessions[0].note,old.sessions[0].note);
  assert.equal(after.signatures.length,2);
  assert.deepEqual(after.signatures.find(item=>item.id==='201'),old.signatures[0]);
  assert.equal(!!h.w.SpencerianApp.validBackup(after),true);
  await h.click('[data-action="signature-practice"]');
  assert.ok(h.q('#signature-practice-model svg'),'practice includes the selected signature model');
  assert.match(h.q('#signature-practice-model').textContent,/R Royal/);
  assert.equal(h.q('.pl-slant').value,'52');
  assert.deepEqual(h.errors,[]);
});

test('photo reading needs consent and presents an editable proposal without changing the signing name', async t => {
  const h = await boot(t,{native:true});
  h.route('signature');
  await h.input('#sig-name','Reuben Royal');
  h.emit('native-image',{dataUrl:png});
  await settle();
  await h.input('#ai-provider','gemini','change');
  await h.click('[data-action="read-signature"]');
  assert.equal(h.requests.length,0,'photo reading also requires explicit consent');
  await h.input('#ai-consent',true,'change');
  await h.click('[data-action="read-signature"]');
  assert.equal(h.requests.length,1);
  assert.equal(h.requests[0].provider,'gemini');
  assert.equal(h.requests[0].image,png);
  assert.match(h.requests[0].prompt,/transcribedName/);
  const response = {transcribedName:'Rueben Royal',confidence:'low',featuresToKeep:['Open capital oval'],changes:['Use a short final stroke']};
  h.emit('native-ai-result',{id:h.requests[0].id,ok:true,text:JSON.stringify(response)});
  await settle();
  assert.equal(h.q('#signature-transcription').value,'Rueben Royal');
  assert.equal(h.q('#sig-name').value,'Reuben Royal','vision cannot silently replace the typed name');
  assert.equal(h.state().signature.name,'Reuben Royal');
  assert.equal(h.qa('#signature-drafts [data-action="choose-signature"]').length,0,'a reading alone does not generate or choose a signature');
  await h.input('#signature-transcription','Reuben J Royal');
  await h.click('[data-action="use-transcription"]');
  assert.equal(h.q('#sig-name').value,'Reuben J Royal','only the user-reviewed text is applied');
  assert.equal(h.qa('#signature-drafts [data-action="choose-signature"]').length,3);
  assert.equal(h.requests.length,1,'local generation after review needs no second provider call');
  assert.deepEqual(h.errors,[]);
});

test('changed photo, name, provider, brief or goal makes an in-flight photo reading stale', async t => {
  const h = await boot(t,{native:true});
  h.route('signature');
  await h.input('#sig-name','Reuben Royal');
  const response = JSON.stringify({transcribedName:'Wrong Old Name',confidence:'high',featuresToKeep:[],changes:[]});
  const changes = [
    ['photo', async()=>{h.emit('native-image',{dataUrl:png});await settle();}],
    ['name', async()=>h.input('#sig-name','Reuben J Royal')],
    ['provider', async()=>h.input('#ai-provider','anthropic','change')],
    ['brief', async()=>h.input('#ai-brief','Keep the first initial compact.')],
    ['goal', async()=>h.input('#ai-goal','drill','change')]
  ];
  for (const [label,change] of changes) {
    h.emit('native-image',{dataUrl:png});
    await settle();
    await h.input('#ai-consent',true,'change');
    await h.click('[data-action="read-signature"]');
    const request = h.requests[h.requests.length-1];
    assert.ok(request,label+' request exists');
    await change();
    assert.equal(h.q('#ai-consent').checked,false,label+' change resets consent');
    h.emit('native-ai-result',{id:request.id,ok:true,text:response});
    await settle();
    assert.equal(h.q('#signature-transcription'),null,label+' change invalidates old reading');
    assert.notEqual(h.state().signature.name,'Wrong Old Name');
    assert.equal(h.q('[data-action="read-signature"]').disabled,false,'stale results do not lock the feature');
  }
  assert.deepEqual(h.errors,[]);
});

test('malformed and hostile photo readings never become an applied name or executable markup', async t => {
  const h = await boot(t,{native:true});
  h.route('signature');
  await h.input('#sig-name','Reuben Royal');
  h.emit('native-image',{dataUrl:png});
  const responses = [
    'not JSON',
    JSON.stringify({transcribedName:'Wrong Name'}),
    JSON.stringify({transcribedName:'A'.repeat(49),confidence:'high',featuresToKeep:[],changes:[]}),
    JSON.stringify({transcribedName:'Wrong Name',confidence:'certain',featuresToKeep:[],changes:[]}),
    JSON.stringify({transcribedName:'Wrong Name',confidence:'high',featuresToKeep:[{nested:'bad'}],changes:[]})
  ];
  for (const text of responses) {
    await h.input('#ai-consent',true,'change');
    await h.click('[data-action="read-signature"]');
    h.emit('native-ai-result',{id:h.requests[h.requests.length-1].id,ok:true,text});
    await settle();
    assert.equal(h.q('#signature-transcription'),null);
    assert.equal(h.state().signature.name,'Reuben Royal');
    assert.match(h.q('#signature-analysis').textContent,/usable|could not|couldn|invalid|name/i);
  }
  await h.input('#ai-consent',true,'change');
  await h.click('[data-action="read-signature"]');
  h.emit('native-ai-result',{id:h.requests[h.requests.length-1].id,ok:true,text:JSON.stringify({
    transcribedName:'<img src=x onerror=alert(1)>',confidence:'low',
    featuresToKeep:['<svg onload=alert(1)>'],changes:['<script>alert(1)</script>']
  })});
  await settle();
  assert.equal(h.qa('#signature-analysis img,#signature-analysis svg,#signature-analysis script,#signature-analysis [onload],#signature-analysis [onerror]').length,0);
  assert.equal(h.state().signature.name,'Reuben Royal');
  assert.deepEqual(h.errors,[]);
});

test('AI concepts reject unsupported geometry without changing the selected signature', async t => {
  const h = await boot(t,{native:true});
  h.route('signature');
  await h.input('#sig-name','Reuben Royal');
  const before = copy(h.state().signature);
  const base = {title:'Test direction',rationale:'Keep clear joins',practice:'Write five copies',slant:52,spacing:1,flourish:0,capitalScale:1,seed:23};
  for (const change of [{slant:55},{spacing:1.4},{flourish:4},{capitalScale:1.41},{flourish:0.5}]) {
    await h.input('#ai-consent',true,'change');
    await h.click('[data-action="ask-ai"]');
    const request = h.requests[h.requests.length-1];
    h.emit('native-ai-result',{id:request.id,ok:true,text:JSON.stringify({concepts:[{...base,...change}]})});
    await settle();
    assert.equal(h.qa('[data-action="apply-ai-concept"]').length,0,JSON.stringify(change));
    assert.deepEqual(h.state().signature,before,'rejected AI geometry cannot alter the current name or style');
  }
  assert.deepEqual(h.errors,[]);
});

test('a reviewed current signature can inform a new design only after a second consented request and explicit Apply', async t => {
  const h = await boot(t,{native:true});
  h.route('signature');
  h.emit('native-image',{dataUrl:png});
  await h.input('#ai-consent',true,'change');
  await h.click('[data-action="read-signature"]');
  h.emit('native-ai-result',{id:h.requests[0].id,ok:true,text:JSON.stringify({
    transcribedName:'Reuben Royal',confidence:'medium',featuresToKeep:['Open R oval'],changes:['Shorten the final stroke']
  })});
  await settle();
  await h.click('[data-action="use-transcription"]');
  await h.click('#signature-drafts [data-action="choose-signature"][data-id="daily"]');
  const before = copy(h.state().signature);
  await h.click('[data-action="refine-signature-photo"]');
  assert.equal(h.requests.length,1,'accepting a reading does not grant consent for a later design request');
  await h.input('#ai-consent',true,'change');
  await h.click('[data-action="refine-signature-photo"]');
  assert.equal(h.requests.length,2);
  assert.equal(h.requests[1].image,png,'the explicitly chosen photo accompanies the design request');
  assert.match(h.requests[1].prompt,/Open R oval/);
  assert.match(h.requests[1].prompt,/Shorten the final stroke/);
  assert.match(h.requests[1].prompt,/Reuben Royal/);
  const concept = {title:'Open oval finish',rationale:'Keep the initial open',practice:'Five slow copies',slant:52,spacing:1.05,flourish:3,capitalScale:1.4,seed:71};
  h.emit('native-ai-result',{id:h.requests[1].id,ok:true,text:JSON.stringify({summary:'Try a shorter finish.',concepts:[concept],drills:[]})});
  await settle();
  assert.equal(h.qa('[data-action="apply-ai-concept"]').length,1);
  assert.deepEqual(h.state().signature,before,'a provider response cannot select a design automatically');
  await h.click('[data-action="apply-ai-concept"]');
  assert.equal(h.state().signature.name,'Reuben Royal');
  for (const key of ['slant','spacing','flourish','capitalScale','seed']) assert.equal(h.state().signature[key],concept[key]);
  await h.click('[data-action="sig-save"]');
  const restored = h.w.SpencerianApp.normalizeBackup(copy(await h.w.ProgressStore.load()));
  assert.equal(restored.signatures[0].flourish,3,'the extended finish survives backup normalization');
  assert.equal(restored.signatures[0].capitalScale,1.4,'the selected capital size survives backup normalization');
  assert.deepEqual(h.errors,[]);
});

test('restoring a backup replaces the active signature name and clears old drafts and reference photo', async t => {
  const h = await boot(t,{native:true});
  h.route('signature');
  await h.input('#sig-name','Old Writer');
  await h.click('[data-action="create-signatures"]');
  h.emit('native-image',{dataUrl:png});
  await settle();
  assert.equal(h.qa('#signature-drafts [data-action="choose-signature"]').length,3);
  assert.ok(h.q('#sample-view img'));
  const incoming = blankState();
  incoming.signature.name='Reuben Royal';
  incoming.signature.flourish=0;
  h.emit('native-import',{text:JSON.stringify(incoming)});
  await settle();
  await h.click('[data-action="confirm-restore"]');
  h.route('signature');
  assert.equal(h.q('#sig-name').value,'Reuben Royal');
  assert.equal(h.state().signature.name,'Reuben Royal');
  assert.equal(h.qa('#sig-preview [data-source-glyph]').map(group=>group.dataset.sourceGlyph).join(''),'ReubenRoyal');
  assert.equal(h.qa('#signature-drafts [data-action="choose-signature"]').length,0,'drafts from the old name are cleared');
  assert.equal(h.q('#sample-view img'),null,'the old reference image is cleared');
  await h.click('[data-action="create-signatures"]');
  assert.equal(h.qa('#signature-drafts [data-action="choose-signature"]').length,3);
  await h.click('#signature-drafts [data-action="choose-signature"][data-id="daily"]');
  assert.equal(h.state().signature.name,'Reuben Royal','new drafts use the restored name');
  assert.deepEqual(h.errors,[]);
});

test('finish choices update the preview and controls while retaining every letter of the selected name', async t => {
  const h = await boot(t);
  h.route('signature');
  await h.input('#sig-name','Reuben Royal');
  await h.click('[data-action="create-signatures"]');
  await h.click('#signature-drafts [data-action="choose-signature"][data-id="daily"]');
  const previews = [];
  for (const finish of [0,1,2,3]) {
    await h.click(`[data-action="sig-finish"][data-finish="${finish}"]`);
    assert.equal(h.state().signature.flourish,finish);
    assert.equal(h.q('#sig-flourish').value,String(finish),'the range and direct choices show the same finish');
    assert.equal(h.qa('#signature-finishes [aria-pressed="true"]').length,1);
    assert.equal(h.q('#signature-finishes [aria-pressed="true"]').dataset.finish,String(finish));
    const svg = h.q('#sig-preview svg');
    const metadata = JSON.parse(svg.querySelector('metadata').textContent);
    assert.equal(metadata.style.flourish,finish,'the SVG represents the selected finish');
    assert.equal([...svg.querySelectorAll('[data-source-glyph]')].map(group=>group.dataset.sourceGlyph).join(''),'ReubenRoyal');
    assert.ok(h.q('#signature-flow-study svg'),'the finish has a visible study');
    assert.ok(h.q('#signature-flow-card ol'),'the study includes ordered practice directions');
    previews.push(svg.outerHTML);
  }
  assert.equal(new Set(previews).size,4,'all four finish choices produce different previews');
  await h.input('#sig-flourish','2');
  assert.equal(h.q('#signature-finishes [aria-pressed="true"]').dataset.finish,'2','editing the range updates the direct choices');
  assert.equal(h.state().signature.name,'Reuben Royal');
  assert.deepEqual(h.errors,[]);
});

test('a full paper journal rejects a new record without changing saved history or completion', async t => {
  const initial=blankState();
  initial.completed[lessons[0].id]=1700000000000;
  initial.sessions=Array.from({length:2000},(_,i)=>session({id:String(20000+i)}));
  const h=await boot(t,{initial});
  h.route('practice');
  const before=h.state(), storedBefore=copy(await h.w.ProgressStore.load());
  await h.click('[data-action="log-paper"]');
  await h.click('[data-action="save-paper"]');
  assert.match(h.q('#toast').textContent,/Journal is full.*2,000.*Export a backup.*delete/i);
  assert.equal(h.q('#modal').open,true,'the rejected record remains available for review');
  assert.deepEqual(h.state(),before,'a rejected save must not mutate the journal');
  assert.deepEqual(copy(await h.w.ProgressStore.load()),storedBefore,'saved progress must not change');
  const reopened=await boot(t,{initial:await h.w.ProgressStore.load()});
  assert.equal(reopened.state().sessions.length,2000);
  assert.equal(reopened.state().completed[lessons[0].id],1700000000000);
  assert.deepEqual(h.errors,[]);
});

test('a digital session can reach and update the journal limit but a new session cannot exceed it', async t => {
  const initial=blankState();
  initial.sessions=Array.from({length:1999},(_,i)=>session({id:String(20000+i)}));
  const h=await boot(t,{initial});
  h.route('practice');h.draw();h.advance(120000);await h.click('.pl-save');
  assert.equal(h.state().sessions.length,2000);
  const id=h.state().sessions[0].id;
  h.advance(60000);h.draw();await h.click('.pl-save');
  assert.equal(h.state().sessions.length,2000,'updating the active record does not need extra capacity');
  assert.equal(h.state().sessions[0].id,id);
  assert.equal(h.state().sessions[0].minutes,3);
  const stored=copy(await h.w.ProgressStore.load());
  const reopened=await boot(t,{initial:stored});
  reopened.route('practice');reopened.draw();reopened.advance(60000);await reopened.click('.pl-save');
  assert.equal(reopened.state().sessions.length,2000);
  assert.match(reopened.q('#toast').textContent,/Journal is full/);
  assert.deepEqual(copy(await reopened.w.ProgressStore.load()),stored,'a new desk session cannot replace the saved record');
  assert.equal(!!reopened.w.SpencerianApp.validBackup(await reopened.w.ProgressStore.load()),true);
  assert.deepEqual(h.errors,[]);
  assert.deepEqual(reopened.errors,[]);
});

test('a full signature collection rejects another saved concept and preserves existing progress', async t => {
  const initial=blankState();
  initial.completed[lessons[0].id]=1700000000000;
  initial.signatures=Array.from({length:1000},(_,i)=>({...initial.signature,name:'',id:String(30000+i),date:1700000000000}));
  const h=await boot(t,{initial});
  h.route('signature');
  const before=h.state(),storedBefore=copy(await h.w.ProgressStore.load());
  await h.click('[data-action="sig-save"]');
  assert.match(h.q('#toast').textContent,/Saved signatures are full.*1,000.*Export a backup.*delete/i);
  assert.deepEqual(h.state(),before);
  assert.deepEqual(copy(await h.w.ProgressStore.load()),storedBefore);
  const reopened=await boot(t,{initial:await h.w.ProgressStore.load()});
  assert.equal(reopened.state().signatures.length,1000);
  assert.equal(reopened.state().completed[lessons[0].id],1700000000000);
  assert.deepEqual(h.errors,[]);
});

test('invalid stored progress stays protected and exportable until a valid restore succeeds', async t => {
  const damaged=blankState();
  damaged.completed[lessons[0].id]=1700000000000;
  damaged.sessions=Array.from({length:2001},(_,i)=>session({id:String(20000+i)}));
  const h=await boot(t,{initial:damaged,native:true});
  assert.match(h.q('#storage-notice').textContent,/Saved progress needs recovery.*kept unchanged/);
  assert.equal(h.q('#storage-notice').getAttribute('role'),'alert');
  h.w.SpencerianApp.navigate('lesson',{lesson:lessons[0].id});
  await h.click('[data-action="bookmark"]');
  await h.input('#lesson-note','This session must not overwrite the recovery data.');
  assert.match(h.q('#storage-notice').textContent,/New changes cannot be saved/,'the notice survives navigation');
  assert.deepEqual(copy(await h.w.ProgressStore.load()),damaged,'ordinary edits cannot overwrite rejected data');
  await h.click('[data-action="export-recovery"]');
  assert.equal(h.exports[0].filename,'Spencerian-Desk-Recovery.json');
  assert.deepEqual(JSON.parse(Buffer.from(h.exports[0].base64,'base64').toString('utf8')),damaged,'recovery export retains the original record exactly');
  h.emit('native-import',{text:JSON.stringify({...blankState(),signature:null})});await settle();
  assert.deepEqual(copy(await h.w.ProgressStore.load()),damaged,'an invalid restore cannot replace the protected record');
  const incoming=blankState();incoming.sessions=[session()];incoming.completed[lessons[1].id]=1700000000123;
  h.emit('native-import',{text:JSON.stringify(incoming)});await settle();
  const save=h.w.ProgressStore.save;
  h.w.ProgressStore.save=()=>Promise.reject(new Error('Synthetic write failure during recovery'));
  await h.click('[data-action="confirm-restore"]');
  assert.ok(h.q('#storage-notice'),'failed recovery must keep the warning and protection');
  assert.deepEqual(copy(await h.w.ProgressStore.load()),damaged);
  h.w.ProgressStore.save=save;
  await h.click('[data-action="confirm-restore"]');
  assert.equal(h.q('#storage-notice'),null,'only a successful, explicit restore clears recovery mode');
  assert.equal(h.state().sessions.length,1);
  h.w.SpencerianApp.navigate('lesson',{lesson:lessons[1].id});
  await h.input('#lesson-note','Recovery succeeded.');
  const stored=copy(await h.w.ProgressStore.load());
  assert.equal(stored.lessonNotes[lessons[1].id],'Recovery succeeded.','normal saves resume after recovery');
  assert.equal(stored.completed[lessons[1].id],1700000000123);
  const reopened=await boot(t,{initial:stored});
  assert.equal(reopened.q('#storage-notice'),null);
  assert.equal(reopened.state().sessions.length,1);
  assert.deepEqual(h.errors,[]);
});

test('legacy migration preserves valid progress and protects malformed legacy records', async t => {
  const valid=blankState();valid.sessions=[session()];
  const migrated=await boot(t,{legacy:JSON.stringify(valid)});
  assert.equal(migrated.state().sessions.length,1);
  assert.equal(migrated.w.localStorage.getItem('spencerian-lab-v1'),null);
  assert.equal((await migrated.w.ProgressStore.load()).sessions.length,1);
  assert.equal(migrated.q('#storage-notice'),null);
  for(const legacy of ['{broken JSON',JSON.stringify({...blankState(),signature:null})]){
    const h=await boot(t,{legacy,native:true});
    assert.match(h.q('#storage-notice').textContent,/Saved progress needs recovery/);
    h.w.SpencerianApp.navigate('lesson',{lesson:lessons[0].id});
    await h.click('[data-action="bookmark"]');
    assert.equal(await h.w.ProgressStore.load(),null,'migration cannot overwrite a rejected legacy record');
    assert.equal(h.w.localStorage.getItem('spencerian-lab-v1'),legacy);
    await h.click('[data-action="export-recovery"]');
    assert.equal(Buffer.from(h.exports[0].base64,'base64').toString('utf8'),legacy);
    assert.deepEqual(h.errors,[]);
  }
});

test('journal pages load only twenty drawings and metadata typing is batched', async t => {
 const initial=blankState();initial.sessions=Array.from({length:45},(_,i)=>session({id:String(i+1),image:png,kind:'digital'}));
 const h=await boot(t,{initial});let imageReads=0;const get=h.w.ProgressStore.getImage;
 h.w.ProgressStore.getImage=async key=>{imageReads++;return get(key)};
 h.route('progress');await until(()=>imageReads===20,'first journal page');
 assert.equal(h.qa('.journal-card').length,20);assert.ok(h.state().sessions.every(s=>s.image===null&&s.imageKey));
 await h.click('[data-action="journal-page"][data-page="1"]');await until(()=>imageReads===40,'second journal page');assert.equal(h.qa('.journal-card').length,20);
 h.route('lesson');await settle();let writes=0;const save=h.w.ProgressStore.save;h.w.ProgressStore.save=(...args)=>{writes++;return save(...args)};
 const note=h.q('#lesson-note');for(let i=0;i<30;i++){note.value+='a';note.dispatchEvent(new h.w.Event('input',{bubbles:true}))}
 assert.equal(writes,0);await h.w.SpencerianApp.flush();assert.equal(writes,1);assert.equal((await h.w.ProgressStore.load()).lessonNotes[lessons[0].id].length,30);
 assert.deepEqual(h.errors,[]);
});

test('Android backup exporter uses bounded chunks for a journal over 40 MB',async t=>{
 const initial=blankState(),drawing='data:image/png;base64,'+'A'.repeat(195000);
 initial.sessions=Array.from({length:220},(_,i)=>session({id:String(i+1),image:drawing,kind:'digital'}));
 const h=await boot(t,{initial,native:true});let total=0,largest=0,finished=false;const bridge=h.w.SpencerianNative;
 bridge.beginExport=(name,mime)=>{assert.match(name,/\.jsonl$/);return JSON.stringify({ok:true,id:'test-export'})};
 bridge.appendExport=(id,b64)=>{assert.equal(id,'test-export');const bytes=Buffer.from(b64,'base64').length;total+=bytes;largest=Math.max(largest,bytes);return JSON.stringify({ok:true})};
 bridge.finishExport=id=>{assert.equal(id,'test-export');finished=true;return JSON.stringify({ok:true})};bridge.abortExport=()=>{};
 h.route('settings');h.q('[data-action="export-backup"]').click();
 for(let i=0;i<300&&!finished;i++)await new Promise(resolve=>setTimeout(resolve,10));
 assert.equal(finished,true);assert.ok(total>40000000);assert.ok(largest<=192*1024);assert.equal(h.exports.length,0,'no aggregate legacy bridge call');assert.deepEqual(h.errors,[]);
});

async function feedNativeBackup(h,text,id='incoming'){
 let offset=0;
 h.w.SpencerianNative.abortImport=()=>{};
 h.w.SpencerianNative.readImportChunk=request=>{assert.equal(request,id);setImmediate(()=>{const part=text.slice(offset,offset+32768);offset+=part.length;h.emit('native-import-chunk',{id,ok:true,text:part,done:!part})})};
 h.emit('native-import-start',{id,ok:true});
 await until(()=>h.q('#modal').open&&h.q('[data-action="confirm-restore"]')||/unchanged/.test(h.q('#toast').textContent),'backup parse');
}

test('streamed restore publishes only after confirmation and reads images lazily',async t=>{
 const old=blankState();old.sessions=[session({id:'7'})];const h=await boot(t,{initial:old,native:true}),next=blankState();next.sessions=[session({id:'8',image:png}),session({id:'9',image:png})];
 let text='';for await(const line of h.w.BackupCodec.records(next,()=>png))text+=line;
 await feedNativeBackup(h,text);assert.equal((await h.w.ProgressStore.load()).sessions[0].id,'7');
 await h.click('[data-action="confirm-restore"]');assert.equal(h.state().sessions.length,2);assert.ok(h.state().sessions.every(s=>s.imageKey&&!s.image));
 assert.equal((await h.w.ProgressStore.load()).sessions[0].image,png);assert.equal(h.q('.journal-card img').src,png);assert.deepEqual(h.errors,[]);
});

test('canceling or truncating a streamed restore leaves previous progress and drawings intact',async t=>{
 const old=blankState();old.sessions=[session({id:'7',image:png})];const h=await boot(t,{initial:old,native:true}),next=blankState();next.sessions=[session({id:'8',image:png})];
 let text='';for await(const line of h.w.BackupCodec.records(next,()=>png))text+=line;
 await feedNativeBackup(h,text);await h.click('[data-action="close-modal"]');await h.w.ProgressStore.flush();assert.equal((await h.w.ProgressStore.load()).sessions[0].id,'7');
 await feedNativeBackup(h,text.slice(0,text.lastIndexOf('{"type":"end"')),'truncated');assert.equal((await h.w.ProgressStore.load()).sessions[0].image,png);assert.equal(h.state().sessions[0].id,'7');assert.match(h.q('#toast').textContent,/incomplete/);
});

test('protected recovery data exports exact Unicode text through the chunked native path',async t=>{
 const legacy='{ damaged recovery '+('🖋é'.repeat(15000));const h=await boot(t,{legacy,native:true});const parts=[];let finished=false;
 h.w.SpencerianNative.beginExport=name=>{assert.equal(name,'Spencerian-Desk-Recovery.json');return JSON.stringify({ok:true,id:'recovery'})};
 h.w.SpencerianNative.appendExport=(id,part)=>{assert.equal(id,'recovery');parts.push(Buffer.from(part,'base64'));return JSON.stringify({ok:true})};
 h.w.SpencerianNative.finishExport=()=>{finished=true;return JSON.stringify({ok:true})};h.w.SpencerianNative.abortExport=()=>{};
 await h.click('[data-action="export-recovery"]');for(let i=0;i<100&&!finished;i++)await new Promise(resolve=>setTimeout(resolve,5));
 assert.equal(finished,true);assert.equal(Buffer.concat(parts).toString('utf8'),legacy);assert.equal(h.exports.length,0);assert.equal(h.w.localStorage.getItem('spencerian-lab-v1'),legacy);
});
