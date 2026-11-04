/* Tab 2: Kepler's triangulation of Mars */
(function () {
  const CX = 320, CY = 320, AU = 140, PR = 88, TOL = 3, PERIOD = 687;
  const X = x => CX + x * AU, Y = y => CY - y * AU;
  let svg, gDyn, data = [], sel = 0, mode = 'watch';
  let step = 0, t = 1, playing = false;
  let tr = null;          // "Your turn" state
  let hover = null;       // pointer angle while in Your turn
  let fit = null, showReal = false, keepLines = true;

  const STEP_DUR = [0, 1.8, 2.2, 4.5, 1.8, 2.2, 0.8];

  /* ---------- data ---------- */
  const unit = a => ({ x: Math.cos(a * DEG), y: Math.sin(a * DEG) });
  function intersect(he1, ge1, he2, ge2) {
    const E1 = unit(he1), E2 = unit(he2), d1 = unit(ge1), d2 = unit(ge2);
    const cr = d1.x * d2.y - d1.y * d2.x;
    if (Math.abs(cr) < 0.05) return null;
    const qx = E2.x - E1.x, qy = E2.y - E1.y;
    const tt = (qx * d2.y - qy * d2.x) / cr, s = (qx * d1.y - qy * d1.x) / cr;
    if (tt <= 0 || s <= 0) return null;
    return { x: E1.x + tt * d1.x, y: E1.y + tt * d1.y };
  }
  function genPosition(k) {
    for (let n = 0; n < 1500; n++) {
      const target = norm360(k * 60 + 15 + (Math.random() * 30 - 15));
      let jd1 = Orbit.jd(1600 + Math.floor(Math.random() * 424), 1, 1) + Math.random() * 365;
      for (let i = 0; i < 4; i++) jd1 += angDiff(target, Orbit.helio('mars', jd1).lon) / 0.524;
      jd1 = Math.floor(jd1) + 0.5;
      const jd2 = jd1 + PERIOD;
      if (Orbit.year(jd2) > 2026.8) continue;
      const E1 = Orbit.helio('earth', jd1), E2 = Orbit.helio('earth', jd2);
      const M1 = Orbit.helio('mars', jd1), M2 = Orbit.helio('mars', jd2);
      const g1 = norm360(Math.atan2(M1.y - E1.y, M1.x - E1.x) / DEG), g2 = norm360(Math.atan2(M2.y - E2.y, M2.x - E2.x) / DEG);
      if (Math.abs(angDiff(g1, E1.lon + 180)) < 40 || Math.abs(angDiff(g2, E2.lon + 180)) < 40) continue; // too close to the Sun to see
      const cross = Math.abs(angDiff(g1, g2));
      if (cross < 30 || cross > 150) continue;
      const he1 = Math.round(E1.lon) % 360, he2 = Math.round(E2.lon) % 360, ge1 = Math.round(g1) % 360, ge2 = Math.round(g2) % 360;
      const pt = intersect(he1, ge1, he2, ge2);
      if (!pt) continue;
      const r = Math.hypot(pt.x, pt.y);
      if (r < 1.3 || r > 1.8) continue;
      return { obs: [{ jd: jd1, he: he1, ge: ge1 }, { jd: jd2, he: he2, ge: ge2 }], trueM: { x: M1.x, y: M1.y }, exact: pt };
    }
    return null;
  }
  function newSet() {
    data = [];
    const order = [0, 1, 2, 3, 4, 5].sort(() => Math.random() - 0.5);
    order.forEach((k, i) => { const p = genPosition(k); if (p) data.push(p); });
    data.sort((a, b) => a.obs[0].jd - b.obs[0].jd);
    data.forEach((p, i) => { p.label = 'M' + (i + 1); p.cls = 'p' + (i + 1); p.plotted = null; });
    sel = 0; fit = null; resetStep(); buildTable(); results();
  }

  /* ---------- table ---------- */
  function buildTable() {
    const tb = $('triTable'); tb.innerHTML = '';
    const th = document.createElement('thead');
    th.innerHTML = '<tr><th>Mars position</th><th>Date</th><th class="num">Earth helio&shy;centric</th><th class="num">Mars geo&shy;centric</th></tr>';
    tb.appendChild(th);
    data.forEach((p, i) => {
      const body = document.createElement('tbody'); body.className = 'pos' + (i === sel ? ' sel' : '');
      body.innerHTML = `<tr class="pos"><td rowspan="2"><span class="swatch" style="background:var(--${p.cls})"></span><b>${p.label}</b>${p.plotted ? ' <span class="done" aria-label="plotted">✓</span>' : ''}</td><td>${Orbit.dateText(p.obs[0].jd, true)}</td><td class="num">${p.obs[0].he}°</td><td class="num">${p.obs[0].ge}°</td></tr>
        <tr class="pos"><td>${Orbit.dateText(p.obs[1].jd, true)}</td><td class="num">${p.obs[1].he}°</td><td class="num">${p.obs[1].ge}°</td></tr>`;
      body.addEventListener('click', () => { sel = i; resetStep(); buildTable(); });
      tb.appendChild(body);
    });
    $('triFit').disabled = data.filter(p => p.plotted).length < 4;
  }

  /* ---------- drawing ---------- */
  function drawStatic() {
    const g = el('g', {}, svg);
    for (let v = 20; v < 640; v += 25) {
      el('line', { x1: v, y1: 0, x2: v, y2: 640, class: 'g-grid' }, g);
      el('line', { x1: 0, y1: v, x2: 640, y2: v, class: 'g-grid' }, g);
    }
    el('line', { x1: CX, y1: CY, x2: 636, y2: CY, class: 'ink-s', 'stroke-width': 1.5 }, g);
    el('text', { x: 632, y: CY - 8, class: 'lbl-b halo', 'text-anchor': 'end', text: 'Reference Line 1 (0°)' }, g);
    el('circle', { cx: CX, cy: CY, r: AU, class: 'orbit' }, g);
    el('text', { x: CX - AU * 0.71 - 6, y: CY + AU * 0.71 + 18, class: 'lbl-m halo', 'text-anchor': 'end', text: "Earth's orbit" }, g);
    [[90, 0, -1], [180, -1, 0], [270, 0, 1]].forEach(([a, dx, dy]) => el('text', { x: CX + dx * (AU + 16), y: CY + dy * (AU + 14) + 4, class: 'lbl-m halo', 'text-anchor': 'middle', text: a + '°' }, g));
    el('text', { x: 12, y: 628, class: 'lbl-m', text: 'Counterclockwise is positive. 1 AU = radius of Earth’s orbit.' }, g);
  }
  function arm(g, cx, cy, ang, cls) {
    const c = Math.cos(ang * DEG), s = -Math.sin(ang * DEG);
    if (ang > 0.5) {
      const r = PR - 2, large = ang > 180 ? 1 : 0;
      el('path', { d: `M${cx + r},${cy} A${r},${r} 0 ${large} 0 ${cx + r * c},${cy + r * s}`, fill: 'none', class: 'hi-s', 'stroke-width': 4, opacity: 0.7 }, g);
    }
    el('line', { x1: cx, y1: cy, x2: cx + (PR + 14) * c, y2: cy + (PR + 14) * s, class: cls || 'arm' }, g);
  }
  function sightLine(g, p, E, ang, len, cls) {
    const c = Math.cos(ang * DEG), s = -Math.sin(ang * DEG);
    el('line', { x1: X(E.x), y1: Y(E.y), x2: X(E.x) + len * c, y2: Y(E.y) + len * s, class: `${p.cls} pc-s`, 'stroke-width': 2, opacity: cls === 'faint' ? 0.55 : 1 }, g);
  }
  function earthDot(g, p, E, big) {
    el('circle', { cx: X(E.x), cy: Y(E.y), r: big ? 7 : 4.5, class: big ? 'earth paper-s' : `${p.cls} pc-f`, 'stroke-width': 2 }, g);
  }
  function marsDot(g, p, pt, pulse) {
    if (pulse) el('circle', { cx: X(pt.x), cy: Y(pt.y), r: 14, class: `${p.cls} pc-f`, opacity: 0.25 }, g);
    el('circle', { cx: X(pt.x), cy: Y(pt.y), r: 6.5, class: `${p.cls} pc-f paper-s`, 'stroke-width': 2 }, g);
    const r = Math.hypot(pt.x, pt.y), ox = pt.x / r * 18, oy = -pt.y / r * 18;
    el('text', { x: X(pt.x) + ox, y: Y(pt.y) + oy + 4, class: 'lbl-b halo', 'text-anchor': 'middle', text: p.label }, g);
  }
  function lenTo(E, pt) { return Math.hypot((pt.x - E.x), (pt.y - E.y)) * AU + 34; }

  function drawPlotted(g) {
    data.forEach((p, i) => {
      if (!p.plotted || (i === sel && (step > 0 && step < 6 && mode === 'watch'))) return;
      const pl = p.plotted;
      if (keepLines) pl.lines.forEach(L => { sightLine(g, p, L.E, L.ang, lenTo(L.E, pl.pt), 'faint'); earthDot(g, p, L.E); });
      marsDot(g, p, pl.pt);
    });
  }
  function drawFit(g) {
    if (showReal) {
      let d = '';
      for (let i = 0; i <= 360; i += 3) { const jd = 2451545 + i / 360 * 686.98; const m = Orbit.helio('mars', jd); d += (i ? 'L' : 'M') + X(m.x).toFixed(1) + ' ' + Y(m.y).toFixed(1); }
      el('path', { d, class: 'orbit-faint' }, g);
      const m = Orbit.helio('mars', 2451545 + 140);
      el('text', { x: X(m.x) + 8, y: Y(m.y) - 8, class: 'lbl-m halo', text: "Mars' real orbit" }, g);
    }
    if (!fit) return;
    let d = '';
    for (let i = 0; i <= 360; i += 2) { const th = i * DEG, r = fit.p / (1 + fit.e * Math.cos(th - fit.w)); d += (i ? 'L' : 'M') + X(r * Math.cos(th)).toFixed(1) + ' ' + Y(r * Math.sin(th)).toFixed(1); }
    el('path', { d: d + 'Z', fill: 'none', class: 's-mars', 'stroke-width': 2.5 }, g);
    const per = { x: fit.rp * Math.cos(fit.w), y: fit.rp * Math.sin(fit.w) }, aph = { x: -fit.ra * Math.cos(fit.w), y: -fit.ra * Math.sin(fit.w) };
    el('line', { x1: X(per.x), y1: Y(per.y), x2: X(aph.x), y2: Y(aph.y), class: 'ink-s', 'stroke-dasharray': '6 4' }, g);
    [[per, 'Perihelion'], [aph, 'Aphelion']].forEach(([q, name]) => {
      el('circle', { cx: X(q.x), cy: Y(q.y), r: 5, class: 'ink-f' }, g);
      const r = Math.hypot(q.x, q.y);
      el('text', { x: X(q.x) + q.x / r * 14, y: Y(q.y) - q.y / r * 14 + 4, class: 'lbl-b halo', 'text-anchor': q.x > 0 ? 'start' : 'end', text: name }, g);
    });
  }
  function drawSun(g) {
    el('circle', { cx: CX, cy: CY, r: 13, class: 'sun-glow' }, g);
    el('circle', { cx: CX, cy: CY, r: 7, class: 'sun' }, g);
    el('text', { x: CX + 10, y: CY + 22, class: 'lbl-b halo', text: 'Sun' }, g);
  }

  function render() {
    clear(gDyn);
    const g = gDyn;
    drawFit(g);
    drawPlotted(g);
    const p = data[sel];
    if (p) (mode === 'watch' ? renderWatch : renderTry)(g, p);
    drawSun(g);
    $('triStepNo').textContent = mode === 'watch' ? `Step ${step} of 6` : '';
  }

  /* ---------- Watch it ---------- */
  function renderWatch(g, p) {
    const o = p.obs, E1 = unit(o[0].he), E2 = unit(o[1].he), pt = p.exact;
    const prog = s => s < step ? 1 : s === step ? t : 0;
    const armT = s => ease(clamp(prog(s) / 0.6, 0, 1));
    const lineT = s => clamp((prog(s) - 0.55) / 0.45, 0, 1);
    const cap = $('triCaption');
    if (step === 0) {
      cap.innerHTML = `<b>${p.label}.</b> Kepler knew Mars takes 687 days to orbit the Sun once. So on two dates 687 days apart, Mars is in the same spot, but Earth is not. Two sight lines from two Earth positions will cross at Mars. Press <b>Next step</b>.`;
      return;
    }
    // Date 1
    if (step === 1) { drawProtractor(g, CX, CY, PR); arm(g, CX, CY, o[0].he * armT(1)); }
    if (prog(1) > 0.62) earthDot(g, p, E1, step <= 3);
    if (step === 2) { drawProtractor(g, X(E1.x), Y(E1.y), PR); arm(g, X(E1.x), Y(E1.y), o[0].ge * armT(2)); }
    if (step >= 2) sightLine(g, p, E1, o[0].ge, lenTo(E1, pt) * (step === 2 ? lineT(2) : 1));
    // 687 days
    if (step === 3) {
      const days = Math.round(PERIOD * t), jd = o[0].jd + PERIOD * t;
      let d = '';
      for (let k = 0; k <= 60; k++) { const a = Orbit.helio('earth', o[0].jd + PERIOD * t * k / 60).lon; d += (k ? 'L' : 'M') + (CX + AU * Math.cos(a * DEG)).toFixed(1) + ' ' + (CY - AU * Math.sin(a * DEG)).toFixed(1); }
      el('path', { d, fill: 'none', class: 's-earth', 'stroke-width': 3, opacity: 0.35 }, g);
      const ea = Orbit.helio('earth', jd).lon, m = Orbit.helio('mars', jd);
      el('circle', { cx: X(m.x), cy: Y(m.y), r: 7, class: 'mars', opacity: 0.85 }, g);
      el('text', { x: X(m.x) + 10, y: Y(m.y) - 10, class: 'lbl halo', text: 'Mars' }, g);
      el('circle', { cx: CX + AU * Math.cos(ea * DEG), cy: CY - AU * Math.sin(ea * DEG), r: 7, class: 'earth' }, g);
      el('text', { x: CX, y: 40, class: 'lbl-b halo', 'text-anchor': 'middle', text: `Day ${days} of 687` }, g);
      cap.innerHTML = t < 1
        ? `687 days pass. Mars goes around the Sun once. Earth goes around almost twice. <b>Day ${days}</b>.`
        : `After 687 days Mars is back where it started, but Earth is about 43° short of a second lap. Now we have a new place to look from.`;
    }
    if (step >= 4 && prog(4) > 0.62) earthDot(g, p, E2, step <= 5);
    if (step === 4) { drawProtractor(g, CX, CY, PR); arm(g, CX, CY, o[1].he * armT(4)); }
    if (step === 5) { drawProtractor(g, X(E2.x), Y(E2.y), PR); arm(g, X(E2.x), Y(E2.y), o[1].ge * armT(5)); }
    if (step >= 5) sightLine(g, p, E2, o[1].ge, lenTo(E2, pt) * (step === 5 ? lineT(5) : 1));
    if (step === 6) marsDot(g, p, pt, true);

    const D1 = Orbit.dateText(o[0].jd), D2 = Orbit.dateText(o[1].jd);
    if (step === 1) cap.innerHTML = `<b>Date 1: ${D1}.</b> Center the protractor on the <b>Sun</b>. Put 0° on Reference Line 1. Count counterclockwise to <b>${o[0].he}°</b> and put a dot on Earth's orbit.`;
    if (step === 2) cap.innerHTML = `Move the protractor to <b>Earth's dot</b>. Keep 0° parallel to the grid lines. Count counterclockwise to <b>${o[0].ge}°</b> and draw a line out past Earth's orbit. Mars is somewhere on this line.`;
    if (step === 4) cap.innerHTML = `<b>Date 2: ${D2}.</b> Protractor back on the <b>Sun</b>, 0° on Reference Line 1. Count to <b>${o[1].he}°</b> and put a dot on Earth's orbit.`;
    if (step === 5) cap.innerHTML = `Protractor on the <b>new Earth dot</b>, 0° parallel to the grid. Count to <b>${o[1].ge}°</b> and draw the second sight line.`;
    if (step === 6) {
      const left = data.filter(q => !q.plotted).length;
      cap.innerHTML = `The two sight lines cross. <b>That point is Mars</b>, ${Math.hypot(pt.x, pt.y).toFixed(2)} AU from the Sun. Label it ${p.label}. ${left ? left + ' position' + (left > 1 ? 's' : '') + ' left to plot.' : 'All positions are plotted. Press <b>Draw the orbit</b>.'}`;
    }
  }

  /* ---------- Your turn ---------- */
  function startTry() {
    tr = { phase: 'he1', vals: {}, misses: 0, passT: 0 };
    hover = null; $('triShow').hidden = true; feedback('', '');
  }
  function tryCenter() {
    if (!tr) return null;
    if (tr.phase === 'he1' || tr.phase === 'he2') return { x: CX, y: CY };
    if (tr.phase === 'ge1') { const E = unit(tr.vals.he1); return { x: X(E.x), y: Y(E.y) }; }
    if (tr.phase === 'ge2') { const E = unit(tr.vals.he2); return { x: X(E.x), y: Y(E.y) }; }
    return null;
  }
  function renderTry(g, p) {
    const o = p.obs, v = tr.vals, cap = $('triCaption');
    const D1 = Orbit.dateText(o[0].jd), D2 = Orbit.dateText(o[1].jd);
    const LONG = 330;
    if (v.he1 !== undefined) earthDot(g, p, unit(v.he1), tr.phase === 'ge1');
    if (v.ge1 !== undefined) sightLine(g, p, unit(v.he1), v.ge1, tr.phase === 'done' && tr.pt ? lenTo(unit(v.he1), tr.pt) : LONG);
    if (v.he2 !== undefined) earthDot(g, p, unit(v.he2), tr.phase === 'ge2');
    if (v.ge2 !== undefined) sightLine(g, p, unit(v.he2), v.ge2, tr.phase === 'done' && tr.pt ? lenTo(unit(v.he2), tr.pt) : LONG);
    if (tr.phase === 'pass') {
      const jd = o[0].jd + PERIOD * tr.passT, ea = Orbit.helio('earth', jd).lon;
      el('circle', { cx: CX + AU * Math.cos(ea * DEG), cy: CY - AU * Math.sin(ea * DEG), r: 7, class: 'earth' }, g);
      el('text', { x: CX, y: 40, class: 'lbl-b halo', 'text-anchor': 'middle', text: `Day ${Math.round(PERIOD * tr.passT)} of 687` }, g);
      cap.innerHTML = '687 days pass. Mars is back in the same spot. Earth is somewhere new.';
    }
    const c = tryCenter();
    if (c) {
      drawProtractor(g, c.x, c.y, PR);
      if (tr.hint !== undefined) arm(g, c.x, c.y, tr.hint);
      if (hover) {
        const a = hover.ang, cs = Math.cos(a * DEG), sn = -Math.sin(a * DEG);
        el('line', { x1: c.x, y1: c.y, x2: c.x + (PR + 40) * cs, y2: c.y + (PR + 40) * sn, class: 'accent-s', 'stroke-width': 1.5, 'stroke-dasharray': '4 3' }, g);
        if (App.guided) el('text', { x: hover.x + 12, y: hover.y - 12, class: 'lbl-acc halo', text: Math.round(norm360(a)) + '°' }, g);
      }
    }
    if (tr.phase === 'done' && tr.pt) marsDot(g, p, tr.pt, true);
    const ask = {
      he1: `<b>Date 1: ${D1}. Earth's heliocentric longitude is ${o[0].he}°.</b> The protractor is on the Sun with 0° on Reference Line 1. Click where Earth goes.`,
      ge1: `<b>Mars' geocentric longitude is ${o[0].ge}°.</b> The protractor is now on Earth's dot with 0° parallel to the grid. Click in the direction of ${o[0].ge}°.`,
      he2: `<b>Date 2: ${D2}. Earth is at ${o[1].he}°.</b> Protractor back on the Sun. Click where Earth goes.`,
      ge2: `<b>Mars is at ${o[1].ge}° from Earth.</b> Protractor on the new Earth dot. Click in the direction of ${o[1].ge}°.`
    };
    if (ask[tr.phase]) cap.innerHTML = ask[tr.phase];
    if (tr.phase === 'done') {
      cap.innerHTML = tr.pt
        ? `Your two sight lines cross at <b>${p.label}</b>, ${Math.hypot(tr.pt.x, tr.pt.y).toFixed(2)} AU from the Sun. ${data.filter(q => !q.plotted).length ? 'Press <b>Next position</b> to keep going.' : 'All positions are plotted. Press <b>Draw the orbit</b>.'}`
        : `Those two lines don't cross outside Earth's orbit, so something got plotted wrong. Press <b>Start over</b> and try ${p.label} again.`;
    }
  }
  function feedback(msg, kind) { const f = $('triFeedback'); f.textContent = msg; f.className = 'feedback ' + (kind || ''); }
  function tryClick(evt) {
    if (mode !== 'try' || !tr) return;
    const c = tryCenter(); if (!c) return;
    const pt = svgPoint(svg, evt);
    if (Math.hypot(pt.x - c.x, pt.y - c.y) < 8) return;
    const a = Math.round(norm360(Math.atan2(-(pt.y - c.y), pt.x - c.x) / DEG));
    submit(a, false);
  }
  function submit(a, shown) {
    const p = data[sel], key = tr.phase, idx = key.endsWith('1') ? 0 : 1, kind = key.startsWith('he') ? 'he' : 'ge';
    const target = p.obs[idx][kind], diff = Math.abs(angDiff(a, target));
    if (diff <= TOL) {
      tr.vals[key] = a; tr.misses = 0; tr.hint = undefined; $('triShow').hidden = true;
      feedback(shown ? `Placed at ${target}°.` : `Good. You placed it at ${a}°. The data says ${target}°.`, 'ok');
      if (key === 'he1') tr.phase = 'ge1';
      else if (key === 'ge1') { tr.phase = 'pass'; tr.passT = 0; }
      else if (key === 'he2') tr.phase = 'ge2';
      else { finishTry(); }
    } else {
      tr.misses++;
      let hint = `You clicked about ${a}°. Find ${target}° on the protractor.`;
      if (Math.abs(angDiff(a, 360 - target)) <= 6 && target % 180 > 8) hint = `You clicked about ${a}°. It looks like you counted clockwise. Count counterclockwise from 0°.`;
      else if (Math.abs(angDiff(a, target + 180)) <= 8) hint = `You clicked about ${a}°, the opposite direction. 0° points the same way as Reference Line 1.`;
      feedback(hint, 'no');
      if (tr.misses >= 2) $('triShow').hidden = false;
    }
    hover = null; render(); updateButtons();
  }
  function finishTry() {
    const p = data[sel], v = tr.vals;
    tr.phase = 'done';
    tr.pt = intersect(v.he1, v.ge1, v.he2, v.ge2);
    if (tr.pt && Math.hypot(tr.pt.x, tr.pt.y) > 1.05) {
      p.plotted = { pt: tr.pt, lines: [{ E: unit(v.he1), ang: v.ge1 }, { E: unit(v.he2), ang: v.ge2 }] };
      buildTable();
    } else tr.pt = null;
  }

  /* ---------- controls ---------- */
  function resetStep() {
    step = 0; t = 1; playing = false;
    if (mode === 'try') startTry(); else { tr = null; feedback('', ''); $('triShow').hidden = true; }
    render(); updateButtons();
  }
  function updateButtons() {
    const next = $('triNext'), back = $('triBack');
    if (mode === 'watch') {
      back.textContent = 'Back'; back.disabled = step === 0;
      next.disabled = false;
      next.textContent = step === 6 ? (data.some(q => !q.plotted) ? 'Next position' : 'Replay') : 'Next step';
    } else {
      back.textContent = 'Start over'; back.disabled = false;
      next.textContent = 'Next position';
      next.disabled = !(tr && tr.phase === 'done' && tr.pt);
    }
  }
  function nextUnplotted() {
    for (let k = 1; k <= data.length; k++) { const i = (sel + k) % data.length; if (!data[i].plotted) return i; }
    return -1;
  }
  function onNext() {
    if (mode === 'watch') {
      if (playing) { t = 1; playing = false; if (step === 6) markWatchPlotted(); render(); updateButtons(); return; }
      if (step === 6) { const n = nextUnplotted(); if (n >= 0) sel = n; buildTable(); resetStep(); return; }
      step++; t = 0; playing = true;
    } else {
      const n = nextUnplotted(); if (n >= 0) sel = n; buildTable(); resetStep();
    }
    render(); updateButtons();
  }
  function markWatchPlotted() {
    const p = data[sel];
    if (!p.plotted) { p.plotted = { pt: p.exact, lines: [{ E: unit(p.obs[0].he), ang: p.obs[0].ge }, { E: unit(p.obs[1].he), ang: p.obs[1].ge }] }; buildTable(); }
  }
  function onBack() {
    if (mode === 'watch') { if (step > 0) { step--; t = 1; playing = false; } }
    else { if (data[sel].plotted && tr && tr.phase === 'done') { data[sel].plotted = null; buildTable(); } startTry(); }
    render(); updateButtons();
  }

  /* ---------- orbit fit ---------- */
  function doFit() {
    const pts = data.filter(p => p.plotted).map(p => p.plotted.pt);
    if (pts.length < 4) return;
    // least squares: 1/r = A + B cos(th) + C sin(th)
    const M = [[0, 0, 0], [0, 0, 0], [0, 0, 0]], V = [0, 0, 0];
    pts.forEach(q => { const r = Math.hypot(q.x, q.y), th = Math.atan2(q.y, q.x), row = [1, Math.cos(th), Math.sin(th)];
      for (let i = 0; i < 3; i++) { V[i] += row[i] / r; for (let j = 0; j < 3; j++) M[i][j] += row[i] * row[j]; } });
    const sol = solve3(M, V); if (!sol) return;
    const [A, B, C] = sol, e = Math.hypot(B, C) / A;
    if (!(e < 0.9) || A <= 0) { $('triResults').innerHTML = '<div class="ro">Those points don\'t make a sensible orbit. Check your plots.</div>'; return; }
    const p = 1 / A;
    fit = { e, p, w: Math.atan2(C, B), rp: p / (1 + e), ra: p / (1 - e) };
    results(); render();
  }
  function solve3(M, V) {
    const a = M.map((r, i) => [...r, V[i]]);
    for (let i = 0; i < 3; i++) {
      let m = i; for (let k = i + 1; k < 3; k++) if (Math.abs(a[k][i]) > Math.abs(a[m][i])) m = k;
      [a[i], a[m]] = [a[m], a[i]]; if (Math.abs(a[i][i]) < 1e-12) return null;
      for (let k = 0; k < 3; k++) if (k !== i) { const f = a[k][i] / a[i][i]; for (let j = i; j < 4; j++) a[k][j] -= f * a[i][j]; }
    }
    return [a[0][3] / a[0][0], a[1][3] / a[1][1], a[2][3] / a[2][2]];
  }
  function results() {
    const r = $('triResults');
    if (!fit) { r.innerHTML = ''; return; }
    const L = fit.ra + fit.rp, d = fit.ra - fit.rp, e = d / L;
    const pe = Math.abs(e - 0.094) / 0.094 * 100;
    r.innerHTML = `
      <div class="ro"><span>Perihelion distance</span><b>${fit.rp.toFixed(2)} AU</b></div>
      <div class="ro"><span>Aphelion distance</span><b>${fit.ra.toFixed(2)} AU</b></div>
      <div class="ro"><span>Major axis L (aphelion + perihelion)</span><b>${L.toFixed(2)} AU</b></div>
      <div class="ro"><span>Distance between foci d (aphelion − perihelion)</span><b>${d.toFixed(2)} AU</b></div>
      <div class="ro math big">e = d ÷ L = ${d.toFixed(2)} ÷ ${L.toFixed(2)} = <b>${e.toFixed(3)}</b></div>`;
    $('peMeasured').value = e.toFixed(3); pctErr();
  }
  function pctErr() {
    const m = parseFloat($('peMeasured').value), a = parseFloat($('peAccepted').value), out = $('peOut');
    if (isNaN(m) || isNaN(a) || a === 0) { out.innerHTML = 'Percent error = |your value − accepted| ÷ accepted × 100'; return; }
    const pe = Math.abs(m - a) / a * 100;
    out.innerHTML = `|${m.toFixed(3)} − ${a.toFixed(3)}| ÷ ${a.toFixed(3)} × 100 = <b>${pe.toFixed(1)}%</b>`;
  }

  function init() {
    svg = $('triSvg'); drawStatic(); gDyn = el('g', {}, svg);
    document.querySelectorAll('#tab-triangulate .seg button').forEach(b => b.addEventListener('click', () => {
      mode = b.dataset.mode; document.querySelectorAll('#tab-triangulate .seg button').forEach(x => x.classList.toggle('on', x === b));
      if (mode === 'try' && data[sel].plotted) { const n = nextUnplotted(); if (n >= 0) { sel = n; buildTable(); } }
      resetStep();
    }));
    $('triNext').addEventListener('click', onNext);
    $('triBack').addEventListener('click', onBack);
    $('triShow').addEventListener('click', () => { const p = data[sel], k = tr.phase; submit(p.obs[k.endsWith('1') ? 0 : 1][k.startsWith('he') ? 'he' : 'ge'], true); });
    $('triNew').addEventListener('click', newSet);
    $('triClear').addEventListener('click', () => { data.forEach(p => p.plotted = null); fit = null; results(); buildTable(); resetStep(); });
    $('triFit').addEventListener('click', doFit);
    $('triReal').addEventListener('change', e => { showReal = e.target.checked; render(); });
    $('triLines').addEventListener('change', e => { keepLines = e.target.checked; render(); });
    $('peMeasured').addEventListener('input', pctErr);
    $('peAccepted').addEventListener('input', pctErr);
    svg.addEventListener('pointerdown', tryClick);
    svg.addEventListener('pointermove', evt => {
      if (mode !== 'try' || !tr) return; const c = tryCenter(); if (!c) { hover = null; return; }
      const pt = svgPoint(svg, evt);
      hover = { ang: norm360(Math.atan2(-(pt.y - c.y), pt.x - c.x) / DEG), x: pt.x, y: pt.y }; render();
    });
    svg.addEventListener('pointerleave', () => { if (hover) { hover = null; render(); } });
    newSet();
  }
  function tick(dt) {
    if (mode === 'watch' && playing) {
      t += dt / (STEP_DUR[step] || 1);
      if (t >= 1) { t = 1; playing = false; if (step === 6) markWatchPlotted(); updateButtons(); }
      render();
    }
    if (mode === 'try' && tr && tr.phase === 'pass') {
      tr.passT += dt / 3;
      if (tr.passT >= 1) { tr.phase = 'he2'; tr.passT = 1; }
      render();
    }
  }
  App.register('triangulate', { init, tick, onGuided: () => render() });
})();
