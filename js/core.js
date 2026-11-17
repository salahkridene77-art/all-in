/* ============================================================
   ALL IN — Cœur : stockage, dates, calculs, composants visuels
   ============================================================ */
import { GOALS, EXERCISES, TEMPLATES, SPLITS, TRAINING_DAYS, SCHEMES } from './data.js';

const KEY = 'allin_v1';

const blank = () => ({
  v: 1,
  profile: null,
  days: {},
  weights: [],
  skin: { answers: {}, zones: {}, feel: null, result: null, photos: [] },
  settings: {},
  coach: [],
  brief: null,
});

function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (!s || !s.v) return blank();
    return { ...blank(), ...s, skin: { ...blank().skin, ...(s.skin || {}) } };
  } catch { return blank(); }
}

export let S = load();

let afterSave = () => {};
export const onSave = (fn) => { afterSave = fn; };

// Sauvegarde sans déclencher la synchro (utilisée par la synchro elle-même)
export function saveQuiet() {
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { /* plein */ }
}

export function save() {
  try { localStorage.setItem(KEY, JSON.stringify(S)); afterSave(); return true; }
  catch (e) {
    // Quota dépassé : on retire les plus vieilles photos de peau
    if (S.skin.photos.length > 1) { S.skin.photos.shift(); return save(); }
    toast('Mémoire du téléphone pleine');
    return false;
  }
}

export function resetAll() { S = blank(); save(); }
export function replaceState(obj) { S = { ...blank(), ...obj }; save(); }

/* ---------- Dates ---------- */
export const pad = (n) => String(n).padStart(2, '0');
export const dateKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const today = () => dateKey();
export const parseKey = (k) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
export const addDays = (k, n) => { const d = parseKey(k); d.setDate(d.getDate() + n); return dateKey(d); };
export const weekdayMon = (d = new Date()) => ((d.getDay() + 6) % 7) + 1; // 1 = lundi
export const lastDays = (n) => Array.from({ length: n }, (_, i) => addDays(today(), i - n + 1));
export const DAY_SHORT = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
export const DAY_NAMES = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
export const dayLetter = (k) => DAY_SHORT[weekdayMon(parseKey(k)) - 1];
export function prettyDate(d = new Date()) {
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}
export function shortDate(k) {
  return parseKey(k).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

export function day(k = today()) {
  if (!S.days[k]) S.days[k] = { water: 0, steps: 0, meals: [], sleep: null, workout: null };
  return S.days[k];
}
export const peekDay = (k) => S.days[k] || { water: 0, steps: 0, meals: [], sleep: null, workout: null };

/* ---------- Calculs santé ---------- */
export function bmr(p = S.profile) {
  const base = 10 * p.weight + 6.25 * p.height - 5 * p.age;
  return p.sex === 'f' ? base - 161 : base + 5;
}

export function currentWeight() {
  const w = S.weights[S.weights.length - 1];
  return w ? w.kg : S.profile.weight;
}

export function targets(p = S.profile) {
  const weight = currentWeight();
  const pp = { ...p, weight };
  const goal = GOALS[p.goal];
  const tdee = bmr(pp) * Number(p.activity);
  const floor = p.sex === 'f' ? 1200 : 1500;
  const kcal = Math.max(floor, Math.round((tdee * (1 + goal.kcal)) / 10) * 10);
  const prot = Math.round(weight * goal.prot);
  const fat = Math.round(weight * 0.9);
  const carbs = Math.max(50, Math.round((kcal - prot * 4 - fat * 9) / 4));
  const water = Math.round((weight * 35) / 50) * 50;
  return { kcal, prot, fat, carbs, water, steps: goal.steps, sleepMin: 8 * 60, tdee: Math.round(tdee) };
}

export function bmi() {
  const h = S.profile.height / 100;
  const v = currentWeight() / (h * h);
  let cat = 'Corpulence normale', cls = 'good';
  if (v < 18.5) { cat = 'Maigreur'; cls = 'warn'; }
  else if (v >= 30) { cat = 'Obésité'; cls = 'bad'; }
  else if (v >= 25) { cat = 'Surpoids'; cls = 'warn'; }
  return { v: v.toFixed(1), cat, cls };
}

export const sum = (arr, f) => arr.reduce((a, x) => a + (Number(x[f]) || 0), 0);
export function dayNutrition(k = today()) {
  const m = peekDay(k).meals;
  return { kcal: Math.round(sum(m, 'k')), p: Math.round(sum(m, 'p')), g: Math.round(sum(m, 'g')), l: Math.round(sum(m, 'l')) };
}

export function sleepMinutes(bed, wake) {
  const [bh, bm] = bed.split(':').map(Number);
  const [wh, wm] = wake.split(':').map(Number);
  let m = (wh * 60 + wm) - (bh * 60 + bm);
  if (m <= 0) m += 24 * 60;
  return m;
}
export const fmtDur = (min) => `${Math.floor(min / 60)} h ${pad(min % 60)}`;

/* ---------- Générateur de programme ---------- */
function candidates(slot, place, lvl) {
  let list = Object.entries(EXERCISES).filter(([, e]) => e.slot === slot && e.lvl <= lvl && (e.place === 'both' || e.place === place));
  if (!list.length) list = Object.entries(EXERCISES).filter(([, e]) => e.slot === slot && e.lvl <= lvl);
  // Les exercices proches du niveau de la personne passent en premier
  return list.sort((a, b) => Math.abs(a[1].lvl - lvl) - Math.abs(b[1].lvl - lvl) || (a[1].place === place ? -1 : 1));
}

export function buildPlan(p = S.profile) {
  const lvl = Number(p.level);
  const scheme = SCHEMES[p.goal];
  const keys = SPLITS[p.days](p.goal);
  const seen = {};
  return keys.map((tk, i) => {
    const t = TEMPLATES[tk];
    const rep = (seen[tk] = (seen[tk] || 0) + 1) - 1; // 2e "push" = variantes décalées
    const used = new Set();
    const exercises = [];
    t.slots.forEach(([slot, variant]) => {
      const c = candidates(slot, p.place, lvl);
      for (let j = 0; j < c.length; j++) {
        const [id, e] = c[(variant + rep + j) % c.length];
        if (!used.has(id)) {
          used.add(id);
          const sets = scheme.sets[lvl - 1];
          const target = e.unit === 'reps' ? `${scheme.reps} reps` : e.unit === 'time' ? scheme.time : (['perte_poids', 'endurance'].includes(p.goal) ? '20 min' : '12 min');
          exercises.push({ id, ...e, sets: e.unit === 'cardio' ? 1 : sets, target, rest: e.unit === 'cardio' ? 0 : scheme.rest });
          break;
        }
      }
    });
    const mins = Math.round(exercises.reduce((a, e) => a + (e.unit === 'cardio' ? parseInt(e.target) : e.sets * (0.75 + e.rest / 60)), 0) + 8);
    return { idx: i, key: tk, name: t.name + (rep ? ' (variante)' : ''), focus: t.focus, exercises, minutes: mins, finisher: scheme.finisher, weekday: TRAINING_DAYS[p.days][i] };
  });
}

export function todaySession() {
  const plan = buildPlan();
  return plan.find((s) => s.weekday === weekdayMon()) || null;
}

export function streak() {
  // Jours consécutifs où au moins une action a été faite (eau, pas, repas, sommeil, séance)
  let n = 0;
  let k = today();
  const active = (d) => d && (d.water > 0 || d.steps > 0 || d.meals.length || d.sleep || d.workout);
  if (!active(S.days[k])) k = addDays(k, -1);
  while (active(S.days[k])) { n++; k = addDays(k, -1); }
  return n;
}

export function dayScore(k = today()) {
  const t = targets();
  const d = peekDay(k);
  const parts = [];
  const water = Math.min(1, d.water / t.water);
  const steps = Math.min(1, d.steps / t.steps);
  const sleep = d.sleep ? Math.min(1, d.sleep.minutes / t.sleepMin) * (0.8 + 0.05 * d.sleep.quality) : 0;
  const n = dayNutrition(k);
  const food = n.kcal ? Math.max(0, 1 - Math.abs(n.kcal - t.kcal) / t.kcal) : 0;
  parts.push(['Eau', water, 'var(--water)'], ['Pas', steps, 'var(--steps)'], ['Sommeil', Math.min(1, sleep), 'var(--sleep)'], ['Nutrition', food, 'var(--food)']);
  const isTrain = buildPlan().some((s) => s.weekday === weekdayMon(parseKey(k)));
  if (isTrain) parts.push(['Séance', d.workout ? 1 : 0, 'var(--accent)']);
  const score = Math.round((parts.reduce((a, x) => a + x[1], 0) / parts.length) * 100);
  return { score, parts };
}

/* ---------- Composants visuels ---------- */
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const fmt = (n) => Math.round(n).toLocaleString('fr-FR');

export function ring(pct, { size = 120, stroke = 12, color = 'var(--accent)', inner = '', track = 'var(--card2)' } = {}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c * (1 - Math.max(0, Math.min(1, pct)));
  return `<div class="ring" style="width:${size}px;height:${size}px">
    <svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${track}" stroke-width="${stroke}"/>
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${off}"/></svg>
    <div class="in">${inner}</div></div>`;
}

export const bar = (pct, color = 'var(--accent)') => `<div class="bar"><i style="width:${Math.max(0, Math.min(100, pct * 100))}%;background:${color}"></i></div>`;

export function barChart(values, labels, { color = 'var(--accent)', target = null, h = 120, fmtTop = null } = {}) {
  const w = 320, pad = 18, n = values.length;
  const max = Math.max(target || 0, ...values, 1) * 1.1;
  const bw = (w - pad * 2) / n;
  const bars = values.map((v, i) => {
    const bh = Math.max(v ? 4 : 0, (v / max) * (h - 30));
    const x = pad + i * bw + bw * 0.2;
    const y = h - 18 - bh;
    const isLast = i === n - 1;
    return `<rect x="${x}" y="${y}" width="${bw * 0.6}" height="${bh}" rx="6" fill="${color}" opacity="${isLast ? 1 : 0.45}"/>
      ${fmtTop && v ? `<text x="${x + bw * 0.3}" y="${y - 5}" text-anchor="middle">${fmtTop(v)}</text>` : ''}
      <text x="${x + bw * 0.3}" y="${h - 3}" text-anchor="middle">${labels[i]}</text>`;
  }).join('');
  const ty = target ? h - 18 - (target / max) * (h - 30) : 0;
  const tl = target ? `<line x1="${pad}" x2="${w - pad}" y1="${ty}" y2="${ty}" stroke="var(--muted)" stroke-dasharray="4 4" stroke-width="1" opacity=".6"/>` : '';
  return `<svg class="chart" viewBox="0 0 ${w} ${h}">${tl}${bars}</svg>`;
}

export function lineChart(points, { color = 'var(--body)', h = 140 } = {}) {
  if (points.length < 2) return '';
  const w = 320, px = 26, py = 16;
  const vals = points.map((p) => p.v);
  let min = Math.min(...vals), max = Math.max(...vals);
  if (max - min < 2) { min -= 1; max += 1; }
  const X = (i) => px + (i / (points.length - 1)) * (w - px * 2);
  const Y = (v) => py + (1 - (v - min) / (max - min)) * (h - py * 2 - 14);
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(p.v).toFixed(1)}`).join(' ');
  const area = `${d} L${X(points.length - 1)},${h - 14} L${X(0)},${h - 14} Z`;
  const dots = points.map((p, i) => `<circle cx="${X(i)}" cy="${Y(p.v)}" r="3.5" fill="${color}"/>`).join('');
  const lbl = [0, points.length - 1].map((i) => `<text x="${X(i)}" y="${h - 1}" text-anchor="${i ? 'end' : 'start'}">${points[i].l}</text>`).join('');
  return `<svg class="chart" viewBox="0 0 ${w} ${h}"><defs><linearGradient id="lg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity=".3"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient></defs>
    <path d="${area}" fill="url(#lg)"/><path d="${d}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linejoin="round"/>${dots}${lbl}</svg>`;
}

/* ---------- Toast & modal ---------- */
let toastT;
export function toast(msg) {
  document.querySelector('.toast')?.remove();
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  document.body.appendChild(el);
  clearTimeout(toastT);
  toastT = setTimeout(() => el.remove(), 2200);
}

export function openModal(html) {
  closeModal();
  const bg = document.createElement('div');
  bg.className = 'modal-bg';
  bg.innerHTML = `<div class="modal" role="dialog"><div class="grab"></div>${html}</div>`;
  bg.addEventListener('click', (e) => { if (e.target === bg) closeModal(); });
  document.body.appendChild(bg);
  return bg.querySelector('.modal');
}
export function closeModal() { document.querySelector('.modal-bg')?.remove(); }

/* ---------- Son & vibration ---------- */
let actx;
export function beep(freq = 880, dur = 0.15, times = 1) {
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    for (let i = 0; i < times; i++) {
      const o = actx.createOscillator(), g = actx.createGain();
      o.frequency.value = freq; o.connect(g); g.connect(actx.destination);
      const t0 = actx.currentTime + i * (dur + 0.08);
      g.gain.setValueAtTime(0.25, t0); g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      o.start(t0); o.stop(t0 + dur);
    }
  } catch { /* pas de son disponible */ }
  navigator.vibrate?.(times > 1 ? [120, 80, 120] : 80);
}
