/* Shared helpers, orbit model, and tab app shell */
const DEG = Math.PI / 180;
const NS = 'http://www.w3.org/2000/svg';

function el(tag, attrs, parent) {
  const e = document.createElementNS(NS, tag);
  if (attrs) for (const k in attrs) {
    if (k === 'text') e.textContent = attrs[k];
    else if (attrs[k] !== undefined && attrs[k] !== null) e.setAttribute(k, attrs[k]);
  }
  if (parent) parent.appendChild(e);
  return e;
}
function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }
const $ = id => document.getElementById(id);
const norm360 = a => ((a % 360) + 360) % 360;
function angDiff(a, b) { let d = norm360(a - b); if (d > 180) d -= 360; return d; } // a minus b, -180..180
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MON3 = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

/* point in SVG user units from a pointer event */
function svgPoint(svg, evt) {
  const p = svg.createSVGPoint();
  p.x = evt.clientX; p.y = evt.clientY;
  return p.matrixTransform(svg.getScreenCTM().inverse());
}

/* Tooltip */
const Tip = {
  show(html, evt) {
    const t = $('tip'); t.innerHTML = html; t.hidden = false;
    const pad = 14, w = t.offsetWidth, h = t.offsetHeight;
    let x = evt.clientX + pad, y = evt.clientY + pad;
    if (x + w > window.innerWidth - 8) x = evt.clientX - w - pad;
    if (y + h > window.innerHeight - 8) y = evt.clientY - h - pad;
    t.style.left = x + 'px'; t.style.top = y + 'px';
  },
  hide() { $('tip').hidden = true; }
};

/* Kepler's equation */
function solveKepler(M, e) {
  let E = e < 0.8 ? M : Math.PI;
  for (let i = 0; i < 30; i++) {
    const dE = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    E -= dE; if (Math.abs(dE) < 1e-10) break;
  }
  return E;
}

/* Orbit model: JPL approximate mean elements (J2000), projected onto the ecliptic.
   Longitudes are shifted for precession so they match observations "of date",
   the same way Tycho's numbers were measured. */
const Orbit = {
  EL: {
    earth: { a: 1.00000261, e0: 0.01671123, e1: -0.00004392, L0: 100.46457166, L1: 35999.37244981, w0: 102.93768193, w1: 0.32327364 },
    mars:  { a: 1.52371034, e0: 0.09339410, e1: 0.00007882, L0: -4.55343205, L1: 19140.30268499, w0: -23.94362959, w1: 0.44441088 }
  },
  jd(y, m, d) { // Gregorian calendar date to Julian Day
    if (m <= 2) { y -= 1; m += 12; }
    const A = Math.floor(y / 100), B = 2 - A + Math.floor(A / 4);
    return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524.5;
  },
  date(jd) { // Julian Day to Gregorian {y, m, d}
    const Z = Math.floor(jd + 0.5), F = jd + 0.5 - Z;
    const alpha = Math.floor((Z - 1867216.25) / 36524.25);
    const A = Z + 1 + alpha - Math.floor(alpha / 4);
    const B = A + 1524, C = Math.floor((B - 122.1) / 365.25), D = Math.floor(365.25 * C), E = Math.floor((B - D) / 30.6001);
    const d = Math.floor(B - D - Math.floor(30.6001 * E) + F);
    const m = E < 14 ? E - 1 : E - 13;
    const y = m > 2 ? C - 4716 : C - 4715;
    return { y, m, d };
  },
  dateText(jd, short) { const t = this.date(jd); return short ? `${MON3[t.m - 1]} ${t.d}, ${t.y}` : `${MONTHS[t.m - 1]} ${t.d}, ${t.y}`; },
  year(jd) { return 2000 + (jd - 2451545) / 365.25; },
  helio(planet, jd) { // heliocentric ecliptic position in AU, equinox of date
    const T = (jd - 2451545) / 36525, el = this.EL[planet];
    const e = el.e0 + el.e1 * T, L = el.L0 + el.L1 * T, w = el.w0 + el.w1 * T;
    const M = norm360(L - w) * DEG, E = solveKepler(M, e);
    const nu = 2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(E / 2), Math.sqrt(1 - e) * Math.cos(E / 2));
    const r = el.a * (1 - e * Math.cos(E));
    const prec = 1.3969 * T; // degrees of precession since J2000
    const lon = norm360(nu / DEG + w + prec);
    return { x: r * Math.cos(lon * DEG), y: r * Math.sin(lon * DEG), r, lon };
  }
};

/* Protractor drawing (used by triangulation) */
function drawProtractor(parent, cx, cy, R) {
  const g = el('g', { transform: `translate(${cx},${cy})` }, parent);
  el('circle', { r: R, class: 'prot-face' }, g);
  el('circle', { r: 3, class: 'accent-f' }, g);
  for (let a = 0; a < 360; a++) {
    const len = a % 10 === 0 ? 10 : a % 5 === 0 ? 6 : 3;
    const c = Math.cos(a * DEG), s = -Math.sin(a * DEG);
    el('line', { x1: R * c, y1: R * s, x2: (R - len) * c, y2: (R - len) * s, class: 'prot-tick' }, g);
    if (a % 30 === 0) el('text', { x: (R - 19) * c, y: (R - 19) * s, class: 'prot-num', text: a }, g);
  }
  el('line', { x1: -R, y1: 0, x2: R, y2: 0, class: 'prot-tick', 'stroke-dasharray': '2 3' }, g);
  return g;
}

/* App shell: tabs, guided mode, theme, single animation loop */
const App = {
  mods: {}, order: [], current: null, guided: false,
  register(id, mod) { this.mods[id] = mod; this.order.push(id); },
  store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } },
  start() {
    for (const id of this.order) { try { this.mods[id].init(); } catch (e) { console.error(id, e); } }
    document.querySelectorAll('.tabs button').forEach(b => b.addEventListener('click', () => { this.show(b.dataset.tab); history.replaceState(null, '', '#' + b.dataset.tab); }));
    const g = $('guidedToggle');
    this.guided = this.store('um-guided') === '1'; g.checked = this.guided; document.body.classList.toggle('guided', this.guided);
    g.addEventListener('change', () => { this.guided = g.checked; document.body.classList.toggle('guided', this.guided); this.store('um-guided', this.guided ? '1' : '0'); for (const id of this.order) this.mods[id].onGuided && this.mods[id].onGuided(); });
    const tt = $('themeToggle');
    const isDark = () => { const t = document.documentElement.getAttribute('data-theme'); return t ? t === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches; };
    const label = () => { tt.textContent = isDark() ? 'Light' : 'Dark'; };
    label();
    tt.addEventListener('click', () => { const next = isDark() ? 'light' : 'dark'; document.documentElement.setAttribute('data-theme', next); this.store('um-theme', next); label(); });
    const hash = location.hash.slice(1);
    this.show(this.mods[hash] ? hash : (this.store('um-tab') && this.mods[this.store('um-tab')] ? this.store('um-tab') : 'ellipse'));
    window.addEventListener('hashchange', () => { const h = location.hash.slice(1); if (this.mods[h]) this.show(h); });
    let last = performance.now();
    const frame = now => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const m = this.mods[this.current];
      if (m && m.tick && !document.hidden) m.tick(dt);
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  },
  show(id) {
    if (this.current === id) return;
    this.current = id; this.store('um-tab', id);
    document.querySelectorAll('.tabs button').forEach(b => { const on = b.dataset.tab === id; b.setAttribute('aria-selected', on); b.tabIndex = on ? 0 : -1; });
    document.querySelectorAll('.panel').forEach(p => p.hidden = p.id !== 'tab-' + id);
    const m = this.mods[id]; m && m.onShow && m.onShow();
    Tip.hide();
  }
};
