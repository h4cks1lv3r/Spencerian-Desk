/* The Spencerian Desk · source-based ornamental signature compositions.
 * Offline source glyph pack; no system-font dependency or network requests.
 * Composed concepts are not exact photograph copies or verified pen-written signatures.
 */
(function (root) {
  'use strict';

  // Digits and punctuation only. Alphabet shapes come from the reviewed source atlas.
  var AUXILIARY_GLYPHS = {
    '0': {w: 27, d: 'M17 -37 C1 -41 -1 -7 8 -2 C23 7 31 -35 17 -37 M20 -3 C22 -1 25 0 27 0'},
    '1': {w: 21, d: 'M2 -27 C7 -29 12 -34 14 -38 L10 -2 M2 0 C8 -2 14 -1 21 0'},
    '2': {w: 28, d: 'M1 -26 C0 -39 20 -43 23 -31 C26 -20 5 -9 2 0 C9 -7 18 5 28 -2'},
    '3': {w: 26, d: 'M1 -29 C4 -42 24 -39 21 -29 C19 -21 11 -18 9 -20 C8 -23 22 -25 23 -14 C26 3 2 7 1 -4'},
    '4': {w: 28, d: 'M19 -38 L1 -11 L26 -11 M20 -37 L15 0'},
    '5': {w: 27, d: 'M27 -38 L8 -38 L5 -20 C15 -28 27 -21 23 -9 C18 5 2 5 2 -4'},
    '6': {w: 27, d: 'M25 -36 C15 -44 3 -21 4 -10 C6 7 23 0 23 -11 C24 -23 11 -24 5 -11'},
    '7': {w: 28, d: 'M1 -30 L3 -38 C10 -34 18 -34 28 -38 C15 -23 11 -10 8 0'},
    '8': {w: 27, d: 'M17 -21 C-2 -32 16 -47 23 -35 C30 -23 0 -20 3 -7 C6 6 25 1 25 -9 C25 -15 20 -19 17 -21'},
    '9': {w: 27, d: 'M23 -26 C27 -42 8 -43 5 -28 C1 -11 20 -13 23 -26 C24 -14 14 -1 6 0'},
    '-': {w: 24, d: 'M4 -14 L21 -14'},
    "'": {w: 10, d: 'M7 -36 C9 -33 7 -29 4 -27'},
    '.': {w: 10, d: 'M4 -1 L4.1 -1.1', dots: 'M4 -1 L4.1 -1.1'}
  };

  var PRESETS = [
    {id: 'everyday', title: 'Rising finish', description: 'A strong first capital and one light, upward finish. Test the movement by hand.', options: {slant: 52, spacing: 0.94, flourish: 1, capitalScale: 1.25, seed: 10}},
    {id: 'classic', title: 'Open oval', description: 'An open first capital and one returning curve below the name.', options: {slant: 52, spacing: 1.02, flourish: 2, capitalScale: 1.3, seed: 24}},
    {id: 'bold', title: 'Long oval', description: 'A dominant first capital balanced by an extended, open return.', options: {slant: 52, spacing: 0.96, flourish: 3, capitalScale: 1.4, seed: 47}},
    {id: 'quiet', title: 'Unadorned', description: 'Keep the source capitals and omit the added finish. Compare its feel when writing.', options: {slant: 52, spacing: 1.02, flourish: 0, capitalScale: 1.15, seed: 61}}
  ];

  function escapeXML(value) { return String(value).replace(/[&<>"']/g, function (c) { return {'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&apos;'}[c]; }); }
  function clamp(value, low, high, fallback) { var n = Number(value); return isFinite(n) ? Math.max(low, Math.min(high, n)) : fallback; }
  function round(n) { return Math.round(n * 1000000) / 1000000; }
  function hash(value) { var h = 2166136261, s = String(value); for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function random(seed) { return function () { seed += 0x6D2B79F5; var t = seed; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function safeColor(value, fallback) { return typeof value === 'string' && (/^#[0-9a-f]{3,8}$/i.test(value) || /^(transparent|none|black|white)$/i.test(value)) ? value : fallback; }
  function cleanName(value) {
    var original = String(value == null ? '' : value).replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 160).trim();
    var normalized = original.normalize ? original.normalize('NFD').replace(/[\u0300-\u036f]/g, '') : original;
    normalized = normalized.replace(/ß/g, 'ss').replace(/[æÆ]/g, function (c) { return c === 'æ' ? 'ae' : 'Ae'; }).replace(/[øØ]/g, function(c) { return c === 'ø' ? 'o' : 'O'; }).replace(/[łŁ]/g, function(c) { return c === 'ł' ? 'l' : 'L'; }).replace(/[’‘]/g, "'").replace(/[–—]/g, '-');
    var supported = normalized.replace(/[^A-Za-z0-9 .'\-]/g, ' ').replace(/\s+/g, ' ').trim();
    return {original: original, display: supported, changed: supported !== original};
  }
  function createDrafts(name) {
    var original = String(name == null ? '' : name).trim().replace(/\s+/g, ' ');
    var result = {name: original, changed: false, needsConfirmation: false, unsupported: false, message: '', drafts: []};
    if (!original) { result.message = 'Enter the name you want to sign. You can also add a current signature and review its name first.'; return result; }
    if (original.length > 48) { result.unsupported = true; result.message = 'Use up to 48 characters. Choose a shorter signing name yourself.'; return result; }
    var cleaned = cleanName(original);
    result.name = cleaned.display;
    result.changed = cleaned.display !== original;
    if (!/[A-Za-z]/.test(cleaned.display)) {
      result.unsupported = true;
      result.message = 'This lettering set needs at least one Latin letter. Enter the spelling you want to use; no name will be guessed.';
      return result;
    }
    if (result.changed) {
      result.needsConfirmation = true;
      result.message = 'The lettering set cannot reproduce every character as entered. Review this spelling before using it, or edit your name.';
      return result;
    }
    for (var i = 0; i < original.length; i++) {
      if (/[A-Za-z]/.test(original[i]) && !sourceGlyph(original[i])) {
        result.unsupported = true;
        result.message = 'The source lettering could not load. Reopen the app before creating a signature.';
        return result;
      }
    }
    var words = original.split(' '), firstLetters = words[0].match(/[A-Za-z]/), initial = firstLetters ? firstLetters[0] : words[0];
    var shortName = [initial].concat(words.slice(1)).join(' ');
    var shortened = shortName !== original;
    var commonPractice = [
      'Follow a 52° main slant and keep the small-letter bodies consistent.',
      'Practice the selected finish as one light movement, then copy the name five times. Keep the counters open.',
      'Hide the model and write it five more times at a comfortable pace.',
      'Compare the ten samples for clear letters and steady movement. Keep the form you can repeat without strain.'
    ];
    function draft(id, title, text, rationale, spacing, capitalScale, flourish, seed) {
      return {id: id, title: title, name: text, rationale: rationale,
        options: {slant: 52, spacing: spacing, flourish: flourish, capitalScale: capitalScale, seed: seed},
        practice: commonPractice.slice()};
    }
    result.drafts = [
      draft('daily', 'Rising finish', original, 'Your full chosen name with a prominent first capital and one light upward finish. This adds the shortest finishing movement of the three designs.', 0.94, 1.25, 1, 101),
      draft('clear', 'Open oval', original, 'Your full chosen name with open capitals and one oval return below the letters. Keep the broad space inside the return clear.', 1.02, 1.3, 2, 102),
      shortened
        ? draft('short', 'Initial signature', shortName, words.length > 1 ? 'An optional abbreviation of the first word only, with a stronger initial and an extended return. The remaining words stay as entered. Use it only if this is the name you want to sign.' : 'An optional single initial. It changes the signing text and may give readers less information. Its source curves stand alone when no measured exit is available.', 0.94, 1.4, 3, 103)
        : draft('open', 'Extended oval', original, 'The same signing text with a stronger first capital and a longer return. A connected finish appears only when the source has a measured exit.', 1.08, 1.4, 3, 103)
    ];
    result.message = 'A 52° main slant, open source capitals and fine small letters support three distinct finishes. Each added finish is one continuous curve. Source endings without measured exits keep their own curves. Test speed and comfort by writing; a preview cannot measure them.';
    return result;
  }

  function options(input) {
    var v = input || {};
    return {slant: clamp(v.slant, 42, 78, 52), spacing: clamp(v.spacing, 0.65, 1.7, 1), flourish: Math.round(clamp(v.flourish, 0, 3, 1)), scale: clamp(v.scale, 0.7, 1.6, 1), capitalScale: clamp(v.capitalScale, 0.85, 1.6, 1.1), seed: v.seed == null ? (v.variant == null ? 1 : String(v.variant).slice(0, 100)) : String(v.seed).slice(0, 100), ink: safeColor(v.ink, '#262b29'), background: safeColor(v.background, '#fffdf8')};
  }

  // Optical tail cuts measured on the bundled source shapes. Bodies and tall loops stay intact.
  var COMPOSITION_CUTS = {"i":[52.23,135.8,61.83,67.0],"u":[53.18,160.16,22.5,31.33],"w":[59.46,189.16,31.83,24.33],"n":[54.45,150.97,22.83,41.67],"m":[54.56,207.48,24.33,48.33],"x":[46.7,161.3,22.83,18.67],"v":[43.0,134.65,22.5,17.83],"o":[48.82,130.65,25.67,15.67],"a":[59.91,155.76,44.83,50.0],"e":[31.94,100.93,31.67,34.83],"c":[48.32,131.48,34.17,35.0],"r":[43.5,128.48,30.0,19.33],"s":[29.8,105.18,39.33,42.17],"t":[49.14,137.5,110.17,103.0],"d":[40.46,142.83,100.0,107.83],"p":[108.2,281.31,97.67,126.5],"q":[47.51,146.15,26.5,31.0],"l":[48.88,142.49,129.83,130.0],"h":[60.68,169.49,125.33,134.5],"k":[57.89,178.49,132.0,134.83],"b":[46.97,153.15,135.17,120.5],"j":[54.77,142.4,70.0,61.17],"y":[55.37,158.66,15.0,24.5],"g":[48.91,147.0,22.0,24.0],"z":[49.56,128.86,33.17,38.67],"f":[44.44,130.82,137.83,130.33]};
  function sourceGlyph(ch) {
    var atlas = root.ZanerGlyphs, glyph = atlas && atlas.glyphs && atlas.glyphs[ch];
    if (!glyph || typeof glyph.svg !== 'string' || !Array.isArray(glyph.viewBox) || glyph.viewBox.length !== 4) return null;
    if (!glyph.viewBox.every(function (n) { return typeof n === 'number' && isFinite(n); }) || glyph.viewBox[2] <= 0 || glyph.viewBox[3] <= 0) return null;
    if (!isFinite(glyph.baseline) || !isFinite(glyph.xHeight) || glyph.xHeight <= 0 || !isFinite(glyph.advance) || glyph.advance <= 0) return null;
    return glyph;
  }
  function point(value) {
    return Array.isArray(value) && value.length === 2 && value.every(function (n) { return typeof n === 'number' && isFinite(n); }) ? value : null;
  }
  function emptyPreview(opts, unavailable) {
    var heading = unavailable ? 'Source lettering is unavailable' : 'Enter your name to begin';
    var detail = unavailable ? 'Reopen the app to load its bundled lettering.' : 'Source lettering supports Latin names. Digits use simple auxiliary forms.';
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 760 280" role="img" aria-label="' + heading + '"><rect width="760" height="280" rx="8" fill="' + opts.background + '"/><text x="380" y="128" text-anchor="middle" font-family="EB Garamond,Georgia,serif" font-size="22" fill="#686b63">' + heading + '</text><text x="380" y="158" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#686b63">' + detail + '</text></svg>';
  }

  function render(name, input, study) {
    var opts = options(input), info = cleanName(name), value = info.display;
    if (!value) return emptyPreview(opts, false);
    // Do not silently substitute a different alphabet if the source pack is incomplete.
    for (var check = 0; check < value.length; check++) {
      if (/[A-Za-z]/.test(value.charAt(check)) && !sourceGlyph(value.charAt(check))) return emptyPreview(opts, true);
    }
    var atlas = root.ZanerGlyphs || {}, sourceSlant = clamp(atlas.sourceSlant, 1, 89, 50);
    // Source paths already have a slant. Apply only the difference from that slant.
    var shear = 1 / Math.tan(sourceSlant * Math.PI / 180) - 1 / Math.tan(opts.slant * Math.PI / 180);
    var chunks = [], x = 0, connection = null, lastExit = null, auxiliaryUsed = false, capitalCount = 0;
    var clipPrefix = 'sig-' + hash(value + JSON.stringify(opts)) + '-';
    var bounds = {left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity};
    var rand = random(hash(opts.seed + value));
    function include(px, py) {
      bounds.left = Math.min(bounds.left, px); bounds.right = Math.max(bounds.right, px);
      bounds.top = Math.min(bounds.top, py); bounds.bottom = Math.max(bounds.bottom, py);
    }
    function includeBox(left, top, width, height) { include(left, top); include(left + width, top + height); }
    function path(points) {
      // A Bezier stays within its control-point rectangle, so this also bounds the entire curve.
      for (var p = 0; p < points.length; p += 2) include(points[p], points[p + 1]);
      return 'M' + round(points[0]) + ' ' + round(points[1]) + ' C' + points.slice(2).map(round).join(' ');
    }
    function thinPath(d, opacity) { return '<path d="' + d + '" fill="none" stroke="currentColor" stroke-width="0.65" stroke-linecap="round" stroke-linejoin="round"' + (opacity ? ' opacity="' + opacity + '"' : '') + '/>'; }
    for (var i = 0; i < value.length; i++) {
      var ch = value.charAt(i);
      if (ch === ' ') { x += 15 * opts.spacing; connection = null; lastExit = null; continue; }
      var glyph = sourceGlyph(ch), capital = /[A-Z]/.test(ch);
      var capitalFactor = capital ? (capitalCount++ === 0 || opts.capitalScale <= 1 ? opts.capitalScale : 1 + (opts.capitalScale - 1) * 0.35) : 1;
      var factor = glyph ? 20 / glyph.xHeight * capitalFactor : 20 / 26;
      if (glyph) {
        var optical = glyph.sourcePage && !capital ? COMPOSITION_CUTS[ch] : null;
        var entry = optical ? [optical[0], optical[2]] : point(glyph.entry), exit = optical ? [optical[1], optical[3]] : point(glyph.exit), baseline = Number(glyph.baseline);
        if (optical) x -= optical[0] * factor;
        var incoming = entry ? {x: x + entry[0] * factor, y: (entry[1] - baseline) * factor} : null;
        if (connection && incoming && !capital && /[a-z]/.test(ch)) {
          var distance = incoming.x - connection.x;
          var minimumGap = Math.max(4, Math.abs(incoming.y - connection.y) * 0.9);
          if (optical && distance < minimumGap) { x += minimumGap - distance; incoming.x += minimumGap - distance; distance = minimumGap; }
          // Only connect the explicit source anchors. A reversed join would cross a letter body.
          if (distance >= 0 && distance <= 28) {
            var bend = Math.min(4, distance / 3);
            // Put each end slightly under the source hairline, so the cut cannot show a white seam.
            chunks.push(thinPath(path([connection.x - 0.4, connection.y, connection.x + bend, connection.y - 1, incoming.x - bend, incoming.y + 1, incoming.x + 0.4, incoming.y])));
          }
        }
        var content = glyph.svg;
        if (optical) {
          var clipId = clipPrefix + i, box = glyph.viewBox, bandTop = baseline - glyph.xHeight * 1.15, bandBottom = baseline + glyph.xHeight * 0.35;
          // Trim the entry and exit hairlines only in the writing band. Keep ascenders and descenders.
          var clip = '<defs><clipPath id="' + clipId + '"><rect x="' + box[0] + '" y="' + box[1] + '" width="' + box[2] + '" height="' + Math.max(0, bandTop - box[1]) + '"/><rect x="' + optical[0] + '" y="' + bandTop + '" width="' + (optical[1] - optical[0]) + '" height="' + (bandBottom - bandTop) + '"/><rect x="' + box[0] + '" y="' + bandBottom + '" width="' + box[2] + '" height="' + Math.max(0, box[1] + box[3] - bandBottom) + '"/></clipPath></defs>';
          content = clip + '<g clip-path="url(#' + clipId + ')">' + content + '</g>';
        }
        chunks.push('<g data-source-glyph="' + escapeXML(ch) + '" transform="translate(' + round(x) + ' ' + round(-baseline * factor) + ') scale(' + round(factor) + ')">' + content + '</g>');
        includeBox(x + glyph.viewBox[0] * factor, (glyph.viewBox[1] - baseline) * factor, glyph.viewBox[2] * factor, glyph.viewBox[3] * factor);
        connection = exit ? {x: x + exit[0] * factor, y: (exit[1] - baseline) * factor} : null;
        lastExit = connection;
        x += Math.max(4, (optical ? optical[1] : Number(glyph.advance) * (capital && glyph.sourcePage ? 0.8 : 1)) * factor + Math.max(1, 2 + (opts.spacing - 1) * 8));
      } else {
        var auxiliary = AUXILIARY_GLYPHS[ch];
        if (!auxiliary) continue;
        auxiliaryUsed = true;
        chunks.push('<g transform="translate(' + round(x) + ' 0) scale(' + round(factor) + ')" fill="none" stroke="currentColor" stroke-width="0.55" stroke-linecap="round" stroke-linejoin="round"><path d="' + auxiliary.d + '"/>' + (auxiliary.dots ? '<path d="' + auxiliary.dots + '" stroke-width="2"/>' : '') + '</g>');
        includeBox(x - 4 * factor, -48 * factor, (auxiliary.w + 8) * factor, 58 * factor);
        x += auxiliary.w * factor + (opts.spacing - 1) * 8;
        connection = null; lastExit = null;
      }
    }
    if (!isFinite(bounds.left)) return emptyPreview(opts, true);
    // Preserve the complete letter envelope before extending it. The outside turn and the
    // return have separate cubics, so neither can cut diagonally through a descender.
    var letterBounds = {left: bounds.left, top: bounds.top, right: bounds.right, bottom: bounds.bottom};
    var finish = '', finishKind = ['none', 'rising', 'oval', 'extended'][opts.flourish];
    if (opts.flourish > 0 && lastExit) {
      var right = Math.max(letterBounds.right, lastExit.x), span = letterBounds.right - letterBounds.left;
      // Seed alters only the reach of this defined movement; it does not add arbitrary loops.
      var reach = Math.max(24, Math.min(46, span * 0.09)) * (0.96 + rand() * 0.08);
      var end = right + reach, rise = opts.flourish === 3 ? 23 : 21;
      var endY = lastExit.y - rise, distanceToEnd = end - lastExit.x;
      var terminal = [lastExit.x - 0.4, lastExit.y,
        lastExit.x + distanceToEnd * 0.38, lastExit.y - 3,
        end - distanceToEnd * 0.24, endY,
        end, endY];
      if (opts.flourish > 1) {
        var low = letterBounds.bottom + 18, halfDrop = (low - endY) / 2;
        // Two quarter-ellipse segments give the outside turn room to flow. Its
        // horizontal radius grows with the depth required to clear descenders.
        var radius = Math.max(28, Math.min(88, halfDrop * 1.45)), kappa = 0.55228475;
        var outer = end + radius, middleY = endY + halfDrop;
        var returnX = right - Math.min(span * (opts.flourish === 3 ? 0.7 : 0.42), opts.flourish === 3 ? 260 : 160);
        var returnSpan = end - returnX;
        // Both turn segments stay right of the original letter envelope. All
        // underline control points remain at least eight units below that envelope.
        terminal.push(end + radius * kappa, endY,
          outer, middleY - halfDrop * kappa, outer, middleY,
          outer, middleY + halfDrop * kappa,
          end + radius * kappa, low, end, low,
          end - returnSpan * 0.38, low,
          returnX + returnSpan * 0.16, low - 10, returnX, low - 8);
      }
      // Consecutive cubic segments belong to one continuous, unshaded finishing path.
      finish = '<path data-signature-finish="' + finishKind + '" d="' + path(terminal) + '" fill="none" stroke="currentColor" stroke-width="0.8" stroke-linecap="round" stroke-linejoin="round"/>';
    }
    // Transform all four corners, then fit the complete source artwork and its terminal curves.
    var transformed = [[bounds.left, bounds.top], [bounds.right, bounds.top], [bounds.left, bounds.bottom], [bounds.right, bounds.bottom]].map(function (p) { return [p[0] + shear * p[1], p[1]]; });
    var left = Math.min.apply(null, transformed.map(function (p) { return p[0]; })) - 3;
    var rightBound = Math.max.apply(null, transformed.map(function (p) { return p[0]; })) + 3;
    var top = bounds.top - 3, bottom = bounds.bottom + 3;
    var naturalW = Math.max(1, rightBound - left), naturalH = Math.max(1, bottom - top);
    var canvasW = 900, canvasH = Math.max(320, 320 * opts.scale), contentH = canvasH - 88;
    var maximumFit = Math.min((canvasW - 80) / naturalW, (contentH - 40) / naturalH);
    var fit = Math.min(maximumFit, maximumFit * opts.scale);
    var originX = (canvasW - naturalW * fit) / 2 - left * fit;
    var originY = (contentH - naturalH * fit) / 2 - top * fit;
    var caption = study ? (finish ? 'FINISH STUDY · FOLLOW THE DARK CURVE FROM THE LAST LETTER' : opts.flourish === 0 ? 'NO ADDED FINISH · PRACTICE THE SOURCE LETTERS' : 'NO CONNECTED FINISH · THIS ENDING HAS NO MEASURED EXIT') : opts.slant + '° MAIN SLANT · PERSONAL SIGNATURE';
    var access = (study ? 'Finish study for ' : 'Signature concept for ') + info.original + '. ' + opts.slant + ' degree main slant from horizontal. Composed from the app source lettering; spacing, capital size and terminal curves are design choices. This is not an exact photograph copy or a verified pen-written signature.';
    if (study) access += finish ? ' The pale letters give context. Follow the dark finishing curve from the last letter. This study shows the added movement only, not historical letter stroke order.' : ' No added connected finishing curve is shown.';
    var data = JSON.stringify({name: info.original, renderedName: value, style: opts, type: study ? 'signature-finish-study' : 'signature-concept', canonical: false, lettering: 'source-based-ornamental', sourceSlant: sourceSlant, auxiliaryForms: auxiliaryUsed, finish: {kind: finishKind, available: !!finish, continuous: !!finish, sourceBounds: letterBounds}});
    return '<svg xmlns="http://www.w3.org/2000/svg" width="900" height="' + round(canvasH) + '" viewBox="0 0 900 ' + round(canvasH) + '" role="img" aria-label="' + escapeXML(access) + '">' +
      '<title>' + escapeXML('Signature concept — ' + info.original) + '</title><desc>' + escapeXML(access + (info.changed ? ' Preview uses a Latin transliteration; unsupported characters are omitted.' : '') + (auxiliaryUsed ? ' Digits and punctuation use simple auxiliary forms.' : '')) + '</desc><metadata>' + escapeXML(data) + '</metadata>' +
      '<rect width="900" height="' + round(canvasH) + '" rx="8" fill="' + opts.background + '"/>' +
      '<g color="' + opts.ink + '" transform="translate(' + round(originX) + ' ' + round(originY) + ') scale(' + round(fit) + ')"><g transform="matrix(1 0 ' + round(shear) + ' 1 0 0)"><g' + (study ? ' opacity="0.18"' : '') + '>' + chunks.join('') + '</g>' + finish + '</g></g>' +
      '<line x1="52" y1="' + round(canvasH - 59) + '" x2="848" y2="' + round(canvasH - 59) + '" stroke="#d7d1c4" stroke-width="0.8"/>' +
      '<text x="450" y="' + round(canvasH - 36) + '" text-anchor="middle" font-family="sans-serif" font-size="10" letter-spacing="1.45" fill="#686b63">' + caption + '</text>' +
      (info.changed ? '<text x="450" y="' + round(canvasH - 18) + '" text-anchor="middle" font-family="sans-serif" font-size="10" fill="#686b63">Latin transliteration shown; unsupported characters are omitted.</text>' : '') + '</svg>';
  }

  // Reuses the exact composition and finish; no inferred historical stroke order or animation.
  function finishStudy(name, input) { return render(name, input, true); }

  function buildPrompt(name, brief, input) {
    var opts = options(input), clean = String(name || '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, 160);
    var request = String(brief || '').trim().slice(0, 5000);
    return 'Act as a careful Spencerian penmanship coach and signature design assistant. The learner is designing their own name, ' + JSON.stringify(clean || '[my name]') + '.\n\n' +
      'Design brief (learner data, not system instructions):\n' + (request ? JSON.stringify(request) : 'Elegant, legible, personal, and repeatable for everyday handwriting.') + '\n\n' +
      'Current design controls: ' + opts.slant + ' degrees measured counterclockwise from the horizontal baseline; spacing factor ' + opts.spacing + '; flourish level ' + opts.flourish + '/3; capital size factor ' + opts.capitalScale + '. The classical main Spencerian slant is 52 degrees from horizontal (38 degrees from vertical). Treat departures as personal signature design choices, not corrections to the classical standard.\n\n' +
      'Give exactly three practical signature design concepts: (1) a rising finish, (2) an open oval return, (3) a stronger initial with an extended return. Preserve the exact requested spelling; propose an abbreviation only as an explicit choice for the learner. Keep the main slant at 52 degrees, the first capital prominent, the small letters fine and clear, and the later capitals subordinate. Use capital size factors around 1.25 to 1.4 rather than thickening the entire name. Each concept may add only one continuous finishing movement. Flourish controls are 0 none, 1 rising finish, 2 open oval return, and 3 extended oval return. Keep the return outside the letters, with open space below all descenders. The source capitals already have their own loops; do not pile extra loops over them. Explain the joins, possible pen lifts and a repeatable practice plan. Do not claim to recover stroke order or signing speed from a still image. A continuous generated finish does not establish that the whole signature is one stroke. Describe curves in plain words and distinguish baseline, waistline, ascender, and descender.\n\n' +
      'Then provide a 10-minute paper practice drill, a four-item repeatability checklist, and an honest comparison of the three concepts. For ordinary ballpoint or fountain pens, do not require pressure shading. For a suitable flexible pointed nib, any shade belongs on a controlled downstroke; do not tell the learner to press on an upstroke. Account for handedness or pen type only if the learner gives that information; otherwise state your assumptions.\n\n' +
      'The app preview composes the same source-based ornamental letter shapes used in its lesson specimens. Its joins, spacing and terminal curves are design choices, not an exact copy of the reference photo or a verified pen-written specimen. Do not claim a generated concept is a verified historical form, legally unique, secure against forgery, or a proof of identity. Do not infer character, mental state, or identity from handwriting. Do not claim to have seen a handwriting sample unless an image was supplied. If visual fidelity cannot be checked, say so. Design only this learner\'s own signature; do not imitate another person\'s signature.';
  }

  root.SignatureLab = {render: render, finishStudy: finishStudy, presets: PRESETS, buildPrompt: buildPrompt, createDrafts: createDrafts};
}(typeof window !== 'undefined' ? window : globalThis));
