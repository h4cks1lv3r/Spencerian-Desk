'use strict';

// Render the app's actual vector output. Requires @resvg/resvg-js.
// RESVG_MODULE may point to an installed copy outside this project.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {Resvg} = require(process.env.RESVG_MODULE || '@resvg/resvg-js');
const project = path.resolve(__dirname, '..');
const assets = path.join(project, 'app/src/main/assets');
const output = path.join(project, 'output');
const root = {};
for (const name of ['zaner-glyphs.js', 'signature.js']) {
  vm.runInNewContext(fs.readFileSync(path.join(assets, name), 'utf8'), {window: root});
}
fs.mkdirSync(output, {recursive: true});
const xml = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&apos;'}[c]));
const font = {fontFiles: [path.join(assets, 'fonts/EBGaramond.ttf')], loadSystemFonts: true};
function write(name, svg) {
  fs.writeFileSync(path.join(output, name + '.svg'), svg);
  fs.writeFileSync(path.join(output, name + '.png'), new Resvg(svg, {font}).render().asPng());
}
function inset(svg, x, y, width, height) {
  return svg.replace('<svg ', `<svg x="${x}" y="${y}" `).replace(/width="900" height="[\d.]+"/, `width="${width}" height="${height}"`);
}
const example = process.argv[2] || 'Reuben Royal';
const result = root.SignatureLab.createDrafts(example);
if (result.drafts.length !== 3) throw new Error(result.message);
const descriptions = ['A prominent initial. A light upward finish.', 'An open return balances the full name.', 'An optional initial and a sweeping return.'];
const cards = result.drafts.map((draft, index) => {
  const y = 146 + index * 412;
  const svg = root.SignatureLab.render(draft.name, {...draft.options, background:'#ffffff'});
  write('Signature-' + draft.id, svg);
  return `<rect x="36" y="${y}" width="1088" height="394" rx="7" fill="#ffffff" stroke="#dfd5c4"/><text x="62" y="${y+42}" font-size="28" fill="#203f34">${index+1}. ${xml(draft.title)}</text><text x="62" y="${y+69}" font-size="17" fill="#767367">${descriptions[index]}</text>${inset(svg, 55, y+80, 1048, 300)}`;
}).join('');
const board = `<svg xmlns="http://www.w3.org/2000/svg" width="1160" height="1460" viewBox="0 0 1160 1460"><rect width="1160" height="1460" fill="#faf9f5"/><rect x="17" y="17" width="1126" height="1426" fill="#fff" stroke="#c6b58f"/><path d="M1094 17L1143 66H1094Z" fill="#f2efe8" stroke="#dbd3c2"/><g font-family="EB Garamond,Georgia,serif"><text x="50" y="77" fill="#203f34" font-size="43">Signature Lab</text><text x="51" y="112" fill="#6d6b60" font-size="21">The Spencerian Desk · Example name: ${xml(example)}</text>${cards}<text x="52" y="1412" font-size="18" fill="#6d6b60">Open capitals. Fine letters. One considered finish. Practise to find your natural pace.</text></g></svg>`;
write('Signature-Lab-Drafts', board);
if (root.SignatureLab.finishStudy) write('Signature-Finish-Study', root.SignatureLab.finishStudy(result.drafts[1].name, result.drafts[1].options));
// A separate QA sheet exercises descenders, multiple capitals, and different lengths.
const names = ['Clara Whitmore', 'Henry Gray', 'Emily Young', 'Hugh Fitz', 'Jane Briggs', 'Alexandra Sterling'];
const rows = names.map((name,index) => {
  const draft = root.SignatureLab.createDrafts(name).drafts[1];
  return `<text x="24" y="${index*260+27}" font-family="sans-serif" font-size="14" fill="#686b63">${xml(name)}</text>${inset(root.SignatureLab.render(name, draft.options), 0,index*260+34,900,220)}`;
}).join('');
write('Signature-Geometry-Review', `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1560"><rect width="900" height="1560" fill="white"/>${rows}</svg>`);
console.log(JSON.stringify({example, drafts: result.drafts.map(d=>({title:d.title,name:d.name,options:d.options})), output},null,2));
