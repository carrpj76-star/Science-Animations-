/* Tab 1: Pins-and-string ellipse builder */
(function () {
  const S = 26;                // pixels per centimeter on the board
  const CX = 320, CY = 200;
  const PRESETS = [['Circle', 0], ['Earth', 0.017], ['Mars', 0.094], ['Mercury', 0.206], ['Pluto', 0.249], ["Halley's Comet", 0.967]];
  let L = 10, d = 0.94, preset = 0.094, trace = 1, tracing = false, showCircle = false;
  let svg, gDyn;

  function init() {
    svg = $('ellSvg');
    const grid = el('g', {}, svg);
    for (let x = CX % S; x <= 640; x += S) el('line', { x1: x, y1: 0, x2: x, y2: 420, class: Math.round((x - CX) / S) % 5 === 0 ? 'g-grid2' : 'g-grid' }, grid);
    for (let y = CY % S; y <= 420; y += S) el('line', { x1: 0, y1: y, x2: 640, y2: y, class: Math.round((y - CY) / S) % 5 === 0 ? 'g-grid2' : 'g-grid' }, grid);
    el('text', { x: 10, y: 412, class: 'lbl-m', text: 'Grid: 1 square = 1 cm' }, svg);
    gDyn = el('g', {}, svg);

    const pr = $('ellPresets');
    PRESETS.forEach(([name, e]) => {
      const b = document.createElement('button'); b.type = 'button'; b.textContent = `${name} (${e.toFixed(3)})`; b.dataset.e = e;
      b.addEventListener('click', () => { preset = e; d = e * L; sync(); trace = 0; tracing = true; });
      pr.appendChild(b);
    });
    $('ellL').addEventListener('input', ev => { L = +ev.target.value; if (preset !== null) d = preset * L; d = Math.min(d, L - 0.1); sync(); });
    $('ellD').addEventListener('input', ev => { d = +ev.target.value; preset = null; sync(); });
    $('ellD').step = 0.01;
    $('ellDraw').addEventListener('click', () => { trace = 0; tracing = true; });
    $('ellCircle').addEventListener('change', ev => { showCircle = ev.target.checked; render(); });
    sync();
  }

  function sync() {
    const dIn = $('ellD'); dIn.max = (L - 0.1).toFixed(1); dIn.value = d;
    $('ellLOut').textContent = L.toFixed(1) + ' cm';
    $('ellDOut').textContent = d.toFixed(2) + ' cm';
    document.querySelectorAll('#ellPresets button').forEach(b => b.classList.toggle('on', preset !== null && +b.dataset.e === preset));
    readouts(); render();
  }

  function readouts() {
    const e = d / L, a = L / 2, c = d / 2;
    const r = $('ellRead');
    r.innerHTML = `
      <div class="ro math big">e = d ÷ L = ${d.toFixed(2)} ÷ ${L.toFixed(1)} = <b>${e.toFixed(3)}</b></div>
      <div class="ro math">Going the other way: d = e × L = ${e.toFixed(3)} × ${L.toFixed(1)} = ${d.toFixed(2)} ≈ <b>${d.toFixed(1)} cm</b> (nearest tenth)</div>
      <div class="ro"><span>Perihelion distance (Sun to closest point)</span><b>${(a - c).toFixed(2)} cm</b></div>
      <div class="ro"><span>Aphelion distance (Sun to farthest point)</span><b>${(a + c).toFixed(2)} cm</b></div>
      <div class="ro"><span>Aphelion − perihelion</span><b>${d.toFixed(2)} cm = d</b></div>
      <div class="ro"><span>String loop length (L + d)</span><b>${(L + d).toFixed(2)} cm</b></div>`;
  }

  function render() {
    clear(gDyn);
    const a = L / 2 * S, c = d / 2 * S, b = Math.sqrt(Math.max(a * a - c * c, 0));
    const sunX = CX + c, f2X = CX - c;
    if (showCircle) {
      el('circle', { cx: CX, cy: CY, r: a, class: 'orbit-faint' }, gDyn);
      el('text', { x: CX, y: CY - a - 6, class: 'lbl-m halo', 'text-anchor': 'middle', text: 'circle (e = 0)' }, gDyn);
    }
    // traced path
    const end = tracing ? trace * 2 * Math.PI : 2 * Math.PI;
    let dPath = '';
    const n = Math.max(2, Math.ceil(end / (2 * Math.PI) * 240));
    for (let i = 0; i <= n; i++) {
      const ph = end * i / n, x = CX + a * Math.cos(ph), y = CY - b * Math.sin(ph);
      dPath += (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1);
    }
    el('path', { d: dPath, fill: 'none', class: 's-mars', 'stroke-width': 2.5 }, gDyn);
    // major axis & labels
    el('line', { x1: CX - a, y1: CY, x2: CX + a, y2: CY, class: 'muted-s', 'stroke-dasharray': '5 4' }, gDyn);
    const by = CY + b + 18;
    el('line', { x1: CX - a, y1: by, x2: CX + a, y2: by, class: 'ink-s' }, gDyn);
    el('line', { x1: CX - a, y1: by - 5, x2: CX - a, y2: by + 5, class: 'ink-s' }, gDyn);
    el('line', { x1: CX + a, y1: by - 5, x2: CX + a, y2: by + 5, class: 'ink-s' }, gDyn);
    el('text', { x: CX, y: by - 5, class: 'lbl halo', 'text-anchor': 'middle', text: `Major axis L = ${L.toFixed(1)} cm` }, gDyn);
    // string while tracing
    if (tracing) {
      const ph = end, px = CX + a * Math.cos(ph), py = CY - b * Math.sin(ph);
      el('polyline', { points: `${f2X},${CY} ${px},${py} ${sunX},${CY}`, fill: 'none', class: 'ink-s', 'stroke-width': 1.5 }, gDyn);
      el('line', { x1: f2X, y1: CY, x2: sunX, y2: CY, class: 'ink-s', 'stroke-width': 1.5 }, gDyn);
      el('circle', { cx: px, cy: py, r: 5, class: 'ink-f' }, gDyn);
      const r1 = Math.hypot(px - sunX, py - CY) / S, r2 = Math.hypot(px - f2X, py - CY) / S;
      $('ellCaption').innerHTML = `Pencil to Sun = <b>${r1.toFixed(2)} cm</b>, pencil to Focus 2 = <b>${r2.toFixed(2)} cm</b>. Together: <b>${(r1 + r2).toFixed(2)} cm</b>. That sum never changes, and it equals the major axis.`;
    }
    // foci
    el('circle', { cx: sunX, cy: CY, r: 14, class: 'sun-glow' }, gDyn);
    el('circle', { cx: sunX, cy: CY, r: 8, class: 'sun' }, gDyn);
    el('text', { x: sunX + (d > 0.3 ? 4 : 12), y: CY + 26, class: 'lbl-b halo', text: 'Sun (Focus 1)' }, gDyn);
    if (d > 0.01) {
      el('circle', { cx: f2X, cy: CY, r: 5, class: 'ink-f' }, gDyn);
      el('text', { x: f2X - 4, y: CY - 12, class: 'lbl-b halo', 'text-anchor': 'end', text: 'Focus 2' }, gDyn);
    }
    if (d > 0.3) {
      const yy = CY - 30;
      el('line', { x1: f2X, y1: yy, x2: sunX, y2: yy, class: 'accent-s', 'stroke-width': 1.5 }, gDyn);
      el('line', { x1: f2X, y1: yy - 4, x2: f2X, y2: yy + 4, class: 'accent-s' }, gDyn);
      el('line', { x1: sunX, y1: yy - 4, x2: sunX, y2: yy + 4, class: 'accent-s' }, gDyn);
      el('text', { x: CX, y: yy - 6, class: 'lbl-acc halo', 'text-anchor': 'middle', text: `d = ${d.toFixed(2)} cm` }, gDyn);
    }
    // perihelion/aphelion
    if (!tracing) {
      el('circle', { cx: CX + a, cy: CY, r: 5, class: 'mars' }, gDyn);
      el('circle', { cx: CX - a, cy: CY, r: 5, class: 'mars' }, gDyn);
      el('text', { x: CX + a + 6, y: CY - 8, class: 'lbl-b halo', text: 'Perihelion' }, gDyn);
      el('text', { x: CX - a - 6, y: CY - 8, class: 'lbl-b halo', 'text-anchor': 'end', text: 'Aphelion' }, gDyn);
    }
  }

  function tick(dt) {
    if (!tracing) return;
    trace += dt / 5;
    if (trace >= 1) {
      trace = 1; tracing = false;
      $('ellCaption').innerHTML = `The orbit is done. The closest point to the Sun is <b>perihelion</b> and the farthest is <b>aphelion</b>. Try other presets to see how the shape changes.`;
    }
    render();
  }

  App.register('ellipse', { init, tick, onShow() { if (trace === 1 && !tracing) { trace = 0; tracing = true; } } });
})();
