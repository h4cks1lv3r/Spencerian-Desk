/* The Spencerian Desk: local, dependency-free practice surface. */
(function () {
  'use strict';
  const W = 960, H = 520, SLOPE = Math.tan(52 * Math.PI / 180), BASE = 342, XH = 120;
  const SLANT = XH / SLOPE;
  const targetSlant = value => Number(value && typeof value==='object' ? value.slant : value)===50 ? 50 : 52;
  const slopeFor = value => Math.tan(targetSlant(value) * Math.PI / 180);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const esc = v => String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const P = (x,y) => ({x,y});
  const line = (x1,y1,x2,y2) => [P(x1,y1),P(x2,y2)];
  function cubic(a,b,c,d,count=48) {
    const out=[];
    for(let i=0;i<=count;i++){const t=i/count,u=1-t;out.push(P(u*u*u*a.x+3*u*u*t*b.x+3*u*t*t*c.x+t*t*t*d.x,u*u*u*a.y+3*u*u*t*b.y+3*u*t*t*c.y+t*t*t*d.y));}
    return out;
  }
  const join = (...paths) => paths.reduce((a,p,i)=>a.concat(i?p.slice(1):p),[]);
  const C = (a,b,c,d) => cubic(P(...a),P(...b),P(...c),P(...d));
  const templates = {
    free:{label:'Free writing',note:'Practice letters, words, or your signature without a trace model. Use the source plates for letter forms and letter-specific proportions.',paths:[]},
    straight:{label:'Straight stroke',note:'Pull a light straight stroke down the main slant. Start with equal weight; learn nib shading on paper.',paths:[line(420+SLANT,BASE-XH,420,BASE)]},
    oval:{label:'Oval movement',note:'Follow one open oval rhythm. Keep the long axis close to the main slant and avoid pressing at the turn.',paths:[join(C([497,231],[454,182],[333,306],[387,339]),C([387,339],[435,365],[538,262],[497,231]))]},
    underturn:{label:'Underturn',note:'Descend lightly, soften the lower turn, then rise without a sharp corner. This is a movement study.',paths:[join(line(376+SLANT,222,388,326),C([388,326],[368,370],[433,329],[516,222]))]},
    overturn:{label:'Overturn',note:'Rise into a rounded turn, then descend on the 52° main slant. Keep the turn light.',paths:[join(C([348,342],[421,246],[484,191],[502,222]),line(502,222,502-SLANT,342))]},
    loop:{label:'Upper loop',note:'Travel up the loop, turn softly, then descend across the first line. Aim for open space and an even rhythm.',paths:[join(C([365,342],[414,264],[530,91],[545,106]),C([545,106],[575,125],[535,163],[510,194]),line(510,194,510-(342-194)/SLOPE,342))]},
    compound:{label:'Compound movement',note:'Link an overturn and an underturn. Watch spacing and continuity at their join. The second stroke is the exit.',paths:[join(C([315,342],[378,266],[443,186],[461,222]),line(461,222,383,322),C([383,322],[357,368],[417,332],[464,275])),C([464,275],[486,247],[505,238],[526,231])]},
    capital:{label:'Capital movement study',note:'Practice a capital stem, then its upper and lower curves in order. Compare letter-specific proportions with the source plates.',paths:[join(C([545,127],[520,106],[488,136],[476,164]),line(476,164,337,342)),C([529,137],[666,68],[613,227],[442,217]),C([442,217],[614,192],[515,388],[337,342])]},
    flourish:{label:'Balanced flourish',note:'Use broad oval movement and open counters. Add the second curve only after the first is controlled. More loops do not mean better writing.',paths:[join(C([282,323],[481,165],[746,104],[668,259]),C([668,259],[593,389],[379,368],[372,280]),C([372,280],[367,207],[556,273],[736,334])),C([465,278],[352,203],[192,193],[245,278])]},
  };
  function templateFor(type){return templates[type]||templates.straight;}
  function guideConfig(mode){return mode==='letters'?{base:318,xheight:72,upper:3,lower:2}:{base:BASE,xheight:XH,upper:2,lower:1};}
  function templatePaths(type,mode,slant=52){
    const config=guideConfig(mode),scale=config.xheight/XH,delta=1/slopeFor(slant)-1/SLOPE;
    // These source curves already use 52 degrees. Apply only the difference
    // in horizontal offset, anchored at the baseline, before uniform scaling.
    return templateFor(type).paths.map(path=>path.map(p=>P((p.x+(BASE-p.y)*delta-W/2)*scale+W/2,(p.y-BASE)*scale+config.base)));
  }
  function linesForMode(mode,slant=52){const c=guideConfig(mode);return guideLines(W,H,c.base,c.xheight,c.upper,c.lower,slant);}
  function pathD(points){return points.map((p,i)=>(i?'L':'M')+p.x.toFixed(2)+' '+p.y.toFixed(2)).join(' ');}
  function polyLength(points){let len=0;for(let i=1;i<points.length;i++)len+=Math.hypot(points[i].x-points[i-1].x,points[i].y-points[i-1].y);return len;}
  function partial(points,distance){const out=[points[0]];let left=distance;for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],len=Math.hypot(b.x-a.x,b.y-a.y);if(left>=len){out.push(b);left-=len;}else{const t=len?left/len:0;out.push(P(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t));break;}}return out;}
  function estimateAngle(strokes,slant=52){
    // Reject curved strokes, short marks, horizontal motion, and reversals.
    // This measures full, nearly straight descending strokes; it is not a penmanship grade.
    const measured=[];
    for(const stroke of strokes||[]){
      const raw=Array.isArray(stroke)?stroke:stroke.points;
      if(!raw||raw.length<2)continue;
      const pts=raw.map(p=>P(p.x*W,p.y*H));
      const a=pts[0],b=pts[pts.length-1],dx=b.x-a.x,dy=b.y-a.y,dist=Math.hypot(dx,dy),length=polyLength(pts);
      if(dist<38||dy<28||dx>=-7||!length||dist/length<0.955)continue;
      let maxDeviation=0,reversal=0;
      for(let i=0;i<pts.length;i++){const p=pts[i];maxDeviation=Math.max(maxDeviation,Math.abs(dy*p.x-dx*p.y+b.x*a.y-b.y*a.x)/dist);if(i&&p.y<pts[i-1].y-1.5)reversal++;}
      if(maxDeviation>Math.max(4,dist*.035)||reversal>pts.length*.12)continue;
      const angle=Math.atan2(dy,-dx)*180/Math.PI;
      if(angle<25||angle>85)continue;
      measured.push({angle,length:dist});
    }
    if(!measured.length)return {angle:null,samples:0,deviation:null};
    const total=measured.reduce((n,s)=>n+s.length,0);
    const angle=measured.reduce((n,s)=>n+s.angle*s.length,0)/total;
    return {angle:Math.round(angle*10)/10,samples:measured.length,deviation:Math.round((angle-targetSlant(slant))*10)/10 || 0};
  }
  function guideLines(width=W,height=H,base=BASE,xheight=XH,upper=2,lower=1,slant=52){
    const lines=[],slope=slopeFor(slant);
    for(let bottom=-height/slope;bottom<width+height/slope;bottom+=76){lines.push({x1:bottom,y1:height,x2:bottom+height/slope,y2:0,kind:'slant'});}
    [['ascender',base-upper*xheight],['xheight',base-xheight],['baseline',base],['descender',base+lower*xheight]].forEach(([kind,y])=>lines.push({x1:0,y1:y,x2:width,y2:y,kind}));
    return lines;
  }
  function templateSVG(type,opts={}){
    const t=templateFor(type),guides=opts.guides!==false,mode=opts.guideMode==='letters'?'letters':'movement',slant=targetSlant(opts.slant);
    const lines=guides?linesForMode(mode,slant).map(l=>`<line x1="${l.x1}" y1="${l.y1}" x2="${l.x2}" y2="${l.y2}" stroke="${l.kind==='baseline'?'#958260':'#d8d3c8'}" stroke-width="${l.kind==='baseline'?1.6:1}" ${l.kind==='slant'?'stroke-dasharray="4 7"':''}/>`).join(''):'';
    const paths=opts.showTemplate===false?'':templatePaths(type,mode,slant).map((p,i)=>`<path d="${pathD(p)}" fill="none" stroke="#8a6a34" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/><circle cx="${p[0].x}" cy="${p[0].y}" r="11" fill="#8a6a34"/><text x="${p[0].x}" y="${p[0].y+4}" font-family="sans-serif" font-size="12" text-anchor="middle" fill="white">${i+1}</text>`).join('');
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${Number(opts.width)||W}" height="${Number(opts.height)||H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(t.label)}: schematic movement study, main guides ${slant} degrees from horizontal"><rect width="960" height="520" fill="#fffdf8"/>${lines}${paths}</svg>`;
  }
  function sheetGeometry(mode='letters',slant=52){
    const letters=mode!=='movement',xheight=letters?3:8,upper=letters?3:2,lower=letters?2:1;
    const left=14,right=196,top=57,bottom=258,pitch=letters?20:32,rows=[];
    for(let base=top+upper*xheight;base+lower*xheight<=bottom;base+=pitch)rows.push({ascender:base-upper*xheight,xheight:base-xheight,baseline:base,descender:base+lower*xheight});
    const slope=slopeFor(slant),slants=[];for(let x=left-(bottom-top)/slope;x<right+20;x+=letters?8:14)slants.push({x1:x,y1:bottom,x2:x+(bottom-top)/slope,y2:top});
    return {left,right,top,bottom,xheight,upper,lower,rows,slants};
  }
  function printableSheet(mode='letters',options={}){
    // One SVG user unit is one millimetre: neither print scale nor slant relies on rounded pixel dimensions.
    const slant=targetSlant(options),g=sheetGeometry(mode,slant),letters=mode!=='movement';
    let rules=g.slants.map(l=>`<line x1="${l.x1}" y1="${l.y1}" x2="${l.x2}" y2="${l.y2}" stroke="#d9d3c9" stroke-width=".15"/>`).join('');
    g.rows.forEach(row=>Object.entries(row).forEach(([kind,y])=>{rules+=`<line x1="${g.left}" x2="${g.right}" y1="${y}" y2="${y}" stroke="${kind==='baseline'?'#938474':'#bdb3a4'}" stroke-width="${kind==='baseline'?.24:.15}" ${kind==='xheight'?'stroke-dasharray="1.3 1"':''}/>`;}));
    const desc=letters?'3 mm x-height · 6 mm above x-height · 6 mm below baseline':'8 mm x-height · 2 x-heights above baseline · 1 below';
    return `<svg xmlns="http://www.w3.org/2000/svg" width="210mm" height="297mm" viewBox="0 0 210 297"><defs><clipPath id="paper"><rect x="${g.left}" y="${g.top}" width="${g.right-g.left}" height="${g.bottom-g.top}"/></clipPath></defs><rect width="210" height="297" fill="white"/><g font-family="sans-serif" fill="#262b29"><text x="14" y="20" font-size="7" font-family="EB Garamond,Georgia,serif">The Spencerian Desk</text><text x="14" y="29" font-size="4.5">${slant}° main-slant ${letters?'letter':'movement'} practice sheet</text><text x="14" y="37" font-size="2.8">${desc}</text><text x="14" y="43" font-size="2.8">${letters?'3 above / 2 below baseline. ':''}Slant is measured from the horizontal. Print at 100%.</text><text x="14" y="49" font-size="2.8">Ascender — x-height (dashed) — baseline (dark) — descender</text><text x="14" y="269" font-size="2.8">Guide ratios organize practice; individual letter and capital proportions vary.</text><text x="14" y="275" font-size="2.8">Compare shapes with the source plates. Work lightly; rest the forearm.</text><text x="14" y="286" font-size="2.7">Print check: this bar must measure 30 mm.</text></g><path d="M156 282v4m0-2h30m0-2v4" stroke="#555" stroke-width=".3"/><g clip-path="url(#paper)">${rules}</g></svg>`;
  }
  function base64Text(text){const bytes=new TextEncoder().encode(text);let s='';for(let i=0;i<bytes.length;i++)s+=String.fromCharCode(bytes[i]);return btoa(s);}
  function download(filename,mime,data,callback){
    if(callback){callback({filename,mime,base64:data});return;}
    const a=document.createElement('a');a.href=`data:${mime};base64,${data}`;a.download=filename;a.style.display='none';document.body.appendChild(a);a.click();a.remove();
  }
  function installStyles(){
    if(document.getElementById('practice-lab-styles'))return;
    const style=document.createElement('style');style.id='practice-lab-styles';style.textContent=`
      .pl-root{--pl-accent:#8a6a34;--pl-emphasis:#253a33;--pl-muted:#686b63;--pl-line:#dedacf;color:#262b29;font-family:inherit;min-width:0}
      .pl-toolbar{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-bottom:14px}.pl-field{display:flex;flex-direction:column;gap:5px;flex:1;min-width:155px}.pl-label,.pl-eyebrow{font-size:10px;text-transform:uppercase;letter-spacing:.13em;color:var(--pl-muted);font-weight:700}
      .pl-select{font:inherit;font-size:13px;color:#262b29;background:#fffdf8;border:1px solid var(--pl-line);padding:12px;border-radius:7px;width:100%;min-height:44px;color-scheme:light}.pl-btn{border:1px solid var(--pl-line);background:#fffdf8;color:#262b29;border-radius:7px;min-height:42px;padding:10px 13px;font:inherit;font-size:12px;font-weight:600;cursor:pointer;transition:background .16s;white-space:nowrap}.pl-btn:hover{background:#f0ede5}.pl-btn:focus-visible,.pl-select:focus-visible,.pl-root input:focus-visible{outline:2px solid var(--pl-accent);outline-offset:3px}.pl-btn:disabled{opacity:.45;cursor:default}.pl-btn-primary{background:linear-gradient(120deg,#31463e,#253a33);color:#fffdf8;border-color:#253a33;box-shadow:0 4px 12px #253a3314}.pl-btn-primary:hover{background:#31463e}
      .pl-paper-wrap{position:relative;background:#fffdf8;border-radius:8px;overflow:hidden;border:1px solid #d7d1c4;box-shadow:0 10px 25px rgba(49,46,38,.07),0 2px 0 #f8f6f1,0 3px 0 #dedacf}.pl-paper-wrap:after{content:'';position:absolute;top:0;right:0;width:18px;height:18px;background:linear-gradient(45deg,#e1dacc 0%,#f1ece2 49%,#d7d1c4 50%,#f8f6f1 52%);border-bottom-left-radius:3px;box-shadow:-1px 1px 3px #262b2912;pointer-events:none}.pl-paper-heading{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:15px 30px 0 17px;color:#686b63;font-size:9px;font-weight:600;text-transform:uppercase;letter-spacing:.13em}.pl-paper-heading strong{color:#253a33;font-family:'EB Garamond',Georgia,serif;font-size:14px;font-weight:400;text-transform:none;letter-spacing:.01em}.pl-canvas{display:block;width:100%;aspect-ratio:24/13;touch-action:none;cursor:crosshair;user-select:none;-webkit-user-select:none}.pl-paper-footer{display:flex;justify-content:space-between;padding:0 17px 13px;color:#686b63;font-size:9px;letter-spacing:.03em}
      .pl-guide-key{display:flex;gap:13px;flex-wrap:wrap;color:var(--pl-muted);font-size:10px;margin:12px 0}.pl-guide-key span:before{content:'';display:inline-block;width:15px;border-top:1px solid #b4afa2;vertical-align:middle;margin-right:5px}.pl-guide-key span:nth-child(2):before{border-top-style:dashed}.pl-guide-key span:nth-child(3):before{border-top-width:2px;border-color:var(--pl-accent)}.pl-options{display:flex;flex-wrap:wrap;gap:14px;align-items:center;margin:16px 0}.pl-check{display:flex;align-items:center;gap:7px;font-size:12px;color:#454b45;cursor:pointer;min-height:28px}.pl-check input{accent-color:var(--pl-emphasis);width:16px;height:16px}.pl-range{accent-color:var(--pl-accent);width:95px}.pl-speed{font-size:11px;color:var(--pl-muted);display:flex;align-items:center;gap:7px}.pl-sheet-size{width:156px;min-height:42px;padding:9px 10px;font-size:11px}.pl-guide-description{color:var(--pl-muted);font-size:10px;line-height:1.55;margin:0 0 10px}.pl-actions{display:flex;flex-wrap:wrap;gap:8px;align-items:center}.pl-actions .pl-spacer{flex:1;min-width:0}
      .pl-metrics{display:grid;grid-template-columns:1fr 1fr 1fr;gap:9px;margin-top:17px}.pl-metric{background:#f8f6f1;border:1px solid var(--pl-line);border-radius:7px;padding:12px 13px}.pl-metric strong{display:block;font-family:'EB Garamond',Georgia,serif;font-size:21px;font-weight:400;color:var(--pl-emphasis);margin-bottom:5px}.pl-metric span{font-size:10px;color:var(--pl-muted)}.pl-note{font-size:12px;line-height:1.65;color:#454b45;margin:15px 0 0}.pl-note strong{color:#253a33;font-weight:600}.pl-method{font-size:10px;line-height:1.6;color:#686b63;margin:8px 0}.pl-pressure{display:inline-flex;align-items:center;gap:6px;border-radius:20px;background:#f1f3ed;border:1px solid #d7dfd1;color:#405047;font-size:10px;padding:7px 10px;margin-top:10px}.pl-pressure:before{content:'';width:5px;height:5px;border-radius:50%;background:var(--pl-accent)}.pl-status{font-size:11px;color:#405047;min-height:17px;margin-top:10px}.pl-opacity{display:flex;gap:7px;align-items:center;font-size:11px;color:var(--pl-muted)}
      @media(max-width:420px){.pl-btn{padding:10px 11px;font-size:11px}.pl-metrics{gap:6px}.pl-metric{padding:10px}.pl-metric strong{font-size:19px}.pl-paper-heading{font-size:8px;padding:13px 26px 0 12px}.pl-paper-heading strong{font-size:12px}.pl-paper-footer{padding:0 12px 10px;font-size:8px}.pl-options{gap:9px 13px}.pl-actions .pl-spacer{display:none}}
    `;document.head.appendChild(style);
  }
  function mount(container, options={}){
    if(typeof container==='string')container=document.querySelector(container);
    if(!container)throw new Error('PracticeLab.mount needs a container');
    installStyles();
    let type=templates[options.template]?options.template:'straight',strokes=[],current=null,activePointer=null,destroyed=false;
    let slant=targetSlant(options.slant);
    let guideMode=options.guideMode==='letters'||(!options.guideMode&&type==='free')?'letters':'movement';
    let startTime=0,elapsed=0,frame=0,anim=null,penMin=1,penMax=0,pressureVerified=false,lastInput='none';
    const root=document.createElement('section');root.className='pl-root';
    root.innerHTML=`<div class="pl-toolbar"><label class="pl-field"><span class="pl-label">Practice mode</span><select class="pl-select pl-template" aria-label="Choose movement study">${Object.entries(templates).map(([k,v])=>`<option value="${k}">${v.label}</option>`).join('')}</select></label><label class="pl-field"><span class="pl-label">Guides</span><select class="pl-select pl-guide-mode" aria-label="Guide proportions"><option value="movement">Movement · 2 above / 1 below</option><option value="letters">Letters · 3 above / 2 below</option></select></label><label class="pl-field"><span class="pl-label">Main slant</span><select class="pl-select pl-slant" aria-label="Main slant angle"><option value="52">52° · Classical Spencerian</option><option value="50">50° · Reference style</option></select></label><button class="pl-btn pl-play" type="button" aria-label="Animate the stroke order">▶ Play movement</button></div><div class="pl-paper-wrap"><div class="pl-paper-heading"><strong>Movement before mastery</strong><span class="pl-slant-label">${slant}° from horizontal</span></div><canvas class="pl-canvas" aria-label="Drawing area with ${slant} degree guides. Use a pen, mouse, or touch to draw." role="img"></canvas><div class="pl-paper-footer"><span class="pl-model-label">Schematic stroke study · numbered starts</span><span>THE SPENCERIAN DESK</span></div></div><div class="pl-guide-key"><span>Ascender</span><span>x-height</span><span>Baseline</span><span>Descender</span></div><p class="pl-guide-description"></p><div class="pl-options"><label class="pl-check"><input class="pl-trace" type="checkbox" checked>Trace guide</label><label class="pl-opacity">Opacity<input class="pl-range pl-alpha" type="range" min="0.1" max="0.7" step="0.05" value="0.3" aria-label="Trace opacity"></label><label class="pl-check"><input class="pl-stylus" type="checkbox">Pen only</label><label class="pl-speed">Speed<input class="pl-range pl-speed-input" type="range" min="0.5" max="2" step="0.25" value="1" aria-label="Movement animation speed"><span class="pl-speed-value">1×</span></label></div><div class="pl-actions"><button class="pl-btn pl-undo" type="button" disabled>↶ Undo</button><button class="pl-btn pl-clear" type="button" disabled>Clear</button><span class="pl-spacer"></span><select class="pl-select pl-sheet-size" aria-label="Printable sheet size"><option value="letters">Print: 3 mm letters</option><option value="movement">Print: 8 mm movement</option></select><button class="pl-btn pl-sheet" type="button">Print sheet</button><button class="pl-btn pl-export" type="button">Export PNG</button><button class="pl-btn pl-btn-primary pl-save" type="button" disabled>Save practice</button></div><div class="pl-metrics" aria-live="polite"><div class="pl-metric"><strong class="pl-angle">—</strong><span>Approx. downstroke angle</span></div><div class="pl-metric"><strong class="pl-count">0</strong><span>Strokes drawn</span></div><div class="pl-metric"><strong class="pl-target-angle">${slant}°</strong><span>Main-slant reference</span></div></div><div class="pl-pressure">Draw with pen, touch, or mouse</div><p class="pl-note"></p><p class="pl-method">Angle feedback uses only long, nearly straight, descending strokes. Curves and small marks are excluded. It is approximate geometry, not AI feedback or a skill grade.</p><p class="pl-method">A screen can train stroke order and slant. Transfer each drill to paper for grip, forearm movement, spacing, and nib control. Digital pressure does not reproduce a flexible nib.</p><div class="pl-status" role="status" aria-live="polite"></div>`;
    container.appendChild(root);
    const $=s=>root.querySelector(s),canvas=$('.pl-canvas'),ctx=canvas.getContext('2d'),select=$('.pl-template');select.value=type;$('.pl-guide-mode').value=guideMode;$('.pl-slant').value=String(slant);
    const listeners=[];
    function on(el,event,fn,opts){el.addEventListener(event,fn,opts);listeners.push(()=>el.removeEventListener(event,fn,opts));}
    function status(message){$('.pl-status').textContent=message;}
    function linePath(context,points){if(!points.length)return;context.beginPath();context.moveTo(points[0].x,points[0].y);for(let i=1;i<points.length;i++)context.lineTo(points[i].x,points[i].y);context.stroke();}
    function drawPaper(context){
      context.fillStyle='#fffdf8';context.fillRect(0,0,W,H);
      for(const l of linesForMode(guideMode,slant)){context.beginPath();context.setLineDash(l.kind==='slant'?[4,8]:l.kind==='xheight'?[7,6]:[]);context.strokeStyle=l.kind==='baseline'?'#a18c66':l.kind==='slant'?'#e2dfd5':'#cbc5b8';context.lineWidth=l.kind==='baseline'?1.6:1;context.moveTo(l.x1,l.y1);context.lineTo(l.x2,l.y2);context.stroke();}
      context.setLineDash([]);context.font='12px sans-serif';context.fillStyle='#6e7066';
      linesForMode(guideMode,slant).filter(l=>l.kind!=='slant').map(l=>[l.kind==='xheight'?'x-height':l.kind,l.y1]).forEach(([text,y])=>{context.fillStyle='#fffdf8';context.fillRect(7,y-17,73,15);context.fillStyle='#6e7066';context.fillText(text,13,y-5);});
      context.strokeStyle='#8a6a34';context.lineWidth=1.5;context.beginPath();context.moveTo(817,482);context.lineTo(884,482);context.moveTo(817,482);context.lineTo(817+54/slopeFor(slant),428);context.stroke();context.beginPath();context.arc(817,482,29,-slant*Math.PI/180,0);context.stroke();context.font='13px sans-serif';context.fillText(`${slant}°`,859,465);
    }
    function drawTemplates(context,now){
      const paths=templatePaths(type,guideMode,slant),trace=$('.pl-trace').checked;
      context.save();context.lineWidth=3.2;context.lineCap='round';context.lineJoin='round';context.strokeStyle='#8a6a34';
      if(trace){context.globalAlpha=Number($('.pl-alpha').value);paths.forEach(p=>linePath(context,p));context.globalAlpha=1;paths.forEach((p,i)=>{context.fillStyle='#8a6a34';context.beginPath();context.arc(p[0].x,p[0].y,11,0,Math.PI*2);context.fill();context.fillStyle='#fffdf8';context.font='bold 12px sans-serif';context.textAlign='center';context.fillText(String(i+1),p[0].x,p[0].y+4);});}
      if(anim){const progress=clamp((now-anim.started)/anim.duration,0,1);let budget=progress*anim.total;context.globalAlpha=1;context.strokeStyle='#8a6a34';context.lineWidth=4;let tip=null;for(let i=0;i<paths.length;i++){const len=anim.lengths[i];if(budget<=0)break;const path=budget>=len?paths[i]:partial(paths[i],budget);linePath(context,path);tip=path[path.length-1];budget-=len;}if(tip){context.fillStyle='#253a33';context.beginPath();context.arc(tip.x,tip.y,6,0,Math.PI*2);context.fill();}if(progress>=1){anim=null;$('.pl-play').textContent='▶ Play movement';}}
      context.restore();
    }
    function drawInk(context,list){
      context.save();context.lineCap='round';context.lineJoin='round';context.strokeStyle='#262b29';context.fillStyle='#262b29';
      for(const stroke of list){const pts=stroke.points;if(!pts.length)continue;const nativePressure=stroke.pointerType==='pen'&&stroke.pressureVerified;
        if(pts.length===1){context.beginPath();context.arc(pts[0].x*W,pts[0].y*H,1.4,0,Math.PI*2);context.fill();continue;}
        for(let i=1;i<pts.length;i++){const a=pts[i-1],b=pts[i];context.lineWidth=nativePressure?1.35+clamp(((a.p||.15)+(b.p||.15))/2,0,1)*5:2.7;context.beginPath();context.moveTo(a.x*W,a.y*H);context.lineTo(b.x*W,b.y*H);context.stroke();}
      }context.restore();
    }
    function render(now=performance.now()){
      if(destroyed)return;frame=0;ctx.setTransform(canvas.width/W,0,0,canvas.height/H,0,0);ctx.clearRect(0,0,W,H);drawPaper(ctx);drawTemplates(ctx,now);drawInk(ctx,current?strokes.concat(current):strokes);if(anim)frame=requestAnimationFrame(render);
    }
    function schedule(){if(!frame&&!destroyed)frame=requestAnimationFrame(render);}
    function resize(){if(destroyed)return;const rect=canvas.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,3);canvas.width=Math.max(1,Math.round(rect.width*dpr));canvas.height=Math.max(1,Math.round(rect.width*H/W*dpr));schedule();}
    function duration(){return elapsed+(startTime?(performance.now()-startTime)/1000:0);}
    function getStats(){const angle=estimateAngle(strokes,slant);return {...angle,strokeCount:strokes.length,duration:Math.round(duration()),pressureVerified,input:lastInput,targetAngle:slant,template:type,guideMode,slant,method:'Approximate geometry of long, nearly straight descending strokes. Not an AI assessment or grade.'};}
    function update(){const s=getStats();$('.pl-angle').textContent=s.angle===null?'—':`${s.angle.toFixed(1)}°`;$('.pl-count').textContent=String(strokes.length);$('.pl-undo').disabled=!strokes.length;$('.pl-clear').disabled=!strokes.length;$('.pl-save').disabled=!strokes.length;$('.pl-play').disabled=type==='free';$('.pl-trace').disabled=type==='free';$('.pl-alpha').disabled=type==='free';$('.pl-speed-input').disabled=type==='free';$('.pl-model-label').textContent=type==='free'?'Free writing · no trace model':'Schematic stroke study · numbered starts';$('.pl-guide-description').textContent=guideMode==='letters'?'Letter guides: 3 x-heights above baseline, 2 below. Individual letter heights vary; compare the source plates. Screen size is not physical paper size.':'Large movement guides: 2 x-heights above baseline, 1 below. These schematic drills teach movement, not a fixed proportion for every letter.';$('.pl-note').innerHTML=`<strong>${esc(templateFor(type).label)}.</strong> ${esc(templateFor(type).note.replace(/52°/g,`${slant}°`))}`;if(options.onChange)options.onChange(s);}
    function pointerPoint(event){const rect=canvas.getBoundingClientRect();return {x:clamp((event.clientX-rect.left)/rect.width,0,1),y:clamp((event.clientY-rect.top)/rect.height,0,1),p:event.pointerType==='pen'?clamp(Number(event.pressure)||0,0,1):null,t:Math.round(performance.now())};}
    function pressure(event){lastInput=event.pointerType||'mouse';if(event.pointerType==='pen'&&event.pressure>0){penMin=Math.min(penMin,event.pressure);penMax=Math.max(penMax,event.pressure);if(penMax-penMin>.035){pressureVerified=true;if(current)current.pressureVerified=true;}}$('.pl-pressure').textContent=event.pointerType==='pen'?(pressureVerified?'Pen input · variable native pressure detected':'Pen input · pressure variation not yet detected'):event.pointerType==='touch'?'Touch input · fixed ink width':'Mouse input · fixed ink width';}
    function pointerDown(event){if(activePointer!==null)return;if($('.pl-stylus').checked&&event.pointerType!=='pen'){status('Pen only is on. Turn it off to draw with touch or a mouse.');return;}if(event.button!==0&&event.pointerType==='mouse')return;event.preventDefault();activePointer=event.pointerId;canvas.setPointerCapture(event.pointerId);anim=null;$('.pl-play').textContent='▶ Play movement';if(!startTime)startTime=performance.now();current={pointerType:event.pointerType||'mouse',pressureVerified,points:[pointerPoint(event)]};pressure(event);status('');schedule();}
    function pointerMove(event){if(activePointer!==event.pointerId||!current)return;event.preventDefault();const events=typeof event.getCoalescedEvents==='function'?event.getCoalescedEvents():[];for(const sample of events.length?events:[event]){pressure(sample);const p=pointerPoint(sample),last=current.points[current.points.length-1];if(Math.hypot((p.x-last.x)*W,(p.y-last.y)*H)>.35)current.points.push(p);}schedule();}
    function finishPointer(event,cancelled=false){if(activePointer!==event.pointerId)return;if(current){if(!cancelled){const p=pointerPoint(event),last=current.points[current.points.length-1];if(Math.hypot((p.x-last.x)*W,(p.y-last.y)*H)>.35)current.points.push(p);strokes.push(current);}current=null;}try{canvas.releasePointerCapture(activePointer);}catch(e){}activePointer=null;update();schedule();if(cancelled)status('Interrupted stroke discarded.');}
    function clear(){if(current)return;strokes=[];elapsed=0;startTime=0;update();schedule();status('Practice cleared.');}
    function undo(){if(current)return;strokes.pop();update();schedule();status('Last stroke removed.');}
    function setTemplate(next){if(!templates[next])next='straight';type=next;select.value=type;anim=null;$('.pl-play').textContent='▶ Play movement';update();schedule();}
    function setGuideMode(mode){guideMode=mode==='letters'?'letters':'movement';$('.pl-guide-mode').value=guideMode;$('.pl-slant').value=String(slant);anim=null;$('.pl-play').textContent='▶ Play movement';update();schedule();}
    function setSlant(value){slant=targetSlant(value);$('.pl-slant').value=String(slant);$('.pl-slant-label').textContent=`${slant}° from horizontal`;$('.pl-target-angle').textContent=`${slant}°`;canvas.setAttribute('aria-label',`Drawing area with ${slant} degree guides. Use a pen, mouse, or touch to draw.`);anim=null;$('.pl-play').textContent='▶ Play movement';update();schedule();}
    function getImage(){const output=document.createElement('canvas');output.width=W*2;output.height=H*2;const c=output.getContext('2d');c.scale(2,2);drawPaper(c);drawInk(c,strokes);return output.toDataURL('image/png');}
    function exportSheet(){const mode=$('.pl-sheet-size').value,svg=printableSheet(mode,{slant});download(`spencerian-${slant}-degree-${mode==='letters'?'3mm-letters':'8mm-movement'}.svg`,'image/svg+xml',base64Text(svg),options.onExport);status('Print sheet exported. Print at 100% and check the 30 mm reference bar.');return svg;}
    function loadDrawing(data){
      if(current)return;
      const input=Array.isArray(data)?data:data&&data.strokes;
      if(!Array.isArray(input)){status('This practice file has no strokes.');return;}
      strokes=input.slice(0,2000).filter(s=>s&&typeof s==='object').map(s=>({pointerType:['pen','touch','mouse'].includes(s.pointerType)?s.pointerType:'mouse',pressureVerified:s.pressureVerified===true,points:(Array.isArray(s)?s:Array.isArray(s.points)?s.points:[]).slice(0,12000).filter(p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y)).map(p=>({x:clamp(p.x,0,1),y:clamp(p.y,0,1),p:Number.isFinite(p.p)?clamp(p.p,0,1):null,t:Number(p.t)||0}))})).filter(s=>s.points.length);
      pressureVerified=strokes.some(s=>s.pressureVerified);startTime=0;elapsed=clamp(Number(data&&data.duration)||0,0,86400);if(data&&templates[data.template])setTemplate(data.template);if(data&&data.guideMode)setGuideMode(data.guideMode);if(data&&!Array.isArray(data))setSlant(data.slant ?? (data.metrics&&data.metrics.targetAngle) ?? 52);update();schedule();status('Saved practice loaded.');
    }
    function animate(){if(type==='free')return;if(anim){anim=null;$('.pl-play').textContent='▶ Play movement';schedule();return;}const paths=templatePaths(type,guideMode,slant),lengths=paths.map(polyLength),total=lengths.reduce((a,b)=>a+b,0);anim={started:performance.now(),duration:(3300+paths.length*500)/Number($('.pl-speed-input').value),lengths,total};$('.pl-play').textContent='Ⅱ Stop movement';schedule();}
    on(canvas,'pointerdown',pointerDown);on(canvas,'pointermove',pointerMove);on(canvas,'pointerup',e=>finishPointer(e));on(canvas,'pointercancel',e=>finishPointer(e,true));on(canvas,'lostpointercapture',e=>{if(activePointer===e.pointerId)finishPointer(e,true);});
    on(select,'change',()=>setTemplate(select.value));on($('.pl-slant'),'change',()=>{setSlant($('.pl-slant').value);status(`${slant}° guides selected. Existing ink is unchanged.`);});on($('.pl-guide-mode'),'change',()=>setGuideMode($('.pl-guide-mode').value));on($('.pl-play'),'click',animate);on($('.pl-undo'),'click',undo);on($('.pl-clear'),'click',clear);on($('.pl-trace'),'change',schedule);on($('.pl-alpha'),'input',schedule);on($('.pl-speed-input'),'input',()=>{$('.pl-speed-value').textContent=$('.pl-speed-input').value+'×';if(anim){anim=null;animate();}});on($('.pl-stylus'),'change',()=>status($('.pl-stylus').checked?'Only pen input draws. Touch can still scroll outside the paper.':'Pen, touch, and mouse input enabled.'));
    on($('.pl-sheet'),'click',exportSheet);on($('.pl-export'),'click',()=>{download('spencerian-practice.png','image/png',getImage().split(',')[1],options.onExport);status('Practice image exported.');});
    on($('.pl-save'),'click',async()=>{const payload={image:getImage(),strokes:JSON.parse(JSON.stringify(strokes)),metrics:getStats(),duration:Math.round(duration()),template:type,guideMode,slant};try{if(options.onSave){await options.onSave(payload);status('Practice saved.');}else{download('spencerian-practice.png','image/png',payload.image.split(',')[1],options.onExport);status('Practice image exported.');}}catch(e){status('Practice could not be saved. Please try again.');}});
    const resizeObserver=typeof ResizeObserver!=='undefined'?new ResizeObserver(resize):null;if(resizeObserver)resizeObserver.observe(canvas);else on(window,'resize',resize);
    on(document,'visibilitychange',()=>{if(document.hidden&&startTime){elapsed+=(performance.now()-startTime)/1000;startTime=0;}});
    resize();update();
    return {destroy(){destroyed=true;if(frame)cancelAnimationFrame(frame);if(resizeObserver)resizeObserver.disconnect();listeners.forEach(off=>off());root.remove();},clear,undo,setTemplate,setGuideMode,setSlant,getImage,getStats,exportSheet,loadDrawing};
  }
  window.PracticeGeometry={estimateAngle,guideLines,guideConfig,linesForMode,templatePaths,sheetGeometry,printableSheet,slantOffset:(height,slant=52)=>height/slopeFor(slant),polyLength,partial};
  window.PracticeLab={mount,templateSVG};
})();
