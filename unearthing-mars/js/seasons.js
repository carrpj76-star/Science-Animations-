/* Tab 6: Daylight through the year on Earth and Mars */
(function () {
  const P = { earth: { tilt: 23.44, day: 24, name: 'Earth', days: 365, unit: 'day' }, mars: { tilt: 25.19, day: 24 + 37 / 60 + 22 / 3600, name: 'Mars', days: 669, unit: 'sol' } };
  const ML = 52, MR = 20, MT = 18, MB = 62, W = 640, H = 360;
  const SEASONS = ['Spring equinox', 'Summer solstice', 'Fall equinox', 'Winter solstice', 'Spring equinox'];
  let lat = 68, chart, gC, globes;

  function daylight(pl, f, phi) { // hours of daylight at fraction f of the year after spring equinox
    const p = P[pl], dec = Math.asin(Math.sin(p.tilt * DEG) * Math.sin(2 * Math.PI * f));
    let cosH = -Math.tan(phi * DEG) * Math.tan(dec);
    cosH = clamp(cosH, -1, 1);
    return 2 * Math.acos(cosH) / (2 * Math.PI) * p.day;
  }
  const hm = h => { let H = Math.floor(h), m = Math.round((h - H) * 60); if (m === 60) { H++; m = 0; } return `${H} h ${m} min`; };
  const sx = f => ML + f * (W - ML - MR), sy = h => H - MB - h / 25 * (H - MT - MB);

  function drawChart() {
    clear(gC);
    for (let h = 0; h <= 24; h += 4) { el('line', { x1: ML, y1: sy(h), x2: W - MR, y2: sy(h), class: 'g-grid' }, gC); el('text', { x: ML - 8, y: sy(h) + 4, class: 'lbl-m', 'text-anchor': 'end', text: h }, gC); }
    SEASONS.forEach((s, i) => {
      const x = sx(i / 4);
      el('line', { x1: x, y1: MT, x2: x, y2: H - MB, class: 'g-grid' }, gC);
      el('text', { x, y: H - MB + 18, class: 'lbl-m', 'text-anchor': i === 0 ? 'start' : i === 4 ? 'end' : 'middle', text: s }, gC);
    });
    el('line', { x1: ML, y1: H - MB, x2: W - MR, y2: H - MB, class: 'axis' }, gC);
    el('text', { x: (ML + W - MR) / 2, y: H - 14, class: 'lbl', 'text-anchor': 'middle', text: 'Time of year (seasons named for the Northern Hemisphere)' }, gC);
    el('text', { x: 14, y: (MT + H - MB) / 2, class: 'lbl', 'text-anchor': 'middle', transform: `rotate(-90 14 ${(MT + H - MB) / 2})`, text: 'Hours of daylight' }, gC);
    ['earth', 'mars'].forEach(pl => {
      let d = '';
      for (let i = 0; i <= 200; i++) { const f = i / 200; d += (i ? 'L' : 'M') + sx(f).toFixed(1) + ' ' + sy(daylight(pl, f, lat)).toFixed(1); }
      el('path', { d, fill: 'none', class: 's-' + pl, 'stroke-width': 2.5, 'stroke-dasharray': pl === 'mars' ? '8 5' : null, 'stroke-linejoin': 'round' }, gC);
    });
    gC.appendChild(hoverG);
  }
  let hoverG;
  function hover(evt) {
    const p = svgPoint(chart, evt), f = clamp((p.x - ML) / (W - ML - MR), 0, 1);
    clear(hoverG);
    el('line', { x1: sx(f), y1: MT, x2: sx(f), y2: H - MB, class: 'crosshair' }, hoverG);
    const e = daylight('earth', f, lat), m = daylight('mars', f, lat);
    el('circle', { cx: sx(f), cy: sy(e), r: 5, class: 'earth paper-s', 'stroke-width': 2 }, hoverG);
    el('circle', { cx: sx(f), cy: sy(m), r: 5, class: 'mars paper-s', 'stroke-width': 2 }, hoverG);
    Tip.show(`<b>${Math.round(f * 100)}% through the year</b>Earth (${P.earth.unit} ${Math.round(f * P.earth.days)}): ${hm(e)}<br>Mars (${P.mars.unit} ${Math.round(f * P.mars.days)}): ${hm(m)}`, evt);
  }
  function readouts() {
    const vals = pl => { let mx = 0, mn = 99; for (let i = 0; i <= 400; i++) { const h = daylight(pl, i / 400, lat); mx = Math.max(mx, h); mn = Math.min(mn, h); } return [mx, mn]; };
    const [emx, emn] = vals('earth'), [mmx, mmn] = vals('mars');
    const note = (mx, mn, pl) => mx >= P[pl].day - 0.01 ? 'Sun never sets in summer' : mn <= 0.01 ? 'Sun never rises in winter' : '';
    $('seRead').innerHTML = `
      <div class="ro"><span>Earth: most / least daylight</span><b>${hm(emx)} / ${hm(emn)}</b></div>
      <div class="ro"><span>Mars: most / least daylight</span><b>${hm(mmx)} / ${hm(mmn)}</b></div>
      <div class="ro"><span>Length of one day</span><b>Earth 24 h, Mars 24 h 37 min</b></div>
      <div class="ro"><span>Length of one year</span><b>Earth 365 days, Mars 687 Earth days</b></div>
      <div class="ro"><span>Axis tilt</span><b>Earth 23.4°, Mars 25.2°</b></div>`;
    const ne = note(emx, emn, 'earth'), nm = note(mmx, mmn, 'mars');
    $('seCaption').innerHTML = `At ${Math.abs(lat)}°${lat >= 0 ? 'N' : 'S'}, the two curves have almost the same shape because Earth and Mars have almost the same tilt.` +
      (ne && nm ? ' On both planets the Sun stays up all day in summer and never rises in the middle of winter here.' : ne ? ' Here the Sun stays up all day in summer on Earth, but not on Mars.' : nm ? ' Here the Sun stays up all day in summer on Mars, but not on Earth. Mars\' bigger tilt pushes its "arctic circle" farther south.' : '') +
      ` One difference: each Mars season lasts about twice as long, because a Mars year is 687 Earth days. Hover over the graph to compare.`;
    const rows = [];
    for (let i = 0; i < 8; i++) { const f = i / 8; rows.push(`<tr><td>${i % 2 === 0 ? SEASONS[i / 2] : 'between'}</td><td class="num">${hm(daylight('earth', f, lat))}</td><td class="num">${hm(daylight('mars', f, lat))}</td></tr>`); }
    $('seTable').innerHTML = `<thead><tr><th>Time of year</th><th class="num">Earth</th><th class="num">Mars</th></tr></thead><tbody>${rows.join('')}</tbody>`;
  }
  function drawGlobes() {
    clear(globes);
    [['earth', 118], ['mars', 238]].forEach(([pl, cx], k) => {
      const cy = 82, R = 48, t = P[pl].tilt * DEG, id = 'gclip' + k;
      const cp = el('clipPath', { id }, globes); el('circle', { cx, cy, r: R }, cp);
      el('circle', { cx, cy, r: R, class: pl }, globes);
      el('rect', { x: cx, y: cy - R, width: R, height: 2 * R, class: 'night', 'clip-path': `url(#${id})` }, globes);
      const ax = { x: -Math.sin(t), y: -Math.cos(t) }, pr = { x: Math.cos(t), y: -Math.sin(t) };
      el('line', { x1: cx - ax.x * R * 1.25, y1: cy - ax.y * R * 1.25, x2: cx + ax.x * R * 1.25, y2: cy + ax.y * R * 1.25, class: 'ink-s', 'stroke-width': 1.5 }, globes);
      el('text', { x: cx + ax.x * R * 1.25 - 4, y: cy + ax.y * R * 1.25 - 4, class: 'lbl-b halo', 'text-anchor': 'end', text: 'N' }, globes);
      el('line', { x1: cx - pr.x * R, y1: cy - pr.y * R, x2: cx + pr.x * R, y2: cy + pr.y * R, stroke: 'rgba(255,255,255,.5)', 'stroke-dasharray': '3 3' }, globes);
      const s = Math.sin(lat * DEG), c = Math.cos(lat * DEG), mx = cx + ax.x * R * s, my = cy + ax.y * R * s;
      el('line', { x1: mx - pr.x * R * c, y1: my - pr.y * R * c, x2: mx + pr.x * R * c, y2: my + pr.y * R * c, class: 'hi-s', 'stroke-width': 3.5, 'stroke-linecap': 'round' }, globes);
      el('text', { x: cx, y: 160, class: 'lbl-b', 'text-anchor': 'middle', text: `${P[pl].name} ${P[pl].tilt.toFixed(1)}°` }, globes);
    });
    el('text', { x: 8, y: 70, class: 'lbl-m', text: 'Sunlight' }, globes);
    [80, 92].forEach(y => { el('line', { x1: 8, y1: y, x2: 54, y2: y, class: 'hi-s', 'stroke-width': 2 }, globes); el('polygon', { points: `60,${y} 52,${y - 4} 52,${y + 4}`, class: 'hi-f' }, globes); });
  }
  function setLat(v) {
    lat = v; $('seLat').value = v; $('seLatOut').textContent = `${Math.abs(v)}°${v > 0 ? 'N' : v < 0 ? 'S' : ''}`;
    document.querySelectorAll('#sePresets button').forEach(b => b.classList.toggle('on', +b.dataset.lat === v));
    drawChart(); readouts(); drawGlobes();
  }
  function init() {
    chart = $('seChart'); gC = el('g', {}, chart); hoverG = el('g', {}, chart); globes = $('seGlobes');
    $('seLegend').innerHTML = '<span><i style="background:var(--earth)"></i>Earth (solid)</span><span><i style="background:repeating-linear-gradient(90deg,var(--mars) 0 6px,transparent 6px 9px)"></i>Mars (dashed)</span>';
    $('seLat').addEventListener('input', ev => setLat(+ev.target.value));
    document.querySelectorAll('#sePresets button').forEach(b => b.addEventListener('click', () => setLat(+b.dataset.lat)));
    chart.addEventListener('pointermove', hover);
    chart.addEventListener('pointerleave', () => { clear(hoverG); Tip.hide(); });
    setLat(68);
  }
  App.register('seasons', { init });
})();
