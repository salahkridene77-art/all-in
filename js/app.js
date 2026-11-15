/* ============================================================
   ALL IN — Écrans et interactions
   ============================================================ */
import * as D from './data.js';
import {
  S, save, resetAll, replaceState, today, day, peekDay, lastDays, dayLetter, addDays, parseKey, weekdayMon,
  DAY_SHORT, DAY_NAMES, prettyDate, shortDate, targets, bmi, currentWeight, dayNutrition, sleepMinutes, fmtDur,
  buildPlan, todaySession, streak, dayScore, esc, fmt, ring, bar, barChart, lineChart, toast, openModal, closeModal, beep, pad,
} from './core.js';

const app = document.getElementById('app');
const MEALS = ['Petit-déjeuner', 'Déjeuner', 'Dîner', 'Collation'];

const ui = {
  nutriTab: 'journal', recipeFilter: 'all', meal: 'Déjeuner', portion: 1, foodQ: '',
  ob: null, skin: { step: null, sel: null, photo: null, zones: {}, feel: null, answers: {}, camError: false },
  openSession: null, wk: null, cycleMode: 'bed', cycleTime: '23:00', lastRoute: '',
};

/* ============================================================
   Routeur
   ============================================================ */
function route() {
  const h = location.hash.replace(/^#\/?/, '') || 'home';
  const [page, sub] = h.split('/');
  return { page, sub };
}
const go = (to) => { location.hash = '#/' + to; };

function render() {
  const { page, sub } = route();
  const key = page + '/' + (sub || '');
  if (page !== 'wk') stopWorkoutTimer();
  if (page !== 'peau') stopCamera();

  if (!S.profile) {
    if (!ui.ob) ui.ob = newOb();
    app.innerHTML = viewOnboarding();
  } else if (page === 'onboarding') {
    if (!ui.ob) ui.ob = newOb(true);
    app.innerHTML = viewOnboarding();
  } else {
    const views = { home: viewHome, sport: viewSport, wk: viewWorkout, nutrition: viewNutrition, suivi: () => viewSuivi(sub || 'eau'), peau: viewPeau, profil: viewProfil };
    const v = views[page] || viewHome;
    const noNav = page === 'wk';
    app.innerHTML = v() + (noNav ? '' : nav(page));
  }
  if (key !== ui.lastRoute) { window.scrollTo(0, 0); ui.lastRoute = key; }
  afterRender(page);
}
const rerender = () => { const y = window.scrollY; render(); window.scrollTo(0, y); };

function afterRender(page) {
  if (page === 'peau' && ui.skin.step === 'photo' && !ui.skin.photo && !ui.skin.camError) startCamera();
  const q = document.getElementById('food-q');
  if (q && document.activeElement !== q && ui.focusFood) { q.focus(); ui.focusFood = false; }
}

function nav(page) {
  const tabs = [['home', '🏠', 'Accueil'], ['sport', '🏋️', 'Sport'], ['nutrition', '🥗', 'Nutrition'], ['suivi', '📊', 'Suivi'], ['peau', '✨', 'Peau']];
  return `<nav class="nav"><div class="nav-in">${tabs.map(([k, i, l]) => `<a href="#/${k}" class="${page === k || (k === 'home' && page === 'profil') ? 'on' : ''}"><span class="i">${i}</span>${l}</a>`).join('')}</div></nav>`;
}

function header(title, { back = null, right = '' } = {}) {
  return `<div class="top">${back ? `<button class="back" data-act="go" data-to="${back}" aria-label="Retour">←</button>` : ''}<h1 class="grow">${title}</h1>${right}</div>`;
}

/* ============================================================
   Onboarding
   ============================================================ */
function newOb(edit = false) {
  const p = S.profile;
  return {
    step: edit ? 1 : 0, edit,
    d: p ? { ...p, weight: currentWeight() } : { name: '', sex: '', age: '', height: '', weight: '', goal: '', level: '', place: '', days: 3, activity: '1.375' },
  };
}

function viewOnboarding() {
  const ob = ui.ob, d = ob.d;
  if (ob.step === 0) {
    return `<div class="splash">
      <div><div class="xs upper muted" style="margin-bottom:14px">Sport · Nutrition · Sommeil · Skincare</div>
        <div class="brand">ALL<br><span>IN.</span></div>
        <p class="muted" style="margin-top:18px;font-size:17px;line-height:1.5;max-width:320px">Ton corps, ton rythme. Tout ce qu'il faut pour aller mieux, dans une seule appli.</p></div>
      <div><div class="feat"><div><span>🏋️</span>Programme</div><div><span>💧</span>Eau</div><div><span>😴</span>Sommeil</div><div><span>🥗</span>Calories</div><div><span>👟</span>Pas</div><div><span>✨</span>Skincare</div></div>
        <button class="btn primary block" data-act="ob-next">Commencer</button>
        <p class="note center" style="margin-top:12px">Gratuit · Tes données restent sur ton téléphone</p></div></div>`;
  }
  const total = 6;
  const steps = {
    1: () => ({
      title: 'Comment tu t\'appelles ?', sub: 'Pour personnaliser ton expérience.',
      ok: d.name.trim() && d.sex,
      body: `<div class="field"><label>Prénom</label><input class="input" data-bind="name" value="${esc(d.name)}" placeholder="Ton prénom" autocomplete="given-name"></div>
        <div class="field"><label>Sexe (pour le calcul des besoins)</label><div class="grid2">
        ${[['h', '👨', 'Homme'], ['f', '👩', 'Femme']].map(([v, i, l]) => `<button class="choice ${d.sex === v ? 'on' : ''}" data-act="ob-set" data-k="sex" data-v="${v}"><span class="ico">${i}</span><span class="t">${l}</span></button>`).join('')}</div></div>`,
    }),
    2: () => ({
      title: 'Tes mesures', sub: 'Elles servent à calculer tes calories, ton eau et ton IMC.',
      ok: d.age >= 14 && d.age <= 99 && d.height >= 120 && d.height <= 230 && d.weight >= 30 && d.weight <= 300,
      body: `<div class="field"><label>Âge (ans)</label><input class="input lg" type="number" inputmode="numeric" data-bind="age" value="${esc(d.age)}" placeholder="25"></div>
        <div class="field"><label>Taille (cm)</label><input class="input lg" type="number" inputmode="numeric" data-bind="height" value="${esc(d.height)}" placeholder="175"></div>
        <div class="field"><label>Poids (kg)</label><input class="input lg" type="number" inputmode="decimal" step="0.1" data-bind="weight" value="${esc(d.weight)}" placeholder="75"></div>`,
    }),
    3: () => ({
      title: 'Ton objectif', sub: 'Ton programme sport et nutrition s\'adapte à ce choix.',
      ok: d.goal,
      body: Object.entries(D.GOALS).map(([k, g]) => `<button class="choice ${d.goal === k ? 'on' : ''}" data-act="ob-set" data-k="goal" data-v="${k}"><span class="ico">${g.icon}</span><span><div class="t">${g.label}</div><div class="d">${g.desc}</div></span></button>`).join(''),
    }),
    4: () => ({
      title: 'Ton niveau et ton lieu', sub: 'Pour choisir les bons exercices.',
      ok: d.level && d.place,
      body: `${Object.entries(D.LEVELS).map(([k, l]) => `<button class="choice ${String(d.level) === k ? 'on' : ''}" data-act="ob-set" data-k="level" data-v="${k}"><span class="ico">${'🔥'.repeat(Number(k))}</span><span><div class="t">${l.label}</div><div class="d">${l.desc}</div></span></button>`).join('')}
        <div class="field" style="margin-top:8px"><label>Tu t'entraînes où ?</label><div class="grid2">
        ${[['maison', '🏠', 'À la maison', 'Sans matériel'], ['salle', '🏢', 'En salle', 'Machines et haltères']].map(([v, i, l, s]) => `<button class="choice ${d.place === v ? 'on' : ''}" data-act="ob-set" data-k="place" data-v="${v}" style="flex-direction:column;align-items:flex-start;gap:6px"><span style="font-size:24px">${i}</span><span><div class="t">${l}</div><div class="d">${s}</div></span></button>`).join('')}</div></div>`,
    }),
    5: () => ({
      title: 'Ton rythme', sub: 'Combien de séances par semaine, et ton activité au quotidien.',
      ok: d.days && d.activity,
      body: `<div class="field"><label>Séances par semaine</label><div class="seg">${[2, 3, 4, 5, 6].map((n) => `<button class="${Number(d.days) === n ? 'on' : ''}" data-act="ob-set" data-k="days" data-v="${n}">${n}</button>`).join('')}</div></div>
        <div class="field" style="margin-top:6px"><label>Activité au quotidien (hors sport)</label></div>
        ${Object.entries(D.ACTIVITY).map(([k, a]) => `<button class="choice ${String(d.activity) === k ? 'on' : ''}" data-act="ob-set" data-k="activity" data-v="${k}"><span><div class="t">${a.label}</div><div class="d">${a.desc}</div></span></button>`).join('')}`,
    }),
    6: () => {
      const p = { ...d, age: +d.age, height: +d.height, weight: +d.weight };
      const t = targetsFor(p);
      return {
        title: `C'est prêt, ${esc(d.name)} 🎉`, sub: 'Voici tes objectifs quotidiens. Tu pourras les modifier dans ton profil.', ok: true,
        body: `<div class="target-grid">
          <div class="card"><div class="xs upper muted">Calories</div><div class="mid-num color-food">${fmt(t.kcal)}</div><div class="xs muted">kcal / jour</div></div>
          <div class="card"><div class="xs upper muted">Protéines</div><div class="mid-num color-accent">${t.prot} g</div><div class="xs muted">par jour</div></div>
          <div class="card"><div class="xs upper muted">Eau</div><div class="mid-num color-water">${(t.water / 1000).toFixed(1)} L</div><div class="xs muted">par jour</div></div>
          <div class="card"><div class="xs upper muted">Pas</div><div class="mid-num color-steps">${fmt(t.steps)}</div><div class="xs muted">par jour</div></div>
          <div class="card"><div class="xs upper muted">Sommeil</div><div class="mid-num color-sleep">8 h</div><div class="xs muted">par nuit</div></div>
          <div class="card"><div class="xs upper muted">Sport</div><div class="mid-num">${d.days}×</div><div class="xs muted">par semaine</div></div></div>
          <p class="note">Calculs basés sur la formule de Mifflin-St Jeor. Ce sont des repères, pas une prescription médicale. En cas de problème de santé, demande l'avis d'un médecin avant de commencer.</p>`,
      };
    },
  };
  const s = steps[ob.step]();
  return `<div class="ob">
    <div class="row" style="gap:14px">${ob.step > 1 || ob.edit ? `<button class="icon-btn" data-act="ob-back" aria-label="Retour">←</button>` : `<button class="icon-btn" data-act="ob-back" aria-label="Retour">←</button>`}
      <div class="ob-progress grow">${Array.from({ length: total }, (_, i) => `<i class="${i < ob.step ? 'on' : ''}"></i>`).join('')}</div></div>
    <div class="body"><div><h1>${s.title}</h1><p class="muted" style="margin-top:6px">${s.sub}</p></div>${s.body}</div>
    <div class="foot"><button class="btn primary block" data-act="ob-next" ${s.ok ? '' : 'disabled'}>${ob.step === total ? (ob.edit ? 'Enregistrer' : 'C\'est parti 🚀') : 'Continuer'}</button></div></div>`;
}

function targetsFor(p) {
  const saved = S.profile, savedW = S.weights;
  S.profile = p; S.weights = [];
  const t = targets(p);
  S.profile = saved; S.weights = savedW;
  return t;
}

function finishOnboarding() {
  const d = ui.ob.d;
  const p = { name: d.name.trim(), sex: d.sex, age: +d.age, height: +d.height, weight: +d.weight, goal: d.goal, level: +d.level, place: d.place, days: +d.days, activity: String(d.activity), createdAt: S.profile?.createdAt || today() };
  const wasEdit = ui.ob.edit;
  S.profile = p;
  if (!S.weights.length || Math.abs(currentWeight() - p.weight) > 0.01) addWeight(p.weight);
  save();
  ui.ob = null;
  toast(wasEdit ? 'Profil mis à jour' : `Bienvenue ${p.name} 💪`);
  go(wasEdit ? 'profil' : 'home');
  render();
}

/* ============================================================
   Accueil
   ============================================================ */
function tipOfDay() {
  const list = [...(D.TIPS[S.profile.goal] || []), ...D.TIPS.general];
  const doy = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 864e5);
  return list[doy % list.length];
}

function viewHome() {
  const p = S.profile, t = targets(), d = peekDay(today());
  const { score, parts } = dayScore();
  const ses = todaySession();
  const n = dayNutrition();
  const st = streak();
  const hour = new Date().getHours();
  const hello = hour < 5 ? 'Bonne nuit' : hour < 12 ? 'Bonjour' : hour < 18 ? 'Salut' : 'Bonsoir';
  const verdict = score >= 80 ? 'Journée au top 🔥' : score >= 50 ? 'Bien parti, continue !' : score > 0 ? 'C\'est le début, on y va' : 'Commence ta journée';
  const sk = S.skin.result;

  let wk;
  if (ses && d.workout) {
    wk = `<div class="card"><div class="today-workout"><div class="big-ico bg-accent">✅</div><div class="grow"><div class="xs upper muted">Séance du jour</div><h3 style="margin-top:3px">${esc(d.workout.name)} terminée</h3><p class="small muted" style="margin-top:3px">Bravo, récupère bien. Pense aux protéines.</p></div></div></div>`;
  } else if (ses) {
    wk = `<div class="card accent tap" data-act="go" data-to="sport"><div class="today-workout"><div class="big-ico">🏋️</div><div class="grow"><div class="xs upper muted">Séance du jour</div><h2 style="margin-top:2px">${ses.name}</h2><p class="small muted" style="margin-top:3px">${ses.exercises.length} exercices · ~${ses.minutes} min · ${ses.focus}</p></div></div>
      <button class="btn block" style="margin-top:14px;background:var(--accent-ink);color:var(--accent)" data-act="start-wk" data-i="${ses.idx}">▶ Commencer la séance</button></div>`;
  } else {
    wk = `<div class="card tap" data-act="go" data-to="sport"><div class="today-workout"><div class="big-ico bg-sleep">🧘</div><div class="grow"><div class="xs upper muted">Aujourd'hui</div><h3 style="margin-top:3px">Jour de repos</h3><p class="small muted" style="margin-top:3px">Récupération active : 30 min de marche et 5 min d'étirements.</p></div><span class="dim">›</span></div></div>`;
  }

  return `<div class="view">
    <div class="top"><div class="grow"><div class="small muted" style="text-transform:capitalize">${prettyDate()}</div><h1 style="margin-top:2px">${hello} ${esc(p.name)} 👋</h1></div>
      <button class="avatar" data-act="go" data-to="profil" aria-label="Profil">${esc(p.name[0]?.toUpperCase() || '?')}</button></div>

    <div class="card"><div class="row between" style="margin-bottom:12px"><div class="xs upper muted">Score du jour</div>${st ? `<span class="pill on">🔥 ${st} jour${st > 1 ? 's' : ''}</span>` : ''}</div>
      <div class="hero-score">${ring(score / 100, { size: 118, stroke: 11, inner: `<div><div class="mid-num">${score}</div><div class="xs muted">/ 100</div></div>` })}
        <div class="score-legend">${parts.map(([l, v, c]) => `<div class="l"><span>${l}</span>${bar(v, c)}<b>${Math.round(v * 100)}%</b></div>`).join('')}</div></div>
      <p class="small" style="margin-top:12px;font-weight:700">${verdict}</p></div>

    <div class="section">${wk}</div>

    <div class="section grid2">
      <div class="mini-card" data-act="go" data-to="suivi/eau"><div class="row between"><div class="ico bg-water">💧</div><button class="btn sm" style="background:rgba(76,201,255,.15);color:var(--water);height:32px;padding:0 10px" data-act="water-add" data-ml="250">+250 ml</button></div>
        <div><div class="mid-num">${(d.water / 1000).toFixed(2).replace('.', ',')} L</div><div class="xs muted">sur ${(t.water / 1000).toFixed(1).replace('.', ',')} L</div></div>${bar(d.water / t.water, 'var(--water)')}</div>
      <div class="mini-card" data-act="go" data-to="suivi/pas"><div class="ico bg-steps">👟</div>
        <div><div class="mid-num">${fmt(d.steps)}</div><div class="xs muted">sur ${fmt(t.steps)} pas</div></div>${bar(d.steps / t.steps, 'var(--steps)')}</div>
      <div class="mini-card" data-act="go" data-to="suivi/sommeil"><div class="ico bg-sleep">😴</div>
        <div><div class="mid-num">${d.sleep ? fmtDur(d.sleep.minutes) : '—'}</div><div class="xs muted">${d.sleep ? 'cette nuit' : 'Ajoute ta nuit'}</div></div>${bar(d.sleep ? d.sleep.minutes / t.sleepMin : 0, 'var(--sleep)')}</div>
      <div class="mini-card" data-act="go" data-to="nutrition"><div class="ico bg-food">🍽️</div>
        <div><div class="mid-num">${fmt(n.kcal)}</div><div class="xs muted">sur ${fmt(t.kcal)} kcal</div></div>${bar(n.kcal / t.kcal, n.kcal > t.kcal * 1.1 ? 'var(--danger)' : 'var(--food)')}</div>
    </div>

    <div class="section card tap" data-act="go" data-to="peau"><div class="row"><div class="mini-card" style="padding:0;border:0;background:none"><div class="ico bg-skin" style="width:46px;height:46px;border-radius:14px;font-size:22px">✨</div></div>
      <div class="grow"><h3>${sk ? `Skincare : ${sk.score}/100` : 'Scan de ta peau'}</h3><p class="small muted" style="margin-top:3px">${sk ? `${D.SKIN_TYPES[sk.type].label} · dernier scan le ${shortDate(sk.date)}` : 'Découvre ton type de peau et la routine qu\'il te faut'}</p></div><span class="dim">›</span></div></div>

    <div class="section card flat" style="background:var(--card2)"><div class="tip-card"><span class="ico">💡</span><div><div class="xs upper muted">Conseil du jour</div><p style="margin-top:5px;line-height:1.5">${tipOfDay()}</p></div></div></div>
  </div>`;
}

/* ============================================================
   Sport
   ============================================================ */
function viewSport() {
  const p = S.profile, plan = buildPlan(), ses = todaySession();
  const wd = weekdayMon();
  const monday = addDays(today(), 1 - wd);
  const trainDays = plan.map((s) => s.weekday);
  const week = DAY_SHORT.map((l, i) => {
    const k = addDays(monday, i);
    const dd = peekDay(k);
    const cls = [trainDays.includes(i + 1) ? 'train' : '', dd.workout ? 'done' : '', i + 1 === wd ? 'today' : ''].join(' ');
    return `<div class="d ${cls}">${l}<span>${parseKey(k).getDate()}</span><span class="dot"></span></div>`;
  }).join('');
  const doneMonth = Object.entries(S.days).filter(([k, v]) => v.workout && k.slice(0, 7) === today().slice(0, 7)).length;

  const sessions = plan.map((s) => {
    const open = ui.openSession === s.idx || (ui.openSession === null && ses && ses.idx === s.idx);
    return `<div class="card session-card" style="margin-bottom:10px">
      <div class="head" data-act="toggle-session" data-i="${s.idx}"><div class="row"><span class="num-badge">${s.idx + 1}</span><div><h3>${s.name}</h3><div class="xs muted" style="margin-top:2px">${DAY_NAMES[s.weekday - 1]} · ${s.exercises.length} exos · ~${s.minutes} min</div></div></div>
        <div class="row">${ses && ses.idx === s.idx ? '<span class="pill on">Aujourd\'hui</span>' : ''}<span class="dim">${open ? '▴' : '▾'}</span></div></div>
      ${open ? `<div class="body"><p class="small muted">${s.focus}</p>
        ${s.exercises.map((e) => `<div class="ex-row" data-act="ex-info" data-id="${e.id}" data-sets="${e.sets}" data-target="${esc(e.target)}" data-rest="${e.rest}"><div class="ico">${e.icon}</div><div class="grow"><div style="font-weight:700">${e.name}</div><div class="meta">${e.unit === 'cardio' ? e.target : `${e.sets} × ${e.target}`}${e.rest ? ` · repos ${e.rest} s` : ''}</div></div><span class="dim">ⓘ</span></div>`).join('')}
        ${s.finisher ? `<p class="small" style="margin-top:10px;color:var(--accent)">${s.finisher}</p>` : ''}
        <button class="btn primary block" style="margin-top:14px" data-act="start-wk" data-i="${s.idx}">▶ Commencer</button></div>` : ''}</div>`;
  }).join('');

  return `<div class="view">${header('Sport', { right: `<span class="pill">${D.GOALS[p.goal].icon} ${D.GOALS[p.goal].label}</span>` })}
    <div class="week">${week}</div>
    <div class="row between" style="margin-top:14px"><p class="small muted">${p.days} séances / semaine · ${p.place === 'maison' ? '🏠 Maison' : '🏢 Salle'} · ${D.LEVELS[p.level].label}</p><span class="small nowrap" style="font-weight:700">${doneMonth} ce mois-ci</span></div>

    <div class="section card flat" style="background:var(--card2)"><div class="row" style="align-items:flex-start"><span style="font-size:22px">🔥</span><div><h3>Échauffement (5 min, avant chaque séance)</h3>
      <p class="small muted" style="margin-top:5px;line-height:1.5">Rotations des épaules, des hanches et des chevilles · 1 min de jumping jacks ou montées de genoux · 10 squats lents · 10 pompes faciles (mains en hauteur).</p></div></div></div>

    <div class="section"><div class="section-title"><h2>Ton programme</h2></div>${sessions}</div>

    <div class="section card"><h3>Comment progresser</h3><ul class="list-plain" style="margin-top:10px">
      <li>Quand toutes les séries sont faciles, ajoute 1 à 2 répétitions ou un peu de charge.</li>
      <li>Garde 1 à 2 répétitions « en réserve » : la technique passe avant tout.</li>
      <li>Une douleur articulaire vive = on arrête l'exercice.</li>
      <li>Fin de séance : 5 min d'étirements doux et un grand verre d'eau.</li></ul></div>
    <button class="btn ghost block section" data-act="edit-profile">Changer d'objectif ou de rythme</button></div>`;
}

function exerciseModal(id, extra = {}) {
  const e = D.EXERCISES[id];
  const q = encodeURIComponent(`${e.name} exercice technique`);
  openModal(`<div class="modal-head"><div class="row"><div style="font-size:34px">${e.icon}</div><div><h2>${e.name}</h2><p class="small muted">${e.muscles}</p></div></div><button class="icon-btn" data-act="close-modal">✕</button></div>
    ${extra.sets ? `<div class="grid3" style="margin-bottom:16px"><div class="card center" style="padding:12px"><div class="mid-num">${e.unit === 'cardio' ? '1' : extra.sets}</div><div class="xs muted">série${extra.sets > 1 ? 's' : ''}</div></div><div class="card center" style="padding:12px"><div style="font-weight:800;font-size:15px;padding:5px 0">${esc(extra.target)}</div><div class="xs muted">par série</div></div><div class="card center" style="padding:12px"><div class="mid-num">${extra.rest || 0}s</div><div class="xs muted">repos</div></div></div>` : ''}
    <h3>Comment faire</h3><ol class="steps" style="margin-top:10px">${e.steps.map((s) => `<li>${s}</li>`).join('')}</ol>
    <div class="card flat" style="background:var(--card2);margin-top:16px"><p class="small"><b>💡 Conseil :</b> ${e.tip}</p></div>
    <a class="btn ghost block" style="margin-top:16px;text-decoration:none" href="https://www.youtube.com/results?search_query=${q}" target="_blank" rel="noopener">▶ Voir une démo vidéo</a>`);
}

/* ---------- Mode séance ---------- */
let wkTimer = null;
function stopWorkoutTimer() { clearInterval(wkTimer); wkTimer = null; }

function startWorkout(idx) {
  const s = buildPlan()[idx];
  ui.wk = { s, ex: 0, set: 1, phase: 'work', left: 0, startedAt: Date.now(), setsDone: 0, chrono: false };
  go('wk');
}

function maxSeconds(target) {
  const nums = (target.match(/\d+/g) || ['30']).map(Number);
  return Math.max(...nums) * (/min/.test(target) ? 60 : 1);
}

function tick() {
  const w = ui.wk;
  if (!w) return stopWorkoutTimer();
  w.left--;
  if (w.left <= 3 && w.left > 0) beep(660, 0.08);
  if (w.left <= 0) {
    stopWorkoutTimer();
    beep(990, 0.18, 2);
    if (w.phase === 'rest') { w.phase = 'work'; }
    else if (w.chrono) { w.chrono = false; completeSet(); return; }
  }
  rerender();
}

function completeSet() {
  const w = ui.wk, e = w.s.exercises[w.ex];
  w.setsDone++;
  stopWorkoutTimer();
  w.chrono = false;
  const lastSet = w.set >= e.sets;
  const lastEx = w.ex >= w.s.exercises.length - 1;
  if (lastSet && lastEx) return finishWorkout();
  if (lastSet) { w.ex++; w.set = 1; } else { w.set++; }
  if (e.rest) { w.phase = 'rest'; w.left = e.rest; wkTimer = setInterval(tick, 1000); }
  else w.phase = 'work';
  rerender();
}

function finishWorkout() {
  const w = ui.wk;
  w.phase = 'done';
  const minutes = Math.max(1, Math.round((Date.now() - w.startedAt) / 60000));
  w.minutes = minutes;
  day().workout = { name: w.s.name, at: Date.now(), minutes };
  save();
  beep(880, 0.15, 3);
  rerender();
}

function viewWorkout() {
  const w = ui.wk;
  if (!w) { setTimeout(() => go('sport')); return '<div class="view"></div>'; }
  const exs = w.s.exercises;
  const prog = `<div class="wk-progress">${exs.map((_, i) => `<i class="${i < w.ex || w.phase === 'done' ? 'done' : i === w.ex ? 'cur' : ''}"></i>`).join('')}</div>`;
  const top = `<div class="row between" style="margin-bottom:14px"><button class="icon-btn" data-act="quit-wk" aria-label="Quitter">✕</button><div class="center"><div class="xs upper muted">${w.s.name}</div><div class="small" style="font-weight:700">${w.phase === 'done' ? 'Terminé' : `Exercice ${w.ex + 1} / ${exs.length}`}</div></div><span style="width:40px"></span></div>`;

  if (w.phase === 'done') {
    return `<div class="view no-nav workout">${top}${prog}<div class="wk-main"><div style="font-size:80px">🏆</div><h1>Séance terminée !</h1>
      <p class="muted">Tu viens de faire un pas de plus vers ton objectif.</p>
      <div class="grid3" style="width:100%;margin-top:10px"><div class="card center"><div class="mid-num">${exs.length}</div><div class="xs muted">exercices</div></div><div class="card center"><div class="mid-num">${w.setsDone}</div><div class="xs muted">séries</div></div><div class="card center"><div class="mid-num">${w.minutes}</div><div class="xs muted">minutes</div></div></div>
      ${w.s.finisher ? `<p class="small" style="color:var(--accent);margin-top:6px">${w.s.finisher}</p>` : ''}
      <p class="small muted">Étire-toi 5 minutes, bois un grand verre d'eau et mange des protéines dans les 2 heures.</p></div>
      <button class="btn primary block" data-act="end-wk">Retour à l'accueil</button></div>`;
  }

  const e = exs[w.ex];
  if (w.phase === 'rest') {
    const tot = exs[w.set === 1 ? w.ex - 1 : w.ex]?.rest || 60;
    return `<div class="view no-nav workout">${top}${prog}<div class="wk-main"><div class="xs upper muted">Repos</div>
      <div class="rest-ring">${ring(w.left / tot, { size: 210, stroke: 14, color: 'var(--water)', inner: `<div><div class="t">${w.left}</div><div class="small muted">secondes</div></div>` })}</div>
      <div class="card" style="width:100%;text-align:left"><div class="xs upper muted">À suivre</div><div class="row" style="margin-top:8px"><span style="font-size:28px">${e.icon}</span><div><b>${e.name}</b><div class="small muted">Série ${w.set} / ${e.sets} · ${e.target}</div></div></div></div></div>
      <div class="row"><button class="btn grow" data-act="rest-add">+15 s</button><button class="btn primary grow" data-act="rest-skip">Passer le repos</button></div></div>`;
  }

  const timed = e.unit === 'time';
  return `<div class="view no-nav workout">${top}${prog}<div class="wk-main">
    <div class="wk-ico">${e.icon}</div><div><h1>${e.name}</h1><p class="muted small" style="margin-top:4px">${e.muscles}</p></div>
    ${w.chrono ? `<div class="wk-target">${w.left}s</div>` : `<div class="wk-target">${e.target}</div>`}
    ${e.unit !== 'cardio' ? `<div><div class="small muted" style="margin-bottom:8px">Série ${w.set} / ${e.sets}</div><div class="sets-dots">${Array.from({ length: e.sets }, (_, i) => `<i class="${i < w.set - 1 ? 'done' : ''}"></i>`).join('')}</div></div>` : ''}
    <button class="btn sm ghost" data-act="ex-info" data-id="${e.id}">ⓘ Voir la technique</button></div>
    <div class="col">${timed && !w.chrono ? `<button class="btn primary block" data-act="wk-chrono">⏱ Lancer le chrono (${maxSeconds(e.target)} s)</button>` : ''}
      <button class="btn ${timed && !w.chrono ? '' : 'primary'} block" data-act="set-done">✓ ${e.unit === 'cardio' ? 'Cardio terminé' : 'Série terminée'}</button>
      <button class="btn ghost block sm" data-act="skip-ex">Passer cet exercice</button></div></div>`;
}

/* ============================================================
   Nutrition
   ============================================================ */
function viewNutrition() {
  const tabs = [['journal', 'Journal'], ['recettes', 'Recettes'], ['conseils', 'Conseils']];
  const body = ui.nutriTab === 'recettes' ? nutriRecipes() : ui.nutriTab === 'conseils' ? nutriTips() : nutriJournal();
  return `<div class="view">${header('Nutrition')}
    <div class="seg">${tabs.map(([k, l]) => `<button class="${ui.nutriTab === k ? 'on' : ''}" data-act="nutri-tab" data-v="${k}">${l}</button>`).join('')}</div>
    <div class="section" style="margin-top:18px">${body}</div></div>`;
}

function nutriJournal() {
  const t = targets(), n = dayNutrition(), d = peekDay(today());
  const left = t.kcal - n.kcal;
  const macros = [['Protéines', n.p, t.prot, 'var(--accent)'], ['Glucides', n.g, t.carbs, 'var(--water)'], ['Lipides', n.l, t.fat, 'var(--food)']];
  return `<div class="card"><div class="row" style="gap:18px">${ring(n.kcal / t.kcal, { size: 124, stroke: 12, color: n.kcal > t.kcal * 1.1 ? 'var(--danger)' : 'var(--food)', inner: `<div><div class="mid-num">${fmt(Math.abs(left))}</div><div class="xs muted">${left >= 0 ? 'kcal restantes' : 'kcal en trop'}</div></div>` })}
    <div class="grow col" style="gap:12px">${macros.map(([l, v, tg, c]) => `<div class="macro"><div class="row between"><span>${l}</span><span>${v} / ${tg} g</span></div>${bar(v / tg, c)}</div>`).join('')}</div></div>
    <div class="row between" style="margin-top:14px"><span class="small muted">Consommé : <b style="color:var(--text)">${fmt(n.kcal)}</b> kcal</span><span class="small muted">Objectif : <b style="color:var(--text)">${fmt(t.kcal)}</b> kcal</span></div></div>
  ${MEALS.map((m) => {
    const items = d.meals.map((x, i) => ({ ...x, i })).filter((x) => x.meal === m);
    const kc = Math.round(items.reduce((a, x) => a + x.k, 0));
    return `<div class="card meal"><div class="meal-head"><div><h3>${m}</h3><div class="xs muted">${kc ? `${fmt(kc)} kcal` : 'Rien pour l\'instant'}</div></div><button class="btn sm" data-act="food-open" data-meal="${m}">+ Ajouter</button></div>
      ${items.map((x) => `<div class="food-item"><div class="grow"><div style="font-weight:600">${esc(x.n)}</div><div class="xs muted">${esc(x.u || '')}${x.p ? ` · ${Math.round(x.p)} g prot.` : ''}</div></div><b class="small">${fmt(x.k)} kcal</b><button class="x" data-act="food-del" data-i="${x.i}" aria-label="Supprimer">✕</button></div>`).join('')}</div>`;
  }).join('')}
  <p class="note" style="margin-top:14px">Valeurs nutritionnelles approximatives, données à titre indicatif.</p>`;
}

function foodModal() {
  const q = ui.foodQ.trim().toLowerCase();
  const norm = (s) => s.toLowerCase().replace(/œ/g, 'oe').replace(/æ/g, 'ae').normalize('NFD').replace(/[̀-ͯ]/g, '');
  const list = D.FOODS.map((f, i) => ({ ...f, i })).filter((f) => !q || norm(f.n).includes(norm(q)));
  const cats = [...new Set(list.map((f) => f.c))];
  const html = `<div class="modal-head"><div><h2>Ajouter</h2><p class="small muted">${ui.meal}</p></div><button class="icon-btn" data-act="close-modal">✕</button></div>
    <input id="food-q" class="input" data-on="food-search" placeholder="🔍 Rechercher un aliment…" value="${esc(ui.foodQ)}" autocomplete="off">
    <div class="field" style="margin-top:12px"><label>Quantité</label><div class="seg">${[[0.5, '½'], [1, '1'], [1.5, '1½'], [2, '2'], [3, '3']].map(([v, l]) => `<button class="${ui.portion === v ? 'on' : ''}" data-act="portion" data-v="${v}">${l}×</button>`).join('')}</div></div>
    <div class="food-list" id="food-list">${cats.map((c) => `<div class="cat xs upper muted">${c}</div>${list.filter((f) => f.c === c).map((f) => `<div class="food-pick" data-act="food-add" data-i="${f.i}"><div><div style="font-weight:600">${f.n}</div><div class="xs muted">${f.u} · ${f.p} g prot.</div></div><div class="row"><b class="small">${Math.round(f.k * ui.portion)} kcal</b><span class="icon-btn" style="width:32px;height:32px;font-size:16px;background:rgba(212,255,58,.12);color:var(--accent)">+</span></div></div>`).join('')}`).join('') || '<div class="empty"><div class="e">🔎</div>Aucun aliment trouvé. Ajoute-le en aliment perso ci-dessous.</div>'}</div>
    <div class="divider"></div><h3>Aliment perso</h3>
    <div class="row" style="margin-top:10px"><input id="cf-n" class="input grow" placeholder="Nom" value="${esc(ui.foodQ)}"><input id="cf-k" class="input" style="width:100px" type="number" inputmode="numeric" placeholder="kcal"></div>
    <div class="row" style="margin-top:8px"><input id="cf-p" class="input grow" type="number" inputmode="decimal" placeholder="Protéines (g) – facultatif"><button class="btn primary" data-act="food-custom">Ajouter</button></div>`;
  const m = document.querySelector('.modal');
  if (m) { m.innerHTML = '<div class="grab"></div>' + html; } else openModal(html);
}

function addFood(item) {
  day().meals.push({ ...item, meal: ui.meal });
  save();
}

function nutriRecipes() {
  const goal = S.profile.goal;
  const filters = [['all', 'Toutes'], ['goal', `Pour toi ${D.GOALS[goal].icon}`], ['fast', '⚡ Rapides'], ['Petit-déjeuner', 'Petit-déj'], ['Déjeuner', 'Déjeuner'], ['Dîner', 'Dîner'], ['Collation', 'Collation']];
  const f = ui.recipeFilter;
  const list = D.RECIPES.filter((r) => f === 'all' || (f === 'goal' && r.tags.includes(goal)) || (f === 'fast' && r.time <= 15) || r.meal === f);
  return `<div class="chips">${filters.map(([k, l]) => `<button class="chip ${f === k ? 'on' : ''}" data-act="recipe-filter" data-v="${k}">${l}</button>`).join('')}</div>
    <div class="col" style="margin-top:14px;gap:10px">${list.map((r) => `<div class="card tap recipe-card" data-act="recipe" data-id="${r.id}"><div class="ico">${r.icon}</div><div class="grow"><h3>${r.name}</h3>
      <div class="row wrap" style="gap:6px;margin-top:7px"><span class="pill">⏱ ${r.time} min</span><span class="pill">${r.kcal} kcal</span><span class="pill">${r.p} g prot.</span>${r.tags.includes(goal) ? '<span class="pill good">Idéal pour toi</span>' : ''}</div></div></div>`).join('')}</div>`;
}

function recipeModal(id) {
  const r = D.RECIPES.find((x) => x.id === id);
  openModal(`<div class="modal-head"><div class="row"><span style="font-size:40px">${r.icon}</span><div><h2>${r.name}</h2><p class="small muted">${r.meal} · ${r.time} min</p></div></div><button class="icon-btn" data-act="close-modal">✕</button></div>
    <div class="grid3"><div class="card center" style="padding:12px"><div class="mid-num color-food">${r.kcal}</div><div class="xs muted">kcal</div></div><div class="card center" style="padding:12px"><div class="mid-num color-accent">${r.p} g</div><div class="xs muted">protéines</div></div><div class="card center" style="padding:12px"><div class="mid-num">${r.time}′</div><div class="xs muted">préparation</div></div></div>
    <h3 style="margin-top:18px">Ingrédients (1 personne)</h3><ul class="ing" style="margin-top:10px">${r.ing.map((x) => `<li>${x}</li>`).join('')}</ul>
    <h3 style="margin-top:18px">Préparation</h3><ol class="steps" style="margin-top:10px">${r.steps.map((x) => `<li>${x}</li>`).join('')}</ol>
    <button class="btn primary block" style="margin-top:20px" data-act="recipe-add" data-id="${r.id}">+ Ajouter à mon journal (${r.meal === 'Petit-déjeuner' || r.meal === 'Collation' ? r.meal : 'repas'})</button>`);
}

function nutriTips() {
  const g = S.profile.goal, t = targets();
  return `<div class="card accent"><div class="xs upper muted">Ton objectif : ${D.GOALS[g].label}</div><p style="margin-top:8px;font-weight:600;line-height:1.5">Environ ${fmt(t.kcal)} kcal par jour, dont ${t.prot} g de protéines, ${t.carbs} g de glucides et ${t.fat} g de lipides. Ta dépense estimée est de ${fmt(t.tdee)} kcal par jour.</p></div>
    <div class="card section"><h3>Pour ton objectif</h3><ul class="list-plain" style="margin-top:10px">${D.TIPS[g].map((x) => `<li>${x}</li>`).join('')}</ul></div>
    <div class="card section"><h3>L'assiette idéale</h3><div class="col" style="margin-top:12px;gap:10px">
      <div class="row"><span style="font-size:22px">🥦</span><div class="grow"><b>½ assiette de légumes</b><div class="small muted">Fibres, vitamines, satiété</div></div></div>
      <div class="row"><span style="font-size:22px">🍗</span><div class="grow"><b>¼ de protéines</b><div class="small muted">Poulet, poisson, œufs, lentilles</div></div></div>
      <div class="row"><span style="font-size:22px">🍚</span><div class="grow"><b>¼ de féculents</b><div class="small muted">Riz, semoule, pain complet, patate douce</div></div></div>
      <div class="row"><span style="font-size:22px">🫒</span><div class="grow"><b>1 c. à soupe de bon gras</b><div class="small muted">Huile d'olive, avocat, oléagineux</div></div></div></div></div>
    <div class="card section"><h3>Bons réflexes</h3><ul class="list-plain" style="margin-top:10px">${D.TIPS.general.slice(0, 6).map((x) => `<li>${x}</li>`).join('')}</ul></div>`;
}

/* ============================================================
   Suivi : eau, sommeil, pas, corps
   ============================================================ */
function viewSuivi(sub) {
  const tabs = [['eau', '💧 Eau'], ['sommeil', '😴 Sommeil'], ['pas', '👟 Pas'], ['corps', '⚖️ Corps']];
  const body = { eau: suiviWater, sommeil: suiviSleep, pas: suiviSteps, corps: suiviBody }[sub] || suiviWater;
  return `<div class="view">${header('Suivi')}
    <div class="seg">${tabs.map(([k, l]) => `<button class="${sub === k ? 'on' : ''}" data-act="go" data-to="suivi/${k}">${l}</button>`).join('')}</div>
    <div style="margin-top:18px">${body()}</div></div>`;
}

function tipsCard(list, title = 'Conseils') {
  return `<div class="card section"><h3>${title}</h3><ul class="list-plain" style="margin-top:10px">${list.map((x) => `<li>${x}</li>`).join('')}</ul></div>`;
}

function suiviWater() {
  const t = targets(), d = peekDay(today());
  const pct = Math.min(1, d.water / t.water);
  const y = 206 - pct * 196 - 8;
  const days = lastDays(7);
  const vals = days.map((k) => peekDay(k).water);
  const glasses = Math.round(d.water / 250);
  return `<div class="card"><div class="glass-wrap"><div class="glass"><svg viewBox="0 0 150 212">
      <defs><clipPath id="gc"><path d="M10 6 L140 6 L126 200 Q125 206 119 206 L31 206 Q25 206 24 200 Z"/></clipPath></defs>
      <g clip-path="url(#gc)"><rect width="150" height="212" fill="var(--card2)"/>
      <g transform="translate(0 ${y.toFixed(1)})"><path class="wave" d="M0 8 Q30 0 60 8 T120 8 T180 8 T240 8 T300 8 V260 H0 Z" fill="var(--water)" opacity=".9"/></g></g>
      <path d="M10 6 L140 6 L126 200 Q125 206 119 206 L31 206 Q25 206 24 200 Z" fill="none" stroke="var(--line)" stroke-width="3"/>
      <text x="75" y="105" text-anchor="middle" font-size="30" font-weight="800" fill="var(--text)" font-family="var(--font)">${Math.round(pct * 100)}%</text></svg></div></div>
    <div class="center"><div class="big-num color-water">${(d.water / 1000).toFixed(2).replace('.', ',')} L</div><p class="small muted" style="margin-top:6px">Objectif : ${(t.water / 1000).toFixed(1).replace('.', ',')} L · ${glasses} verre${glasses > 1 ? 's' : ''} bu${glasses > 1 ? 's' : ''}</p>
      ${pct >= 1 ? '<p class="small" style="margin-top:8px;color:var(--steps);font-weight:700">🎉 Objectif atteint !</p>' : `<p class="small muted" style="margin-top:4px">Encore ${fmt(t.water - d.water)} ml</p>`}</div>
    <div class="water-btns" style="margin-top:18px">${[['🥃', 150], ['🥛', 250], ['🧃', 330], ['🍶', 500]].map(([i, ml]) => `<button data-act="water-add" data-ml="${ml}"><span>${i}</span>${ml} ml</button>`).join('')}</div>
    ${d.waterLog?.length ? `<button class="btn sm ghost block" style="margin-top:10px" data-act="water-undo">↶ Annuler le dernier ajout (${d.waterLog[d.waterLog.length - 1]} ml)</button>` : ''}</div>
    <div class="card section"><div class="row between"><h3>7 derniers jours</h3><span class="small muted">Moy. ${(vals.reduce((a, b) => a + b, 0) / 7 / 1000).toFixed(1).replace('.', ',')} L</span></div>
      <div style="margin-top:12px">${barChart(vals, days.map(dayLetter), { color: 'var(--water)', target: t.water, fmtTop: (v) => (v / 1000).toFixed(1) })}</div></div>
    ${tipsCard(D.TIPS.water)}`;
}

function suiviSleep() {
  const t = targets(), d = peekDay(today());
  const last = [...lastDays(14)].reverse().map((k) => peekDay(k).sleep).find(Boolean);
  const bed = d.sleep?.bed || last?.bed || '23:00', wake = d.sleep?.wake || last?.wake || '07:00';
  const q = ui.sleepQ ?? d.sleep?.quality ?? 0;
  const days = lastDays(7);
  const vals = days.map((k) => (peekDay(k).sleep?.minutes || 0) / 60);
  const logged = vals.filter(Boolean);
  const avg = logged.length ? logged.reduce((a, b) => a + b, 0) / logged.length : 0;
  const faces = ['😩', '😕', '😐', '🙂', '🤩'];
  return `${d.sleep ? `<div class="card"><div class="row" style="gap:18px">${ring(d.sleep.minutes / t.sleepMin, { size: 110, stroke: 11, color: 'var(--sleep)', inner: `<div><div style="font-size:26px">${faces[d.sleep.quality - 1] || '😴'}</div></div>` })}
      <div><div class="xs upper muted">Cette nuit</div><div class="big-num color-sleep" style="font-size:38px;margin-top:4px">${fmtDur(d.sleep.minutes)}</div><p class="small muted" style="margin-top:6px">${d.sleep.bed} → ${d.sleep.wake}</p>
      <p class="small" style="margin-top:4px;font-weight:700;color:${d.sleep.minutes >= 420 ? 'var(--steps)' : 'var(--food)'}">${d.sleep.minutes >= 420 ? 'Bonne nuit de récupération' : 'Un peu court, couche-toi plus tôt ce soir'}</p></div></div></div>` : ''}
    <div class="card ${d.sleep ? 'section' : ''}"><h3>${d.sleep ? 'Modifier ma nuit' : 'Comment as-tu dormi ?'}</h3>
      <div class="grid2" style="margin-top:12px"><div class="field"><label>🌙 Coucher</label><input id="sl-bed" class="input" type="time" value="${bed}"></div><div class="field"><label>☀️ Réveil</label><input id="sl-wake" class="input" type="time" value="${wake}"></div></div>
      <div class="field" style="margin-top:12px"><label>Qualité du sommeil</label><div class="quality">${faces.map((f, i) => `<button class="${q === i + 1 ? 'on' : ''}" data-act="sleep-q" data-v="${i + 1}">${f}</button>`).join('')}</div></div>
      <button class="btn primary block" style="margin-top:14px;background:var(--sleep)" data-act="sleep-save">Enregistrer ma nuit</button></div>
    <div class="card section"><div class="row between"><h3>7 dernières nuits</h3><span class="small muted">${avg ? `Moy. ${fmtDur(Math.round(avg * 60))}` : ''}</span></div>
      <div style="margin-top:12px">${barChart(vals, days.map(dayLetter), { color: 'var(--sleep)', target: 8, fmtTop: (v) => v.toFixed(1) })}</div></div>
    <div class="card section"><h3>Calculateur de cycles 🔄</h3><p class="small muted" style="margin-top:4px">Un cycle dure environ 90 min. Se réveiller à la fin d'un cycle évite d'être groggy.</p>
      <div class="seg" style="margin-top:12px"><button class="${ui.cycleMode === 'bed' ? 'on' : ''}" data-act="cycle-mode" data-v="bed">Je me couche à…</button><button class="${ui.cycleMode === 'wake' ? 'on' : ''}" data-act="cycle-mode" data-v="wake">Je dois me lever à…</button></div>
      <input class="input" type="time" style="margin-top:10px" data-on="cycle-time" value="${ui.cycleTime}">
      <div id="cycles" style="margin-top:12px">${cyclesHtml()}</div></div>
    ${tipsCard(D.TIPS.sleep)}`;
}

function cyclesHtml() {
  const [h, m] = ui.cycleTime.split(':').map(Number);
  if (isNaN(h)) return '';
  const base = h * 60 + m;
  const fmtT = (x) => { x = ((x % 1440) + 1440) % 1440; return `${pad(Math.floor(x / 60))}:${pad(x % 60)}`; };
  const cycles = [6, 5, 4];
  const items = cycles.map((c) => ({ c, t: ui.cycleMode === 'bed' ? fmtT(base + 15 + c * 90) : fmtT(base - 15 - c * 90) }));
  return `<p class="small muted" style="margin-bottom:8px">${ui.cycleMode === 'bed' ? 'Réveille-toi à :' : 'Couche-toi à :'}</p>
    <div class="cycle-list">${items.map((x, i) => `<div class="c ${i < 2 ? 'best' : ''}"><b>${x.t}</b><span class="xs">${x.c} cycles</span><span class="xs">${fmtDur(x.c * 90)}</span></div>`).join('')}</div>
    <p class="xs dim" style="margin-top:8px">15 min d'endormissement incluses. 5 à 6 cycles = idéal.</p>`;
}

let ped = { on: false, count: 0, last: 0, avg: 9.8, above: false, gotEvent: false };
function onMotion(e) {
  const a = e.accelerationIncludingGravity;
  if (!a || a.x === null) return;
  ped.gotEvent = true;
  const mag = Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z);
  ped.avg = ped.avg * 0.92 + mag * 0.08;
  const now = performance.now();
  if (mag > ped.avg + 1.8 && !ped.above && now - ped.last > 320) {
    ped.above = true; ped.last = now; ped.count++;
    day().steps++;
    if (ped.count % 10 === 0) save();
    const el = document.getElementById('ped-count'); if (el) el.textContent = `+${fmt(ped.count)} pas`;
    const tot = document.getElementById('steps-total'); if (tot) tot.textContent = fmt(day().steps);
  } else if (mag < ped.avg) ped.above = false;
}
async function togglePedometer() {
  if (ped.on) { window.removeEventListener('devicemotion', onMotion); ped.on = false; save(); rerender(); return; }
  try {
    if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
      const r = await DeviceMotionEvent.requestPermission();
      if (r !== 'granted') { toast('Permission refusée'); return; }
    }
    ped = { on: true, count: 0, last: 0, avg: 9.8, above: false, gotEvent: false };
    window.addEventListener('devicemotion', onMotion);
    rerender();
    setTimeout(() => { if (ped.on && !ped.gotEvent) { window.removeEventListener('devicemotion', onMotion); ped.on = false; rerender(); toast('Capteur de mouvement indisponible sur cet appareil'); } }, 3000);
  } catch { toast('Capteur de mouvement indisponible'); }
}

function suiviSteps() {
  const t = targets(), d = peekDay(today()), p = S.profile;
  const stride = (p.height * 0.415) / 100; // mètres
  const km = (d.steps * stride) / 1000;
  const kcal = d.steps * 0.04 * (currentWeight() / 70);
  const days = lastDays(7);
  const vals = days.map((k) => peekDay(k).steps);
  return `<div class="card center">${ring(d.steps / t.steps, { size: 190, stroke: 15, color: 'var(--steps)', inner: `<div><div style="font-size:26px">👟</div><div class="big-num" id="steps-total" style="font-size:38px">${fmt(d.steps)}</div><div class="xs muted">sur ${fmt(t.steps)}</div></div>` })}
      <div class="grid2" style="margin-top:16px"><div class="card flat" style="background:var(--card2);padding:12px"><div class="mid-num">${km.toFixed(1).replace('.', ',')} km</div><div class="xs muted">distance</div></div><div class="card flat" style="background:var(--card2);padding:12px"><div class="mid-num">${fmt(kcal)}</div><div class="xs muted">kcal brûlées</div></div></div></div>
    <div class="card section"><h3>Ajouter des pas</h3><p class="small muted" style="margin-top:4px">Recopie le chiffre de ton téléphone ou de ta montre.</p>
      <div class="row" style="margin-top:12px"><input id="steps-in" class="input grow" type="number" inputmode="numeric" placeholder="Ex. 3500"><button class="btn" data-act="steps-add">+ Ajouter</button></div>
      <button class="btn ghost block sm" style="margin-top:8px" data-act="steps-set">Remplacer le total du jour par ce chiffre</button></div>
    <div class="card section"><div class="row between"><div><h3>Compteur en direct</h3><p class="small muted" style="margin-top:3px">Compte tes pas avec le capteur du téléphone, tant que l'appli reste ouverte.</p></div></div>
      ${ped.on ? `<div class="row between" style="margin-top:12px"><span class="pill good" id="ped-count">+${fmt(ped.count)} pas</span><button class="btn sm danger" data-act="ped">■ Arrêter</button></div>` : `<button class="btn block" style="margin-top:12px;background:rgba(62,224,143,.14);color:var(--steps)" data-act="ped">▶ Démarrer le compteur</button>`}</div>
    <div class="card section"><div class="row between"><h3>7 derniers jours</h3><span class="small muted">Moy. ${fmt(vals.reduce((a, b) => a + b, 0) / 7)}</span></div>
      <div style="margin-top:12px">${barChart(vals, days.map(dayLetter), { color: 'var(--steps)', target: t.steps, fmtTop: (v) => (v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v) })}</div></div>
    ${tipsCard(D.TIPS.steps)}`;
}

function addWeight(kg) {
  const k = today();
  const ex = S.weights.find((w) => w.date === k);
  if (ex) ex.kg = kg; else S.weights.push({ date: k, kg });
  S.weights.sort((a, b) => a.date.localeCompare(b.date));
}

function suiviBody() {
  const w = currentWeight(), first = S.weights[0]?.kg ?? w, diff = w - first, b = bmi();
  const goal = S.profile.goal;
  const good = goal === 'prise_masse' ? diff >= 0 : diff <= 0;
  const pts = S.weights.slice(-12).map((x) => ({ v: x.kg, l: shortDate(x.date) }));
  return `<div class="grid2"><div class="card"><div class="xs upper muted">Poids actuel</div><div class="big-num color-body" style="font-size:36px;margin-top:6px">${w.toFixed(1).replace('.', ',')}</div><div class="xs muted">kg</div></div>
      <div class="card"><div class="xs upper muted">Depuis le début</div><div class="big-num" style="font-size:36px;margin-top:6px;color:${diff === 0 ? 'var(--text)' : good ? 'var(--steps)' : 'var(--food)'}">${diff > 0 ? '+' : ''}${diff.toFixed(1).replace('.', ',')}</div><div class="xs muted">kg</div></div></div>
    <div class="card section"><div class="row between"><div><div class="xs upper muted">IMC</div><div class="mid-num" style="margin-top:4px">${b.v.replace('.', ',')}</div></div><span class="pill ${b.cls}">${b.cat}</span></div>
      <p class="note" style="margin-top:8px">L'IMC est un repère général : il ne distingue pas le muscle du gras.</p></div>
    <div class="card section"><h3>Nouvelle pesée</h3><div class="row" style="margin-top:12px"><input id="w-in" class="input grow lg" style="text-align:left" type="number" inputmode="decimal" step="0.1" placeholder="${w.toFixed(1)}"><button class="btn primary" style="background:var(--body)" data-act="weight-add">Enregistrer</button></div>
      <p class="note" style="margin-top:8px">Pèse-toi le matin, à jeun, après être passé aux toilettes, 1 fois par semaine.</p></div>
    ${pts.length > 1 ? `<div class="card section"><h3>Évolution</h3><div style="margin-top:12px">${lineChart(pts)}</div></div>` : ''}
    <div class="card section"><h3>Historique</h3>${[...S.weights].reverse().slice(0, 8).map((x) => `<div class="food-item"><div class="grow">${shortDate(x.date)}</div><b>${x.kg.toFixed(1).replace('.', ',')} kg</b><button class="x" data-act="weight-del" data-d="${x.date}" aria-label="Supprimer">✕</button></div>`).join('')}</div>`;
}

/* ============================================================
   Peau / skincare
   ============================================================ */
let camStream = null;
async function startCamera() {
  const v = document.getElementById('cam');
  if (!v || camStream) return;
  try {
    camStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 960 } }, audio: false });
    const v2 = document.getElementById('cam');
    if (!v2) return stopCamera();
    v2.srcObject = camStream;
    await v2.play();
  } catch {
    ui.skin.camError = true;
    stopCamera();
    rerender();
  }
}
function stopCamera() { camStream?.getTracks().forEach((t) => t.stop()); camStream = null; }

function analyseLight(ctx, w, h) {
  const data = ctx.getImageData(0, 0, w, h).data;
  let tot = 0, left = 0, right = 0, n = 0;
  for (let y = Math.floor(h * 0.2); y < h * 0.8; y += 4) {
    for (let x = Math.floor(w * 0.2); x < w * 0.8; x += 4) {
      const i = (y * w + x) * 4;
      const l = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      tot += l; n++;
      if (x < w / 2) left += l; else right += l;
    }
  }
  const lum = tot / n, ratio = Math.max(left, right) / Math.max(1, Math.min(left, right));
  if (lum < 70) return { cls: 'warn', msg: 'Photo trop sombre : place-toi face à une fenêtre' };
  if (lum > 215) return { cls: 'warn', msg: 'Photo trop exposée : évite le soleil direct' };
  if (ratio > 1.45) return { cls: 'warn', msg: 'Lumière de côté : mets-toi face à la lumière' };
  return { cls: 'good', msg: 'Bonne lumière ✓' };
}

function drawToPhoto(src, sw, sh, mirror) {
  const W = 360, H = 480;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  const r = Math.max(W / sw, H / sh);
  const dw = sw * r, dh = sh * r;
  if (mirror) { ctx.translate(W, 0); ctx.scale(-1, 1); }
  ctx.drawImage(src, (W - dw) / 2, (H - dh) / 2, dw, dh);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  return { data: c.toDataURL('image/jpeg', 0.72), light: analyseLight(ctx, W, H) };
}

function capturePhoto() {
  const v = document.getElementById('cam');
  if (!v || !v.videoWidth) { toast('Caméra pas encore prête'); return; }
  ui.skin.photo = drawToPhoto(v, v.videoWidth, v.videoHeight, true);
  stopCamera();
  rerender();
}

function importPhoto(file) {
  const r = new FileReader();
  r.onload = () => {
    const img = new Image();
    img.onload = () => { ui.skin.photo = drawToPhoto(img, img.width, img.height, false); stopCamera(); rerender(); };
    img.src = r.result;
  };
  r.readAsDataURL(file);
}

function startSkin() {
  ui.skin = { step: 'photo', sel: null, photo: null, zones: JSON.parse(JSON.stringify(S.skin.zones || {})), feel: S.skin.feel, answers: { ...S.skin.answers }, camError: false };
  rerender();
}

function faceMap() {
  const z = ui.skin.zones, sel = ui.skin.sel;
  const cls = (k) => `zone ${sel === k ? 'sel' : ''} ${(z[k] || []).length ? 'has' : ''}`;
  const lab = (k, x, y) => `<text x="${x}" y="${y}" text-anchor="middle">${D.SKIN_ZONES[k].replace('Contour des yeux', 'Yeux').replace('Joue gauche', 'Joue G').replace('Joue droite', 'Joue D')}${(z[k] || []).length ? ` · ${z[k].length}` : ''}</text>`;
  return `<svg class="face-map" viewBox="0 0 240 300">
    <ellipse cx="120" cy="150" rx="96" ry="128" fill="var(--card)" stroke="var(--line)" stroke-width="2"/>
    <path d="M70 100 Q85 92 100 100 M140 100 Q155 92 170 100" stroke="var(--dim)" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <path d="M100 222 Q120 232 140 222" stroke="var(--dim)" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <rect class="${cls('front')}" data-act="skin-zone" data-z="front" x="58" y="36" width="124" height="56" rx="26"/>${lab('front', 120, 68)}
    <ellipse class="${cls('yeux')}" data-act="skin-zone" data-z="yeux" cx="84" cy="122" rx="27" ry="13"/><ellipse class="${cls('yeux')}" data-act="skin-zone" data-z="yeux" cx="156" cy="122" rx="27" ry="13"/>${lab('yeux', 120, 146)}
    <rect class="${cls('nez')}" data-act="skin-zone" data-z="nez" x="104" y="104" width="32" height="88" rx="15"/>${lab('nez', 120, 182)}
    <ellipse class="${cls('joue_g')}" data-act="skin-zone" data-z="joue_g" cx="66" cy="180" rx="30" ry="34"/>${lab('joue_g', 66, 184)}
    <ellipse class="${cls('joue_d')}" data-act="skin-zone" data-z="joue_d" cx="174" cy="180" rx="30" ry="34"/>${lab('joue_d', 174, 184)}
    <ellipse class="${cls('menton')}" data-act="skin-zone" data-z="menton" cx="120" cy="255" rx="40" ry="20"/>${lab('menton', 120, 259)}
  </svg>`;
}

function computeSkin() {
  const sk = ui.skin, z = sk.zones;
  const all = (k) => z[k] || [];
  let type = { brille_tout: 'grasse', brille_t: 'mixte', tiraille: 'seche', confort: 'normale', reagit: 'sensible' }[sk.feel] || 'normale';
  const shineT = ['front', 'nez', 'menton'].some((k) => all(k).includes('brillance'));
  const shineCheeks = ['joue_g', 'joue_d'].some((k) => all(k).includes('brillance'));
  const dryCheeks = ['joue_g', 'joue_d'].some((k) => all(k).includes('secheresse'));
  if (type === 'normale' && shineT) type = shineCheeks ? 'grasse' : 'mixte';
  if (type === 'mixte' && shineCheeks) type = 'grasse';
  if (type === 'normale' && dryCheeks) type = 'seche';
  const concerns = new Set(Object.values(z).flat());
  if (sk.feel === 'brille_tout' || sk.feel === 'brille_t') concerns.add('brillance');
  if (sk.feel === 'tiraille') concerns.add('secheresse');
  if (sk.feel === 'reagit') concerns.add('rougeurs');

  let score = 0;
  const good = [], improve = [];
  const fixes = {
    clean_pm: 'Nettoie ton visage chaque soir : sébum, pollution et crème solaire bouchent les pores pendant la nuit.',
    moist: 'Hydrate ta peau matin et soir, même si elle est grasse.',
    spf: 'Mets un SPF tous les jours, même quand il fait gris : c\'est le meilleur anti-taches et anti-âge.',
    exfo_daily: 'Exfolier tous les jours abîme la barrière de la peau : limite-toi à 1 ou 2 fois par semaine.',
    exfo_never: 'Une exfoliation douce 1 à 2 fois par semaine aide à désincruster les pores et à raviver l\'éclat.',
    adapted: 'Le savon classique décape la peau : passe à un nettoyant doux adapté à ton type de peau.',
    touch: 'Toucher et percer les boutons propage les bactéries et laisse des marques brunes.',
    pillow: 'Change ta taie d\'oreiller chaque semaine : elle accumule sébum et bactéries.',
    sleep: 'Dors 7 h ou plus : la peau se répare surtout la nuit (et les cernes diminuent).',
  };
  const goods = { clean_pm: 'Nettoyage du soir régulier', moist: 'Hydratation quotidienne', spf: 'Protection solaire tous les jours', exfo: 'Exfoliation à la bonne fréquence', adapted: 'Produits adaptés à ta peau', touch: 'Tu ne touches pas tes boutons', pillow: 'Taie d\'oreiller changée souvent', sleep: 'Bon sommeil' };
  D.SKIN_ROUTINE_Q.forEach((q) => {
    const a = sk.answers[q.id];
    const opt = q.opts[a];
    if (!opt) return;
    const max = Math.max(...q.opts.map((o) => o[1]));
    score += opt[1];
    if (opt[1] === max) good.push(goods[q.id]);
    else if (q.id === 'exfo') improve.push(a === 2 ? fixes.exfo_daily : fixes.exfo_never);
    else improve.push(fixes[q.id]);
  });

  const T = D.SKIN_TYPES[type];
  const has = (c) => concerns.has(c);
  const serumAM = has('taches') || has('terne') ? 'Sérum vitamine C' : has('rougeurs') ? 'Sérum apaisant à la centella' : has('boutons') || has('points') || has('brillance') ? 'Sérum niacinamide' : has('secheresse') ? 'Sérum acide hyaluronique' : null;
  const treatPM = has('boutons') || has('points') ? 'Soin acide salicylique (BHA), 3 soirs par semaine'
    : has('rides') ? 'Rétinol en douceur, 2 à 3 soirs par semaine (pas pendant la grossesse)'
    : has('taches') ? 'Acide azélaïque ou niacinamide le soir'
    : has('terne') ? 'Exfoliant doux à l\'acide lactique, 1 à 2 soirs par semaine' : null;
  const routine = {
    matin: [T.cleanser, serumAM, has('cernes') ? 'Contour des yeux à la caféine' : null, T.moisturizer, `Protection solaire : ${T.spf}`].filter(Boolean),
    soir: ['Démaquillage ou eau micellaire si tu portes du maquillage ou du SPF', T.cleanser, treatPM, T.moisturizer + (type === 'seche' ? ' (couche plus généreuse le soir)' : '')].filter(Boolean),
    semaine: [['grasse', 'mixte'].includes(type) || has('points') ? 'Masque à l\'argile sur la zone T, 1 fois par semaine' : null, type === 'seche' || has('secheresse') ? 'Masque hydratant, 1 à 2 fois par semaine' : null, type === 'sensible' ? 'Pas de gommage à grains : uniquement des soins très doux' : null].filter(Boolean),
  };
  const use = new Set(), avoid = new Set(), why = [];
  const keyOf = (x) => x.split(/[\d(]/)[0].trim().toLowerCase();
  const addUniq = (set, x) => { if (![...set].some((y) => keyOf(y) === keyOf(x))) set.add(x); };
  [...concerns].forEach((c) => { const a = D.SKIN_ADVICE[c]; if (!a) return; a.use.forEach((x) => addUniq(use, x)); a.avoid.forEach((x) => addUniq(avoid, x)); why.push([c, a.why]); });
  if (type === 'sensible') { addUniq(avoid, 'Parfums et huiles essentielles'); addUniq(avoid, 'Alcool'); }
  if (!use.size) { use.add('Nettoyant doux'); use.add('Hydratant adapté'); use.add('SPF 30 à 50'); }

  score = Math.round(score);
  const verdict = score >= 75 ? 'Ta skincare est déjà solide 👏' : score >= 50 ? 'Bonne base, quelques ajustements à faire' : 'Ta routine a besoin d\'un coup de boost';
  return { date: today(), type, concerns: [...concerns], score, verdict, good: good.filter(Boolean), improve, routine, use: [...use].slice(0, 10), avoid: [...avoid].slice(0, 9), why };
}

function finishSkin() {
  const res = computeSkin();
  S.skin.zones = ui.skin.zones; S.skin.feel = ui.skin.feel; S.skin.answers = ui.skin.answers; S.skin.result = res;
  if (ui.skin.photo) {
    S.skin.photos = S.skin.photos.filter((p) => p.date !== today());
    S.skin.photos.push({ date: today(), data: ui.skin.photo.data });
    S.skin.photos = S.skin.photos.slice(-6);
  }
  save();
  ui.skin.step = 'result';
  rerender();
}

function viewPeau() {
  const sk = ui.skin;
  const stepIdx = { photo: 1, zones: 2, questions: 3 }[sk.step];
  const ind = stepIdx ? `<div class="steps-indicator">${[1, 2, 3].map((i) => `<i class="${i <= stepIdx ? 'on' : ''}"></i>`).join('')}</div>` : '';
  let body;
  if (sk.step === 'photo') body = skinPhoto();
  else if (sk.step === 'zones') body = skinZones();
  else if (sk.step === 'questions') body = skinQuestions();
  else if (sk.step === 'result') body = skinResult(S.skin.result);
  else body = skinHome();
  const back = sk.step ? `<button class="back" data-act="skin-back" aria-label="Retour">←</button>` : '';
  return `<div class="view"><div class="top">${back}<h1 class="grow">${sk.step === 'result' ? 'Ton analyse' : 'Peau'}</h1>${stepIdx ? `<span class="small muted">Étape ${stepIdx}/3</span>` : ''}</div>${ind}${body}</div>`;
}

function skinHome() {
  const r = S.skin.result;
  const photos = S.skin.photos;
  return `<div class="card" style="background:radial-gradient(120% 90% at 100% 0%, rgba(255,126,182,.25), transparent 60%), var(--card)">
      <div style="font-size:40px">✨</div><h2 style="margin-top:8px">Scan peau en 3 étapes</h2>
      <p class="small muted" style="margin-top:6px;line-height:1.5">Photo de ton visage, repérage des zones à problème, puis quelques questions sur ta routine. Tu obtiens ton type de peau, un score de ta skincare actuelle, la routine adaptée et les ingrédients à utiliser ou à éviter.</p>
      <button class="btn primary block" style="margin-top:16px;background:var(--skin);color:#1a0a12" data-act="skin-start">${r ? 'Refaire mon scan' : 'Commencer le scan'}</button></div>
    ${r ? `<div class="section card tap" data-act="skin-result"><div class="skin-score">${ring(r.score / 100, { size: 92, stroke: 9, color: 'var(--skin)', inner: `<div class="mid-num">${r.score}</div>` })}
      <div class="grow"><div class="xs upper muted">Dernier scan · ${shortDate(r.date)}</div><h3 style="margin-top:4px">${r.verdict}</h3><p class="small muted" style="margin-top:4px">${D.SKIN_TYPES[r.type].label}${r.concerns.length ? ' · ' + r.concerns.slice(0, 3).map((c) => D.SKIN_ISSUES[c]?.label).join(', ') : ''}</p></div><span class="dim">›</span></div></div>` : ''}
    ${photos.length ? `<div class="section"><div class="section-title"><h2>Journal photo</h2><span class="small muted">${photos.length} photo${photos.length > 1 ? 's' : ''}</span></div>
      <div class="photo-strip">${[...photos].reverse().map((p) => `<figure><img src="${p.data}" alt="Photo du ${shortDate(p.date)}"><figcaption>${shortDate(p.date)}</figcaption></figure>`).join('')}</div>
      <p class="note" style="margin-top:8px">Refais une photo toutes les 2 à 4 semaines, avec la même lumière, pour voir l'évolution.</p></div>` : ''}
    <div class="section card flat" style="background:var(--card2)"><p class="small"><b>🤖 Bientôt :</b> analyse automatique de la photo par IA dans la V2.</p></div>`;
}

function skinPhoto() {
  const sk = ui.skin;
  const oval = `<svg class="cam-oval" viewBox="0 0 300 400" preserveAspectRatio="none"><defs><mask id="m"><rect width="300" height="400" fill="white"/><ellipse cx="150" cy="185" rx="98" ry="132" fill="black"/></mask></defs><rect width="300" height="400" fill="rgba(0,0,0,.45)" mask="url(#m)"/><ellipse cx="150" cy="185" rx="98" ry="132" fill="none" stroke="var(--skin)" stroke-width="2.5" stroke-dasharray="6 6"/></svg>`;
  if (sk.photo) {
    return `<div class="cam-box"><img src="${sk.photo.data}" alt="Ta photo"></div>
      <div class="center" style="margin-top:12px"><span class="pill ${sk.photo.light.cls}">${sk.photo.light.msg}</span></div>
      <div class="row" style="margin-top:14px"><button class="btn grow" data-act="skin-retake">↺ Reprendre</button><button class="btn primary grow" style="background:var(--skin);color:#1a0a12" data-act="skin-next" data-to="zones">Continuer</button></div>
      <p class="note center" style="margin-top:10px">La photo reste uniquement sur ton téléphone.</p>`;
  }
  return `${sk.camError ? `<div class="card center" style="padding:28px 18px"><div style="font-size:40px">📷</div><h3 style="margin-top:8px">Caméra indisponible</h3><p class="small muted" style="margin-top:6px">Autorise l'accès à la caméra dans ton navigateur, ou importe une photo.</p></div>`
    : `<div class="cam-box"><video id="cam" playsinline muted autoplay></video>${oval}<div class="cam-hint"><span>Visage dans l'ovale · face à la lumière · sans maquillage</span></div></div>`}
    <div class="col" style="margin-top:14px">${sk.camError ? '' : `<button class="btn primary block" style="background:var(--skin);color:#1a0a12" data-act="skin-capture">📸 Prendre la photo</button>`}
      <label class="btn block" style="cursor:pointer">🖼 Importer une photo<input type="file" accept="image/*" data-on="skin-file" hidden></label>
      <button class="btn ghost block sm" data-act="skin-next" data-to="zones">Passer cette étape</button></div>`;
}

function skinZones() {
  const sk = ui.skin, sel = sk.sel;
  const issues = sel === 'yeux' ? ['cernes', 'rides', 'secheresse', 'rougeurs'] : Object.keys(D.SKIN_ISSUES).filter((k) => k !== 'cernes');
  const cur = sk.zones[sel] || [];
  return `<p class="muted small" style="margin-bottom:12px">${sk.photo ? 'Regarde ta photo et ' : ''}touche chaque zone où tu remarques quelque chose, puis choisis ce que tu vois.</p>
    ${sk.photo ? `<div class="row" style="align-items:flex-start;gap:12px"><img src="${sk.photo.data}" style="width:92px;border-radius:14px" alt=""><div class="grow">${faceMap()}</div></div>` : faceMap()}
    <div class="card" style="margin-top:14px">${sel ? `<h3>${D.SKIN_ZONES[sel]}</h3><div class="issue-chips" style="margin-top:12px">${issues.map((k) => `<button class="chip ${cur.includes(k) ? 'on' : ''}" data-act="skin-issue" data-k="${k}">${D.SKIN_ISSUES[k].icon} ${D.SKIN_ISSUES[k].label}</button>`).join('')}</div>`
      : '<p class="small muted center">👆 Touche une zone du visage</p>'}</div>
    <button class="btn primary block" style="margin-top:16px;background:var(--skin);color:#1a0a12" data-act="skin-next" data-to="questions">${Object.values(sk.zones).flat().length ? 'Continuer' : 'Rien à signaler, continuer'}</button>`;
}

function skinQuestions() {
  const sk = ui.skin;
  const done = sk.feel && D.SKIN_ROUTINE_Q.every((q) => sk.answers[q.id] !== undefined);
  return `<p class="muted small">Réponds honnêtement : c'est ce qui permet de juger ta skincare actuelle.</p>
    <div class="q-block"><div class="q">${D.SKIN_FEEL_Q.q}</div><div class="opt-list">${D.SKIN_FEEL_Q.opts.map(([k, l]) => `<button class="opt ${sk.feel === k ? 'on' : ''}" data-act="skin-feel" data-v="${k}">${l}</button>`).join('')}</div></div>
    ${D.SKIN_ROUTINE_Q.map((q) => `<div class="q-block"><div class="q">${q.q}</div><div class="opt-list">${q.opts.map(([l], i) => `<button class="opt ${sk.answers[q.id] === i ? 'on' : ''}" data-act="skin-ans" data-q="${q.id}" data-v="${i}">${l}</button>`).join('')}</div></div>`).join('')}
    <button class="btn primary block" style="margin-top:22px;background:var(--skin);color:#1a0a12" data-act="skin-finish" ${done ? '' : 'disabled'}>Voir mon résultat ✨</button>
    ${done ? '' : '<p class="note center" style="margin-top:8px">Réponds à toutes les questions pour continuer.</p>'}`;
}

function skinResult(r) {
  if (!r) return skinHome();
  const T = D.SKIN_TYPES[r.type];
  const list = (arr) => arr.map((x, i) => `<div class="routine-step"><span class="n">${i + 1}</span><div class="grow small" style="line-height:1.45">${x}</div></div>`).join('');
  const d = peekDay(today()), t = targets();
  const sleeps = lastDays(7).map((k) => peekDay(k).sleep?.minutes).filter(Boolean);
  const avgSleep = sleeps.length ? sleeps.reduce((a, b) => a + b, 0) / sleeps.length : null;
  return `<div class="card"><div class="skin-score">${ring(r.score / 100, { size: 110, stroke: 11, color: 'var(--skin)', inner: `<div><div class="mid-num">${r.score}</div><div class="xs muted">/ 100</div></div>` })}
      <div class="grow"><div class="xs upper muted">Score de ta skincare</div><h2 style="margin-top:4px;font-size:18px">${r.verdict}</h2></div></div></div>
    <div class="card section"><div class="xs upper muted">Ton type de peau</div><h2 style="margin-top:4px" class="color-skin">${T.label}</h2><p class="small muted" style="margin-top:6px;line-height:1.5">${T.desc}</p>
      ${r.concerns.length ? `<div class="row wrap" style="gap:6px;margin-top:12px">${r.concerns.map((c) => `<span class="pill">${D.SKIN_ISSUES[c]?.icon} ${D.SKIN_ISSUES[c]?.label}</span>`).join('')}</div>` : ''}</div>
    ${r.good.length ? `<div class="card section"><h3>✅ Ce que tu fais déjà bien</h3><ul class="list-plain" style="margin-top:10px">${r.good.map((x) => `<li>${x}</li>`).join('')}</ul></div>` : ''}
    ${r.improve.length ? `<div class="card section"><h3>🎯 À améliorer en priorité</h3><ul class="list-plain" style="margin-top:10px">${r.improve.map((x) => `<li>${x}</li>`).join('')}</ul></div>` : ''}
    <div class="section"><h2>Ta routine conseillée</h2>
      <div class="card" style="margin-top:12px"><h3>☀️ Matin</h3>${list(r.routine.matin)}</div>
      <div class="card" style="margin-top:10px"><h3>🌙 Soir</h3>${list(r.routine.soir)}</div>
      ${r.routine.semaine.length ? `<div class="card" style="margin-top:10px"><h3>📅 Chaque semaine</h3>${list(r.routine.semaine)}</div>` : ''}
      <p class="note" style="margin-top:8px">Introduis un seul nouveau produit à la fois et teste-le d'abord derrière l'oreille pendant 48 h.</p></div>
    <div class="card section"><h3>À privilégier</h3><div style="margin-top:12px">${r.use.map((x) => `<span class="ing-chip use">✓ ${x}</span>`).join('')}</div>
      ${r.avoid.length ? `<h3 style="margin-top:14px">À éviter</h3><div style="margin-top:12px">${r.avoid.map((x) => `<span class="ing-chip avoid">✕ ${x}</span>`).join('')}</div>` : ''}</div>
    ${r.why.length ? `<div class="card section"><h3>Pourquoi ces conseils</h3><div class="col" style="margin-top:10px">${r.why.map(([c, w]) => `<div><b class="small">${D.SKIN_ISSUES[c]?.icon} ${D.SKIN_ISSUES[c]?.label}</b><p class="small muted" style="margin-top:3px;line-height:1.5">${w}</p></div>`).join('')}</div></div>` : ''}
    <div class="card section flat" style="background:var(--card2)"><h3>🔗 Ta peau et le reste</h3><ul class="list-plain" style="margin-top:10px">
      <li>Eau aujourd'hui : ${(d.water / 1000).toFixed(1).replace('.', ',')} L sur ${(t.water / 1000).toFixed(1).replace('.', ',')} L. Une peau déshydratée marque plus.</li>
      <li>${avgSleep ? `Sommeil moyen cette semaine : ${fmtDur(Math.round(avgSleep))}.` : 'Note ton sommeil dans Suivi pour voir le lien avec ta peau.'} La peau se répare la nuit.</li>
      <li>Limite les sucres rapides et les produits laitiers en excès si tu as des boutons : chez certaines personnes, ils aggravent l'acné.</li></ul></div>
    <p class="note" style="margin-top:14px">Ces conseils sont cosmétiques et ne remplacent pas l'avis d'un dermatologue. Consulte si un bouton, une tache ou une rougeur change d'aspect, saigne, fait mal ou ne part pas.</p>
    <div class="row" style="margin-top:16px"><button class="btn grow" data-act="skin-home">Retour</button><button class="btn primary grow" style="background:var(--skin);color:#1a0a12" data-act="skin-start">Refaire le scan</button></div>`;
}

/* ============================================================
   Profil
   ============================================================ */
let installEvt = null;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvt = e; });

function viewProfil() {
  const p = S.profile, t = targets();
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  const daysUsed = Object.keys(S.days).length;
  return `<div class="view">${header('Profil', { back: 'home' })}
    <div class="card row" style="gap:14px"><div class="avatar" style="width:60px;height:60px;font-size:24px">${esc(p.name[0]?.toUpperCase())}</div>
      <div class="grow"><h2>${esc(p.name)}</h2><p class="small muted" style="margin-top:3px">${p.age} ans · ${p.height} cm · ${currentWeight().toFixed(1).replace('.', ',')} kg</p><p class="small" style="margin-top:3px">${D.GOALS[p.goal].icon} ${D.GOALS[p.goal].label}</p></div></div>
    <div class="section grid3"><div class="card center" style="padding:12px"><div class="mid-num">${daysUsed}</div><div class="xs muted">jours suivis</div></div><div class="card center" style="padding:12px"><div class="mid-num">${Object.values(S.days).filter((d) => d.workout).length}</div><div class="xs muted">séances</div></div><div class="card center" style="padding:12px"><div class="mid-num">${streak()}</div><div class="xs muted">jours de suite</div></div></div>
    <div class="section card"><h3>Mes objectifs quotidiens</h3>
      ${[['🍽️', 'Calories', `${fmt(t.kcal)} kcal`], ['🥩', 'Protéines', `${t.prot} g`], ['💧', 'Eau', `${(t.water / 1000).toFixed(1).replace('.', ',')} L`], ['👟', 'Pas', fmt(t.steps)], ['😴', 'Sommeil', '8 h'], ['🏋️', 'Sport', `${p.days} séances / semaine`]].map(([i, l, v]) => `<div class="food-item"><span>${i}</span><div class="grow">${l}</div><b>${v}</b></div>`).join('')}
      <button class="btn block" style="margin-top:12px" data-act="edit-profile">Modifier mon profil</button></div>
    ${standalone ? '' : `<div class="section card"><h3>📲 Installer l'appli</h3><p class="small muted" style="margin-top:6px;line-height:1.5">${ios ? 'Sur iPhone : touche le bouton Partager de Safari, puis « Sur l\'écran d\'accueil ».' : 'Ajoute All In sur ton écran d\'accueil pour l\'ouvrir comme une vraie appli.'}</p>
      ${!ios ? `<button class="btn primary block" style="margin-top:12px" data-act="install">Installer</button>` : ''}</div>`}
    <div class="section card"><h3>Bientôt dans la V2</h3><div class="col" style="margin-top:10px;gap:12px">${D.V2_FEATURES.map(([i, t1, d1]) => `<div class="row" style="align-items:flex-start"><span style="font-size:20px">${i}</span><div><b class="small">${t1}</b><p class="xs muted" style="margin-top:2px">${d1}</p></div></div>`).join('')}</div></div>
    <div class="section card"><h3>Mes données</h3><p class="small muted" style="margin-top:6px">Tout est enregistré sur ce téléphone, rien n'est envoyé sur internet. Exporte une sauvegarde avant de changer d'appareil.</p>
      <div class="row" style="margin-top:12px"><button class="btn grow sm" data-act="export">⬇ Exporter</button><label class="btn grow sm" style="cursor:pointer">⬆ Importer<input type="file" accept="application/json,.json" data-on="import" hidden></label></div>
      <button class="btn danger block sm" style="margin-top:8px" data-act="reset">Effacer toutes mes données</button></div>
    <p class="note center section">All In · V1</p></div>`;
}

/* ============================================================
   Actions (délégation d'événements)
   ============================================================ */
const A = {
  go: (el) => go(el.dataset.to),
  'close-modal': () => closeModal(),

  'ob-next': () => {
    const ob = ui.ob;
    if (ob.step === 6) return finishOnboarding();
    ob.step++; render();
  },
  'ob-back': () => {
    const ob = ui.ob;
    if (ob.step <= 1) { if (ob.edit) { ui.ob = null; go('profil'); return; } ob.step = 0; }
    else ob.step--;
    render();
  },
  'ob-set': (el) => { ui.ob.d[el.dataset.k] = el.dataset.v; rerender(); },
  'edit-profile': () => { ui.ob = newOb(true); go('onboarding'); },

  'water-add': (el) => {
    const ml = +el.dataset.ml, d = day();
    d.water += ml; (d.waterLog = d.waterLog || []).push(ml);
    save(); navigator.vibrate?.(30);
    if (d.water >= targets().water && d.water - ml < targets().water) toast('🎉 Objectif eau atteint !'); else toast(`+${ml} ml 💧`);
    rerender();
  },
  'water-undo': () => { const d = day(); const ml = d.waterLog?.pop(); if (ml) { d.water = Math.max(0, d.water - ml); save(); rerender(); } },

  'sleep-q': (el) => { ui.sleepQ = +el.dataset.v; rerender(); },
  'sleep-save': () => {
    const bed = document.getElementById('sl-bed').value, wake = document.getElementById('sl-wake').value;
    if (!bed || !wake) return toast('Indique tes heures');
    const q = ui.sleepQ ?? peekDay(today()).sleep?.quality ?? 3;
    day().sleep = { bed, wake, quality: q, minutes: sleepMinutes(bed, wake) };
    ui.sleepQ = undefined; save(); toast('Nuit enregistrée 😴'); rerender();
  },
  'cycle-mode': (el) => { ui.cycleMode = el.dataset.v; ui.cycleTime = el.dataset.v === 'bed' ? '23:00' : '07:00'; rerender(); },

  'steps-add': () => { const v = parseInt(document.getElementById('steps-in').value); if (!(v > 0)) return toast('Entre un nombre de pas'); day().steps += v; save(); toast(`+${fmt(v)} pas 👟`); rerender(); },
  'steps-set': () => { const v = parseInt(document.getElementById('steps-in').value); if (!(v >= 0)) return toast('Entre un nombre de pas'); day().steps = v; save(); toast('Total mis à jour'); rerender(); },
  ped: () => togglePedometer(),

  'weight-add': () => {
    const v = parseFloat(String(document.getElementById('w-in').value).replace(',', '.'));
    if (!(v >= 30 && v <= 300)) return toast('Poids invalide');
    addWeight(v); save(); toast('Pesée enregistrée'); rerender();
  },
  'weight-del': (el) => {
    if (S.weights.length <= 1) return toast('Garde au moins une pesée');
    S.weights = S.weights.filter((w) => w.date !== el.dataset.d); save(); rerender();
  },

  'nutri-tab': (el) => { ui.nutriTab = el.dataset.v; rerender(); },
  'recipe-filter': (el) => { ui.recipeFilter = el.dataset.v; rerender(); },
  recipe: (el) => recipeModal(el.dataset.id),
  'recipe-add': (el) => {
    const r = D.RECIPES.find((x) => x.id === el.dataset.id);
    const h = new Date().getHours();
    ui.meal = r.meal === 'Petit-déjeuner' || r.meal === 'Collation' ? r.meal : h < 16 ? 'Déjeuner' : 'Dîner';
    addFood({ n: r.name, u: '1 portion', k: r.kcal, p: r.p, g: 0, l: 0 });
    closeModal(); toast(`Ajouté au ${ui.meal.toLowerCase()} ✓`); ui.nutriTab = 'journal'; rerender();
  },
  'food-open': (el) => { ui.meal = el.dataset.meal; ui.portion = 1; ui.foodQ = ''; foodModal(); },
  portion: (el) => { ui.portion = +el.dataset.v; foodModal(); },
  'food-add': (el) => {
    const f = D.FOODS[+el.dataset.i], m = ui.portion;
    addFood({ n: f.n, u: `${m !== 1 ? m + ' × ' : ''}${f.u}`, k: f.k * m, p: f.p * m, g: f.g * m, l: f.l * m });
    closeModal(); toast(`${f.n} ajouté ✓`); rerender();
  },
  'food-custom': () => {
    const n = document.getElementById('cf-n').value.trim(), k = parseFloat(document.getElementById('cf-k').value), p = parseFloat(document.getElementById('cf-p').value) || 0;
    if (!n || !(k >= 0)) return toast('Nom et calories obligatoires');
    addFood({ n, u: 'perso', k, p, g: 0, l: 0 }); closeModal(); toast(`${n} ajouté ✓`); rerender();
  },
  'food-del': (el) => { day().meals.splice(+el.dataset.i, 1); save(); rerender(); },

  'toggle-session': (el) => { const i = +el.dataset.i; const ses = todaySession(); const isOpen = ui.openSession === i || (ui.openSession === null && ses && ses.idx === i); ui.openSession = isOpen ? -1 : i; rerender(); },
  'ex-info': (el) => exerciseModal(el.dataset.id, { sets: +el.dataset.sets || 0, target: el.dataset.target, rest: +el.dataset.rest }),
  'start-wk': (el) => startWorkout(+el.dataset.i),
  'set-done': () => completeSet(),
  'wk-chrono': () => { const w = ui.wk; const e = w.s.exercises[w.ex]; w.chrono = true; w.left = maxSeconds(e.target); beep(880, 0.1); stopWorkoutTimer(); wkTimer = setInterval(tick, 1000); rerender(); },
  'skip-ex': () => {
    const w = ui.wk; stopWorkoutTimer(); w.chrono = false;
    if (w.ex >= w.s.exercises.length - 1) return finishWorkout();
    w.ex++; w.set = 1; w.phase = 'work'; rerender();
  },
  'rest-add': () => { ui.wk.left += 15; rerender(); },
  'rest-skip': () => { stopWorkoutTimer(); ui.wk.phase = 'work'; rerender(); },
  'quit-wk': () => {
    openModal(`<h2>Quitter la séance ?</h2><p class="muted small" style="margin-top:6px">Ta progression sur cette séance ne sera pas enregistrée.</p>
      <div class="row" style="margin-top:18px"><button class="btn grow" data-act="close-modal">Continuer</button><button class="btn danger grow" data-act="quit-wk-ok">Quitter</button></div>`);
  },
  'quit-wk-ok': () => { closeModal(); stopWorkoutTimer(); ui.wk = null; go('sport'); },
  'end-wk': () => { ui.wk = null; go('home'); },

  'skin-start': () => startSkin(),
  'skin-home': () => { ui.skin.step = null; rerender(); },
  'skin-result': () => { ui.skin.step = 'result'; rerender(); },
  'skin-back': () => {
    const order = [null, 'photo', 'zones', 'questions'];
    const s = ui.skin.step;
    if (s === 'result') ui.skin.step = null;
    else ui.skin.step = order[Math.max(0, order.indexOf(s) - 1)];
    stopCamera(); rerender();
  },
  'skin-capture': () => capturePhoto(),
  'skin-retake': () => { ui.skin.photo = null; ui.skin.camError = false; rerender(); },
  'skin-next': (el) => { stopCamera(); ui.skin.step = el.dataset.to; if (el.dataset.to === 'zones') ui.skin.sel = 'front'; rerender(); },
  'skin-zone': (el) => { ui.skin.sel = el.dataset.z; rerender(); },
  'skin-issue': (el) => {
    const z = ui.skin.sel, k = el.dataset.k;
    const cur = new Set(ui.skin.zones[z] || []);
    cur.has(k) ? cur.delete(k) : cur.add(k);
    ui.skin.zones[z] = [...cur]; rerender();
  },
  'skin-feel': (el) => { ui.skin.feel = el.dataset.v; rerender(); },
  'skin-ans': (el) => { ui.skin.answers[el.dataset.q] = +el.dataset.v; rerender(); },
  'skin-finish': () => finishSkin(),

  install: async () => {
    if (installEvt) { installEvt.prompt(); await installEvt.userChoice; installEvt = null; }
    else toast('Utilise le menu du navigateur : « Ajouter à l\'écran d\'accueil »');
  },
  export: () => {
    const blob = new Blob([JSON.stringify(S, null, 1)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = `all-in-sauvegarde-${today()}.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  },
  reset: () => openModal(`<h2>Tout effacer ?</h2><p class="muted small" style="margin-top:6px">Profil, suivis, repas, photos : tout sera supprimé de ce téléphone. Cette action est définitive.</p>
    <div class="row" style="margin-top:18px"><button class="btn grow" data-act="close-modal">Annuler</button><button class="btn danger grow" data-act="reset-ok">Tout effacer</button></div>`),
  'reset-ok': () => { closeModal(); resetAll(); ui.ob = null; location.hash = '#/home'; render(); },
};

const INPUTS = {
  'food-search': (el) => {
    ui.foodQ = el.value;
    const pos = el.selectionStart;
    foodModal();
    const q = document.getElementById('food-q'); q.focus(); q.setSelectionRange(pos, pos);
  },
  'cycle-time': (el) => { ui.cycleTime = el.value; const c = document.getElementById('cycles'); if (c) c.innerHTML = cyclesHtml(); },
  'skin-file': (el) => { const f = el.files?.[0]; if (f) importPhoto(f); },
  import: (el) => {
    const f = el.files?.[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try { const o = JSON.parse(r.result); if (!o.v || !o.profile) throw 0; replaceState(o); toast('Données importées ✓'); go('home'); render(); }
      catch { toast('Fichier invalide'); }
    };
    r.readAsText(f);
  },
};

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el) return;
  const fn = A[el.dataset.act];
  if (fn) { e.preventDefault(); e.stopPropagation(); fn(el, e); }
});
document.addEventListener('input', (e) => {
  const el = e.target;
  if (el.dataset.bind && ui.ob) {
    ui.ob.d[el.dataset.bind] = el.value;
    const btn = document.querySelector('.ob .foot .btn');
    if (btn) { const tmp = document.createElement('div'); tmp.innerHTML = viewOnboarding(); const nb = tmp.querySelector('.ob .foot .btn'); btn.disabled = nb.disabled; }
  }
  if (el.dataset.on && el.type !== 'file' && INPUTS[el.dataset.on]) INPUTS[el.dataset.on](el);
});
document.addEventListener('change', (e) => {
  const el = e.target;
  if (el.dataset.on && el.type === 'file' && INPUTS[el.dataset.on]) INPUTS[el.dataset.on](el);
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.target.closest('.ob')) { const b = document.querySelector('.ob .foot .btn'); if (b && !b.disabled) b.click(); }
});

window.addEventListener('hashchange', render);
// Nouveau jour ou retour sur l'appli : on rafraîchit
document.addEventListener('visibilitychange', () => { if (!document.hidden && route().page !== 'wk') rerender(); });

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

render();
