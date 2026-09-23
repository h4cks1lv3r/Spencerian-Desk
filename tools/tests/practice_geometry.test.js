'use strict';
// Run from any directory: node --test tools/tests/practice_geometry.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const sandbox = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../../app/src/main/assets/practice.js'), 'utf8'), sandbox);
const geometry = sandbox.window.PracticeGeometry;
const lab = sandbox.window.PracticeLab;
const point = (x,y) => ({x:x/960,y:y/520});
const lineAngle = l => Math.atan2(l.y1-l.y2,l.x2-l.x1)*180/Math.PI;
const near = (actual, expected, epsilon=1e-9) => assert(Math.abs(actual-expected)<epsilon, `${actual} != ${expected}`);
const strokeAt = (angle, length=120) => ({points:[point(500,170),point(500-Math.cos(angle*Math.PI/180)*length,170+Math.sin(angle*Math.PI/180)*length)]});

test('both on-screen guide modes retain a true 52-degree slant from horizontal', () => {
  for (const mode of ['movement','letters']) {
    const slants = geometry.linesForMode(mode).filter(l=>l.kind==='slant');
    assert(slants.length>10);
    slants.forEach(l=>near(lineAngle(l),52));
  }
});

test('letter guide has 3 x-heights above baseline and 2 below', () => {
  const guides = Object.fromEntries(geometry.linesForMode('letters').filter(l=>l.kind!=='slant').map(l=>[l.kind,l.y1]));
  const xheight=guides.baseline-guides.xheight;
  assert(xheight>0);
  near((guides.baseline-guides.ascender)/xheight,3);
  near((guides.descender-guides.baseline)/xheight,2);
});

test('large movement guide retains its separate 2-above/1-below scale', () => {
  const g=geometry.guideConfig('movement');
  assert.equal(g.xheight,120);
  assert.equal(g.upper,2);
  assert.equal(g.lower,1);
});

test('letter print sheet uses exactly 3 mm x-height with 6 mm above and below', () => {
  const g=geometry.sheetGeometry('letters');
  assert(g.rows.length>=9);
  for(const row of g.rows){
    near(row.baseline-row.xheight,3);
    near(row.xheight-row.ascender,6);
    near(row.descender-row.baseline,6);
    assert(row.ascender>=g.top);
    assert(row.descender<=g.bottom);
  }
  g.slants.forEach(l=>near(lineAngle(l),52));
});

test('large movement print sheet is 8 mm and has no anisotropic scaling', () => {
  const g=geometry.sheetGeometry('movement');
  for(const row of g.rows){near(row.baseline-row.xheight,8);near(row.baseline-row.ascender,16);near(row.descender-row.baseline,8);}
  for(const mode of ['letters','movement']){
    const svg=geometry.printableSheet(mode);
    assert.match(svg,/width="210mm" height="297mm" viewBox="0 0 210 297"/);
    assert.match(svg,/30 mm/);
    assert.match(svg,/Print at 100%/);
  }
});

test('free-writing templates contain no trace path or numbered starts', () => {
  for(const guideMode of ['letters','movement']){
    assert.equal(geometry.templatePaths('free',guideMode).length,0);
    const svg=lab.templateSVG('free',{guideMode});
    assert.match(svg,/Free writing/);
    assert.doesNotMatch(svg,/<path\b|<circle\b/);
  }
});

test('rescaling the straight-stroke model preserves the 52-degree movement', () => {
  for(const mode of ['movement','letters']){
    const pts=geometry.templatePaths('straight',mode)[0];
    const estimate=geometry.estimateAngle([{points:pts.map(p=>point(p.x,p.y))}]);
    assert.equal(estimate.angle,52);
    assert.equal(estimate.samples,1);
    assert.equal(estimate.deviation,0);
  }
});

test('angle feedback identifies a meaningful slant difference', () => {
  const estimate=geometry.estimateAngle([strokeAt(62)]);
  assert.equal(estimate.angle,62);
  assert.equal(estimate.deviation,10);
  assert.equal(estimate.samples,1);
});

test('upstrokes and short marks are not counted as measured downstrokes', () => {
  const reversed={points:[...strokeAt(52).points].reverse()};
  assert.equal(geometry.estimateAngle([reversed,strokeAt(52,15)]).samples,0);
  assert.equal(geometry.estimateAngle([]).angle,null);
});

test('curves and direction reversals do not create misleading angle feedback', () => {
  const curve={points:[point(500,200),point(560,260),point(400,340)]};
  const reversal={points:[point(500,200),point(430,290),point(510,190),point(410,330)]};
  const result=geometry.estimateAngle([curve,reversal]);
  assert.equal(result.samples,0);
  assert.equal(result.angle,null);
});

test('animation follows traveled distance rather than point count', () => {
  const pts=[{x:0,y:0},{x:3,y:4},{x:9,y:4}];
  near(geometry.polyLength(pts),11);
  const mid=geometry.partial(pts,8);
  near(mid.at(-1).x,6);
  near(mid.at(-1).y,4);
});

test('all eight movement studies remain nonempty and render valid SVG wrappers', () => {
  for(const type of ['straight','oval','underturn','overturn','loop','compound','capital','flourish']){
    assert(geometry.templatePaths(type,'movement').length>0);
    const svg=lab.templateSVG(type);
    assert.match(svg,/^<svg /);
    assert.match(svg,/<path /);
    assert.match(svg,/schematic movement study/);
  }
});

test('50-degree reference guides are consistent in both on-screen modes', () => {
  for (const mode of ['movement','letters']) {
    const slants=geometry.linesForMode(mode,50).filter(l=>l.kind==='slant');
    assert(slants.length>10);
    slants.forEach(l=>near(lineAngle(l),50));
    const svg=lab.templateSVG('straight',{guideMode:mode,slant:50});
    assert.match(svg,/main guides 50 degrees from horizontal/);
    assert.doesNotMatch(svg,/52 degrees/);
  }
  geometry.guideLines(960,520,342,120,2,1,50).filter(l=>l.kind==='slant').forEach(l=>near(lineAngle(l),50));
  near(geometry.slantOffset(120,50),120/Math.tan(50*Math.PI/180));
});

test('reference template transformation uses only the difference from the native 52-degree curves', () => {
  const delta=1/Math.tan(50*Math.PI/180)-1/Math.tan(52*Math.PI/180);
  for(const mode of ['movement','letters']) {
    const baseline=geometry.guideConfig(mode).base;
    for(const type of ['straight','oval','underturn','overturn','loop','compound','capital','flourish']) {
      const native=geometry.templatePaths(type,mode);
      const reference=geometry.templatePaths(type,mode,50);
      native.forEach((path,i)=>path.forEach((point,j)=>{
        near(reference[i][j].y,point.y);
        near(reference[i][j].x,point.x+(baseline-point.y)*delta);
      }));
    }
    const points=geometry.templatePaths('straight',mode,50)[0].map(p=>point(p.x,p.y));
    const measured=geometry.estimateAngle([{points}],50);
    assert.equal(measured.angle,50);
    assert.equal(measured.deviation,0);
  }
});

test('angle feedback uses the selected target and retains the original default', () => {
  assert.equal(geometry.estimateAngle([strokeAt(52)],50).deviation,2);
  assert.equal(geometry.estimateAngle([strokeAt(50)],50).deviation,0);
  assert.equal(geometry.estimateAngle([strokeAt(50)]).deviation,-2);
  assert.equal(geometry.estimateAngle([strokeAt(50)],{slant:50}).deviation,0);
});

test('print labels and the actual SVG guide coordinates agree for both target angles', () => {
  for(const mode of ['letters','movement']) {
    for(const slant of [50,52]) {
      const g=geometry.sheetGeometry(mode,slant);
      g.slants.forEach(l=>near(lineAngle(l),slant));
      const svg=geometry.printableSheet(mode,{slant});
      assert.match(svg,new RegExp(`${slant}° main-slant`));
      const printed=[...svg.matchAll(/<line x1="([^"]+)" y1="([^"]+)" x2="([^"]+)" y2="([^"]+)" stroke="#d9d3c9"/g)];
      assert.equal(printed.length,g.slants.length);
      printed.forEach(([,x1,y1,x2,y2])=>near(lineAngle({x1:+x1,y1:+y1,x2:+x2,y2:+y2}),slant));
      assert.match(svg,/width="210mm" height="297mm" viewBox="0 0 210 297"/);
    }
  }
});

test('unsupported slants fall back to 52 degrees without changing legacy geometry', () => {
  for(const invalid of [undefined,null,0,60,NaN,'not an angle']) {
    near(geometry.slantOffset(120,invalid),geometry.slantOffset(120));
    geometry.linesForMode('movement',invalid).filter(l=>l.kind==='slant').forEach(l=>near(lineAngle(l),52));
    assert.match(geometry.printableSheet('letters',{slant:invalid}),/52° main-slant/);
  }
});
