/* Tab 4: Launch window with a Hohmann transfer (circular orbits) */
(function () {
  const CX = 320, CY = 280, S = 150, RM = 1.524;
  const AT = (1 + RM) / 2, ET = (RM - 1) / (RM + 1), TT = 0.5 * Math.pow(AT, 1.5) * 365.256; // ~259 days
  const NEED = 180 - TT * 0.52403294;   // Mars must lead Earth by ~44 degrees
  const DAY0 = Orbit.jd(2026, 1, 1);
  const LE = jd => norm360(100.46457 + 0.98560910 * (jd - 2451545));
  const LM = jd => norm360(355.44657 + 0.52403294 * (jd - 2451545));
  let svg, gDyn, day = 0, flight = null, straight = false;

  const P = (r, a) => ({ x: CX + r * S * Math.cos(a * DEG), y: CY - r * S * Math.sin(a * DEG) });
  function craftAt(f, tau) {
    const Mn = Math.PI * tau / TT, E = solveKepler(Mn, ET);
    const nu = 2 * Math.atan2(Math.sqrt(1 + ET) * Math.sin(E / 2), Math.sqrt(1 - ET) * Math.cos(E / 2));
    return P(AT * (1 - ET * Math.cos(E)), f.th0 + nu / DEG);
  }
  function drawStatic() {
    const g = el('g', {}, svg);
    el('circle', { cx: CX, cy: CY, r: S, class: 'orbit' }, g);
    el('circle', { cx: CX, cy: CY, r: RM * S, class: 'orbit' }, g);
    el('text', { x: CX, y: CY + S - 8, class: 'lbl-m halo', 'text-anchor': 'middle', text: "Earth's orbit" }, g);
    el('text', { x: CX, y: CY + RM * S + 18, class: 'lbl-m halo', 'text-anchor': 'middle', text: "Mars' orbit" }, g);
    el('circle', { cx: CX, cy: CY, r: 16, class: 'sun-glow' }, g);
    el('circle', { cx: CX, cy: CY, r: 9, class: 'sun' }, g);
  }
  function planetLabel(g, q, text) {
    const dx = q.x - CX, dy = q.y - CY, d = Math.hypot(dx, dy), ux = dx / d, uy = dy / d;
    el('text', { x: q.x + ux * 16, y: q.y + uy * 16 + 5, class: 'lbl-b halo', 'text-anchor': ux > 0.3 ? 'start' : ux < -0.3 ? 'end' : 'middle', text }, g);
  }
  function render() {
    clear(gDyn); const g = gDyn;
    const jd = DAY0 + day + (flight ? flight.tau : 0);
    const le = LE(jd), lm = LM(jd), E = P(1, le), Mp = P(RM, lm);
    if (flight) {
      let d = ''; const n = 80;
      for (let i = 0; i <= n; i++) { const q = craftAt(flight, TT * i / n); d += (i ? 'L' : 'M') + q.x.toFixed(1) + ' ' + q.y.toFixed(1); }
      el('path', { d, fill: 'none', class: 'accent-s', 'stroke-width': 1.5, 'stroke-dasharray': '5 4', opacity: 0.8 }, g);
      for (let k = 20; k < TT; k += 20) { const q = craftAt(flight, k); el('circle', { cx: q.x, cy: q.y, r: 2.5, class: 'accent-f' }, g); }
      const tgt = P(RM, flight.th0 + 180);
      el('circle', { cx: tgt.x, cy: tgt.y, r: 12, fill: 'none', class: 'accent-s', 'stroke-width': 1.5, 'stroke-dasharray': '3 3' }, g);
      if (!flight.done) el('text', { x: tgt.x, y: tgt.y + (tgt.y > CY ? 28 : -18), class: 'lbl-acc halo', 'text-anchor': 'middle', text: 'arrival point' }, g);
      let tr = '';
      for (let i = 0; i <= 40; i++) { const q = craftAt(flight, flight.tau * i / 40); tr += (i ? 'L' : 'M') + q.x.toFixed(1) + ' ' + q.y.toFixed(1); }
      el('path', { d: tr, fill: 'none', class: 'accent-s', 'stroke-width': 3 }, g);
      const c = craftAt(flight, flight.tau);
      el('rect', { x: c.x - 5, y: c.y - 5, width: 10, height: 10, class: 'ink-f', transform: `rotate(45 ${c.x} ${c.y})` }, g);
      if (!flight.done) el('text', { x: c.x + 10, y: c.y + 16, class: 'lbl halo', text: 'spacecraft' }, g);
    } else if (straight) {
      el('line', { x1: E.x, y1: E.y, x2: Mp.x, y2: Mp.y, class: 'muted-s', 'stroke-width': 2, 'stroke-dasharray': '7 5' }, g);
      el('text', { x: (E.x + Mp.x) / 2 + 8, y: (E.y + Mp.y) / 2 - 8, class: 'lbl-m halo', text: 'straight shot' }, g);
      // where Mars will be after a straight 259-day trip
      const later = P(RM, LM(jd + TT));
      el('circle', { cx: later.x, cy: later.y, r: 8, fill: 'none', class: 's-mars', 'stroke-width': 1.5, 'stroke-dasharray': '3 3' }, g);
      el('text', { x: later.x, y: later.y - 14, class: 'lbl-m halo', 'text-anchor': 'middle', text: 'Mars 259 days later' }, g);
    }
    el('circle', { cx: E.x, cy: E.y, r: 9, class: 'earth paper-s', 'stroke-width': 2 }, g);
    planetLabel(g, E, 'Earth');
    el('circle', { cx: Mp.x, cy: Mp.y, r: 8, class: 'mars paper-s', 'stroke-width': 2 }, g);
    planetLabel(g, Mp, 'Mars');
    if (!flight) {
      // angle wedge from Earth's direction to Mars' direction
      const ph = angDiff(lm, le), r = 60, a1 = le, a2 = le + ph;
      const p1 = { x: CX + r * Math.cos(a1 * DEG), y: CY - r * Math.sin(a1 * DEG) }, p2 = { x: CX + r * Math.cos(a2 * DEG), y: CY - r * Math.sin(a2 * DEG) };
      el('line', { x1: CX, y1: CY, x2: E.x, y2: E.y, class: 'muted-s', 'stroke-dasharray': '2 4' }, g);
      el('line', { x1: CX, y1: CY, x2: Mp.x, y2: Mp.y, class: 'muted-s', 'stroke-dasharray': '2 4' }, g);
      el('path', { d: `M${p1.x},${p1.y} A${r},${r} 0 0 ${ph > 0 ? 0 : 1} ${p2.x},${p2.y}`, fill: 'none', class: 'hi-s', 'stroke-width': 3 }, g);
      const mid = le + ph / 2;
      el('text', { x: CX + (r + 18) * Math.cos(mid * DEG), y: CY - (r + 18) * Math.sin(mid * DEG) + 4, class: 'lbl-b halo', 'text-anchor': 'middle', text: Math.round(Math.abs(ph)) + '°' }, g);
    }
    el('text', { x: 14, y: 30, class: 'lbl-b halo', text: Orbit.dateText(jd) }, g);
    if (flight) el('text', { x: 14, y: 50, class: 'lbl halo', text: `Day ${Math.round(flight.tau)} of the trip` }, g);
    el('text', { x: 14, y: 548, class: 'lbl-m', text: 'Dots on the path are 20 days apart.' }, g);
    const jl = DAY0 + day; side(jl, LE(jl), LM(jl));
  }
  function side(jd, le, lm) {
    const ph = angDiff(lm, le), good = Math.abs(ph - NEED) <= 4;
    $('lwDateOut').textContent = Orbit.dateText(DAY0 + day, true);
    const st = $('lwStatus');
    if (flight) { st.className = 'status'; st.textContent = flight.done ? flight.msg : 'In flight...'; }
    else { st.className = 'status ' + (good ? 'good' : 'no'); st.textContent = good ? '✓ Launch window: Mars is in the right spot' : '✗ Not a launch window'; }
    const Ep = { x: Math.cos(le * DEG), y: Math.sin(le * DEG) }, Mp = { x: RM * Math.cos(lm * DEG), y: RM * Math.sin(lm * DEG) };
    const dist = Math.hypot(Mp.x - Ep.x, Mp.y - Ep.y);
    $('lwRead').innerHTML = `
      <div class="ro"><span>On the launch date, Mars is ${ph >= 0 ? 'ahead of' : 'behind'} Earth by</span><b>${Math.abs(ph).toFixed(0)}°</b></div>
      <div class="ro"><span>Needed for launch</span><b>${NEED.toFixed(0)}° ahead</b></div>
      <div class="ro"><span>Earth to Mars on the launch date</span><b>${(dist * 149.6).toFixed(0)} million km</b></div>
      <div class="ro"><span>Trip time on this path</span><b>${Math.round(TT)} days</b></div>
      <div class="ro"><span>Time between launch windows</span><b>about 780 days (26 months)</b></div>`;
    if (!flight) $('lwCaption').innerHTML = good
      ? `Good timing. Mars is ${Math.round(ph)}° ahead of Earth, so after the ${Math.round(TT)}-day trip it will be right at the arrival point. Press <b>Launch</b>.`
      : `Slide the date or press <b>Launch</b> anyway to see what happens. The spacecraft takes ${Math.round(TT)} days, so Mars needs to be about ${NEED.toFixed(0)}° ahead of Earth when it leaves.`;
  }
  function launch() {
    if (flight && !flight.done) return;
    const jd = DAY0 + day; flight = { th0: LE(jd), tau: 0, done: false };
    $('lwCaption').innerHTML = 'The spacecraft leaves moving the same way Earth does, then coasts outward on half of an ellipse. Watch where Mars is when it gets there.';
    $('lwLaunch').disabled = true;
  }
  function land() {
    const jd = DAY0 + day + TT, miss = angDiff(LM(jd), flight.th0 + 180);
    const km = Math.abs(miss) * DEG * RM * 149.6;
    flight.done = true; flight.tau = TT;
    flight.msg = Math.abs(miss) <= 4 ? '✓ Arrived at Mars' : `✗ Missed by ${Math.abs(miss).toFixed(0)}°`;
    $('lwCaption').innerHTML = Math.abs(miss) <= 4
      ? `Arrived on ${Orbit.dateText(jd)} after ${Math.round(TT)} days. Mars was right there because the launch was timed for where Mars <b>would be</b>.`
      : `The spacecraft reached Mars' orbit on ${Orbit.dateText(jd)}, but Mars was ${Math.abs(miss).toFixed(0)}° ${miss > 0 ? 'ahead' : 'behind'}, about ${km.toFixed(0)} million km away. Try <b>Jump to next launch window</b>.`;
    $('lwLaunch').disabled = false; $('lwLaunch').textContent = 'Launch again';
  }
  function setDay(d) { day = clamp(Math.round(d), 0, 2555); $('lwDate').value = day; flight = null; $('lwLaunch').disabled = false; $('lwLaunch').textContent = 'Launch'; render(); }
  function nextWindow() {
    const jd = DAY0 + day, ph = angDiff(LM(jd), LE(jd));
    let wait = norm360(ph - NEED) / 0.46158;
    if (wait < 2) wait += 780;
    if (day + wait > 2555) wait = norm360(angDiff(LM(DAY0), LE(DAY0)) - NEED) / 0.46158 - day;
    setDay(day + wait);
  }
  function init() {
    svg = $('lwSvg'); drawStatic(); gDyn = el('g', {}, svg);
    $('lwDate').addEventListener('input', ev => setDay(+ev.target.value));
    $('lwLaunch').addEventListener('click', () => { if (flight && flight.done) { flight = null; } launch(); render(); });
    $('lwNext').addEventListener('click', nextWindow);
    $('lwStraight').addEventListener('change', ev => { straight = ev.target.checked; render(); });
    const today = Math.floor(Date.now() / 86400000 + 2440587.5 - DAY0);
    setDay(clamp(today, 0, 2555));
  }
  function tick(dt) {
    if (!flight || flight.done) return;
    flight.tau += dt * TT / 7;
    if (flight.tau >= TT) land();
    render();
  }
  App.register('launch', { init, tick });
})();
