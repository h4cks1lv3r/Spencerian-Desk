'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../../app/src/main/assets/signature.js'), 'utf8');
function setup(pack = true) {
  const root = {};
  if (pack) {
    const glyphs = {};
    for (const ch of 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz') glyphs[ch] = {
      svg: '<path d="M-12 -65 Q25 -75 58 -20 L40 35 Z" fill="currentColor"/>',
      viewBox: [-12, -75, 70, 110], baseline: 0, xHeight: 20,
      advance: 55, entry: [0, 0], exit: [53, 0]
    };
    root.ZanerGlyphs = {sourceSlant: 50, glyphs};
  }
  vm.runInNewContext(source, {window: root});
  return root;
}
function assertGlyphBounds(svg, root) {
  const outer = /<g color="[^\"]+" transform="translate\(([-.\d]+) ([-.\d]+)\) scale\(([-.\d]+)\)"><g transform="matrix\(1 0 ([-.\d]+) 1 0 0\)">/.exec(svg);
  assert.ok(outer, 'source composition transform exists');
  const [, ox, oy, fit, shear] = outer.map(Number);
  const height = Number(/height="([.\d]+)"/.exec(svg)[1]);
  const glyphs = [...svg.matchAll(/data-source-glyph="([A-Za-z])" transform="translate\(([-.\d]+) ([-.\d]+)\) scale\(([-.\d]+)\)"/g)];
  assert.ok(glyphs.length);
  for (const [, ch, tx, ty, factor] of glyphs) {
    const [l,t,w,h] = root.ZanerGlyphs.glyphs[ch].viewBox;
    for (const [gx,gy] of [[l,t],[l+w,t],[l,t+h],[l+w,t+h]]) {
      const px = Number(tx) + gx * Number(factor), py = Number(ty) + gy * Number(factor);
      const screenX = ox + fit * (px + shear * py), screenY = oy + fit * py;
      assert.ok(screenX > 35 && screenX < 865, `x clipped: ${screenX}`);
      assert.ok(screenY > 15 && screenY < height - 103, `y clipped: ${screenY}`);
    }
  }
  for (const [,d] of svg.matchAll(/<path data-signature-finish="[^"]+" d="([^"]+)"/g)) {
    const points = d.match(/-?(?:\d*\.)?\d+(?:e[-+]?\d+)?/gi).map(Number);
    for (let i=0;i<points.length;i+=2) {
      const screenX = ox + fit*(points[i] + shear*points[i+1]);
      const screenY = oy + fit*points[i+1];
      assert.ok(screenX > 35 && screenX < 865, `finish x clipped: ${screenX}`);
      assert.ok(screenY > 15 && screenY < height - 103, `finish y clipped: ${screenY}`);
    }
  }
}

test('letters use source contours and missing source letters never use a generic fallback', () => {
  const root = setup();
  const svg = root.SignatureLab.render('Abc', {flourish: 0});
  assert.equal((svg.match(/data-source-glyph=/g) || []).length, 3);
  assert.ok(svg.includes('M-12 -65 Q25 -75 58 -20 L40 35 Z'));
  assert.ok(svg.includes('source-based-ornamental'));
  assert.ok(setup(false).SignatureLab.render('Abc').includes('Source lettering is unavailable'));
  delete root.ZanerGlyphs.glyphs.b;
  assert.ok(root.SignatureLab.render('Abc').includes('Source lettering is unavailable'));
});

test('source slant is not applied twice', () => {
  const root = setup();
  assert.ok(root.SignatureLab.render('Abc', {slant:50, flourish:0}).includes('matrix(1 0 0 1 0 0)'));
  const svg = root.SignatureLab.render('Abc', {slant:52, flourish:0});
  const shear = Number(/matrix\(1 0 ([-.\d]+) 1 0 0\)/.exec(svg)[1]);
  const expected = 1 / Math.tan(50 * Math.PI / 180) - 1 / Math.tan(52 * Math.PI / 180);
  assert.ok(Math.abs(shear - expected) < 0.00001);
});

test('long names, capital extremes, every flourish and slant extremes stay in the viewport', () => {
  const root = setup();
  for (const name of ['Abc', 'A'.repeat(160), 'Abc Defgh Ijklmnop']) {
    for (const slant of [42, 50, 78]) for (const flourish of [0,1,2,3]) {
      const svg = root.SignatureLab.render(name, {slant, flourish, capitalScale:1.6, spacing:1.7, scale:1.6});
      assertGlyphBounds(svg, root);
      assert.doesNotMatch(svg, /(?:NaN|Infinity)/);
    }
  }
});

test('input escaping, color restrictions and empty names remain safe', () => {
  const root = setup();
  const svg = root.SignatureLab.render('<script>alert("x")</script> José', {ink:'red" onload="alert(1)', background:'url(x)', slant:Infinity});
  assert.doesNotMatch(svg, /<script|onload=|url\(x\)/);
  assert.ok(svg.includes('Jos'));
  assert.ok(svg.includes('Latin transliteration'));
  assert.ok(root.SignatureLab.render('').includes('Enter your name to begin'));
  assert.ok(root.SignatureLab.render('123-45').includes('simple auxiliary forms'));
});

test('terminal variation is deterministic and captions state the source composition limit', () => {
  const lab = setup().SignatureLab;
  assert.equal(lab.render('Abc', {seed:12}), lab.render('Abc', {seed:12}));
  assert.notEqual(lab.render('Abc', {seed:12}), lab.render('Abc', {seed:13}));
  assert.ok(lab.render('Abc').includes('not an exact photograph copy'));
  const prompt = lab.buildPrompt('Abc', 'Daily use', {slant:52});
  assert.ok(prompt.includes('same source-based ornamental letter shapes'));
  assert.ok(prompt.includes('Design only this learner'));
  assert.equal(lab.presets.length, 4);
});

test('ornamental drafts keep the entered full name and require an explicit choice for an abbreviation', () => {
  const lab = setup().SignatureLab;
  for (const name of ['Reuben Royal', "Anne-Marie O'Neill", 'Mary van der Meer', '123 Reuben']) {
    const result = lab.createDrafts(name);
    assert.equal(result.name, name);
    assert.equal(result.changed, false);
    assert.equal(result.needsConfirmation, false);
    assert.equal(result.unsupported, false);
    assert.equal(result.drafts.length, 3);
    for (const id of ['daily','clear']) {
      const draft = result.drafts.find(item=>item.id===id);
      assert.equal(draft.name, name, id+' preserves the full chosen spelling');
    }
    assert.equal(new Set(result.drafts.map(draft=>JSON.stringify(draft.options))).size,3,'the choices have distinct geometry');
    const rendered = [];
    for (const draft of result.drafts) {
      assert.equal(draft.options.slant, 52);
      assert.ok(Number.isInteger(draft.options.flourish) && draft.options.flourish >= 1 && draft.options.flourish <= 3,'each ornamental draft has a supported finish');
      assert.ok(draft.options.capitalScale >= 1.2 && draft.options.capitalScale <= 1.4,'capitals remain prominent but bounded');
      assert.ok(draft.options.spacing >= 0.9 && draft.options.spacing <= 1.2);
      assert.ok(draft.rationale && draft.title);
      assert.equal(draft.practice.length, 4);
      assert.ok(draft.practice.some(line=>/repeat|samples|five/i.test(line)));
      const svg = lab.render(draft.name,draft.options);
      assert.doesNotMatch(svg, /NaN|Infinity/);
      assert.equal([...svg.matchAll(/data-source-glyph="([A-Za-z])"/g)].map(match=>match[1]).join(''),draft.name.replace(/[^A-Za-z]/g,''),'every letter in the chosen name remains present');
      rendered.push(svg);
    }
    assert.equal(new Set(rendered).size,3,'each choice produces a different signature preview');
    assert.match(result.message,/preview cannot measure|do not predict signing speed/);
    assert.equal(JSON.stringify(lab.createDrafts(name)),JSON.stringify(result),'draft choices are deterministic');
  }
  const short = lab.createDrafts('Mary van der Meer').drafts.find(item=>item.id==='short');
  assert.equal(short.name,'M van der Meer','all words after the first remain intact');
  assert.match(short.rationale,/optional abbreviation of the first word/i);
  assert.match(lab.createDrafts('Reuben').drafts.find(item=>item.id==='short').rationale,/optional single initial/i);
  assert.equal(lab.createDrafts('R').drafts[2].id,'open','a one-letter name does not invent a second name');
});

test('new-name generation cannot silently transliterate or drop unsupported characters', () => {
  const lab = setup().SignatureLab;
  for (const [input,proposal] of [['José Álvarez','Jose Alvarez'],['Søren Østergård','Soren Ostergard'],['Anne 王','Anne'],['Anne & Marie','Anne Marie']]) {
    const result = lab.createDrafts(input);
    assert.equal(result.name,proposal);
    assert.equal(result.changed,true);
    assert.equal(result.needsConfirmation,true);
    assert.equal(result.drafts.length,0,'no preview can hide an unapproved spelling change');
    assert.match(result.message,/review|edit/i);
    const accepted = lab.createDrafts(result.name);
    assert.equal(accepted.needsConfirmation,false);
    assert.equal(accepted.drafts.length,3,'only resubmitting the chosen spelling permits generation');
    assert.equal(accepted.drafts[0].name,proposal);
  }
});

test('empty, unsupported, oversized and unavailable names fail without a guessed signature', () => {
  const lab = setup().SignatureLab;
  for (const name of ['', '  ', null, '王小明', '12345', 'A'.repeat(49)]) {
    const result = lab.createDrafts(name);
    assert.equal(result.drafts.length,0,String(name));
    assert.ok(result.message);
  }
  assert.equal(lab.createDrafts('A'.repeat(48)).drafts.length,3,'the supported maximum remains usable');
  assert.equal(setup(false).SignatureLab.createDrafts('Reuben Royal').drafts.length,0);
  const root = setup();
  delete root.ZanerGlyphs.glyphs.R;
  const missing = root.SignatureLab.createDrafts('Reuben Royal');
  assert.equal(missing.unsupported,true);
  assert.equal(missing.drafts.length,0);
  assert.match(missing.message,/source lettering could not load/i);
});

test('real source letters remain in bounds and the study teaches the same connected finish as the chosen preview', () => {
  const root = {};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../../app/src/main/assets/zaner-glyphs.js'),'utf8'),{window:root});
  vm.runInNewContext(source,{window:root});
  const lab = root.SignatureLab;
  const finishPath = svg => /<path\s+data-signature-finish="([^"]+)"\s+d="([^"]+)"/.exec(svg);
  const decode = text => text.replace(/&(amp|quot|apos|lt|gt);/g,(_,entity)=>({amp:'&',quot:'"',apos:"'",lt:'<',gt:'>'})[entity]);
  for (const name of ['Reuben Royal','Ellen Grace','Mary Holly']) {
    for (const draft of lab.createDrafts(name).drafts) {
      const svg = lab.render(draft.name,draft.options);
      const study = lab.finishStudy(draft.name,draft.options);
      assertGlyphBounds(svg,root);
      const finish = finishPath(svg), taught = finishPath(study);
      assert.ok(finish,draft.name+' has a measured ending for its connected finish');
      assert.ok(taught,'the study contains a finish');
      assert.equal(taught[2],finish[2],'practice shows the exact preview curve');
      assert.equal((finish[2].match(/M/g)||[]).length,1,'the finish has one start');
      assert.doesNotMatch(finish[2],/[LQAZ]/i,'the finish uses connected cubic segments');
      const metadata = JSON.parse(decode(/<metadata>([\s\S]*?)<\/metadata>/.exec(svg)[1]));
      assert.equal(metadata.finish.available,true);
      assert.equal(metadata.finish.continuous,true);
      if (metadata.finish.kind !== 'rising') {
        const coordinates = finish[2].match(/-?(?:\d*\.)?\d+(?:e[-+]?\d+)?/gi).map(Number);
        const points = Array.from({length:coordinates.length/2},(_,i)=>[coordinates[2*i],coordinates[2*i+1]]);
        const sourceBounds = metadata.finish.sourceBounds;
        const segments = (points.length-1)/3;
        assert.ok(segments>=3,'the outer turn and lower return have separate curves');
        for (let segment=1;segment<segments-1;segment++) {
          for (const [x] of points.slice(segment*3,segment*3+4)) assert.ok(x>=sourceBounds.right,'outer turn remains clear of the letters');
        }
        for (const [,y] of points.slice(-4)) assert.ok(y>sourceBounds.bottom,'the final return stays below all source descenders');
      }
      assert.equal(lab.render(draft.name,draft.options),svg,'the chosen finish is deterministic');
    }
  }
  const capitalOnly = lab.finishStudy('R',{slant:52,flourish:3,capitalScale:1.4});
  assert.equal(finishPath(capitalOnly),null,'a source capital without a measured exit does not gain an invented join');
  assert.match(capitalOnly,/NO CONNECTED FINISH/);
  assert.equal(finishPath(lab.finishStudy('Reuben Royal',{flourish:0})),null);
});
