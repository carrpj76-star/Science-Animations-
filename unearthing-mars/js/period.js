/* Tab 5: Kepler's 3rd law and satellites around Mars */
(function () {
  const PLANETS = [
    ['Mercury', 0.387, 0.241], ['Venus', 0.723, 0.615], ['Earth', 1.000, 1.000], ['Mars', 1.524, 1.881],
    ['Jupiter', 5.203, 11.86], ['Saturn', 9.537, 29.46], ['Uranus', 19.19, 84.01], ['Neptune', 30.07, 164.8]
  ];
  const GM_MARS = 42828, R_MARS = 3390;
  const MOONS = [['Phobos', 9376], ['Deimos', 23463]];
  const ML = 64, MR = 24, MT = 20, MB = 58, W = 640, H = 400;
  let view = 'curve', zoom = 8, chart, orbitsSvg, satSvg, gO, gS, timeY = 0, timeH = 0, satR = 15000;

  function niceStep(max) { const raw = max / 5, p = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / p; return (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * p; }
  const fmtN = v => v === 0 ? '0' : v >= 1000 ? v.toLocaleString('en-US', { maximumFractionDigits: 0 }) : v >= 10 ? v.toFixed(0) : v >= 1 ? v.toFixed(1).replace(/\.0$/, '') : v.toFixed(2).replace(/0$/, '');

  function drawChart() {
    clear(chart);
    const pts = PLANETS.slice(0, zoom).map(([n, a, T]) => ({ n, a, T, x: view === 'curve' ? a : a ** 3, y: view === 'curve' ? T : T ** 2 }));
    const maxX = Math.max(...pts.map(p => p.x)) * 1.08, maxY = Math.max(...pts.map(p => p.y)) * 1.08;
    const sx = v => ML + v / maxX * (W - ML - MR), sy = v => H - MB - v / maxY * (H - MT - MB);
    const xs = niceStep(maxX), ys = niceStep(maxY);
    for (let v = 0; v <= maxX; v += xs) { el('line', { x1: sx(v), y1: MT, x2: sx(v), y2: H - MB, class: 'g-grid' }, chart); el('text', { x: sx(v), y: H - MB + 18, class: 'lbl-m', 'text-anchor': 'middle', text: fmtN(v) }, chart); }
    for (let v = 0; v <= maxY; v += ys) { el('line', { x1: ML, y1: sy(v), x2: W - MR, y2: sy(v), class: 'g-grid' }, chart); el('text', { x: ML - 8, y: sy(v) + 4, class: 'lbl-m', 'text-anchor': 'end', text: fmtN(v) }, chart); }
    el('line', { x1: ML, y1: H - MB, x2: W - MR, y2: H - MB, class: 'axis' }, chart);
    el('line', { x1: ML, y1: MT, x2: ML, y2: H - MB, class: 'axis' }, chart);
    el('text', { x: (ML + W - MR) / 2, y: H - 14, class: 'lbl', 'text-anchor': 'middle', text: view === 'curve' ? 'Average distance from the Sun, a (AU)' : 'Distance cubed, a³ (AU³)' }, chart);
    el('text', { x: 16, y: (MT + H - MB) / 2, class: 'lbl', 'text-anchor': 'middle', transform: `rotate(-90 16 ${(MT + H - MB) / 2})`, text: view === 'curve' ? 'Period of revolution, T (Earth years)' : 'Period squared, T² (years²)' }, chart);
    // Kepler's law line/curve
    let d = '';
    for (let i = 0; i <= 120; i++) { const xv = maxX * i / 120, yv = view === 'curve' ? Math.pow(xv, 1.5) : xv; if (yv > maxY) break; d += (i ? 'L' : 'M') + sx(xv).toFixed(1) + ' ' + sy(yv).toFixed(1); }
    el('path', { d, fill: 'none', class: 'muted-s', 'stroke-width': 2, 'stroke-dasharray': '6 4' }, chart);
    // points
    const labeled = [];
    pts.forEach(p => {
      const cx = sx(p.x), cy = sy(p.y), cls = p.n === 'Earth' ? 'earth' : p.n === 'Mars' ? 'mars' : 'accent-f';
      el('circle', { cx, cy, r: 6, class: cls + ' paper-s', 'stroke-width': 2 }, chart);
      const crowded = zoom === 8 && p.a < 2;
      if (!crowded && labeled.every(q => Math.hypot(q[0] - cx, q[1] - cy) > 26)) {
        labeled.push([cx, cy]);
        const right = cx > W - MR - 90;
        el('text', { x: right ? cx - 10 : cx + 10, y: cy - 8, class: 'lbl-b halo', 'text-anchor': right ? 'end' : 'start', text: p.n }, chart);
      }
      const hit = el('circle', { cx, cy, r: 16, fill: 'transparent', style: 'cursor:pointer' }, chart);
      const html = `<b>${p.n}</b>${p.a} AU from the Sun<br>${p.T} years to orbit<br>a³ = ${fmtN(p.a ** 3)}, T² = ${fmtN(p.T ** 2)}`;
      hit.addEventListener('pointermove', ev => Tip.show(html, ev));
      hit.addEventListener('pointerleave', () => Tip.hide());
    });
    el('text', { x: ML + 12, y: MT + 14, class: 'lbl-m halo', text: view === 'curve' ? 'Dashed line: Kepler\'s third law, T² = a³' : 'Dashed line: T² = a³' }, chart);
    if (zoom === 8) el('text', { x: ML + 12, y: MT + 32, class: 'lbl-m halo', text: 'Mercury, Venus, Earth, and Mars are bunched near 0. Try Inner planets.' }, chart);
    $('pdCaption').innerHTML = view === 'curve'
      ? 'Farther planets take much longer to go around the Sun. Mars is about 1.5 times as far from the Sun as Earth, but it takes almost <b>1.9 times</b> as long to orbit. Hover over a planet for its numbers.'
      : 'Square each period and cube each distance, and every planet lands on the same straight line: <b>T² = a³</b>. That pattern is Kepler\'s third law.';
  }
  function table() {
    $('pdTable').innerHTML = '<thead><tr><th>Planet</th><th class="num">Distance a (AU)</th><th class="num">Period T (years)</th><th class="num">a³</th><th class="num">T²</th></tr></thead><tbody>' +
      PLANETS.map(([n, a, T]) => `<tr><td>${n}</td><td class="num">${a}</td><td class="num">${T}</td><td class="num">${fmtN(a ** 3)}</td><td class="num">${fmtN(T ** 2)}</td></tr>`).join('') + '</tbody>';
  }

  function radialLabel(g, c, x, y, text, cls) { // label pushed away from the center so it never sits on the Sun or Mars
    const dx = x - c, dy = y - c, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d;
    el('text', { x: x + ux * 10, y: y + uy * 10 + 4, class: cls, 'text-anchor': ux > 0.3 ? 'start' : ux < -0.3 ? 'end' : 'middle', text }, g);
  }
  /* inner planets animation */
  function drawOrbits() {
    clear(gO);
    const S = 85, c = 150;
    PLANETS.slice(0, 4).forEach(([n, a, T]) => {
      el('circle', { cx: c, cy: c, r: a * S, class: 'orbit', 'stroke-width': 1 }, gO);
      const ang = 2 * Math.PI * timeY / T + a * 3, x = c + a * S * Math.cos(ang), y = c - a * S * Math.sin(ang);
      const cls = n === 'Earth' ? 'earth' : n === 'Mars' ? 'mars' : 'muted-f';
      el('circle', { cx: x, cy: y, r: n === 'Mercury' ? 4 : 5.5, class: cls }, gO);
      radialLabel(gO, c, x, y, n, 'lbl-m halo');
    });
    el('circle', { cx: c, cy: c, r: 7, class: 'sun' }, gO);
    $('pdYear').textContent = `Earth years passed: ${timeY.toFixed(1)}. Mars finishes one lap every 1.88 years.`;
  }

  /* satellites around Mars */
  const vSat = r => Math.sqrt(GM_MARS / r);                       // km/s
  const tSat = r => 2 * Math.PI * r / vSat(r) / 3600;              // hours
  function drawSats() {
    clear(gS);
    const c = 150, S = 135 / 30000;
    const sats = [...MOONS, ['Your satellite', satR]];
    sats.forEach(([n, r], i) => {
      el('circle', { cx: c, cy: c, r: r * S, class: i === 2 ? 'orbit-faint' : 'orbit', 'stroke-width': 1 }, gS);
      const ang = 2 * Math.PI * timeH / tSat(r) + i * 2.1, x = c + r * S * Math.cos(ang), y = c - r * S * Math.sin(ang);
      el('circle', { cx: x, cy: y, r: i === 2 ? 5 : 4, class: i === 2 ? 'accent-f' : 'muted-f' }, gS);
      radialLabel(gS, c, x, y, n, i === 2 ? 'lbl-acc halo' : 'lbl-m halo');
    });
    el('circle', { cx: c, cy: c, r: R_MARS * S, class: 'mars' }, gS);
    el('text', { x: 8, y: 292, class: 'lbl-m', text: `Hours passed: ${timeH.toFixed(0)}` }, gS);
  }
  function satTable() {
    $('pdSatOut').textContent = satR.toLocaleString('en-US') + ' km';
    const rows = [...MOONS, ['Your satellite', satR]];
    $('pdSatTable').innerHTML = '<thead><tr><th>Satellite</th><th class="num">Distance (km)</th><th class="num">Speed (km/s)</th><th class="num">One orbit (hours)</th></tr></thead><tbody>' +
      rows.map(([n, r]) => `<tr><td>${n}</td><td class="num">${r.toLocaleString('en-US')}</td><td class="num">${vSat(r).toFixed(2)}</td><td class="num">${tSat(r).toFixed(1)}</td></tr>`).join('') + '</tbody>';
  }

  function init() {
    chart = $('pdChart'); orbitsSvg = $('pdOrbits'); satSvg = $('pdSats');
    gO = el('g', {}, orbitsSvg); gS = el('g', {}, satSvg);
    document.querySelectorAll('#tab-period [data-view]').forEach(b => b.addEventListener('click', () => { view = b.dataset.view; document.querySelectorAll('#tab-period [data-view]').forEach(x => x.classList.toggle('on', x === b)); drawChart(); }));
    document.querySelectorAll('#tab-period [data-zoom]').forEach(b => b.addEventListener('click', () => { zoom = +b.dataset.zoom; document.querySelectorAll('#tab-period [data-zoom]').forEach(x => x.classList.toggle('on', x === b)); drawChart(); }));
    $('pdSatR').addEventListener('input', ev => { satR = +ev.target.value; satTable(); drawSats(); });
    table(); satTable(); drawChart(); drawOrbits(); drawSats();
  }
  function tick(dt) { timeY += dt / 5; timeH += dt / 0.3; drawOrbits(); drawSats(); }
  App.register('period', { init, tick });
})();
