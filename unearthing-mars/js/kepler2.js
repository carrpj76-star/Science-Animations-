/* Tab 3: Kepler's 2nd law, gravity, and inertia */
(function () {
  const A_AU = 1.524, A_PX = 210, CY = 230, CXE = 300, SECS = 14, N = 12;
  let e = 0.094, M = 0, playing = true, slices = true, arrows = true, free = null;
  let svg, gDyn, sky;

  const geom = () => { const c = A_PX * e, b = A_PX * Math.sqrt(1 - e * e); return { c, b, sx: CXE + c }; };
  function posAt(Mx) { // pixel position and r (AU) at mean anomaly Mx
    const E = solveKepler(((Mx % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI), e), g = geom();
    const x = CXE + A_PX * Math.cos(E), y = CY - g.b * Math.sin(E);
    return { x, y, r: A_AU * (1 - e * Math.cos(E)) };
  }
  const speed = r => 29.78 * Math.sqrt(2 / r - 1 / A_AU);       // km/s (vis-viva)
  const pull = r => Math.pow(A_AU / r, 2) * 100;                   // % of pull at average distance
  const sunSize = r => 0.533 / r;                                   // degrees

  function arrow(g, x1, y1, x2, y2, cls, label) {
    const ang = Math.atan2(y2 - y1, x2 - x1), h = 9;
    el('line', { x1, y1, x2: x2 - Math.cos(ang) * h * 0.6, y2: y2 - Math.sin(ang) * h * 0.6, class: cls + '-s', 'stroke-width': 3, 'stroke-linecap': 'round' }, g);
    el('polygon', { points: `${x2},${y2} ${x2 - h * Math.cos(ang - 0.45)},${y2 - h * Math.sin(ang - 0.45)} ${x2 - h * Math.cos(ang + 0.45)},${y2 - h * Math.sin(ang + 0.45)}`, class: cls + '-f' }, g);
    if (label) el('text', { x: x2 + Math.cos(ang) * 10, y: y2 + Math.sin(ang) * 10 + 4, class: 'lbl halo', 'text-anchor': Math.cos(ang) > 0.2 ? 'start' : Math.cos(ang) < -0.2 ? 'end' : 'middle', text: label }, g);
  }

  function render() {
    clear(gDyn);
    const g = gDyn, geo = geom();
    // slices
    const cur = Math.floor((((M % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) / (2 * Math.PI) * N);
    if (slices) for (let k = 0; k < N; k++) {
      let d = `M${geo.sx},${CY}`;
      for (let i = 0; i <= 16; i++) { const p = posAt(2 * Math.PI * (k + i / 16) / N); d += `L${p.x.toFixed(1)},${p.y.toFixed(1)}`; }
      el('path', { d: d + 'Z', class: (k === cur && !free ? 'slice-on' : k % 2 ? 'slice-b' : 'slice-a') + ' slice-edge' }, g);
    }
    el('ellipse', { cx: CXE, cy: CY, rx: A_PX, ry: geo.b, class: 'orbit' }, g);
    // perihelion / aphelion
    el('circle', { cx: CXE + A_PX, cy: CY, r: 4, class: 'ink-f' }, g);
    el('circle', { cx: CXE - A_PX, cy: CY, r: 4, class: 'ink-f' }, g);
    el('text', { x: CXE + A_PX + 8, y: CY + 4, class: 'lbl-b halo', text: 'Perihelion' }, g);
    el('text', { x: CXE - A_PX - 8, y: CY + 4, class: 'lbl-b halo', 'text-anchor': 'end', text: 'Aphelion' }, g);
    // sun
    el('circle', { cx: geo.sx, cy: CY, r: 16, class: 'sun-glow' }, g);
    el('circle', { cx: geo.sx, cy: CY, r: 9, class: 'sun' }, g);

    let mx, my, r;
    if (free) {
      mx = free.x; my = free.y; r = Math.hypot(mx - geo.sx, my - CY) / A_PX * A_AU;
      el('line', { x1: free.x0, y1: free.y0, x2: mx, y2: my, class: 'muted-s', 'stroke-dasharray': '6 5', 'stroke-width': 1.5 }, g);
      el('line', { x1: mx, y1: my, x2: mx + free.vx * 3, y2: my + free.vy * 3, class: 'muted-s', 'stroke-dasharray': '2 6', 'stroke-width': 1.5 }, g);
      if (arrows) { const v = Math.hypot(free.vx, free.vy); arrow(g, mx, my, mx + free.vx / v * free.vlen, my + free.vy / v * free.vlen, 'accent', 'velocity'); }
    } else {
      const p = posAt(M); mx = p.x; my = p.y; r = p.r;
      if (arrows) {
        const q = posAt(M + 0.001), vx = q.x - p.x, vy = q.y - p.y, vl = Math.hypot(vx, vy);
        const vlen = 46 * speed(r) / speed(A_AU);
        arrow(g, mx, my, mx + vx / vl * vlen, my + vy / vl * vlen, 'accent', 'velocity');
        const gx = geo.sx - mx, gy = CY - my, gl = Math.hypot(gx, gy), glen = Math.min(36 * pull(r) / 100, gl - 14);
        arrow(g, mx, my, mx + gx / gl * glen, my + gy / gl * glen, 'hi', 'gravity');
      }    }
    el('circle', { cx: mx, cy: my, r: 9, class: 'mars paper-s', 'stroke-width': 2 }, g);
    if (mx > -20 && mx < 660 && my > -20 && my < 480) el('text', { x: mx + 12, y: my - 12, class: 'lbl-b halo', text: 'Mars' }, g);
    if (slices && !free) el('text', { x: 14, y: 448, class: 'lbl-m', text: `Each slice = 1/12 of a Mars year = 57 Earth days` }, g);
    readouts(r);
    drawSky(r);
  }

  function readouts(r) {
    const day = Math.round((((M % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) / (2 * Math.PI) * 687);
    const off = free ? Math.hypot(free.x - geom().sx, free.y - CY) > 700 : false;
    $('k2Read').innerHTML = free ? `
      <div class="ro"><span>Gravity</span><b>OFF</b></div>
      <div class="ro"><span>Speed</span><b>${free.v.toFixed(1)} km/s (not changing)</b></div>
      <div class="ro"><span>Direction</span><b>straight line</b></div>${off ? '<div class="ro">Mars has left the solar system for good.</div>' : ''}` : `
      <div class="ro"><span>Day of the Mars year</span><b>${day} of 687</b></div>
      <div class="ro"><span>Distance from Sun</span><b>${(r * 149.6).toFixed(0)} million km (${r.toFixed(2)} AU)</b></div>
      <div class="ro"><span>Orbital speed</span><b>${speed(r).toFixed(1)} km/s</b></div>
      <div class="ro"><span>Sun's pull (100% = average)</span><b>${pull(r).toFixed(0)}%</b></div>`;
  }
  function drawSky(r) {
    clear(sky);
    el('rect', { x: 0, y: 0, width: 220, height: 110, fill: '#0B1620' }, sky);
    const rad = x => 14 / x, rp = A_AU * (1 - e), ra = A_AU * (1 + e), cx = 110, cy = 55;
    el('circle', { cx, cy, r: rad(r) * 1.9, fill: '#FFD866', opacity: 0.18 }, sky);
    el('circle', { cx, cy, r: rad(r), fill: '#F4B942' }, sky);
    el('circle', { cx, cy, r: rad(rp), fill: 'none', stroke: '#E3EBEE', 'stroke-dasharray': '3 3', 'stroke-width': 1 }, sky);
    el('circle', { cx, cy, r: rad(ra), fill: 'none', stroke: '#8FA2AC', 'stroke-dasharray': '2 3', 'stroke-width': 1 }, sky);
    el('text', { x: 8, y: 18, fill: '#E3EBEE', style: 'font:12px var(--body)', text: 'Sun seen from Mars' }, sky);
    el('text', { x: 8, y: 102, fill: '#A0B1BA', style: 'font:11px var(--body)', text: 'dashed: size at perihelion / aphelion' }, sky);
    $('k2SkyText').innerHTML = free ? 'Without gravity Mars drifts away and the Sun keeps shrinking.' :
      `The Sun looks <b>${sunSize(r).toFixed(2)}°</b> wide from Mars right now. From Earth it's about 0.53°. Closer to the Sun means a bigger-looking Sun.`;
  }
  function table() {
    const rp = A_AU * (1 - e), ra = A_AU * (1 + e);
    $('k2Table').innerHTML = `<thead><tr><th></th><th class="num">Perihelion</th><th class="num">Aphelion</th></tr></thead><tbody>
      <tr><td>Distance (million km)</td><td class="num">${(rp * 149.6).toFixed(0)}</td><td class="num">${(ra * 149.6).toFixed(0)}</td></tr>
      <tr><td>Speed (km/s)</td><td class="num">${speed(rp).toFixed(1)}</td><td class="num">${speed(ra).toFixed(1)}</td></tr>
      <tr><td>Sun's pull (% of average)</td><td class="num">${pull(rp).toFixed(0)}%</td><td class="num">${pull(ra).toFixed(0)}%</td></tr>
      <tr><td>Sun's size from Mars</td><td class="num">${sunSize(rp).toFixed(2)}°</td><td class="num">${sunSize(ra).toFixed(2)}°</td></tr></tbody>`;
  }
  function setE(v) {
    e = v; $('k2E').value = v; $('k2EOut').textContent = v.toFixed(3);
    document.querySelectorAll('#k2Presets button').forEach(b => b.classList.toggle('on', Math.abs(+b.dataset.e - v) < 1e-6));
    free = null; $('k2Gravity').textContent = 'Turn off gravity'; table(); render();
  }
  function toggleGravity() {
    if (free) { free = null; $('k2Gravity').textContent = 'Turn off gravity'; $('k2Caption').textContent = 'Gravity is back on. The Sun pulls Mars toward it the whole time, which bends its path into an ellipse.'; render(); return; }
    const p = posAt(M), q = posAt(M + 0.001), dMdt = 2 * Math.PI / SECS;
    const vx = (q.x - p.x) / 0.001 * dMdt, vy = (q.y - p.y) / 0.001 * dMdt;
    free = { x: p.x, y: p.y, x0: p.x, y0: p.y, vx, vy, v: speed(p.r), vlen: 46 * speed(p.r) / speed(A_AU) };
    playing = true; $('k2Play').textContent = 'Pause';
    $('k2Gravity').textContent = 'Turn gravity back on';
    $('k2Caption').innerHTML = "Gravity is off. Nothing pulls Mars toward the Sun, so it keeps going in a <b>straight line</b> at the same speed. That's inertia.";
    render();
  }
  function init() {
    svg = $('k2Svg'); gDyn = el('g', {}, svg); sky = $('k2Sky');
    $('k2E').addEventListener('input', ev => setE(+ev.target.value));
    document.querySelectorAll('#k2Presets button').forEach(b => b.addEventListener('click', () => setE(+b.dataset.e)));
    $('k2Play').addEventListener('click', () => { playing = !playing; $('k2Play').textContent = playing ? 'Pause' : 'Play'; });
    $('k2Gravity').addEventListener('click', toggleGravity);
    $('k2Slices').addEventListener('change', ev => { slices = ev.target.checked; render(); });
    $('k2Arrows').addEventListener('change', ev => { arrows = ev.target.checked; render(); });
    setE(0.094);
  }
  function tick(dt) {
    if (!playing) return;
    if (free) { free.x += free.vx * dt; free.y += free.vy * dt; }
    else M += dt * 2 * Math.PI / SECS;
    render();
  }
  App.register('kepler2', { init, tick });
})();
