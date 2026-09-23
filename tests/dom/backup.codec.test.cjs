'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const context={window:{}};vm.runInNewContext(fs.readFileSync(path.resolve(__dirname,'../../app/src/main/assets/backup.js'),'utf8'),context);
const codec=context.window.BackupCodec;
const image='data:image/png;base64,'+'A'.repeat(1024);
const validImage=x=>typeof x==='string'&&x.length<12000000&&/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(x);
function harness(){
 const saved={value:'original'},staged=new Map();let token=null;
 const store={async beginImport(meta){token={meta};return token},async stageImportImage(t,k,v){assert.equal(t,token);staged.set(k,v)},async abortImport(t){assert.equal(t,token);staged.clear()},async commitImport(t){saved.value=t.meta;return t.meta}};
 const reader=()=>codec.importer({store,validate:(x,options={})=>x?.version===1&&Array.isArray(x.sessions)&&x.sessions.every(s=>!Object.hasOwn(s,'imageKey')||options.allowImageRefs===true),normalize:x=>x,validImage});
 return {saved,staged,store,reader};
}
async function feed(reader,text,size=192*1024){for(let i=0;i<text.length;i+=size)await reader.push(text.slice(i,i+size))}
test('streaming backup larger than 40 MB stages drawings independently before confirmation',async()=>{
 const h=harness(),reader=h.reader(),drawing='data:image/png;base64,'+'A'.repeat(195000);
 const state={version:1,sessions:Array.from({length:220},(_,i)=>({id:String(i),imageKey:'saved-'+i,image:null}))};
 let bytes=0,reads=0;
 for await(const line of codec.records(state,async()=>{reads++;return drawing})){bytes+=line.length;await feed(reader,line)}
 const result=await reader.finish();
 assert.ok(bytes>40000000);assert.equal(reads,220);assert.equal(h.staged.size,220);assert.equal(h.saved.value,'original');assert.ok(result.token);
 await h.store.commitImport(result.token);assert.equal(h.saved.value.sessions.length,220);
});
test('new format and Unicode survive single-character chunks',async()=>{
 const h=harness(),reader=h.reader(),state={version:1,name:'Élodie 漢字',sessions:[{id:'1',image}]};
 for await(const line of codec.records(state,()=>assert.fail('inline image should be used')))await feed(reader,line,1);
 const result=await reader.finish();assert.equal(result.metadata.name,state.name);assert.equal(h.staged.get('image-0'),image);
});
test('truncated and duplicate image streams never replace current progress',async()=>{
 const state={version:1,sessions:[{id:'1',image}]},lines=[];for await(const line of codec.records(state,()=>image))lines.push(line);
 for(const input of [lines.slice(0,2).join(''),lines[0]+lines[1]+lines[1]+lines[2]]){
  const h=harness(),reader=h.reader();await assert.rejects(async()=>{await feed(reader,input);await reader.finish()});await reader.cancel();assert.equal(h.saved.value,'original');assert.equal(h.staged.size,0);
 }
});
test('missing and invalid images are rejected, with staged data removable',async()=>{
 const state={version:1,sessions:[{id:'1',image}]},lines=[];for await(const line of codec.records(state,()=>image))lines.push(line);
 for(const input of [lines[0]+lines[2],lines[0]+JSON.stringify({type:'image',key:'image-0',data:'javascript:bad'})+'\n']){
  const h=harness(),reader=h.reader();await assert.rejects(async()=>{await feed(reader,input);await reader.finish()});await reader.cancel();assert.equal(h.saved.value,'original');assert.equal(h.staged.size,0);
 }
});
test('legacy pretty and compact schema-1 JSON still import and reject internal references',async()=>{
 for(const spaces of [0,2]){
  const h=harness(),reader=h.reader(),state={version:1,sessions:[{id:'1',image}],name:'Old backup'};
  await feed(reader,JSON.stringify(state,null,spaces),1);const result=await reader.finish();assert.equal(result.legacy.name,'Old backup');assert.equal(result.token,null);assert.equal(h.staged.size,0);
 }
 const h=harness(),reader=h.reader();await feed(reader,JSON.stringify({version:1,sessions:[{id:'1',imageKey:'existing-private-drawing'}]}));
 await assert.rejects(()=>reader.finish(),/not valid/);assert.equal(h.staged.size,0);assert.equal(h.saved.value,'original');
});
test('malformed drawing indexes cannot point outside the staged backup',async()=>{
 const cases=[
  {images:1,sessions:[{id:'1',image:null,imageKey:'drawing:existing'}]},
  {images:2,sessions:[{id:'1',image:null,imageKey:'image-0'},{id:'2',image:null,imageKey:'image-0'}]},
  {images:0,sessions:[{id:'1',image:null,imageKey:'image-0'}]},
  {images:1,sessions:[{id:'1',image,imageKey:'image-0'}]},
  {images:1.5,sessions:[]},
  {images:2001,sessions:[]}
 ];
 for(const bad of cases){
  const h=harness(),reader=h.reader();
  await assert.rejects(()=>feed(reader,JSON.stringify({format:codec.format,version:codec.version,state:{version:1,sessions:bad.sessions},images:bad.images})+'\n'));
  await reader.cancel();assert.equal(h.staged.size,0);assert.equal(h.saved.value,'original');
 }
});
test('unexpected records and incorrect footer counts never publish a staged backup',async()=>{
 const lines=[];for await(const line of codec.records({version:1,sessions:[{id:'1',image}]},()=>image))lines.push(line);
 for(const tail of [JSON.stringify({type:'image',key:'image-9',data:image})+'\n',lines[1]+JSON.stringify({type:'end',images:0})+'\n',lines[1]+lines[2]+'null\n']){
  const h=harness(),reader=h.reader();await assert.rejects(async()=>{await feed(reader,lines[0]+tail);await reader.finish()});
  await reader.cancel();assert.equal(h.staged.size,0);assert.equal(h.saved.value,'original');
 }
});
test('cancel while the import header is being staged stops all later records and removes its token',async()=>{
 let beginStarted,completeBegin;
 const started=new Promise(resolve=>{beginStarted=resolve}),pending=new Promise(resolve=>{completeBegin=resolve});
 const aborted=[],staged=[];
 const store={async beginImport(){beginStarted();return pending},async stageImportImage(...args){staged.push(args)},async abortImport(token){aborted.push(token)}};
 const reader=codec.importer({store,validate:x=>x?.version===1,normalize:x=>x,validImage});
 let text='';for await(const line of codec.records({version:1,sessions:[{id:'1',image}]},()=>image))text+=line;
 const feeding=reader.push(text);await started;await reader.cancel();completeBegin('late-token');
 await assert.rejects(()=>feeding,/cancel|ended/i);assert.deepEqual(aborted,['late-token']);assert.equal(staged.length,0);
 await assert.rejects(()=>reader.finish(),/ended/);
});
test('chunk and record bounds stop oversized inputs before publication',async()=>{
 const chunkHarness=harness(),chunkReader=chunkHarness.reader();
 await assert.rejects(()=>chunkReader.push(' '.repeat(262145)),/chunk is too large/);
 await chunkReader.cancel();assert.equal(chunkHarness.saved.value,'original');
 const recordHarness=harness(),recordReader=recordHarness.reader();
 await recordReader.push('{"format":"'+codec.format+'","unused":"');
 await assert.rejects(async()=>{for(let i=0;i<123;i++)await recordReader.push('A'.repeat(262144))},/record is too large/);
 await recordReader.cancel();assert.equal(recordHarness.staged.size,0);assert.equal(recordHarness.saved.value,'original');
});
test('backup rejects content after footer and missing stored drawings',async()=>{
 const h=harness(),reader=h.reader();let text='';for await(const line of codec.records({version:1,sessions:[]},()=>null))text+=line;
 await assert.rejects(()=>feed(reader,text+'{}\n'));
 await assert.rejects(async()=>{for await(const line of codec.records({version:1,sessions:[{imageKey:'missing'}]},async()=>null)){}},/missing/);
});
test('export refuses damaged stored drawings instead of producing an unrestorable backup',async()=>{
 for(const damaged of ['data:image/png;base64,not valid', 'data:image/png;base64,'+'A'.repeat(12000000)]){
  const rows=[];
  await assert.rejects(async()=>{for await(const row of codec.records({version:1,sessions:[{id:'1',imageKey:'saved'}]},async()=>damaged))rows.push(row)},/damaged/);
  assert.equal(rows.length,1,'Only the metadata header may be staged before the export aborts');
 }
});
