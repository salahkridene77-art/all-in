/* ============================================================
   ALL IN — Écrans et interactions
   ============================================================ */
import * as D from './data.js';
import {
  S, save, saveQuiet, resetAll, replaceState, today, day, peekDay, lastDays, dayLetter, addDays, parseKey, weekdayMon,
  DAY_SHORT, DAY_NAMES, prettyDate, shortDate, targets, bmi, currentWeight, dayNutrition, sleepMinutes, fmtDur,
  buildPlan, todaySession, streak, dayScore, isTrainingDay, weekNumber, isLightWeek, recordFeedback, weekKey, mondayOf, esc, fmt, ring, bar, barChart, lineChart, toast, openModal, closeModal, beep, pad, onSave,
} from './core.js';
import { exerciseAnim, hasAnim } from './anim.js';
import { cloud, initCloud, schedulePush, signUp, signIn, signInGoogle, resetPassword, signOutUser, authError, ai, pullAndMerge } from './cloud.js';

const app = document.getElementById('app');
// Navigateur intégré à une appli (Instagram, Facebook, TikTok, Snapchat…) : caméra et connexion Google souvent bloquées
const IN_APP = /FBAN|FBAV|FB_IAB|Instagram|TikTok|musical_ly|Bytedance|Snapchat|Line\/|MicroMessenger|Twitter/i.test(navigator.userAgent);
const inAppNote = () => IN_APP ? `<div class="card flat" style="background:rgba(255,169,77,.12);border:1px solid rgba(255,169,77,.35);margin-bottom:12px"><p class="small" style="line-height:1.5">⚠️ Tu as ouvert All In depuis une autre appli (Instagram, TikTok…). La caméra et la connexion Google peuvent y être bloquées. Ouvre plutôt le lien dans <b>Safari</b> ou <b>Chrome</b> : menu ⋯ → « Ouvrir dans le navigateur ».</p></div>` : '';
const MEALS = ['Petit-déjeuner', 'Déjeuner', 'Dîner', 'Collation'];

const ui = {
  nutriTab: 'journal', recipeFilter: 'all', meal: 'Déjeuner', portion: 1, foodQ: '',
  ob: null, skin: { step: null, sel: null, photo: null, zones: {}, feel: null, answers: {}, camError: false },
  openSession: null, wk: null, cycleMode: 'bed', cycleTime: '23:00', lastRoute: '',
  coachLoading: false, briefLoading: false, briefError: '', mealAi: null, authMode: 'login', pendingConsent: null,
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
    const views = { home: viewHome, sport: viewSport, wk: viewWorkout, coach: viewCoach, nutrition: viewNutrition, suivi: () => viewSuivi(sub || 'eau'), peau: viewPeau, profil: viewProfil, premium: viewPremium, bilan: viewBilan, progres: viewProgres, infos: viewInfos };
    const v = views[page] || viewHome;
    const noNav = page === 'wk';
    app.innerHTML = v() + (noNav ? '' : nav(page));
  }
  if (key !== ui.lastRoute) { window.scrollTo(0, 0); ui.lastRoute = key; }
  afterRender(page);
}
const rerender = () => { const y = window.scrollY; render(); window.scrollTo(0, y); };

function afterRender(page) {
  if (S.profile && page !== 'wk') checkBadges();
  if (page === 'coach' && ui.scrollChat) { ui.scrollChat = false; requestAnimationFrame(() => window.scrollTo(0, document.body.scrollHeight)); }
  if (page === 'home' && S.profile && cloud.user && (!S.brief || S.brief.date !== today()) && !ui.briefLoading && !ui.briefError) fetchBrief();
  if (page === 'peau' && ui.skin.step === 'photo' && !ui.skin.photo && !ui.skin.camError) startCamera();
  const q = document.getElementById('food-q');
  if (q && document.activeElement !== q && ui.focusFood) { q.focus(); ui.focusFood = false; }
}

function nav(page) {
  const tabs = [['home', '🏠', 'Accueil'], ['sport', '🏋️', 'Sport'], ['coach', '🤖', 'Coach'], ['nutrition', '🥗', 'Nutrition'], ['suivi', '📊', 'Suivi'], ['peau', '✨', 'Peau']];
  return `<nav class="nav"><div class="nav-in">${tabs.map(([k, i, l]) => `<a href="#/${k}" class="${page === k || (k === 'home' && ['profil', 'premium', 'bilan', 'progres', 'infos'].includes(page)) ? 'on' : ''}"><span class="i">${i}</span>${l}</a>`).join('')}</div></nav>`;
}

function header(title, { back = null, right = '' } = {}) {
  return `<div class="top">${back ? `<button class="back" data-act="go" data-to="${back}" aria-label="Retour">←</button>` : ''}<h1 class="grow">${title}</h1>${right}</div>`;
}

/* ============================================================
   Onboarding
   ============================================================ */
function detectCountry() {
  const tz = (Intl.DateTimeFormat().resolvedOptions().timeZone || '');
  const map = { 'Africa/Algiers': 'DZ', 'Africa/Casablanca': 'MA', 'Africa/Tunis': 'TN', 'Europe/Paris': 'FR', 'Europe/Brussels': 'BE', 'Europe/Zurich': 'CH', 'Europe/Luxembourg': 'LU', 'Africa/Dakar': 'SN', 'Africa/Abidjan': 'CI' };
  if (map[tz]) return map[tz];
  if (tz.startsWith('America/') && /fr-CA/i.test(navigator.language)) return 'CA';
  const reg = (navigator.language || '').split('-')[1];
  return D.COUNTRIES[reg] ? reg : 'FR';
}
const userCountry = () => D.COUNTRIES[S.profile?.country] ? S.profile.country : detectCountry();
const countryInfo = () => D.COUNTRIES[userCountry()];

function newOb(edit = false) {
  const p = S.profile;
  return {
    step: edit ? 1 : 0, edit,
    d: p ? { ...p, country: userCountry(), weight: currentWeight() } : { name: '', sex: '', country: detectCountry(), age: '', height: '', weight: '', goal: '', level: '', place: '', days: 3, activity: '1.375' },
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
        ${cloud.enabled ? `<button class="btn ghost block" style="margin-top:10px" data-act="auth-open" data-mode="login">J'ai déjà un compte</button>` : ''}
        <p class="note center" style="margin-top:12px">Gratuit · Fonctionne même sans compte</p></div></div>`;
  }
  const total = 6;
  const steps = {
    1: () => ({
      title: 'Comment tu t\'appelles ?', sub: 'Pour personnaliser ton expérience.',
      ok: d.name.trim() && d.sex && d.country,
      body: `<div class="field"><label>Prénom</label><input class="input" data-bind="name" value="${esc(d.name)}" placeholder="Ton prénom" autocomplete="given-name"></div>
        <div class="field"><label>Sexe (pour le calcul des besoins)</label><div class="grid2">
        ${[['h', '👨', 'Homme'], ['f', '👩', 'Femme']].map(([v, i, l]) => `<button class="choice ${d.sex === v ? 'on' : ''}" data-act="ob-set" data-k="sex" data-v="${v}"><span class="ico">${i}</span><span class="t">${l}</span></button>`).join('')}</div></div>
        <div class="field"><label>Pays (pour te conseiller des produits vendus chez toi)</label><select class="input" data-bind="country">${Object.entries(D.COUNTRIES).map(([k, c]) => `<option value="${k}" ${d.country === k ? 'selected' : ''}>${c.flag} ${c.label}</option>`).join('')}</select></div>`,
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
          <div class="card"><div class="xs upper muted">Eau</div><div class="mid-num color-water">${(t.waterBase / 1000).toFixed(1).replace('.', ',')} L</div><div class="xs muted">+0,5 L les jours de sport</div></div>
          <div class="card"><div class="xs upper muted">Pas</div><div class="mid-num color-steps">${fmt(t.steps)}</div><div class="xs muted">par jour</div></div>
          <div class="card"><div class="xs upper muted">Sommeil</div><div class="mid-num color-sleep">${fmtDur(t.sleepMin).replace(' 00', '')}</div><div class="xs muted">par nuit</div></div>
          <div class="card"><div class="xs upper muted">Sport</div><div class="mid-num">${d.days}×</div><div class="xs muted">par semaine</div></div></div>
          ${calcDetails(t, { ...d, days: +d.days })}
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
  const t = targets(S.profile);
  S.profile = saved; S.weights = savedW;
  return t;
}

function finishOnboarding() {
  const d = ui.ob.d;
  const p = { name: d.name.trim(), sex: d.sex, country: d.country || detectCountry(), age: +d.age, height: +d.height, weight: +d.weight, goal: d.goal, level: +d.level, place: d.place, days: +d.days, activity: String(d.activity), createdAt: S.profile?.createdAt || today() };
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
      <p class="small" style="margin-top:12px;font-weight:700">${verdict}</p>
      <div style="margin-top:14px">${levelChip()}</div></div>

    ${nudgeCard() ? `<div class="section">${nudgeCard()}</div>` : ''}
    ${reviewCard() ? `<div class="section">${reviewCard()}</div>` : ''}
    <div class="section">${coachCard()}</div>

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

    <div class="section">${factCard()}</div>
    <div class="section card flat" style="background:var(--card2)"><div class="tip-card"><span class="ico">🎯</span><div><div class="xs upper muted">Conseil pour ton objectif</div><p style="margin-top:5px;line-height:1.5">${tipOfDay()}</p></div></div></div>
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
        ${s.exercises.map((e) => `<div class="ex-row" data-act="ex-info" data-id="${e.id}" data-sets="${e.sets}" data-target="${esc(e.target)}" data-rest="${e.rest}"><div class="ico">${e.icon}</div><div class="grow"><div style="font-weight:700">${e.name}</div><div class="meta">${e.unit === 'cardio' ? e.target : `${e.sets} × ${e.target}`}${e.rest ? ` · repos ${e.rest} s` : ''}${e.shift ? ` <b style="color:${e.shift > 0 ? 'var(--steps)' : 'var(--food)'}">${e.shift > 0 ? '↑' : '↓'}</b>` : ''}</div></div><span class="dim">ⓘ</span></div>`).join('')}
        ${s.finisher ? `<p class="small" style="margin-top:10px;color:var(--accent)">${s.finisher}</p>` : ''}
        <button class="btn primary block" style="margin-top:14px" data-act="start-wk" data-i="${s.idx}">▶ Commencer</button></div>` : ''}</div>`;
  }).join('');

  return `<div class="view">${header('Sport', { right: `<span class="pill">${D.GOALS[p.goal].icon} ${D.GOALS[p.goal].label}</span>` })}
    <div class="week">${week}</div>
    <div class="row between" style="margin-top:14px"><p class="small muted">${p.days} séances / semaine · ${p.place === 'maison' ? '🏠 Maison' : '🏢 Salle'} · ${D.LEVELS[p.level].label}</p><span class="small nowrap" style="font-weight:700">${doneMonth} ce mois-ci</span></div>

    <div class="section card flat" style="background:var(--card2)"><div class="row" style="align-items:flex-start"><span style="font-size:22px">🔥</span><div><h3>Échauffement (5 min, avant chaque séance)</h3>
      <p class="small muted" style="margin-top:5px;line-height:1.5">Rotations des épaules, des hanches et des chevilles · 1 min de jumping jacks ou montées de genoux · 10 squats lents · 10 pompes faciles (mains en hauteur).</p></div></div></div>

    <div class="section">${progressCard(plan)}</div>
    <div class="section"><div class="section-title"><h2>Ton programme</h2></div>${sessions}</div>

    <div class="section card"><h3>Comment progresser</h3><ul class="list-plain" style="margin-top:10px">
      <li>Après chaque exercice, ton retour (trop dur, parfait, trop facile) ajuste automatiquement tes répétitions.</li>
      <li>Toutes les 4 semaines, une semaine plus légère laisse ton corps récupérer.</li>
      <li>Garde 1 à 2 répétitions « en réserve » : la technique passe avant tout.</li>
      <li>Une douleur articulaire vive = on arrête l'exercice.</li>
      <li>Fin de séance : 5 min d'étirements doux et un grand verre d'eau.</li></ul></div>
    <button class="btn block section" style="background:rgba(212,255,58,.1);color:var(--accent)" data-act="coach-ask" data-t="Adapte ma séance du jour à mon état de forme (sommeil, énergie, courbatures). Donne-moi la version adaptée.">🤖 Adapter ma séance avec le coach</button>
    <button class="btn ghost block" style="margin-top:10px" data-act="edit-profile">Changer d'objectif ou de rythme</button></div>`;
}

function exerciseModal(id, extra = {}) {
  const e = D.EXERCISES[id];
  openModal(`<div class="modal-head"><div><h2>${e.name}</h2><p class="small muted">${e.muscles}</p></div><button class="icon-btn" data-act="close-modal">✕</button></div>
    ${hasAnim(id) ? `<div class="anim-box" style="margin-bottom:16px;padding:6px">${exerciseAnim(id, { size: 230 })}<p class="xs muted" style="padding-bottom:8px">Démonstration animée · le mouvement tourne en boucle</p></div>` : ''}
    ${extra.sets ? `<div class="grid3" style="margin-bottom:16px"><div class="card center" style="padding:12px"><div class="mid-num">${e.unit === 'cardio' ? '1' : extra.sets}</div><div class="xs muted">série${extra.sets > 1 ? 's' : ''}</div></div><div class="card center" style="padding:12px"><div style="font-weight:800;font-size:15px;padding:5px 0">${esc(extra.target)}</div><div class="xs muted">par série</div></div><div class="card center" style="padding:12px"><div class="mid-num">${extra.rest || 0}s</div><div class="xs muted">repos</div></div></div>` : ''}
    <h3>Comment faire</h3><ol class="steps" style="margin-top:10px">${e.steps.map((s) => `<li>${s}</li>`).join('')}</ol>
    <div class="card flat" style="background:var(--card2);margin-top:16px"><p class="small"><b>💡 Conseil :</b> ${e.tip}</p></div>`);
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
  const lastSet = w.set >= e.sets || e.unit === 'cardio';
  if (lastSet) { w.phase = 'feedback'; rerender(); return; }
  w.set++;
  if (e.rest) { w.phase = 'rest'; w.left = e.rest; wkTimer = setInterval(tick, 1000); }
  else w.phase = 'work';
  rerender();
}

function afterFeedback(f) {
  const w = ui.wk, e = w.s.exercises[w.ex];
  if (f !== null) recordFeedback(e.id, f);
  const lastEx = w.ex >= w.s.exercises.length - 1;
  if (lastEx) return finishWorkout();
  w.ex++; w.set = 1;
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
  if (w.phase === 'feedback') {
    return `<div class="view no-nav workout">${top}${prog}<div class="wk-main"><div class="wk-ico">${e.icon}</div><div><div class="xs upper muted">${e.name} terminé</div><h1 style="margin-top:6px">C'était comment ?</h1>
      <p class="small muted" style="margin-top:6px;line-height:1.5">Ta réponse ajuste ${e.unit === 'reps' ? 'tes répétitions' : 'ta durée'} pour les prochaines séances.</p></div>
      <div class="col" style="width:100%;gap:10px"><button class="btn block fb-btn" data-act="wk-fb" data-v="-1">😮‍💨 Trop dur</button><button class="btn block fb-btn" data-act="wk-fb" data-v="0">👌 Parfait</button><button class="btn block fb-btn" data-act="wk-fb" data-v="1">💪 Trop facile</button></div></div>
      <button class="btn ghost block sm" data-act="wk-fb" data-v="skip">Passer</button></div>`;
  }
  if (w.phase === 'rest') {
    const tot = exs[w.set === 1 ? w.ex - 1 : w.ex]?.rest || 60;
    const restFact = factAt(['sport', 'eau', 'nutrition'][(w.ex + w.set) % 3], w.ex * 3 + w.set + doy());
    const lightTxt = isLightWeek() ? '<p class="xs muted">Semaine légère : une série de moins</p>' : '';
    return `<div class="view no-nav workout">${top}${prog}<div class="wk-main"><div class="xs upper muted">Repos</div>
      <div class="rest-ring">${ring(w.left / tot, { size: 210, stroke: 14, color: 'var(--water)', inner: `<div><div class="t">${w.left}</div><div class="small muted">secondes</div></div>` })}</div>
      <div class="card" style="width:100%;text-align:left"><div class="xs upper muted">À suivre</div><div class="row" style="margin-top:8px"><span style="font-size:28px">${e.icon}</span><div><b>${e.name}</b><div class="small muted">Série ${w.set} / ${e.sets} · ${e.target}</div></div></div></div>${lightTxt}<div class="card flat" style="width:100%;text-align:left;background:var(--card2)">${factHtml(restFact)}</div></div>
      <div class="row"><button class="btn grow" data-act="rest-add">+15 s</button><button class="btn primary grow" data-act="rest-skip">Passer le repos</button></div></div>`;
  }

  const timed = e.unit === 'time';
  return `<div class="view no-nav workout">${top}${prog}<div class="wk-main">
    ${hasAnim(e.id) ? `<div class="anim-box wk-anim">${exerciseAnim(e.id, { size: 220 })}</div>` : `<div class="wk-ico">${e.icon}</div>`}<div><h1>${e.name}</h1><p class="muted small" style="margin-top:4px">${e.muscles}</p></div>
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
    ${cloud.user ? `<label class="btn block ai-btn" style="margin-bottom:12px">📸 Photo de mon assiette <span class="pill on" style="padding:3px 8px">IA</span>${isPro() ? '' : `<span class="xs" style="opacity:.7">${quotaLeft('meal')}/${D.FREE_LIMITS.meal}</span>`}<input type="file" accept="image/*" capture="environment" data-on="meal-photo" hidden></label>`
      : cloud.enabled ? `<button class="btn block ai-btn" style="margin-bottom:12px" data-act="need-login">📸 Photo de mon assiette <span class="pill" style="padding:3px 8px">IA · connexion</span></button>` : ''}
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
  day().meals.push({ ...item, meal: ui.meal, at: Date.now() });
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
      <p class="xs dim" style="margin-top:4px">Base ${(t.waterBase / 1000).toFixed(1).replace('.', ',')} L${t.waterTrain ? ' · +0,5 L jour de sport' : ''}${t.waterHeat ? ' · +0,3 L chaleur' : ''}</p>
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
  if (!navigator.mediaDevices?.getUserMedia) { ui.skin.camError = true; rerender(); return; }
  try {
    camStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1080 }, height: { ideal: 1440 } }, audio: false });
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
  const W = 720, H = 960; // assez de détails pour voir pores et texture
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  const r = Math.max(W / sw, H / sh);
  const dw = sw * r, dh = sh * r;
  if (mirror) { ctx.translate(W, 0); ctx.scale(-1, 1); }
  ctx.drawImage(src, (W - dw) / 2, (H - dh) / 2, dw, dh);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  return { data: c.toDataURL('image/jpeg', 0.85), light: analyseLight(ctx, W, H) };
}

/* Scan guidé : de face, puis côté gauche et côté droit, avec compte à rebours */
const sleep = (ms) => new Promise((ok) => setTimeout(ok, ms));
async function runScanSequence() {
  const sk = ui.skin;
  if (sk.scanning) return;
  const v = document.getElementById('cam');
  if (!v || !v.videoWidth) { toast('Caméra pas encore prête'); return; }
  sk.scanning = true; sk.shots = [];
  const hud = () => document.getElementById('scan-hud');
  const box = document.querySelector('.cam-box');
  box?.classList.add('scanning');
  document.querySelectorAll('[data-act="scan-go"], .scan-alt').forEach((b) => { b.disabled = true; b.style.opacity = .4; });
  for (let i = 0; i < D.SCAN_ANGLES.length; i++) {
    const a = D.SCAN_ANGLES[i];
    for (let n = a.wait; n > 0; n--) {
      if (route().page !== 'peau' || ui.skin !== sk || !document.getElementById('cam')) { sk.scanning = false; return; }
      const h = hud();
      if (h) h.innerHTML = `<div class="scan-step">${i + 1} / ${D.SCAN_ANGLES.length} · ${a.label}</div><div class="scan-hint">${a.hint}</div><div class="scan-count">${n}</div>`;
      document.querySelectorAll('.scan-dots i').forEach((d, j) => { d.className = j < i ? 'done' : j === i ? 'cur' : ''; });
      beep(620, 0.05);
      await sleep(1000);
    }
    const vid = document.getElementById('cam');
    if (!vid?.videoWidth) { sk.scanning = false; return; }
    sk.shots.push(drawToPhoto(vid, vid.videoWidth, vid.videoHeight, true));
    beep(990, 0.08);
    box?.classList.add('flash'); await sleep(180); box?.classList.remove('flash');
  }
  sk.scanning = false;
  stopCamera();
  handleShots();
}

/* Photos importées (1 à 3) ou prises une par une avec l'appareil photo */
function importPhotos(files) {
  const list = [...files].slice(0, 3 - (ui.skin.shots?.length || 0));
  Promise.all(list.map((file) => new Promise((ok) => {
    const r = new FileReader();
    r.onload = () => { const img = new Image(); img.onload = () => ok(drawToPhoto(img, img.width, img.height, false)); img.onerror = () => ok(null); img.src = r.result; };
    r.readAsDataURL(file);
  }))).then((shots) => {
    stopCamera();
    ui.skin.shots = [...(ui.skin.shots || []), ...shots.filter(Boolean)];
    if (ui.skin.single && ui.skin.shots.length < 3) { rerender(); return; } // appareil photo : on propose l'angle suivant
    handleShots();
  });
}

/* Après le scan : les photos ne sont jamais affichées. Si la lumière est mauvaise on prévient, sinon on enchaîne. */
function handleShots() {
  const shots = ui.skin.shots || [];
  if (!shots.length) return;
  ui.skin.photo = shots[0];
  if (shots[0].light.cls === 'warn') { ui.skin.lightWarn = true; rerender(); return; }
  proceedWithPhoto();
}

function proceedWithPhoto() {
  const data = ui.skin.photo?.data;
  const images = (ui.skin.shots?.length ? ui.skin.shots : ui.skin.photo ? [ui.skin.photo] : []).map((x) => x.data);
  ui.skin.shots = [];
  ui.skin.lightWarn = false;
  if (data && S.settings?.keepSkinPhotos) {
    S.skin.photos = S.skin.photos.filter((x) => x.date !== today());
    S.skin.photos.push({ date: today(), data });
    S.skin.photos = S.skin.photos.slice(-6);
    save();
  }
  ui.skin.photo = null; // la photo disparaît de l'écran et de la mémoire de l'appli
  const manual = (why) => { ui.skin.manual = true; ui.skin.manualWhy = why; ui.skin.step = 'zones'; ui.skin.sel = 'front'; rerender(); };
  if (!data) return manual('nophoto');
  if (!cloud.user) return manual('login');
  if (!requireQuota('scan', () => manual('quota'))) return;
  withConsent(() => { consume('scan'); ui.skin.pending = images; startSkinAi(images); ui.skin.manual = false; ui.skin.step = 'questions'; rerender(); }, () => manual('consent'));
}

/* L'analyse IA démarre tout de suite, pendant que la personne répond aux questions */
function startSkinAi(images) {
  ui.skin.aiStatus = 'running'; ui.skin.aiRes = null; ui.skin.aiError = '';
  const imgs = Array.isArray(images) ? images : [images];
  const run = ui.skin.aiPromise = ai('skin', { images: imgs, answers: { sexe: S.profile.sex === 'f' ? 'femme' : 'homme', age: S.profile.age } })
    .then((r) => { if (ui.skin.aiPromise !== run) return; ui.skin.aiRes = r; ui.skin.aiStatus = 'done'; })
    .catch((e) => { if (ui.skin.aiPromise !== run) return; ui.skin.aiStatus = 'error'; ui.skin.aiError = e.message; })
    .finally(() => { if (route().page === 'peau' && ui.skin.step === 'questions') rerender(); });
  return run;
}

/* Réponses du questionnaire, avec ce qui est déjà bien fait */
function skinRoutineAnswers() {
  const sk = ui.skin;
  const out = skinQs(sk).map((q) => {
    const opt = q.opts[sk.answers[q.id]];
    if (!opt) return null;
    const max = Math.max(...q.opts.map((o) => o[1]));
    return { question: q.q, reponse: opt[0], statut: opt[1] === max ? 'déjà bien' : 'à améliorer' };
  }).filter(Boolean);
  const feel = D.SKIN_FEEL_Q.opts.find(([k]) => k === sk.feel);
  if (feel) out.unshift({ question: 'Ressenti de la peau en fin de journée', reponse: feel[1], statut: 'info' });
  return out;
}

/* Questions du scan : les essentielles + 5 tirées au sort (en priorité celles pas posées la dernière fois) */
function pickSkinQuestions() {
  const last = new Set(S.skin.qs || []);
  const pool = D.SKIN_Q_POOL.filter((q) => !q.core);
  const shuffle = (a) => a.map((x) => [Math.random(), x]).sort((p, q) => p[0] - q[0]).map((x) => x[1]);
  const pick = [...shuffle(pool.filter((q) => !last.has(q.id))), ...shuffle(pool.filter((q) => last.has(q.id)))].slice(0, 5);
  const qs = [...D.SKIN_Q_POOL.filter((q) => q.core), ...shuffle(pick)].map((q) => q.id);
  return { qs, feelQ: D.SKIN_FEEL_VARIANTS[Math.floor(Math.random() * D.SKIN_FEEL_VARIANTS.length)], factI: Math.floor(Math.random() * 100) };
}
const skinQs = (sk) => (sk.qs?.length ? sk.qs : Object.keys(sk.answers || {})).map((id) => D.SKIN_Q_POOL.find((q) => q.id === id)).filter(Boolean);

/* Les observations de l'IA remplissent la carte du visage */
function zonesFromAi(r) {
  const z = {};
  (r?.observations || []).forEach((o) => { if (D.SKIN_ZONES[o.zone] && D.SKIN_ISSUES[o.issue]) { z[o.zone] = [...new Set([...(z[o.zone] || []), o.issue])]; } });
  // zones fines du scan détaillé → zones de la carte du visage
  const map = { front: 'front', tempes: 'front', entre_sourcils: 'front', contour_yeux: 'yeux', nez: 'nez', ailes_nez: 'nez', joue_g: 'joue_g', joue_d: 'joue_d', tour_bouche: 'menton', menton: 'menton', machoire: 'menton' };
  (r?.zones || []).forEach((x) => { const k = map[x.zone]; if (k && ['à surveiller', 'à traiter'].includes(x.etat)) (x.issues || []).forEach((i) => { if (D.SKIN_ISSUES[i]) z[k] = [...new Set([...(z[k] || []), i])]; }); });
  return z;
}

function startSkin(force = false) {
  // Sans compte, l'IA ne peut pas analyser la photo : on le dit avant de commencer
  if (cloud.enabled && !cloud.user && !force) {
    openModal(`<div class="center"><div style="font-size:44px">✨</div><h2 style="margin-top:8px">Crée ton compte gratuit</h2>
      <p class="small muted" style="margin-top:8px;line-height:1.55">Pour que l'<b>IA analyse ta peau</b> zone par zone et te conseille des produits vendus en ${esc(countryInfo().label)}, il faut un compte. C'est gratuit et ça prend 30 secondes.</p></div>
      <button class="btn primary block" style="margin-top:18px;background:var(--skin);color:#1a0a12" data-act="skin-gate" data-mode="signup">Créer mon compte</button>
      <button class="btn block" style="margin-top:8px" data-act="skin-gate" data-mode="login">J'ai déjà un compte</button>
      <button class="btn ghost block sm" style="margin-top:8px" data-act="skin-gate" data-mode="manual">Continuer sans l'IA</button>`);
    return;
  }
  ui.skin = { step: 'photo', sel: null, photo: null, zones: {}, feel: null, answers: {}, ...pickSkinQuestions(), camError: false, manual: false, lightWarn: false, aiStatus: null, aiRes: null, aiPromise: null };
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

function computeSkin(aiRes = null) {
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
  if (aiRes && aiRes.quality !== 'bad') (aiRes.observations || []).forEach((o) => { if (D.SKIN_ISSUES[o.issue]) concerns.add(o.issue); });

  let score = 0, maxScore = 0;
  const good = [], improve = [];
  skinQs(sk).forEach((q) => {
    const opt = q.opts[sk.answers[q.id]];
    if (!opt) return;
    const max = Math.max(...q.opts.map((o) => o[1]));
    score += opt[1]; maxScore += max;
    if (opt[1] === max) good.push(q.good);
    else improve.push(opt[2] || q.fix);
  });
  score = maxScore ? (score / maxScore) * 100 : 0;

  const T = D.SKIN_TYPES[type];
  const has = (c) => concerns.has(c);
  const serumAM = has('taches') || has('terne') ? 'Sérum vitamine C' : has('rougeurs') ? 'Sérum apaisant à la centella' : has('boutons') || has('points') || has('brillance') ? 'Sérum niacinamide' : has('secheresse') ? 'Sérum acide hyaluronique' : null;
  const treatPM = has('boutons') || has('points') ? 'Soin acide salicylique (BHA), 3 soirs par semaine'
    : has('rides') ? 'Rétinol en douceur, 2 à 3 soirs par semaine (pas pendant la grossesse)'
    : has('taches') ? 'Acide azélaïque ou niacinamide le soir'
    : has('terne') ? 'Exfoliant doux à l\'acide lactique, 1 à 2 soirs par semaine' : null;
  const doneQ = (id) => { const q = D.SKIN_Q_POOL.find((x) => x.id === id); const o = q?.opts[sk.answers[id]]; return o && o[1] === Math.max(...q.opts.map((x) => x[1])); };
  const tag = (txt, id) => (doneQ(id) ? `${txt} <span class="pill good" style="padding:2px 8px;font-size:10.5px">déjà fait</span>` : txt);
  const routine = {
    matin: [T.cleanser, serumAM, has('cernes') ? 'Contour des yeux à la caféine' : null, tag(T.moisturizer, 'moist'), tag(`Protection solaire : ${T.spf}`, 'spf')].filter(Boolean),
    soir: ['Démaquillage ou eau micellaire si tu portes du maquillage ou du SPF', tag(T.cleanser, 'clean_pm'), treatPM, T.moisturizer + (type === 'seche' ? ' (couche plus généreuse le soir)' : '')].filter(Boolean),
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
  return { date: today(), ai: aiRes, type, concerns: [...concerns], score, verdict, good: good.filter(Boolean), improve, routine, use: [...use].slice(0, 10), avoid: [...avoid].slice(0, 9), why };
}

async function finishSkin() {
  if (ui.skin.aiStatus === 'running') {
    ui.skin.step = 'analyzing'; rerender();
    try { await ui.skin.aiPromise; } catch { /* géré plus haut */ }
  }
  let aiRes = ui.skin.aiStatus === 'done' ? ui.skin.aiRes : null;
  if (ui.skin.aiStatus === 'error') toast('Résultat basé sur tes réponses (analyse photo indisponible)');
  if (aiRes && aiRes.quality !== 'bad') ui.skin.zones = zonesFromAi(aiRes);
  const res = computeSkin(aiRes);
  if (aiRes && aiRes.zones && aiRes.quality !== 'bad') {
    // 2e étape : plan personnalisé qui tient compte de ce que la personne fait déjà
    ui.skin.step = 'analyzing'; ui.skin.planStage = true; if (route().page === 'peau') rerender();
    try {
      const plan = await ai('skinplan', { analysis: { type: aiRes.skinType, resume: aiRes.summary, indicateurs: aiRes.indicateurs, zones: (aiRes.zones || []).filter((z) => z.etat !== 'non visible').map((z) => ({ zone: D.SKIN_DZONES[z.zone] || z.zone, etat: z.etat, constat: z.constat })) },
        routine: skinRoutineAnswers(), person: { sexe: S.profile.sex === 'f' ? 'femme' : 'homme', age: S.profile.age, objectif: D.GOALS[S.profile.goal]?.label }, country: { label: countryInfo().label, currency: countryInfo().cur } });
      res.plan = { deja_bien: plan.deja_bien || [], nouveautes: plan.nouveautes || [], routine: plan.routine };
      res.reco = { privilegier: plan.privilegier || [], eviter: plan.eviter || [], products: plan.products || [] };
    } catch (e) { toast('Plan personnalisé indisponible, conseils de base affichés'); }
    ui.skin.planStage = false;
  } else if (aiRes) res.reco = { privilegier: aiRes.privilegier || [], eviter: aiRes.eviter || [], products: aiRes.products || [] };
  S.skin.zones = ui.skin.zones; S.skin.feel = ui.skin.feel; S.skin.answers = ui.skin.answers; S.skin.qs = ui.skin.qs; S.skin.result = res;
  S.skin.history = [...(S.skin.history || []).filter((x) => x.date !== res.date), { date: res.date, score: res.score, n: res.concerns.length, type: res.type }].slice(-24);
  save();
  ui.skin.aiPromise = null; ui.skin.pending = null; // la photo est oubliée
  ui.skin.step = 'result';
  if (aiRes?.quality === 'bad') toast('Photo difficile à analyser : refais-en une face à la lumière');
  if (route().page === 'peau') rerender();
}

function viewPeau() {
  const sk = ui.skin;
  const order = sk.manual ? ['photo', 'zones', 'questions'] : ['photo', 'questions'];
  const stepIdx = order.indexOf(sk.step) + 1;
  const total = order.length;
  const ind = stepIdx ? `<div class="steps-indicator">${order.map((_, i) => `<i class="${i < stepIdx ? 'on' : ''}"></i>`).join('')}</div>` : '';
  let body;
  if (sk.step === 'photo') body = skinPhoto();
  else if (sk.step === 'zones') body = skinZones();
  else if (sk.step === 'questions') body = skinQuestions();
  else if (sk.step === 'result') body = skinResult(S.skin.result);
  else if (sk.step === 'analyzing') body = `<div class="card center" style="padding:36px 20px"><div class="spin"></div><h3 style="margin-top:16px">${sk.planStage ? 'Création de ton plan personnalisé…' : 'L\'IA inspecte ta peau zone par zone…'}</h3>
    <div class="col" style="margin-top:14px;gap:6px;text-align:left;max-width:280px;margin-left:auto;margin-right:auto">
      <div class="small">${sk.planStage ? '✅' : '⏳'} Analyse des 11 zones du visage</div>
      <div class="small ${sk.planStage ? '' : 'muted'}">${sk.planStage ? '⏳' : '○'} Conseils nouveaux selon tes réponses</div>
      <div class="small ${sk.planStage ? '' : 'muted'}">${sk.planStage ? '⏳' : '○'} Produits vendus en ${esc(countryInfo().label)}</div></div></div>
    <div class="card flat section" style="background:var(--card2)">${factHtml(factAt('peau', doy() + 3))}</div>`;
  else body = skinHome();
  const back = sk.step ? `<button class="back" data-act="skin-back" aria-label="Retour">←</button>` : '';
  return `<div class="view"><div class="top">${back}<h1 class="grow">${sk.step === 'result' ? 'Ton analyse' : 'Peau'}</h1>${stepIdx ? `<span class="small muted">Étape ${stepIdx}/${total}</span>` : ''}</div>${ind}${body}</div>`;
}

function skinHome() {
  const r = S.skin.result;
  const keep = !!S.settings?.keepSkinPhotos;
  const photos = keep ? S.skin.photos : [];
  return `<div class="card" style="background:radial-gradient(120% 90% at 100% 0%, rgba(255,126,182,.25), transparent 60%), var(--card)">
      <div style="font-size:40px">✨</div><h2 style="margin-top:8px">Scan peau</h2>
      <p class="small muted" style="margin-top:6px;line-height:1.5">${cloud.user ? 'Prends une photo de ton visage : l\'IA repère elle-même brillance, boutons, points noirs, rougeurs, taches… Pendant ce temps, tu réponds à quelques questions sur ta routine. Tu obtiens ton type de peau, le score de ta skincare, les ingrédients à privilégier ou à éviter et des produits vendus en ' + esc(countryInfo().label) + '.' : 'Photo de ton visage, zones à problème et questions sur ta routine. Crée un compte pour que l\'IA analyse ta photo et te conseille des produits vendus dans ton pays.'}</p>
      <button class="btn primary block" style="margin-top:16px;background:var(--skin);color:#1a0a12" data-act="skin-start">${r ? 'Refaire mon scan' : 'Commencer le scan'}</button></div>
    ${r ? `<div class="section card tap" data-act="skin-result"><div class="skin-score">${ring(r.score / 100, { size: 92, stroke: 9, color: 'var(--skin)', inner: `<div class="mid-num">${r.score}</div>` })}
      <div class="grow"><div class="xs upper muted">Dernier scan · ${shortDate(r.date)}</div><h3 style="margin-top:4px">${r.verdict}</h3><p class="small muted" style="margin-top:4px">${D.SKIN_TYPES[r.type].label}${r.concerns.length ? ' · ' + r.concerns.slice(0, 3).map((c) => D.SKIN_ISSUES[c]?.label).join(', ') : ''}</p></div><span class="dim">›</span></div></div>` : ''}
    <div class="section card"><div class="row between" style="align-items:flex-start"><div class="grow"><h3>📷 Garder mes photos</h3><p class="small muted" style="margin-top:4px;line-height:1.45">${keep ? 'Tes photos de scan sont gardées sur ce téléphone pour voir l\'évolution.' : 'Désactivé : la photo est effacée juste après le scan.'}</p></div>
      <button class="toggle ${keep ? 'on' : ''}" data-act="skin-keep" aria-label="Garder mes photos"><i></i></button></div>
      ${photos.length ? `<div class="photo-strip" style="margin-top:12px">${[...photos].reverse().map((x) => `<figure><img src="${x.data}" alt="Photo du ${shortDate(x.date)}"><figcaption>${shortDate(x.date)}</figcaption></figure>`).join('')}</div>` : ''}</div>`;
}

function skinPhoto() {
  const sk = ui.skin;
  const oval = `<svg class="cam-oval" viewBox="0 0 300 400" preserveAspectRatio="none"><defs><mask id="m"><rect width="300" height="400" fill="white"/><ellipse cx="150" cy="185" rx="98" ry="132" fill="black"/></mask></defs><rect width="300" height="400" fill="rgba(0,0,0,.45)" mask="url(#m)"/><ellipse cx="150" cy="185" rx="98" ry="132" fill="none" stroke="var(--skin)" stroke-width="2.5" stroke-dasharray="6 6"/></svg>`;
  if (sk.lightWarn && sk.photo) {
    return `<div class="card center" style="padding:30px 18px"><div style="font-size:42px">💡</div><h3 style="margin-top:10px">${esc(sk.photo.light.msg)}</h3>
      <p class="small muted" style="margin-top:6px;line-height:1.5">Une bonne lumière, face à une fenêtre, permet à l'IA de bien voir ta peau.</p></div>
      <div class="row" style="margin-top:14px"><button class="btn primary grow" style="background:var(--skin);color:#1a0a12" data-act="skin-retake">↺ Reprendre</button><button class="btn grow" data-act="skin-continue">Continuer quand même</button></div>`;
  }
  const shots = sk.shots || [];
  const dots = `<div class="scan-dots">${D.SCAN_ANGLES.map((a, j) => `<i class="${j < shots.length ? 'done' : ''}"></i>`).join('')}</div>`;
  const steps = `<div class="row" style="justify-content:space-between;margin-top:10px">${D.SCAN_ANGLES.map((a, j) => `<span class="xs ${j < shots.length ? '' : 'muted'}" style="font-weight:700">${j < shots.length ? '✓' : j + 1 + '.'} ${a.label}</span>`).join('')}</div>`;
  // Sans caméra intégrée : une photo par angle avec l'appareil photo du téléphone
  if (sk.camError || (sk.single && shots.length)) {
    const next = D.SCAN_ANGLES[shots.length];
    return `${inAppNote()}<div class="card" style="padding:22px 18px"><div class="center"><div style="font-size:40px">📷</div><h3 style="margin-top:8px">${shots.length ? `${shots.length} photo${shots.length > 1 ? 's' : ''} sur 3` : 'Scan avec l\'appareil photo'}</h3>
      <p class="small muted" style="margin-top:6px;line-height:1.5">${next ? `Prends maintenant ta photo <b>${next.label.toLowerCase()}</b> : ${next.hint.replace(/[⬅➡]/g, '').trim().toLowerCase()}.` : ''} 3 angles = une analyse bien plus précise.</p></div>${steps}</div>
      <div class="col" style="margin-top:14px">${next ? `<label class="btn primary block" style="cursor:pointer;background:var(--skin);color:#1a0a12">📸 Photo ${next.label.toLowerCase()}<input type="file" accept="image/*" capture="user" data-on="skin-file" hidden></label>` : ''}
        ${shots.length ? `<button class="btn block" data-act="skin-analyse">Analyser avec ${shots.length} photo${shots.length > 1 ? 's' : ''}</button>` : `<label class="btn block" style="cursor:pointer">🖼 Choisir 1 à 3 photos existantes<input type="file" accept="image/*" multiple data-on="skin-file" hidden></label>`}
        <button class="btn ghost block sm" data-act="skin-nophoto">Continuer sans photo</button></div>`;
  }
  return `${inAppNote()}<div class="cam-box"><video id="cam" playsinline muted autoplay></video>${oval}<div class="scan-line"></div>
      <div id="scan-hud" class="scan-hud"><div class="scan-step">Scan du visage en 3 angles</div><div class="scan-hint">Face à la lumière · sans maquillage · cheveux dégagés</div></div></div>
    ${dots}
    <div class="col" style="margin-top:14px"><button class="btn primary block" style="background:var(--skin);color:#1a0a12" data-act="scan-go">🔬 Lancer le scan</button>
      <label class="btn block scan-alt" style="cursor:pointer">🖼 Choisir 1 à 3 photos existantes<input type="file" accept="image/*" multiple data-on="skin-file" hidden></label>
      <button class="btn ghost block sm scan-alt" data-act="skin-nophoto">Continuer sans photo</button></div>
    <p class="note center" style="margin-top:8px">Le scan prend 3 photos : de face, puis en tournant la tête de chaque côté. Garde le téléphone à hauteur du visage.</p>
    <p class="note center" style="margin-top:10px">${S.settings?.keepSkinPhotos ? 'La photo est gardée sur ton téléphone (réglable dans Peau).' : 'La photo n\'est pas conservée : elle est effacée juste après l\'analyse.'}</p>`;
}

function skinZones() {
  const sk = ui.skin, sel = sk.sel;
  const issues = sel === 'yeux' ? ['cernes', 'rides', 'secheresse', 'rougeurs'] : Object.keys(D.SKIN_ISSUES).filter((k) => k !== 'cernes');
  const cur = sk.zones[sel] || [];
  const why = sk.manualWhy;
  const fix = why === 'login' && cloud.enabled ? `<button class="btn sm block" style="margin-top:10px;background:var(--skin);color:#1a0a12" data-act="skin-gate" data-mode="signup">Créer mon compte pour l'analyse IA</button>`
    : why === 'quota' ? `<button class="btn sm block" style="margin-top:10px" data-act="go-premium">Voir Premium</button>`
    : why === 'consent' || why === 'nophoto' ? `<button class="btn sm block" style="margin-top:10px" data-act="skin-start">Refaire le scan avec l'IA</button>` : '';
  const msg = { login: 'L\'IA analyse ta photo seulement si tu as un compte (gratuit).', quota: 'Tu as utilisé ton scan IA gratuit de la semaine.', consent: 'Tu as choisi de ne pas envoyer ta photo à l\'IA.', nophoto: 'Sans photo, l\'IA ne peut pas voir ta peau.' }[why];
  return `${msg ? `<div class="card flat" style="background:rgba(255,126,182,.1);border:1px solid rgba(255,126,182,.3);margin-bottom:12px"><p class="small" style="line-height:1.5">ℹ️ ${msg} Tu peux quand même indiquer toi-même ce que tu vois.</p>${fix}</div>` : ''}
    <p class="muted small" style="margin-bottom:12px">Touche les zones où tu remarques quelque chose, puis choisis ce que tu vois.</p>
    ${faceMap()}
    <div class="card" style="margin-top:14px">${sel ? `<h3>${D.SKIN_ZONES[sel]}</h3><div class="issue-chips" style="margin-top:12px">${issues.map((k) => `<button class="chip ${cur.includes(k) ? 'on' : ''}" data-act="skin-issue" data-k="${k}">${D.SKIN_ISSUES[k].icon} ${D.SKIN_ISSUES[k].label}</button>`).join('')}</div>`
      : '<p class="small muted center">👆 Touche une zone du visage</p>'}</div>
    <button class="btn primary block" style="margin-top:16px;background:var(--skin);color:#1a0a12" data-act="skin-next" data-to="questions">${Object.values(sk.zones).flat().length ? 'Continuer' : 'Rien à signaler, continuer'}</button>`;
}

function skinQuestions() {
  const sk = ui.skin;
  const qs = skinQs(sk);
  const done = sk.feel && qs.every((q) => sk.answers[q.id] !== undefined);
  const st = sk.aiStatus;
  const banner = st === 'running' ? `<div class="card flat ai-status"><div class="spin sm"></div><div><b class="small">L'IA analyse ta photo…</b><p class="xs muted" style="margin-top:2px">Réponds aux questions pendant ce temps.</p></div></div>`
    : st === 'done' ? `<div class="card flat ai-status"><span style="font-size:20px">✅</span><div><b class="small">Analyse de ta photo terminée</b><p class="xs muted" style="margin-top:2px">${(sk.aiRes?.observations || []).length} point${(sk.aiRes?.observations || []).length > 1 ? 's' : ''} repéré${(sk.aiRes?.observations || []).length > 1 ? 's' : ''} sur ta peau. Le détail est dans ton résultat.</p></div></div>`
    : st === 'error' ? `<div class="card flat ai-status" style="flex-wrap:wrap"><span style="font-size:20px">⚠️</span><div class="grow"><b class="small">L'analyse de ta photo n'a pas abouti</b><p class="xs muted" style="margin-top:2px">${esc(sk.aiError)}</p></div>${sk.pending ? `<button class="btn sm" style="width:100%;margin-top:6px;background:var(--skin);color:#1a0a12" data-act="skin-retry">↻ Relancer l'analyse</button>` : ''}</div>` : '';
  return `${banner}<p class="muted small" style="margin-top:${banner ? 14 : 0}px">Réponds honnêtement : c'est ce qui permet de juger ta skincare actuelle.</p>
    <div class="q-block"><div class="q">${sk.feelQ || D.SKIN_FEEL_Q.q}</div><div class="opt-list">${D.SKIN_FEEL_Q.opts.map(([k, l]) => `<button class="opt ${sk.feel === k ? 'on' : ''}" data-act="skin-feel" data-v="${k}">${l}</button>`).join('')}</div></div>
    ${qs.map((q, n) => `<div class="q-block"><div class="q">${q.q}</div><div class="opt-list">${q.opts.map(([l], i) => `<button class="opt ${sk.answers[q.id] === i ? 'on' : ''}" data-act="skin-ans" data-q="${q.id}" data-v="${i}">${l}</button>`).join('')}</div></div>${n === 3 ? `<div class="card flat" style="background:rgba(255,126,182,.08);border:1px solid rgba(255,126,182,.25);margin-top:16px">${factHtml(factAt('peau', sk.factI || 0))}</div>` : ''}`).join('')}
    <button class="btn primary block" style="margin-top:22px;background:var(--skin);color:#1a0a12" data-act="skin-finish" ${done ? '' : 'disabled'}>Voir mon résultat ✨</button>
    ${done ? '' : '<p class="note center" style="margin-top:8px">Réponds à toutes les questions pour continuer.</p>'}`;
}

function skinResult(r) {
  if (!r) return skinHome();
  const T = D.SKIN_TYPES[r.type];
  const plan = r.plan;
  const rt = plan?.routine || r.routine;
  const list = (arr) => arr.map((x, i) => { const done = /tu le fais déjà/i.test(x); return `<div class="routine-step"><span class="n" ${done ? 'style="background:rgba(62,224,143,.16);color:var(--steps)"' : ''}>${done ? '✓' : i + 1}</span><div class="grow small" style="line-height:1.45">${plan ? esc(x).replace(/\s*\(tu le fais déjà ✓?\)/i, ' <span class="pill good" style="padding:2px 8px;font-size:10.5px">déjà fait</span>') : x}</div></div>`; }).join('');
  const d = peekDay(today()), t = targets();
  const sleeps = lastDays(7).map((k) => peekDay(k).sleep?.minutes).filter(Boolean);
  const avgSleep = sleeps.length ? sleeps.reduce((a, b) => a + b, 0) / sleeps.length : null;
  return `<div class="card"><div class="skin-score">${ring(r.score / 100, { size: 110, stroke: 11, color: 'var(--skin)', inner: `<div><div class="mid-num">${r.score}</div><div class="xs muted">/ 100</div></div>` })}
      <div class="grow"><div class="xs upper muted">Score de ta skincare</div><h2 style="margin-top:4px;font-size:18px">${r.verdict}</h2></div></div></div>
    ${skinAiCard(r)}
    ${plan ? `${plan.nouveautes.length ? `<div class="card section new-tips"><h3>✨ Tes nouveaux conseils</h3><p class="xs muted" style="margin-top:3px">Basés sur ce que l'IA voit sur ta peau et sur tes réponses</p><div class="col" style="margin-top:12px;gap:12px">${plan.nouveautes.map((x, i) => `<div class="routine-step" style="border:0;padding:0"><span class="n" style="background:rgba(255,126,182,.18);color:var(--skin)">${i + 1}</span><div class="grow"><b class="small">${esc(x.titre)}</b><p class="small muted" style="margin-top:3px;line-height:1.5">${esc(x.detail)}</p></div></div>`).join('')}</div></div>` : ''}
      ${plan.deja_bien.length ? `<div class="card section"><h3>✅ Ce que tu fais déjà bien</h3><ul class="list-plain" style="margin-top:10px">${plan.deja_bien.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}`
    : `${r.good.length ? `<div class="card section"><h3>✅ Ce que tu fais déjà bien</h3><ul class="list-plain" style="margin-top:10px">${r.good.map((x) => `<li>${x}</li>`).join('')}</ul></div>` : ''}
    ${r.improve.length ? `<div class="card section"><h3>🎯 À améliorer en priorité</h3><ul class="list-plain" style="margin-top:10px">${r.improve.map((x) => `<li>${x}</li>`).join('')}</ul></div>` : ''}`}
    <div class="card section"><div class="xs upper muted">Ton type de peau</div><h2 style="margin-top:4px" class="color-skin">${T.label}</h2><p class="small muted" style="margin-top:6px;line-height:1.5">${T.desc}</p>
      ${r.concerns.length ? `<div class="row wrap" style="gap:6px;margin-top:12px">${r.concerns.map((c) => `<span class="pill">${D.SKIN_ISSUES[c]?.icon} ${D.SKIN_ISSUES[c]?.label}</span>`).join('')}</div>` : ''}</div>
    <div class="section"><h2>Ta routine conseillée</h2>
      <div class="card" style="margin-top:12px"><h3>☀️ Matin</h3>${list(rt.matin || [])}</div>
      <div class="card" style="margin-top:10px"><h3>🌙 Soir</h3>${list(rt.soir || [])}</div>
      ${(rt.semaine || []).length ? `<div class="card" style="margin-top:10px"><h3>📅 Chaque semaine</h3>${list(rt.semaine)}</div>` : ''}
      <p class="note" style="margin-top:8px">Introduis un seul nouveau produit à la fois et teste-le d'abord derrière l'oreille pendant 48 h.</p></div>
    ${r.reco && (r.reco.privilegier || []).length ? ingredientsCard(r, true) : ''}
    ${productsCard(r)}
    ${ingredientsCard(r)}
    ${r.why.length && !plan ? `<div class="card section"><h3>Pourquoi ces conseils</h3><div class="col" style="margin-top:10px">${r.why.map(([c, w]) => `<div><b class="small">${D.SKIN_ISSUES[c]?.icon} ${D.SKIN_ISSUES[c]?.label}</b><p class="small muted" style="margin-top:3px;line-height:1.5">${w}</p></div>`).join('')}</div></div>` : ''}
    <div class="card section flat" style="background:var(--card2)"><h3>🔗 Ta peau et le reste</h3><ul class="list-plain" style="margin-top:10px">
      <li>Eau aujourd'hui : ${(d.water / 1000).toFixed(1).replace('.', ',')} L sur ${(t.water / 1000).toFixed(1).replace('.', ',')} L. Une peau déshydratée marque plus.</li>
      <li>${avgSleep ? `Sommeil moyen cette semaine : ${fmtDur(Math.round(avgSleep))}.` : 'Note ton sommeil dans Suivi pour voir le lien avec ta peau.'} La peau se répare la nuit.</li>
      ${plan ? '' : '<li>Limite les sucres rapides et les produits laitiers en excès si tu as des boutons : chez certaines personnes, ils aggravent l\'acné.</li>'}</ul></div>
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
      <div class="grow"><h2>${esc(p.name)}</h2><p class="small muted" style="margin-top:3px">${p.age} ans · ${p.height} cm · ${currentWeight().toFixed(1).replace('.', ',')} kg · ${countryInfo().flag} ${countryInfo().label}</p><p class="small" style="margin-top:3px">${D.GOALS[p.goal].icon} ${D.GOALS[p.goal].label}</p></div></div>
    <div class="section">${accountCard()}</div>
    ${planCard() ? `<div class="section">${planCard()}</div>` : ''}
    <div class="section">${levelChip()}</div>
    <div class="section grid3"><div class="card center" style="padding:12px"><div class="mid-num">${daysUsed}</div><div class="xs muted">jours suivis</div></div><div class="card center" style="padding:12px"><div class="mid-num">${Object.values(S.days).filter((d) => d.workout).length}</div><div class="xs muted">séances</div></div><div class="card center" style="padding:12px"><div class="mid-num">${streak()}</div><div class="xs muted">jours de suite</div></div></div>
    <div class="section card"><h3>Mes objectifs quotidiens</h3>
      ${[['🍽️', 'Calories', `${fmt(t.kcal)} kcal`], ['🥩', 'Protéines', `${t.prot} g`], ['💧', 'Eau', `${(t.waterBase / 1000).toFixed(1).replace('.', ',')} L (+0,5 L jour de sport)`], ['👟', 'Pas', fmt(t.steps)], ['😴', 'Sommeil', fmtDur(t.sleepMin).replace(' 00', '')], ['🏋️', 'Sport', `${p.days} séances / semaine`]].map(([i, l, v]) => `<div class="food-item"><span>${i}</span><div class="grow">${l}</div><b>${v}</b></div>`).join('')}
      ${calcDetails(t, p)}
      <button class="btn block" style="margin-top:12px" data-act="edit-profile">Modifier mon profil</button></div>
    <div class="section">${remindersCard()}</div>
    <div class="section card tap" data-act="go" data-to="infos"><div class="row"><span style="font-size:24px">💡</span><div class="grow"><h3>Le savais-tu ?</h3><p class="small muted" style="margin-top:3px">Pense-bêtes santé, peau, sommeil et sport</p></div><span class="dim">›</span></div></div>
    <div class="section card tap" data-act="go" data-to="bilan"><div class="row"><span style="font-size:24px">📊</span><div class="grow"><h3>Mes bilans de la semaine</h3><p class="small muted" style="margin-top:3px">Tes chiffres et tes objectifs, chaque dimanche</p></div><span class="dim">›</span></div></div>
    ${standalone ? '' : `<div class="section card"><h3>📲 Installer l'appli</h3><p class="small muted" style="margin-top:6px;line-height:1.5">${ios ? 'Sur iPhone : touche le bouton Partager de Safari, puis « Sur l\'écran d\'accueil ».' : 'Ajoute All In sur ton écran d\'accueil pour l\'ouvrir comme une vraie appli.'}</p>
      ${!ios ? `<button class="btn primary block" style="margin-top:12px" data-act="install">Installer</button>` : ''}</div>`}
    <div class="section card"><h3>Bientôt dans All In</h3><div class="col" style="margin-top:10px;gap:12px">${D.V2_FEATURES.map(([i, t1, d1]) => `<div class="row" style="align-items:flex-start"><span style="font-size:20px">${i}</span><div><b class="small">${t1}</b><p class="xs muted" style="margin-top:2px">${d1}</p></div></div>`).join('')}</div></div>
    <div class="section card"><h3>Mes données</h3><p class="small muted" style="margin-top:6px">${cloud.user ? 'Tes données sont sur ce téléphone et sauvegardées dans ton compte. Les photos de peau restent uniquement sur ce téléphone.' : 'Tout est enregistré sur ce téléphone. Crée un compte pour les sauvegarder, ou exporte une copie avant de changer d\'appareil.'}</p>
      <div class="row" style="margin-top:12px"><button class="btn grow sm" data-act="export">⬇ Exporter</button><label class="btn grow sm" style="cursor:pointer">⬆ Importer<input type="file" accept="application/json,.json" data-on="import" hidden></label></div>
      <button class="btn danger block sm" style="margin-top:8px" data-act="reset">Effacer toutes mes données</button></div>
    <p class="note center section">All In · version 2.9</p></div>`;
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
    const order = ui.skin.manual ? [null, 'photo', 'zones', 'questions'] : [null, 'photo', 'questions'];
    const s = ui.skin.step;
    if (s === 'result' || s === 'analyzing') ui.skin.step = null;
    else ui.skin.step = order[Math.max(0, order.indexOf(s) - 1)];
    if (ui.skin.step === 'photo') { ui.skin.photo = null; ui.skin.lightWarn = false; ui.skin.aiPromise = null; ui.skin.aiStatus = null; ui.skin.camError = false; }
    stopCamera(); rerender();
  },
  'skin-continue': () => proceedWithPhoto(),
  'skin-retry': () => { if (ui.skin.pending) { startSkinAi(ui.skin.pending); rerender(); } },
  'skin-nophoto': () => { stopCamera(); ui.skin.photo = null; ui.skin.manual = true; ui.skin.aiStatus = null; ui.skin.step = 'zones'; ui.skin.sel = 'front'; rerender(); },
  'skin-keep': () => {
    const on = !S.settings?.keepSkinPhotos;
    S.settings = { ...(S.settings || {}), keepSkinPhotos: on };
    if (!on) S.skin.photos = [];
    save(); toast(on ? 'Les prochaines photos seront gardées' : 'Photos supprimées'); rerender();
  },
  'scan-go': () => runScanSequence(),
  'skin-single': () => { ui.skin.single = true; },
  'skin-analyse': () => handleShots(),
  'skin-retake': () => { ui.skin.photo = null; ui.skin.shots = []; ui.skin.single = false; ui.skin.lightWarn = false; ui.skin.camError = false; rerender(); },
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
  'reset-ok': async () => { closeModal(); if (cloud.user) { try { await signOutUser(); } catch { /* ignore */ } } resetAll(); ui.ob = null; location.hash = '#/home'; render(); },
};

const INPUTS = {
  'food-search': (el) => {
    ui.foodQ = el.value;
    const pos = el.selectionStart;
    foodModal();
    const q = document.getElementById('food-q'); q.focus(); q.setSelectionRange(pos, pos);
  },
  'cycle-time': (el) => { ui.cycleTime = el.value; const c = document.getElementById('cycles'); if (c) c.innerHTML = cyclesHtml(); },
  'skin-file': (el) => { if (el.files?.length) { if (el.hasAttribute('capture')) ui.skin.single = true; importPhotos(el.files); } },
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
  navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then((reg) => reg.update()).catch(() => {});
  // Quand une nouvelle version prend le relais, on recharge une fois pour l'afficher
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (!reloaded && route().page !== 'wk') { reloaded = true; location.reload(); } });
}

/* ============================================================
   V2 — Coach IA, comptes, analyse IA (peau et repas)
   ============================================================ */
function buildContext() {
  const p = S.profile, t = targets(), d = peekDay(today()), n = dayNutrition();
  const ses = todaySession();
  return {
    heure: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    jour: DAY_NAMES[weekdayMon() - 1],
    profil: { prenom: p.name, pays: countryInfo().label, monnaie: countryInfo().cur, sexe: p.sex === 'f' ? 'femme' : 'homme', age: p.age, taille_cm: p.height, poids_kg: currentWeight(), objectif: D.GOALS[p.goal].label, niveau: D.LEVELS[p.level].label, lieu: p.place, seances_semaine: p.days },
    cibles: { kcal: t.kcal, proteines_g: t.prot, eau_ml: t.water, pas: t.steps, sommeil_h: 8 },
    aujourdhui: {
      eau_ml: d.water, pas: d.steps, sommeil: d.sleep ? { duree: fmtDur(d.sleep.minutes), qualite_sur_5: d.sleep.quality } : null,
      kcal: n.kcal, proteines_g: n.p, repas: d.meals.slice(0, 15).map((m) => `${m.meal}: ${m.n} (${Math.round(m.k)} kcal)`),
      seance_prevue: ses ? { nom: ses.name, exercices: ses.exercises.map((e) => `${e.name} ${e.sets}x${e.target}`) } : 'repos',
      seance_faite: !!d.workout,
    },
    semaine: lastDays(7).map((k) => { const x = peekDay(k), nn = dayNutrition(k); return { date: k, eau_ml: x.water, pas: x.steps, sommeil_h: x.sleep ? +(x.sleep.minutes / 60).toFixed(1) : null, kcal: nn.kcal || null, seance: !!x.workout }; }),
    poids_recents: S.weights.slice(-5),
    peau: S.skin.result ? { type: S.skin.result.type, score_routine: S.skin.result.score, preoccupations: S.skin.result.concerns } : null,
  };
}

const md = (t) => esc(t)
  .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
  .replace(/^\s*[-•*] (.+)$/gm, '<span class="li">$1</span>')
  .replace(/\n/g, '<br>')
  .replace(/<br>(<span class="li">)/g, '$1').replace(/(<\/span>)<br>/g, '$1');

async function fetchBrief() {
  ui.briefLoading = true;
  try {
    const r = await ai('brief', { context: buildContext() });
    S.brief = { ...r, date: today() };
    save();
  } catch (e) { ui.briefError = e.message; }
  ui.briefLoading = false;
  if (route().page === 'home') rerender();
}

function coachCard() {
  if (!cloud.enabled) return '';
  if (!cloud.user) {
    return `<div class="card coach-card"><div class="row" style="align-items:flex-start"><div class="coach-av">🤖</div><div class="grow"><div class="xs upper muted">Ton coach IA</div>
      <p style="margin-top:5px;line-height:1.5">Crée ton compte gratuit pour activer ton coach : brief du jour, séances adaptées, analyse de tes repas et de ta peau.</p></div></div>
      <button class="btn primary block" style="margin-top:14px" data-act="auth-open" data-mode="signup">Créer mon compte</button></div>`;
  }
  const b = S.brief && S.brief.date === today() ? S.brief : null;
  if (!b) {
    return `<div class="card coach-card"><div class="row" style="align-items:flex-start"><div class="coach-av">🤖</div><div class="grow"><div class="xs upper muted">Brief du coach</div>
      ${ui.briefError ? `<p class="small muted" style="margin-top:6px">${esc(ui.briefError)}</p><button class="btn sm" style="margin-top:10px" data-act="brief-retry">Réessayer</button>` : '<div class="skel" style="margin-top:8px"></div><div class="skel" style="width:70%"></div>'}</div></div></div>`;
  }
  return `<div class="card coach-card tap" data-act="go" data-to="coach"><div class="row" style="align-items:flex-start"><div class="coach-av">🤖</div><div class="grow"><div class="xs upper muted">Brief du coach</div>
    <h3 style="margin-top:4px">${esc(b.title)}</h3><p class="small" style="margin-top:6px;line-height:1.5;color:var(--muted)">${esc(b.message)}</p>
    <div class="coach-action">🎯 ${esc(b.action)}</div></div></div>
    <div class="row between" style="margin-top:12px"><span class="small" style="color:var(--accent);font-weight:700">Discuter avec le coach ›</span></div></div>`;
}

const COACH_SUGGESTIONS = [
  'Adapte ma séance du jour à mon état de forme',
  'Que manger ce soir pour mon objectif ?',
  'J\'ai mal dormi, je fais quoi aujourd\'hui ?',
  'Pourquoi je ne progresse pas ?',
  'Donne-moi une idée de collation healthy',
];

function viewCoach() {
  const head = header('Coach', { right: (S.coach || []).length && cloud.user ? '<button class="btn sm ghost" data-act="coach-clear">Effacer</button>' : '' });
  if (!cloud.enabled) {
    return `<div class="view">${head}<div class="card center" style="padding:30px 18px"><div style="font-size:44px">🤖</div><h2 style="margin-top:10px">Ton coach arrive bientôt</h2><p class="small muted" style="margin-top:8px;line-height:1.5">Le coach IA sera activé dès que le serveur sera configuré.</p></div></div>`;
  }
  if (!cloud.user) {
    return `<div class="view">${head}<div class="card coach-card" style="padding:24px 18px"><div style="font-size:44px">🤖</div><h2 style="margin-top:10px">Un coach rien que pour toi</h2>
      <ul class="list-plain" style="margin-top:12px"><li>Il connaît ton objectif, ton sommeil, ton eau, tes pas et tes repas</li><li>Il adapte ta séance quand tu es fatigué ou courbaturé</li><li>Il répond à tes questions sport, nutrition et bien-être</li></ul>
      <button class="btn primary block" style="margin-top:18px" data-act="auth-open" data-mode="signup">Créer mon compte gratuit</button>
      <button class="btn ghost block" style="margin-top:8px" data-act="auth-open" data-mode="login">J'ai déjà un compte</button></div></div>`;
  }
  const msgs = S.coach || [];
  const bubbles = msgs.map((m) => `<div class="bubble ${m.role === 'user' ? 'me' : 'ai'}">${m.role === 'user' ? esc(m.text).replace(/\n/g, '<br>') : md(m.text)}</div>`).join('');
  const intro = `<div class="bubble ai">Salut ${esc(S.profile.name)} 👋 Je suis ton coach All In. Je vois tes chiffres du jour et de la semaine. Pose-moi une question, ou choisis une idée ci-dessous.</div>`;
  return `<div class="view coach-view">${head}
    <div class="chat">${intro}${bubbles}${ui.coachLoading ? '<div class="bubble ai typing"><i></i><i></i><i></i></div>' : ''}</div>
    ${!msgs.length || !ui.coachLoading ? `<div class="chips" style="margin-top:14px">${COACH_SUGGESTIONS.map((t) => `<button class="chip" data-act="coach-ask" data-t="${esc(t)}">${esc(t)}</button>`).join('')}</div>` : ''}
    <p class="note" style="margin-top:12px">Le coach donne des conseils généraux, il ne remplace pas un médecin.</p>
    ${quotaHint('coach') ? `<div class="center" style="margin-top:10px">${quotaHint('coach')}</div>` : ''}<div class="composer"><div class="composer-in"><textarea id="coach-in" rows="1" placeholder="Écris au coach…" data-on="coach-grow"></textarea><button class="send" data-act="coach-send" aria-label="Envoyer" ${ui.coachLoading ? 'disabled' : ''}>➤</button></div></div></div>`;
}

async function sendCoach(text) {
  text = String(text || '').trim();
  if (!text || ui.coachLoading) return;
  if (!cloud.user) return authModal('signup');
  if (!requireQuota('coach')) return;
  S.coach = S.coach || [];
  S.coach.push({ role: 'user', text, at: Date.now() });
  S.coach = S.coach.slice(-60);
  save();
  ui.coachLoading = true; ui.scrollChat = true;
  if (route().page === 'coach') rerender(); else go('coach');
  try {
    const r = await ai('coach', { messages: S.coach.slice(-16).map(({ role, text: t }) => ({ role, text: t })), context: buildContext() });
    S.coach.push({ role: 'ai', text: r.text, at: Date.now() });
    consume('coach');
  } catch (e) {
    S.coach.push({ role: 'ai', text: `⚠️ ${e.message}`, at: Date.now(), err: true });
  }
  ui.coachLoading = false; ui.scrollChat = true;
  if (route().page === 'coach') render();
}

/* ---------- Consentement avant d'envoyer une photo à l'IA ---------- */
function withConsent(onOk, onCancel = () => {}) {
  if (S.settings?.aiPhotoConsent) return onOk();
  ui.pendingConsent = { onOk, onCancel };
  openModal(`<h2>Envoyer la photo à l'IA ?</h2>
    <p class="small muted" style="margin-top:10px;line-height:1.55">Pour l'analyser, ta photo est envoyée à <b>Google Gemini</b>. All In ne la conserve pas sur ses serveurs. Sur l'offre gratuite de Gemini, Google peut utiliser les contenus reçus pour améliorer ses services.</p>
    <p class="small muted" style="margin-top:8px;line-height:1.55">Tu peux refuser : l'appli reste utilisable sans analyse IA.</p>
    <div class="row" style="margin-top:18px"><button class="btn grow" data-act="consent-no">Non merci</button><button class="btn primary grow" data-act="consent-yes">J'accepte</button></div>`);
}

/* ---------- Peau : analyse IA ---------- */
async function runSkinAi(imageData) {
  ui.skin = { ...ui.skin, zones: JSON.parse(JSON.stringify(S.skin.zones || {})), feel: S.skin.feel, answers: { ...S.skin.answers }, manual: false };
  startSkinAi(imageData);
  await finishSkin();
}

function skinAiCard(r) {
  const lastPhoto = S.settings?.keepSkinPhotos ? S.skin.photos[S.skin.photos.length - 1] : null;
  if (!r.ai) {
    if (!cloud.enabled) return '';
    return `<div class="card section ai-card"><div class="row"><span style="font-size:24px">🤖</span><div class="grow"><h3>Analyse IA de ta peau</h3><p class="small muted" style="margin-top:3px">${cloud.user ? 'Refais le scan avec une photo : l\'IA repère elle-même les problèmes de ta peau.' : 'Crée un compte pour que l\'IA analyse ta photo.'}</p></div></div>
      ${cloud.user ? `<button class="btn block" style="margin-top:12px;background:var(--skin);color:#1a0a12" data-act="${lastPhoto ? 'skin-ai' : 'skin-start'}">${lastPhoto ? 'Analyser ma dernière photo' : 'Refaire le scan avec photo'}</button>` : `<button class="btn block" style="margin-top:12px" data-act="auth-open" data-mode="signup">Créer un compte</button>`}</div>`;
  }
  const a = r.ai;
  if (a.zones) return skinScanCard(a);
  const lvl = { 'léger': 'good', 'modéré': 'warn', 'marqué': 'bad' };
  return `<div class="card section ai-card"><div class="row between"><h3>🤖 Ce que l'IA voit sur ta peau</h3>${a.quality !== 'good' ? `<span class="pill warn">Photo ${a.quality === 'bad' ? 'inexploitable' : 'moyenne'}</span>` : ''}</div>
    ${a.qualityNote ? `<p class="small" style="margin-top:8px;color:var(--food)">${esc(a.qualityNote)}</p>` : ''}
    ${a.quality !== 'bad' ? `<p style="margin-top:10px;line-height:1.5">${esc(a.summary)}</p>
      <p class="small muted" style="margin-top:8px">Type de peau estimé : <b style="color:var(--text)">${D.SKIN_TYPES[a.skinType]?.label || '—'}</b></p>
      ${(a.observations || []).length ? `<div class="col" style="margin-top:12px;gap:8px">${a.observations.map((o) => `<div class="row" style="align-items:flex-start"><span>${D.SKIN_ISSUES[o.issue]?.icon || '•'}</span><div class="grow small"><b>${D.SKIN_ZONES[o.zone] || o.zone}</b> · ${D.SKIN_ISSUES[o.issue]?.label || o.issue} <span class="pill ${lvl[o.level] || ''}" style="padding:2px 8px;font-size:11px">${esc(o.level)}</span>${o.note ? `<div class="xs muted" style="margin-top:2px">${esc(o.note)}</div>` : ''}</div></div>`).join('')}</div>` : '<p class="small" style="margin-top:10px;color:var(--steps)">Aucun problème visible repéré 👌</p>'}
      ${(a.tips || []).length ? `<div class="divider"></div><div class="xs upper muted">Conseils de l'IA</div><ul class="list-plain" style="margin-top:8px">${a.tips.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}
      ${a.seeDoctor ? `<div class="card flat" style="background:rgba(255,93,93,.1);margin-top:12px"><p class="small" style="color:var(--danger)"><b>À montrer à un dermatologue :</b> ${esc(a.seeDoctorReason || 'une zone mérite l\'avis d\'un professionnel.')}</p></div>` : ''}` : `<button class="btn block" style="margin-top:12px;background:var(--skin);color:#1a0a12" data-act="skin-start">Refaire une photo</button>`}</div>`;
}

function skinScanCard(a) {
  if (a.quality === 'bad') return `<div class="card section ai-card"><h3>🔬 Analyse de ta peau</h3><p class="small" style="margin-top:8px;color:var(--food)">${esc(a.qualityNote || 'Photos difficiles à analyser.')}</p><button class="btn block" style="margin-top:12px;background:var(--skin);color:#1a0a12" data-act="skin-start">Refaire le scan</button></div>`;
  const col = (v) => (v >= 75 ? 'var(--steps)' : v >= 50 ? 'var(--food)' : 'var(--danger)');
  const ind = (a.indicateurs || []).filter((x) => D.SKIN_INDIC[x.id]);
  const order = Object.keys(D.SKIN_DZONES);
  const zones = [...(a.zones || [])].filter((z) => z.etat !== 'non visible').sort((x, y) => order.indexOf(x.zone) - order.indexOf(y.zone));
  const pill = { nette: 'good', 'à surveiller': 'warn', 'à traiter': 'bad' };
  const open = ui.skinZonesOpen;
  const shown = open ? zones : zones.filter((z) => z.etat !== 'nette').slice(0, 6);
  const nets = zones.filter((z) => z.etat === 'nette').length;
  return `<div class="card section ai-card"><div class="row between"><h3>🔬 Analyse détaillée de ta peau</h3>${a.quality === 'medium' ? '<span class="pill warn">Photos moyennes</span>' : ''}</div>
    ${a.qualityNote && a.quality !== 'good' ? `<p class="xs" style="margin-top:6px;color:var(--food)">${esc(a.qualityNote)}</p>` : ''}
    <p style="margin-top:10px;line-height:1.5">${esc(a.summary)}</p>
    ${ind.length ? `<div class="indic-grid">${ind.map((x) => `<div class="indic"><div class="row between"><span class="xs">${D.SKIN_INDIC[x.id][0]} ${D.SKIN_INDIC[x.id][1]}</span><b class="xs" style="color:${col(x.score)}">${Math.max(0, Math.min(100, x.score))}</b></div>${bar(x.score / 100, col(x.score))}<p class="xs muted" style="margin-top:4px;line-height:1.35">${esc(x.note)}</p></div>`).join('')}</div>` : ''}
    <div class="divider"></div><div class="row between"><div class="xs upper muted">Zone par zone</div><span class="xs muted">${zones.length} zones · ${nets} nette${nets > 1 ? 's' : ''}</span></div>
    <div class="col" style="margin-top:10px;gap:10px">${shown.map((z) => `<div class="zone-row"><div class="row between"><b class="small">${D.SKIN_DZONES[z.zone] || z.zone}</b><span class="pill ${pill[z.etat] || ''}" style="padding:2px 9px;font-size:11px">${esc(z.etat)}</span></div><p class="small muted" style="margin-top:3px;line-height:1.45">${esc(z.constat)}</p></div>`).join('') || '<p class="small" style="color:var(--steps)">Aucune zone à problème : ta peau est nette 👌</p>'}</div>
    ${zones.length > shown.length || open ? `<button class="btn sm ghost block" style="margin-top:10px" data-act="skin-zones-all">${open ? 'Voir moins' : `Voir les ${zones.length} zones`}</button>` : ''}
    ${a.seeDoctor ? `<div class="card flat" style="background:rgba(255,93,93,.1);margin-top:12px"><p class="small" style="color:var(--danger)"><b>À montrer à un dermatologue :</b> ${esc(a.seeDoctorReason || 'une zone mérite l\'avis d\'un professionnel.')}</p></div>` : ''}</div>`;
}
Object.assign(A, { 'skin-zones-all': () => { ui.skinZonesOpen = !ui.skinZonesOpen; rerender(); } });

/* ---------- Photo de repas ---------- */
function compressImage(file, max = 768) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onerror = reject;
    r.onload = () => {
      const im = new Image();
      im.onerror = reject;
      im.onload = () => {
        const k = Math.min(1, max / Math.max(im.width, im.height));
        const c = document.createElement('canvas');
        c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
        c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
        resolve(c.toDataURL('image/jpeg', 0.75));
      };
      im.src = r.result;
    };
    r.readAsDataURL(file);
  });
}

function mealModal() {
  const m = ui.mealAi;
  let body;
  if (m.loading) body = `<div class="center" style="padding:24px 0"><div class="spin"></div><p class="small muted" style="margin-top:14px">L'IA reconnaît les aliments…</p></div>`;
  else if (m.error) body = `<p class="small" style="color:var(--danger);margin-top:6px">${esc(m.error)}</p><button class="btn block" style="margin-top:12px" data-act="food-back">Retour</button>`;
  else if (!m.isFood || !m.items.length) body = `<div class="empty"><div class="e">🤔</div>Je ne vois pas de nourriture sur cette photo. Réessaie avec l'assiette bien visible.</div><button class="btn block" data-act="food-back">Retour</button>`;
  else {
    const tot = m.items.reduce((a, x) => a + (x.sel ? x.kcal * x.mult : 0), 0);
    body = `<div class="col" style="gap:0;margin-top:4px">${m.items.map((x, i) => `<div class="food-item"><button class="chk ${x.sel ? 'on' : ''}" data-act="meal-toggle" data-i="${i}" aria-label="Sélectionner">${x.sel ? '✓' : ''}</button>
        <div class="grow"><div style="font-weight:600">${esc(x.name)}</div><div class="xs muted">${esc(x.portion)}${x.grams ? ` · ~${Math.round(x.grams * x.mult)} g` : ''} · ${Math.round(x.p * x.mult)} g prot.</div></div>
        <div class="row" style="gap:4px"><button class="mini" data-act="meal-mult" data-i="${i}" data-d="-0.5">−</button><b class="small" style="min-width:58px;text-align:center">${Math.round(x.kcal * x.mult)} kcal</b><button class="mini" data-act="meal-mult" data-i="${i}" data-d="0.5">+</button></div></div>`).join('')}</div>
      ${m.comment ? `<div class="card flat" style="background:var(--card2);margin-top:12px"><p class="small">💡 ${esc(m.comment)}</p></div>` : ''}
      <p class="note" style="margin-top:10px">Estimation de l'IA : ajuste les portions avec − et + si besoin.</p>
      <button class="btn primary block" style="margin-top:14px" data-act="meal-add" ${tot ? '' : 'disabled'}>Ajouter ${fmt(tot)} kcal au ${ui.meal.toLowerCase()}</button>`;
  }
  const html = `<div class="modal-head"><div><h2>Photo de repas</h2><p class="small muted">${ui.meal}</p></div><button class="icon-btn" data-act="close-modal">✕</button></div>
    ${m.img ? `<img src="${m.img}" alt="" style="width:100%;max-height:220px;object-fit:cover;border-radius:18px;margin-bottom:12px">` : ''}${body}`;
  const el = document.querySelector('.modal');
  if (el) el.innerHTML = '<div class="grab"></div>' + html; else openModal(html);
}

async function analyseMeal(img) {
  ui.mealAi = { loading: true, img };
  mealModal();
  try {
    const r = await ai('meal', { image: img });
    ui.mealAi = { img, isFood: r.isFood, comment: r.comment, items: (r.items || []).map((x) => ({ ...x, sel: true, mult: 1 })) };
    consume('meal');
  } catch (e) { ui.mealAi = { img, error: e.message }; }
  if (document.querySelector('.modal')) mealModal();
}

/* ---------- Compte ---------- */
function accountCard() {
  if (!cloud.enabled) return `<div class="card"><h3>☁️ Compte</h3><p class="small muted" style="margin-top:6px">Les comptes et l'IA seront activés très bientôt.</p></div>`;
  if (!cloud.user) {
    return `<div class="card coach-card"><h3>☁️ Crée ton compte gratuit</h3><p class="small muted" style="margin-top:6px;line-height:1.5">Sauvegarde tes données, retrouve-les sur tous tes appareils et active le coach IA, le scan IA du visage et la photo de repas.</p>
      <div class="row" style="margin-top:12px"><button class="btn primary grow" data-act="auth-open" data-mode="signup">Créer un compte</button><button class="btn grow" data-act="auth-open" data-mode="login">Se connecter</button></div></div>`;
  }
  const ago = cloud.lastSync ? Math.round((Date.now() - cloud.lastSync) / 60000) : null;
  return `<div class="card"><div class="row between"><div class="grow"><div class="xs upper muted">Compte</div><div style="font-weight:700;margin-top:3px;word-break:break-all">${esc(cloud.user.email || cloud.user.name || 'Connecté')}</div></div><span class="pill ${cloud.error ? 'warn' : 'good'}">${cloud.syncing ? '⟳ Synchro…' : cloud.error ? '⚠️ Hors ligne' : '✓ Synchronisé'}</span></div>
    <p class="xs muted" style="margin-top:6px">${cloud.error ? esc(cloud.error) : ago === null ? 'Synchronisation automatique activée' : ago < 1 ? 'Dernière synchro : à l\'instant' : `Dernière synchro : il y a ${ago} min`}</p>
    <div class="row" style="margin-top:12px"><button class="btn sm grow" data-act="sync-now">⟳ Synchroniser</button><button class="btn sm ghost grow" data-act="sign-out">Se déconnecter</button></div></div>`;
}

function authModal(mode = 'login', err = '') {
  ui.authMode = mode;
  const signup = mode === 'signup';
  const html = `<div class="modal-head"><h2>${signup ? 'Créer ton compte' : 'Connexion'}</h2><button class="icon-btn" data-act="close-modal">✕</button></div>
    <p class="small muted" style="margin-bottom:14px">${signup ? 'Gratuit. Tes données actuelles seront sauvegardées dans ton compte.' : 'Retrouve ton programme et ton suivi.'}</p>${inAppNote()}
    <button class="btn block google-btn" data-act="auth-google"><svg width="18" height="18" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>Continuer avec Google</button>
    <div class="or"><span>ou</span></div>
    <div class="col"><input id="au-email" class="input" type="email" inputmode="email" autocomplete="email" placeholder="Adresse e-mail">
      <input id="au-pass" class="input" type="password" autocomplete="${signup ? 'new-password' : 'current-password'}" placeholder="Mot de passe${signup ? ' (6 caractères min.)' : ''}"></div>
    <p id="au-err" class="small" style="color:var(--danger);margin-top:10px;min-height:1em">${esc(err)}</p>
    <button class="btn primary block" style="margin-top:6px" data-act="auth-submit">${signup ? 'Créer mon compte' : 'Se connecter'}</button>
    ${signup ? '' : '<button class="btn sm ghost block" style="margin-top:8px" data-act="auth-forgot">Mot de passe oublié ?</button>'}
    <p class="small center muted" style="margin-top:14px">${signup ? 'Déjà un compte ?' : 'Pas encore de compte ?'} <button style="color:var(--accent);font-weight:700" data-act="auth-open" data-mode="${signup ? 'login' : 'signup'}">${signup ? 'Se connecter' : 'Créer un compte'}</button></p>`;
  const el = document.querySelector('.modal');
  if (el) el.innerHTML = '<div class="grab"></div>' + html; else openModal(html);
}

async function doAuth(fn) {
  const btns = document.querySelectorAll('.modal .btn');
  btns.forEach((b) => { b.disabled = true; });
  try {
    await fn();
    closeModal();
    toast('Connecté ✓ Synchronisation…');
    const next = ui.afterAuth; ui.afterAuth = null;
    if (next) setTimeout(next, 300);
  } catch (e) {
    const el = document.getElementById('au-err');
    if (el) el.textContent = authError(e);
    btns.forEach((b) => { b.disabled = false; });
  }
}

Object.assign(A, {
  'auth-open': (el) => authModal(el.dataset.mode || 'login'),
  'need-login': () => authModal('signup'),
  'skin-gate': (el) => {
    const m = el.dataset.mode;
    closeModal();
    if (m === 'manual') return startSkin(true);
    ui.afterAuth = () => { if (route().page !== 'peau') go('peau'); startSkin(); };
    authModal(m);
  },
  'auth-submit': () => {
    const email = document.getElementById('au-email').value.trim(), pass = document.getElementById('au-pass').value;
    if (!email || !pass) { document.getElementById('au-err').textContent = 'Remplis l\'e-mail et le mot de passe.'; return; }
    doAuth(() => (ui.authMode === 'signup' ? signUp(email, pass) : signIn(email, pass)));
  },
  'auth-google': () => doAuth(() => signInGoogle()),
  'auth-forgot': async () => {
    const email = document.getElementById('au-email').value.trim();
    const err = document.getElementById('au-err');
    if (!email) { err.textContent = 'Entre ton e-mail ci-dessus, puis touche à nouveau « Mot de passe oublié ».'; return; }
    try { await resetPassword(email); err.style.color = 'var(--steps)'; err.textContent = 'E-mail de réinitialisation envoyé ✓'; }
    catch (e) { err.textContent = authError(e); }
  },
  'sign-out': async () => { await signOutUser(); toast('Déconnecté'); rerender(); },
  'sync-now': async () => { await pullAndMerge(); toast(cloud.error || 'Synchronisé ✓'); rerender(); },
  'brief-retry': () => { ui.briefError = ''; fetchBrief(); rerender(); },

  'coach-send': () => { const t = document.getElementById('coach-in'); if (t) sendCoach(t.value); },
  'coach-ask': (el) => sendCoach(el.dataset.t),
  'coach-clear': () => openModal(`<h2>Effacer la discussion ?</h2><p class="small muted" style="margin-top:6px">Le coach gardera l'accès à tes données, seule la conversation est supprimée.</p>
    <div class="row" style="margin-top:18px"><button class="btn grow" data-act="close-modal">Annuler</button><button class="btn danger grow" data-act="coach-clear-ok">Effacer</button></div>`),
  'coach-clear-ok': () => { S.coach = []; save(); closeModal(); rerender(); },

  'consent-yes': () => { S.settings = { ...(S.settings || {}), aiPhotoConsent: true }; save(); closeModal(); const p = ui.pendingConsent; ui.pendingConsent = null; p?.onOk(); },
  'consent-no': () => { closeModal(); const p = ui.pendingConsent; ui.pendingConsent = null; p?.onCancel(); },

  'skin-ai': () => {
    const last = S.settings?.keepSkinPhotos ? S.skin.photos[S.skin.photos.length - 1] : null;
    if (!last) return startSkin();
    if (!requireQuota('scan')) return;
    withConsent(() => { consume('scan'); runSkinAi(last.data); });
  },

  'meal-toggle': (el) => { const x = ui.mealAi.items[+el.dataset.i]; x.sel = !x.sel; mealModal(); },
  'meal-mult': (el) => { const x = ui.mealAi.items[+el.dataset.i]; x.mult = Math.max(0.5, Math.min(4, x.mult + Number(el.dataset.d))); mealModal(); },
  'meal-add': () => {
    const items = ui.mealAi.items.filter((x) => x.sel);
    items.forEach((x) => addFood({ n: x.name, u: `${x.mult !== 1 ? x.mult + ' × ' : ''}${x.portion} (IA)`, k: x.kcal * x.mult, p: x.p * x.mult, g: x.g * x.mult, l: x.l * x.mult }));
    ui.mealAi = null; closeModal(); toast(`${items.length} aliment${items.length > 1 ? 's' : ''} ajouté${items.length > 1 ? 's' : ''} ✓`); rerender();
  },
  'food-back': () => { ui.mealAi = null; foodModal(); },
});

Object.assign(INPUTS, {
  'coach-grow': (el) => { el.style.height = 'auto'; el.style.height = Math.min(140, el.scrollHeight) + 'px'; },
  'meal-photo': async (el) => {
    const f = el.files?.[0]; if (!f) return;
    try {
      if (!requireQuota('meal', () => foodModal())) return;
      const img = await compressImage(f);
      withConsent(() => analyseMeal(img), () => foodModal());
    } catch { toast('Impossible de lire cette photo'); }
  },
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey && e.target.id === 'coach-in') { e.preventDefault(); sendCoach(e.target.value); }
  if (e.key === 'Enter' && e.target.closest?.('.modal') && (e.target.id === 'au-pass' || e.target.id === 'au-email')) A['auth-submit']();
});


/* ---------- Produits conseillés selon le pays ---------- */
function productsCard(r) {
  if (!cloud.enabled) return '';
  const c = countryInfo();
  const list = (r.reco?.products?.length ? r.reco.products : r.ai?.products?.length ? r.ai.products : r.products) || [];
  const head = `<h3>🛍 Produits pour ta peau · ${c.flag} ${esc(c.label)}</h3><p class="xs muted" style="margin-top:4px">Choisis pour contenir les bons ingrédients et aucun de ceux à éviter.</p>`;
  if (ui.productsLoading) return `<div class="card section">${head}<div class="center" style="padding:18px 0"><div class="spin"></div><p class="small muted" style="margin-top:10px">Recherche de produits vendus en ${esc(c.label)}…</p></div></div>`;
  if (!list.length) {
    return `<div class="card section">${head}<p class="small muted" style="margin-top:8px;line-height:1.5">L'IA te propose des produits adaptés à ta peau et vendus dans ton pays (pharmacie, parapharmacie, grande surface), avec un prix indicatif.</p>
      ${cloud.user ? `<button class="btn block" style="margin-top:12px;background:var(--skin);color:#1a0a12" data-act="skin-products">Voir les produits pour ma peau</button>` : `<button class="btn block" style="margin-top:12px" data-act="auth-open" data-mode="signup">Créer un compte pour les voir</button>`}</div>`;
  }
  const order = ['Nettoyant', 'Sérum', 'Traitement', 'Contour des yeux', 'Hydratant', 'Protection solaire', 'Masque'];
  const sorted = [...list].sort((a, b) => (order.indexOf(a.etape) + 99) % 99 - (order.indexOf(b.etape) + 99) % 99);
  return `<div class="card section">${head}
    <div class="col" style="margin-top:12px;gap:0">${sorted.map((x) => `<div class="routine-step"><div class="grow">
      <div class="row wrap" style="gap:6px"><span class="pill" style="padding:3px 9px;font-size:11px">${esc(x.etape)}</span>${x.budget ? `<span class="pill ${x.budget === 'petit prix' ? 'good' : ''}" style="padding:3px 9px;font-size:11px">${esc(x.budget)}</span>` : ''}</div>
      <div style="font-weight:700;margin-top:7px">${esc(x.marque)} · ${esc(x.produit)}</div>
      ${(x.contient || []).length ? `<div style="margin-top:6px">${x.contient.map((i) => `<span class="ing-chip use" style="font-size:11.5px;padding:4px 8px">✓ ${esc(i)}</span>`).join('')}</div>` : ''}
      <p class="small muted" style="margin-top:3px;line-height:1.45">${esc(x.pourquoi)}</p>
      <p class="xs" style="margin-top:5px;color:var(--text)">${x.prix ? `💰 ${esc(x.prix)}` : ''}${x.ou ? ` · 📍 ${esc(x.ou)}` : ''}</p></div></div>`).join('')}</div>
    <p class="note" style="margin-top:10px">Suggestions de l'IA, à titre indicatif : vérifie la disponibilité, la composition et le prix sur place. All In n'est lié à aucune marque.</p>
    ${cloud.user ? `<button class="btn sm ghost block" style="margin-top:10px" data-act="skin-products">↻ Proposer d'autres produits</button>` : ''}</div>`;
}

/* Ingrédients : version IA (avec explications et exemples) ou liste de base */
function ingredientsCard(r, aiOnly = false) {
  const reco = r.reco;
  if (reco && (reco.privilegier || []).length) {
    if (!aiOnly) return '';
    return `<div class="card section"><h3>🧪 Ingrédients pour ta peau</h3>
      <div class="xs upper muted" style="margin-top:12px">À privilégier</div>
      <div class="col" style="margin-top:8px;gap:8px">${reco.privilegier.map((x) => `<div><span class="ing-chip use">✓ ${esc(x.ingredient)}</span><p class="xs muted" style="margin:-2px 0 0 4px;line-height:1.45">${esc(x.pourquoi)}</p></div>`).join('')}</div>
      ${(reco.eviter || []).length ? `<div class="xs upper muted" style="margin-top:14px">À éviter</div>
      <div class="col" style="margin-top:8px;gap:8px">${reco.eviter.map((x) => `<div><span class="ing-chip avoid">✕ ${esc(x.quoi)}</span><p class="xs muted" style="margin:-2px 0 0 4px;line-height:1.45">${esc(x.pourquoi)}${x.exemples ? ` <span style="color:var(--text)">Souvent dans : ${esc(x.exemples)}.</span>` : ''}</p></div>`).join('')}</div>` : ''}</div>`;
  }
  if (aiOnly) return '';
  return `<div class="card section"><h3>À privilégier</h3><div style="margin-top:12px">${r.use.map((x) => `<span class="ing-chip use">✓ ${x}</span>`).join('')}</div>
      ${r.avoid.length ? `<h3 style="margin-top:14px">À éviter</h3><div style="margin-top:12px">${r.avoid.map((x) => `<span class="ing-chip avoid">✕ ${x}</span>`).join('')}</div>` : ''}</div>`;
}

async function fetchProducts() {
  const r = S.skin.result;
  if (!r) return;
  ui.productsLoading = true; rerender();
  try {
    const labels = {};
    D.SKIN_Q_POOL.forEach((q) => { const a = S.skin.answers?.[q.id]; if (q.opts[a]) labels[q.q] = q.opts[a][0]; });
    const out = await ai('products', {
      country: { label: countryInfo().label, currency: countryInfo().cur },
      skin: { type: D.SKIN_TYPES[r.type]?.label, preoccupations: r.concerns.map((c) => D.SKIN_ISSUES[c]?.label), sexe: S.profile.sex === 'f' ? 'femme' : 'homme', age: S.profile.age, routine_actuelle: labels, analyse_ia: r.ai && r.ai.quality !== 'bad' ? r.ai.summary : null },
      exclude: (r.reco?.products || r.ai?.products || r.products || []).map((x) => `${x.marque} ${x.produit}`),
    });
    r.reco = { privilegier: out.privilegier?.length ? out.privilegier : (r.reco?.privilegier || []), eviter: out.eviter?.length ? out.eviter : (r.reco?.eviter || []), products: out.products || [] };
    save();
  } catch (e) { toast(e.message); }
  ui.productsLoading = false;
  if (route().page === 'peau') rerender();
}

Object.assign(A, { 'skin-products': () => fetchProducts() });

/* ============================================================
   V3 — Offre Premium, programme évolutif, bilan du dimanche, rappels
   ============================================================ */

/* ---------- Offre ---------- */
function planInfo() {
  const now = Date.now();
  if (S.planServer === 'premium' && (!S.planUntil || new Date(S.planUntil).getTime() > now)) return { status: 'premium' };
  const t = S.premium?.trialStart;
  if (t) {
    const left = Math.ceil((t + 7 * 864e5 - now) / 864e5);
    if (left > 0) return { status: 'trial', left };
  }
  return { status: 'free', trialUsed: !!t };
}
const isPro = () => planInfo().status !== 'free';
function usageOf(kind) {
  const wk = weekKey();
  if (!S.usage || S.usage.week !== wk) S.usage = { week: wk };
  return S.usage[kind] || 0;
}
const quotaLeft = (kind) => Math.max(0, D.FREE_LIMITS[kind] - usageOf(kind));
const canUse = (kind) => isPro() || quotaLeft(kind) > 0;
function consume(kind) { usageOf(kind); S.usage[kind] = (S.usage[kind] || 0) + 1; save(); }
function requireQuota(kind, onSkip) {
  if (canUse(kind)) return true;
  paywall(kind, onSkip);
  return false;
}
const quotaHint = (kind) => (isPro() || !cloud.user ? '' : `<span class="pill ${quotaLeft(kind) ? '' : 'warn'}" style="padding:3px 9px;font-size:11px">${quotaLeft(kind)}/${D.FREE_LIMITS[kind]} gratuit${D.FREE_LIMITS[kind] > 1 ? 's' : ''} cette semaine</span>`);

function startTrial() {
  if (!cloud.user) return authModal('signup');
  if (S.premium?.trialStart) return toast('Ton essai gratuit a déjà été utilisé');
  S.premium = { ...(S.premium || {}), trialStart: Date.now() };
  save(); closeModal();
  toast('🎉 Premium activé pour 7 jours');
  rerender();
}

function paywall(kind, onSkip) {
  const p = planInfo();
  ui.paywallSkip = onSkip || null;
  openModal(`<div class="center" style="padding-top:4px"><div style="font-size:44px">⭐</div><h2 style="margin-top:8px">Passe à All In Premium</h2>
    <p class="small muted" style="margin-top:8px;line-height:1.5">${kind ? `Tu as utilisé ${D.FREE_LIMITS[kind] ? `tes ${D.FREE_LIMITS[kind]} ${D.LIMIT_LABELS[kind]}` : 'les fonctions'} de l'offre gratuite cette semaine.` : ''} Avec Premium, tout est illimité.</p></div>
    <div class="col" style="margin-top:16px;gap:10px">${D.PREMIUM_FEATURES.slice(0, 4).map(([i, t, d]) => `<div class="row" style="align-items:flex-start"><span style="font-size:20px">${i}</span><div><b class="small">${t}</b><p class="xs muted" style="margin-top:2px">${d}</p></div></div>`).join('')}</div>
    ${!p.trialUsed ? `<button class="btn primary block" style="margin-top:18px" data-act="trial">Essayer 7 jours gratuitement</button>` : `<button class="btn primary block" style="margin-top:18px" data-act="go-premium">Voir l'offre Premium</button>`}
    <button class="btn ghost block" style="margin-top:8px" data-act="paywall-skip">${onSkip ? 'Continuer sans l\'IA' : 'Plus tard'}</button>`);
}

function viewPremium() {
  const p = planInfo();
  const status = p.status === 'premium' ? '<span class="pill good">Premium actif</span>' : p.status === 'trial' ? `<span class="pill on">Essai · ${p.left} jour${p.left > 1 ? 's' : ''} restant${p.left > 1 ? 's' : ''}</span>` : '<span class="pill">Offre gratuite</span>';
  const rows = [['Suivis eau, sommeil, pas, poids', true, true], ['Programme sport + démos animées', true, true], ['Recettes et conseils', true, true], ['Brief du coach chaque jour', true, true],
    ['Messages au coach', `${D.FREE_LIMITS.coach} / semaine`, 'Illimité'], ['Scan peau avec IA', `${D.FREE_LIMITS.scan} / semaine`, 'Illimité'], ['Photos de repas', `${D.FREE_LIMITS.meal} / semaine`, 'Illimité'], ['Bilan du dimanche par le coach', false, true]];
  const cell = (v) => (v === true ? '<span style="color:var(--steps)">✓</span>' : v === false ? '<span class="dim">—</span>' : `<span class="xs">${v}</span>`);
  return `<div class="view">${header('Premium', { back: 'profil', right: status })}
    <div class="card premium-hero"><div style="font-size:40px">⭐</div><h2 style="margin-top:6px">All In Premium</h2>
      <p class="small muted" style="margin-top:6px;line-height:1.5">Ton coach, ton scan peau et tes photos de repas sans limite, un programme qui s'adapte chaque semaine et ton bilan du dimanche.</p>
      ${p.status === 'free' && !p.trialUsed ? `<button class="btn primary block" style="margin-top:16px" data-act="trial">Essayer 7 jours gratuitement</button><p class="xs muted center" style="margin-top:8px">Sans carte bancaire · sans engagement</p>` : ''}
      ${p.status === 'trial' ? `<p class="small" style="margin-top:12px;font-weight:700">Profite de ton essai : il reste ${p.left} jour${p.left > 1 ? 's' : ''}.</p>` : ''}</div>
    <div class="card section"><h3>Ce que tu débloques</h3><div class="col" style="margin-top:12px;gap:12px">${D.PREMIUM_FEATURES.map(([i, t, d]) => `<div class="row" style="align-items:flex-start"><span style="font-size:22px">${i}</span><div><b class="small">${t}</b><p class="xs muted" style="margin-top:2px">${d}</p></div></div>`).join('')}</div></div>
    <div class="card section"><div class="cmp-row head"><span></span><span>Gratuit</span><span>Premium</span></div>${rows.map(([l, f, pr]) => `<div class="cmp-row"><span class="small">${l}</span><span>${cell(f)}</span><span>${cell(pr)}</span></div>`).join('')}</div>
    ${p.status !== 'premium' ? `<div class="section"><h2>Les formules</h2>
      <div class="grid2" style="margin-top:12px"><div class="card plan-card"><div class="xs upper muted">Mensuel</div><div class="mid-num" style="margin-top:6px">Bientôt</div><p class="xs muted" style="margin-top:4px">Sans engagement</p></div>
        <div class="card plan-card best"><span class="pill on" style="position:absolute;top:10px;right:10px;padding:3px 8px;font-size:10px">−40 %</span><div class="xs upper muted">Annuel</div><div class="mid-num" style="margin-top:6px">Bientôt</div><p class="xs muted" style="margin-top:4px">Le meilleur prix</p></div></div>
      <p class="small muted" style="margin-top:12px;line-height:1.5">Paiement par carte CIB / Edahabia en Algérie et par carte bancaire dans les autres pays : en cours de mise en place.</p>
      <button class="btn block" style="margin-top:12px" data-act="waitlist">${S.premium?.waitlist ? '✓ Tu seras prévenu' : '🔔 Me prévenir quand c\'est disponible'}</button></div>` : ''}
  </div>`;
}

function planCard() {
  if (!cloud.enabled) return '';
  const p = planInfo();
  if (p.status === 'premium') return `<div class="card tap" data-act="go" data-to="premium"><div class="row between"><div><div class="xs upper muted">Mon offre</div><h3 style="margin-top:4px">⭐ Premium</h3></div><span class="pill good">Actif</span></div></div>`;
  if (p.status === 'trial') return `<div class="card tap" data-act="go" data-to="premium"><div class="row between"><div><div class="xs upper muted">Mon offre</div><h3 style="margin-top:4px">⭐ Essai Premium</h3><p class="small muted" style="margin-top:3px">Il reste ${p.left} jour${p.left > 1 ? 's' : ''}</p></div><span class="dim">›</span></div></div>`;
  return `<div class="card premium-hero tap" data-act="go" data-to="premium"><div class="row between"><div><div class="xs upper muted">Mon offre : gratuite</div><h3 style="margin-top:4px">⭐ Découvre Premium</h3><p class="small muted" style="margin-top:3px">${p.trialUsed ? 'Coach, scans et photos illimités' : '7 jours gratuits, sans carte bancaire'}</p></div><span class="dim">›</span></div></div>`;
}

/* ---------- Programme évolutif : carte de progression ---------- */
function progressCard(plan) {
  const wn = weekNumber();
  const light = isLightWeek();
  const changed = [];
  const seen = new Set();
  plan.forEach((s) => s.exercises.forEach((e) => { if (e.shift && !seen.has(e.id)) { seen.add(e.id); changed.push(e); } }));
  const nbFb = (S.feedback || []).length;
  return `<div class="card progress-card"><div class="row between"><div><div class="xs upper muted">Semaine ${wn} · cycle ${((wn - 1) % 4) + 1}/4</div>
      <h3 style="margin-top:4px">${light ? '🧘 Semaine légère (récupération)' : '📈 Ton programme évolue'}</h3></div></div>
    <p class="small muted" style="margin-top:6px;line-height:1.5">${light ? 'Une série de moins sur chaque exercice cette semaine : tes muscles récupèrent et progressent. On repart plus fort la semaine prochaine.' : nbFb ? 'Après chaque exercice, tu indiques si c\'était trop dur ou trop facile : les répétitions s\'ajustent toutes seules.' : 'Après chaque exercice, dis si c\'était trop dur, parfait ou trop facile : ton programme s\'ajustera tout seul.'}</p>
    ${changed.length ? `<div class="col" style="margin-top:10px;gap:6px">${changed.slice(0, 6).map((e) => `<div class="row between small"><span>${e.icon} ${e.name}</span><b style="color:${e.shift > 0 ? 'var(--steps)' : 'var(--food)'}">${e.shift > 0 ? '↑' : '↓'} ${esc(e.target)}</b></div>`).join('')}</div>` : ''}</div>`;
}

/* ---------- Bilan de la semaine ---------- */
function reviewWeekStart() {
  // Le dimanche (dès 16 h) : la semaine en cours ; sinon la semaine précédente
  const now = new Date();
  const mon = mondayOf();
  const prev = weekdayMon() === 7 && now.getHours() >= 16 ? mon : addDays(mon, -7);
  // Inscrit après cette semaine-là : on montre la semaine en cours
  return (S.profile?.createdAt || '') > addDays(prev, 6) ? mon : prev;
}
const isCurrentWeek = (mon) => mon === mondayOf();
function weekStats(mon) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(mon, i));
  const t = targets();
  const d = days.map((k) => peekDay(k));
  const plan = buildPlan();
  const planned = plan.length;
  const done = d.filter((x) => x.workout).length;
  const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
  const waterDays = d.filter((x) => x.water > 0);
  const sleepDays = d.filter((x) => x.sleep);
  const stepDays = d.filter((x) => x.steps > 0);
  const kcalDays = days.map((k) => dayNutrition(k).kcal).filter(Boolean);
  const w = S.weights.filter((x) => x.date <= days[6]);
  const wStart = S.weights.filter((x) => x.date < mon).slice(-1)[0] || S.weights.find((x) => x.date >= mon);
  const wEnd = w.slice(-1)[0];
  const fb = (S.feedback || []).filter((x) => x.d >= mon && x.d <= days[6]);
  return {
    from: mon, to: days[6], seances: `${done}/${planned}`, done, planned,
    eau_moyenne_ml: Math.round(avg(waterDays.map((x) => x.water))), jours_objectif_eau: d.filter((x) => x.water >= t.waterBase).length,
    sommeil_moyen_min: Math.round(avg(sleepDays.map((x) => x.sleep.minutes))), nuits_notees: sleepDays.length,
    pas_moyens: Math.round(avg(stepDays.map((x) => x.steps))), kcal_moyennes: Math.round(avg(kcalDays)), jours_repas_notes: kcalDays.length,
    poids_debut: wStart?.kg ?? null, poids_fin: wEnd?.kg ?? null,
    retours_exercices: { trop_dur: fb.filter((x) => x.f < 0).length, parfait: fb.filter((x) => x.f === 0).length, trop_facile: fb.filter((x) => x.f > 0).length },
  };
}
function reviewReady() {
  const ok = weekdayMon() === 7 ? new Date().getHours() >= 16 : weekdayMon() <= 2;
  return ok && !isCurrentWeek(reviewWeekStart());
}

function reviewCard() {
  if (!reviewReady()) return '';
  const wk = weekKey(reviewWeekStart());
  const has = S.reviews?.[wk];
  return `<div class="card review-card tap" data-act="go" data-to="bilan"><div class="row"><span style="font-size:30px">📊</span><div class="grow"><div class="xs upper muted">Bilan de la semaine</div><h3 style="margin-top:3px">${has ? esc(has.titre) : 'Ton bilan est prêt'}</h3><p class="small muted" style="margin-top:3px">${has ? 'Revois tes 3 objectifs de la semaine' : 'Tes chiffres de la semaine et tes objectifs'}</p></div><span class="dim">›</span></div></div>`;
}

async function fetchReview(mon) {
  const wk = weekKey(mon);
  ui.reviewLoading = true; rerender();
  try {
    const r = await ai('weekly', { context: buildContext(), week: weekStats(mon) });
    S.reviews = { ...(S.reviews || {}), [wk]: { ...r, date: today() } };
    const keys = Object.keys(S.reviews).sort();
    keys.slice(0, Math.max(0, keys.length - 8)).forEach((k) => delete S.reviews[k]);
    save();
  } catch (e) { toast(e.message); }
  ui.reviewLoading = false;
  if (route().page === 'bilan') rerender();
}

function viewBilan() {
  const mon = ui.reviewWeek || reviewWeekStart();
  const st = weekStats(mon);
  const wk = weekKey(mon);
  const rv = S.reviews?.[wk];
  const t = targets();
  const pro = isPro();
  const cur = isCurrentWeek(mon) && weekdayMon() < 7;
  if (pro && cloud.user && !cur && !rv && !ui.reviewLoading && !ui.reviewTried?.[wk]) { ui.reviewTried = { ...(ui.reviewTried || {}), [wk]: true }; setTimeout(() => fetchReview(mon)); }
  const tile = (ico, v, l, c = 'var(--text)') => `<div class="card" style="padding:12px"><div style="font-size:18px">${ico}</div><div class="mid-num" style="color:${c};margin-top:4px">${v}</div><div class="xs muted">${l}</div></div>`;
  const dw = st.poids_debut != null && st.poids_fin != null ? st.poids_fin - st.poids_debut : null;
  const ai = rv ? `<div class="card section coach-card"><div class="row"><div class="coach-av">🤖</div><div><div class="xs upper muted">Le mot du coach</div><h3 style="margin-top:3px">${esc(rv.titre)}</h3></div></div>
      <p style="margin-top:10px;line-height:1.5">${esc(rv.resume)}</p>
      <div class="xs upper muted" style="margin-top:12px">✅ Points forts</div><ul class="list-plain" style="margin-top:6px">${rv.points_forts.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
      ${rv.a_ameliorer.length ? `<div class="xs upper muted" style="margin-top:12px">🎯 À améliorer</div><ul class="list-plain" style="margin-top:6px">${rv.a_ameliorer.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}</div>
    <div class="card section"><h3>Tes 3 objectifs de la semaine</h3><div class="col" style="margin-top:10px;gap:8px">${rv.objectifs.map((x, i) => `<div class="routine-step"><span class="n" style="background:rgba(212,255,58,.15);color:var(--accent)">${i + 1}</span><div class="grow small" style="line-height:1.45">${esc(x)}</div></div>`).join('')}</div></div>`
    : ui.reviewLoading ? `<div class="card section center" style="padding:26px"><div class="spin"></div><p class="small muted" style="margin-top:10px">Le coach analyse ta semaine…</p></div>`
    : cur ? `<div class="card section flat" style="background:var(--card2)"><p class="small" style="line-height:1.5">📅 Ta semaine est en cours. Ton bilan complet et le mot du coach arrivent <b>dimanche à 18 h</b>.</p></div>`
    : pro ? `<button class="btn primary block section" data-act="review-gen">🤖 Demander mon bilan au coach</button>`
    : `<div class="card section premium-hero"><div class="row"><span style="font-size:26px">🔒</span><div class="grow"><h3>Le mot du coach</h3><p class="small muted" style="margin-top:3px;line-height:1.45">Ce qui a marché, ce qui coince et tes 3 objectifs pour la semaine : réservé à Premium.</p></div></div>
      <button class="btn primary block" style="margin-top:12px" data-act="${planInfo().trialUsed ? 'go-premium' : 'trial'}">${planInfo().trialUsed ? 'Voir Premium' : 'Essayer 7 jours gratuitement'}</button></div>`;
  const past = Object.keys(S.reviews || {}).sort().reverse().filter((k) => k !== wk);
  return `<div class="view">${header('Bilan', { back: 'home' })}
    <p class="small muted">${cur ? 'Semaine en cours · ' : ''}Semaine du ${shortDate(st.from)} au ${shortDate(st.to)}</p>
    <div class="grid3" style="margin-top:12px">${tile('🏋️', st.seances, 'séances', 'var(--accent)')}${tile('💧', st.eau_moyenne_ml ? (st.eau_moyenne_ml / 1000).toFixed(1).replace('.', ',') + ' L' : '—', 'eau / jour', 'var(--water)')}${tile('😴', st.sommeil_moyen_min ? fmtDur(st.sommeil_moyen_min) : '—', 'sommeil moyen', 'var(--sleep)')}
      ${tile('👟', st.pas_moyens ? fmt(st.pas_moyens) : '—', 'pas / jour', 'var(--steps)')}${tile('🍽️', st.kcal_moyennes ? fmt(st.kcal_moyennes) : '—', `kcal / jour (obj. ${fmt(t.kcal)})`, 'var(--food)')}${tile('⚖️', dw == null ? '—' : `${dw > 0 ? '+' : ''}${dw.toFixed(1).replace('.', ',')}`, 'kg sur la semaine', 'var(--body)')}</div>
    ${ai}
    ${past.length ? `<div class="section"><h3>Bilans précédents</h3>${past.map((k) => `<div class="food-item"><div class="grow"><b class="small">${esc(S.reviews[k].titre)}</b><div class="xs muted">${k.replace('-S', ' · semaine ')}</div></div></div>`).join('')}</div>` : ''}</div>`;
}

/* ---------- Rappels ---------- */
const DEFAULT_REM = { water: true, waterTimes: '10:00,13:00,16:00,19:00', bed: true, bedTime: '23:00', workout: true, workoutTime: '18:00', review: true };
const rem = () => ({ ...DEFAULT_REM, ...(S.settings?.reminders || {}) });

function remindersCard() {
  const r = rem();
  const tg = (k, label, extra = '') => `<div class="row between" style="padding:10px 0;border-bottom:1px solid var(--line)"><div class="grow"><b class="small">${label}</b>${extra}</div><button class="toggle ${r[k] ? 'on accent' : ''}" data-act="rem-toggle" data-k="${k}" aria-label="${label}"><i></i></button></div>`;
  return `<div class="card"><h3>🔔 Mes rappels</h3><p class="small muted" style="margin-top:4px;line-height:1.5">Ajoute-les au calendrier de ton téléphone : tu recevras une alerte même appli fermée.</p>
    <div style="margin-top:6px">
      ${tg('water', '💧 Boire de l\'eau', `<div class="xs muted" style="margin-top:2px">À ${esc(r.waterTimes.split(',').join(', '))}</div>`)}
      ${tg('bed', '😴 Aller me coucher', `<input type="time" class="input mini-time" data-on="rem-time" data-k="bedTime" value="${r.bedTime}">`)}
      ${tg('workout', '🏋️ Ma séance de sport', `<div class="xs muted" style="margin-top:2px">Les jours d'entraînement</div><input type="time" class="input mini-time" data-on="rem-time" data-k="workoutTime" value="${r.workoutTime}">`)}
      ${tg('review', '📊 Mon bilan du dimanche', '<div class="xs muted" style="margin-top:2px">Le dimanche à 18 h</div>')}
    </div>
    <button class="btn primary block" style="margin-top:14px" data-act="rem-export">📅 Ajouter à mon calendrier</button>
    <p class="note" style="margin-top:8px">Si tu changes tes horaires plus tard, supprime l'ancien calendrier « All In » puis ajoute-le à nouveau.</p></div>`;
}

function buildIcs() {
  const r = rem();
  const pad2 = (n) => String(n).padStart(2, '0');
  const now = new Date();
  const stamp = `${now.getUTCFullYear()}${pad2(now.getUTCMonth() + 1)}${pad2(now.getUTCDate())}T${pad2(now.getUTCHours())}${pad2(now.getUTCMinutes())}00Z`;
  const startDay = today().replace(/-/g, '');
  const appUrl = location.origin + location.pathname;
  const ev = [];
  const add = (time, title, desc, rrule, mins = 10) => {
    const [h, m] = time.split(':').map(Number);
    const endM = h * 60 + m + mins;
    const icsText = (t) => t.replace(/([,;])/g, '\\$1');
    title = icsText(title); desc = icsText(desc);
    // Identifiant stable : réimporter le calendrier met à jour les rappels au lieu de les doubler
    ev.push(['BEGIN:VEVENT', `UID:allin-${ev.length}@all-in`, `DTSTAMP:${stamp}`, `DTSTART:${startDay}T${pad2(h)}${pad2(m)}00`, `DTEND:${startDay}T${pad2(Math.floor(endM / 60) % 24)}${pad2(endM % 60)}00`,
      `RRULE:${rrule}`, `SUMMARY:${title}`, `DESCRIPTION:${desc}\\n${appUrl}`, `URL:${appUrl}`, 'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${title}`, 'TRIGGER:PT0M', 'END:VALARM', 'END:VEVENT'].join('\r\n'));
  };
  if (r.water) r.waterTimes.split(',').forEach((t) => add(t.trim(), '💧 All In · Un verre d\'eau', 'Bois un grand verre d\'eau et note-le dans All In.', 'FREQ=DAILY', 5));
  if (r.bed) {
    const [h, m] = r.bedTime.split(':').map(Number);
    const pre = ((h * 60 + m - 30) + 1440) % 1440;
    add(`${pad2(Math.floor(pre / 60))}:${pad2(pre % 60)}`, '😴 All In · Prépare-toi à dormir', `Écrans coupés : coucher prévu à ${r.bedTime}.`, 'FREQ=DAILY', 30);
  }
  if (r.workout) {
    const days = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];
    const byday = buildPlan().map((s) => days[s.weekday - 1]).join(',');
    if (byday) add(r.workoutTime, '🏋️ All In · C\'est l\'heure de ta séance', 'Ta séance du jour t\'attend dans All In.', `FREQ=WEEKLY;BYDAY=${byday}`, 45);
  }
  if (r.review) add('18:00', '📊 All In · Ton bilan de la semaine', 'Découvre ton bilan et tes objectifs de la semaine.', 'FREQ=WEEKLY;BYDAY=SU', 10);
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//All In//Rappels//FR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:All In', ...ev, 'END:VCALENDAR'].join('\r\n');
}

function exportReminders() {
  const ics = buildIcs();
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  if (ios) { location.href = 'data:text/calendar;charset=utf-8,' + encodeURIComponent(ics); return; }
  const blob = new Blob([ics], { type: 'text/calendar' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = 'all-in-rappels.ics'; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 3000);
  toast('Ouvre le fichier pour l\'ajouter à ton calendrier');
}

/* Rappel du moment, affiché dans l'appli */
function nudgeCard() {
  const r = rem();
  const now = new Date();
  const h = now.getHours() + now.getMinutes() / 60;
  const d = peekDay(today()), t = targets();
  if (r.bed) {
    const [bh, bm] = r.bedTime.split(':').map(Number);
    const bed = bh + bm / 60;
    if (h >= bed - 1 && h < bed + 0.5) return `<div class="card flat nudge"><span style="font-size:22px">😴</span><div class="grow"><b class="small">Bientôt l'heure de dormir</b><p class="xs muted" style="margin-top:2px">Coucher prévu à ${r.bedTime} : coupe les écrans et baisse la lumière.</p></div></div>`;
  }
  if (r.water && h >= 10 && h <= 21) {
    const expected = t.water * Math.min(1, Math.max(0, (h - 8) / 13));
    if (d.water < expected - 300) return `<div class="card flat nudge"><span style="font-size:22px">💧</span><div class="grow"><b class="small">Pense à boire</b><p class="xs muted" style="margin-top:2px">Il est ${now.getHours()} h : tu en es à ${(d.water / 1000).toFixed(1).replace('.', ',')} L, vise environ ${(Math.round(expected / 100) / 10).toFixed(1).replace('.', ',')} L.</p></div><button class="btn sm" style="background:rgba(76,201,255,.15);color:var(--water)" data-act="water-add" data-ml="250">+250 ml</button></div>`;
  }
  return '';
}

Object.assign(A, {
  trial: () => startTrial(),
  'go-premium': () => { closeModal(); go('premium'); },
  'paywall-skip': () => { closeModal(); const f = ui.paywallSkip; ui.paywallSkip = null; f?.(); },
  waitlist: () => { S.premium = { ...(S.premium || {}), waitlist: true }; save(); toast('🔔 Tu seras prévenu dès que le paiement est disponible'); rerender(); },
  'review-gen': () => fetchReview(ui.reviewWeek || reviewWeekStart()),
  'rem-toggle': (el) => { const r = rem(); r[el.dataset.k] = !r[el.dataset.k]; S.settings = { ...(S.settings || {}), reminders: r }; save(); rerender(); },
  'rem-export': () => exportReminders(),
  'wk-fb': (el) => afterFeedback(el.dataset.v === 'skip' ? null : Number(el.dataset.v)),
});
Object.assign(INPUTS, {
  'rem-time': (el) => { const r = rem(); r[el.dataset.k] = el.value; S.settings = { ...(S.settings || {}), reminders: r }; save(); },
});


/* ============================================================
   V4 — Le savais-tu, progression (niveaux, badges, évolution)
   ============================================================ */
const doy = () => Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 864e5);
const factsOf = (cat) => (cat ? D.FACTS.filter((f) => f[0] === cat) : D.FACTS);
function factAt(cat, i) { const l = factsOf(cat); return l[((i % l.length) + l.length) % l.length]; }
const factHtml = ([c, ico, t], label = 'Le savais-tu ?') => `<div class="fact"><span class="fact-ico">${ico}</span><div><div class="xs upper muted">${label} · ${D.FACT_CATS[c]}</div><p style="margin-top:5px;line-height:1.5">${t}</p></div></div>`;

function factCard() {
  const i = doy() + (ui.factShift || 0);
  return `<div class="card flat fact-card">${factHtml(factAt(null, i * 7))}
    <div class="row between" style="margin-top:12px"><button class="btn sm ghost" data-act="go" data-to="infos">Tout voir</button><button class="btn sm" data-act="fact-next">Une autre ›</button></div></div>`;
}

function viewInfos() {
  const cat = ui.factCat || null;
  const list = factsOf(cat);
  return `<div class="view">${header('Le savais-tu ?', { back: 'home' })}
    <p class="small muted">${D.FACTS.length} pense-bêtes santé, peau, sommeil, sport et nutrition.</p>
    <div class="chips" style="margin-top:12px"><button class="chip ${!cat ? 'on' : ''}" data-act="fact-cat" data-v="">Tout</button>${Object.entries(D.FACT_CATS).map(([k, l]) => `<button class="chip ${cat === k ? 'on' : ''}" data-act="fact-cat" data-v="${k}">${l}</button>`).join('')}</div>
    <div class="col" style="margin-top:14px;gap:10px">${list.map((f) => `<div class="card flat" style="background:var(--card2)">${factHtml(f, '')}</div>`).join('')}</div></div>`;
}

/* ---------- Progression ---------- */
function xpStats() {
  let xp = 0;
  const c = { wk: 0, water: 0, steps: 0, steps10k: 0, sleep: 0, sleep7: 0, meals: 0 };
  Object.entries(S.days).forEach(([k, d]) => {
    const t = targets(S.profile, k);
    if (d.workout) { xp += 50; c.wk++; }
    if (d.water >= t.water) { xp += 20; c.water++; }
    if (d.steps >= t.steps) { xp += 20; c.steps++; }
    if (d.steps >= 10000) c.steps10k++;
    if (d.sleep) { xp += 10; c.sleep++; if (d.sleep.minutes >= 420) c.sleep7++; }
    if (d.meals?.length) { xp += 10; c.meals++; }
  });
  const hist = skinHistory();
  xp += S.weights.length * 5 + hist.length * 40;
  c.weights = S.weights.length; c.scans = hist.length;
  c.skinUp = hist.length >= 2 && hist[hist.length - 1].score > hist[0].score;
  c.reviews = Object.keys(S.reviews || {}).length;
  // Semaine complète : autant de séances que prévu, sur une semaine du lundi au dimanche
  const weeks = {};
  Object.entries(S.days).forEach(([k, d]) => { if (d.workout) { const m = mondayOf(k); weeks[m] = (weeks[m] || 0) + 1; } });
  c.fullWeeks = Object.values(weeks).filter((n) => n >= Number(S.profile.days)).length;
  c.streak = streak();
  let li = 0;
  D.LEVELS_XP.forEach(([min], i) => { if (xp >= min) li = i; });
  const [min, name, icon] = D.LEVELS_XP[li];
  const next = D.LEVELS_XP[li + 1];
  return { xp, c, level: li + 1, name, icon, min, next: next ? next[0] : null, nextName: next ? next[1] : null };
}

const BADGES = [
  ['first_wk', '🎯', 'Première séance', 'Termine ta première séance', (c) => c.wk >= 1],
  ['wk10', '💪', '10 séances', 'Termine 10 séances', (c) => c.wk >= 10],
  ['wk50', '🏆', '50 séances', 'Termine 50 séances', (c) => c.wk >= 50],
  ['full_week', '📅', 'Semaine complète', 'Fais toutes tes séances d\'une semaine', (c) => c.fullWeeks >= 1],
  ['full_4', '🗓️', 'Un mois sans faille', '4 semaines complètes', (c) => c.fullWeeks >= 4],
  ['streak7', '🔥', '7 jours de suite', 'Garde ta série 7 jours', (c) => c.streak >= 7],
  ['streak30', '🌋', '30 jours de suite', 'Garde ta série 30 jours', (c) => c.streak >= 30],
  ['water7', '💧', 'Bien hydraté', 'Atteins ton objectif d\'eau 7 jours', (c) => c.water >= 7],
  ['water30', '🌊', 'Source vive', 'Atteins ton objectif d\'eau 30 jours', (c) => c.water >= 30],
  ['steps10k', '👟', '10 000 pas', 'Fais 10 000 pas en une journée', (c) => c.steps10k >= 1],
  ['sleep7', '😴', 'Gros dormeur', '7 nuits de 7 h ou plus', (c) => c.sleep7 >= 7],
  ['meals7', '🥗', 'Assiette suivie', 'Note tes repas 7 jours', (c) => c.meals >= 7],
  ['weight4', '⚖️', 'Suivi du poids', 'Pèse-toi 4 fois', (c) => c.weights >= 4],
  ['scan1', '✨', 'Premier scan', 'Fais ton premier scan de peau', (c) => c.scans >= 1],
  ['scan3', '🔍', 'Peau suivie', 'Fais 3 scans de peau', (c) => c.scans >= 3],
  ['skin_up', '🌟', 'Peau en progrès', 'Améliore ton score de skincare', (c) => c.skinUp],
  ['review1', '📊', 'Premier bilan', 'Reçois ton premier bilan de la semaine', (c) => c.reviews >= 1],
];

function checkBadges() {
  if (!S.profile) return;
  const { c } = xpStats();
  S.badges = S.badges || {};
  const fresh = BADGES.filter(([id, , , , ok]) => ok(c) && !S.badges[id]);
  if (!fresh.length) return;
  fresh.forEach(([id]) => { S.badges[id] = today(); });
  saveQuiet(); schedulePush();
  const [, ico, name] = fresh[0];
  setTimeout(() => toast(`${ico} Nouveau badge : ${name}${fresh.length > 1 ? ` (+${fresh.length - 1})` : ''}`), 600);
}

function levelChip() {
  const s = xpStats();
  const pct = s.next ? (s.xp - s.min) / (s.next - s.min) : 1;
  return `<div class="level-chip tap" data-act="go" data-to="progres"><span class="lv-ico">${s.icon}</span><div class="grow"><div class="row between"><b class="small">Niveau ${s.level} · ${s.name}</b><span class="xs muted">${fmt(s.xp)} XP</span></div>${bar(pct, 'var(--accent)')}</div><span class="dim">›</span></div>`;
}

function skinHistory() {
  const h = [...(S.skin.history || [])];
  const r = S.skin.result;
  if (r && !h.some((x) => x.date === r.date)) h.push({ date: r.date, score: r.score, n: r.concerns.length, type: r.type });
  return h.sort((a, b) => (a.date < b.date ? -1 : 1));
}

function viewProgres() {
  const s = xpStats();
  const pct = s.next ? (s.xp - s.min) / (s.next - s.min) : 1;
  const got = BADGES.filter(([id]) => S.badges?.[id]);
  const hist = skinHistory();
  // Séances par semaine, 8 dernières semaines
  const mon = mondayOf();
  const weeks = Array.from({ length: 8 }, (_, i) => addDays(mon, (i - 7) * 7));
  const perWeek = weeks.map((m) => Array.from({ length: 7 }, (_, j) => peekDay(addDays(m, j))).filter((d) => d.workout).length);
  const skinPts = hist.slice(-10).map((x) => ({ v: x.score, l: shortDate(x.date) }));
  const firstS = hist[0], lastS = hist[hist.length - 1];
  const w = S.weights.slice(-12).map((x) => ({ v: x.kg, l: shortDate(x.date) }));
  return `<div class="view">${header('Ma progression', { back: 'home' })}
    <div class="card level-hero center"><div style="font-size:48px">${s.icon}</div><div class="xs upper muted" style="margin-top:6px">Niveau ${s.level}</div><h1 style="margin-top:2px">${s.name}</h1>
      <div style="margin-top:14px">${bar(pct, 'var(--accent)')}</div>
      <p class="small muted" style="margin-top:8px">${fmt(s.xp)} XP${s.next ? ` · encore ${fmt(s.next - s.xp)} XP pour devenir <b>${s.nextName}</b>` : ' · niveau maximum atteint 👑'}</p></div>

    <div class="section card"><h3>Gagne des XP</h3><div class="col" style="margin-top:10px;gap:0">${D.XP_RULES.map(([i, l, v]) => `<div class="food-item"><span>${i}</span><div class="grow small">${l}</div><b class="small" style="color:var(--accent)">+${v} XP</b></div>`).join('')}</div></div>

    <div class="section"><div class="section-title"><h2>Badges</h2><span class="small muted">${got.length} / ${BADGES.length}</span></div>
      <div class="badge-grid">${BADGES.map(([id, ico, name, how]) => { const on = S.badges?.[id]; return `<div class="badge ${on ? 'on' : ''}"><div class="b-ico">${on ? ico : '🔒'}</div><b class="xs">${name}</b><span class="xs muted">${on ? `le ${shortDate(on)}` : how}</span></div>`; }).join('')}</div></div>

    <div class="section card"><h3>🏋️ Séances par semaine</h3><p class="xs muted" style="margin-top:3px">Les 8 dernières semaines · objectif ${S.profile.days} par semaine</p>
      <div style="margin-top:12px">${barChart(perWeek, weeks.map((m) => String(parseKey(m).getDate())), { color: 'var(--accent)', target: Number(S.profile.days), fmtTop: (v) => v })}</div></div>

    <div class="section card"><h3>✨ Ma peau</h3>
      ${hist.length >= 2 ? `<p class="small muted" style="margin-top:4px">Score de skincare : <b style="color:var(--text)">${firstS.score} → ${lastS.score}</b>${lastS.score > firstS.score ? ' 📈' : ''} · problèmes repérés : ${firstS.n} → ${lastS.n}</p><div style="margin-top:12px">${lineChart(skinPts, { color: 'var(--skin)' })}</div>`
        : hist.length === 1 ? `<p class="small muted" style="margin-top:6px;line-height:1.5">Premier scan : ${lastS.score}/100. Refais un scan dans 3 à 4 semaines pour voir ton évolution.</p><button class="btn sm block" style="margin-top:10px" data-act="go" data-to="peau">Aller au scan</button>`
        : `<p class="small muted" style="margin-top:6px">Fais ton premier scan pour suivre l'évolution de ta peau.</p><button class="btn sm block" style="margin-top:10px" data-act="go" data-to="peau">Faire mon scan</button>`}</div>

    ${w.length >= 2 ? `<div class="section card"><h3>⚖️ Mon poids</h3><p class="small muted" style="margin-top:4px">${String(w[0].v).replace('.', ',')} kg → <b style="color:var(--text)">${String(w[w.length - 1].v).replace('.', ',')} kg</b></p><div style="margin-top:12px">${lineChart(w)}</div></div>` : ''}
  </div>`;
}

Object.assign(A, {
  'fact-next': () => { ui.factShift = (ui.factShift || 0) + 1; rerender(); },
  'fact-cat': (el) => { ui.factCat = el.dataset.v || null; rerender(); },
});

/* ---------- Détail des calculs (transparence) ---------- */
function calcDetails(t, p) {
  const w = S.profile ? currentWeight() : Number(p.weight);
  const act = D.ACTIVITY[String(p.activity)]?.label || '';
  const goalTxt = t.delta < 0 ? `déficit de ${fmt(-t.delta)} kcal pour perdre du poids en douceur` : t.delta > 0 ? `surplus de ${fmt(t.delta)} kcal pour ${p.goal === 'prise_masse' ? 'prendre de la masse' : 'construire du muscle'}` : 'maintien (pas de déficit ni de surplus)';
  return `<details class="calc"><summary>Comment c'est calculé ?</summary>
    <ul class="list-plain" style="margin-top:10px">
      <li><b>Métabolisme de base :</b> ${fmt(t.bmr)} kcal (formule de Mifflin-St Jeor : sexe, âge, taille, poids).</li>
      <li><b>Dépense du jour :</b> × ${String(t.pal).replace('.', ',')} (${act.toLowerCase()} + ${p.days} séance${p.days > 1 ? 's' : ''}/semaine) = <b>${fmt(t.tdee)} kcal</b>.</li>
      <li><b>Objectif :</b> ${goalTxt} → <b>${fmt(t.kcal)} kcal</b>.</li>
      <li><b>Protéines :</b> ${String(t.protPerKg).replace('.', ',')} g × ${t.refW} kg${t.refW < Math.round(w) ? ' (poids de référence)' : ''} = ${t.prot} g. Lipides ≈ 27 % des calories, glucides = le reste.</li>
      <li><b>Eau à boire :</b> ${t.perKg} ml par kilo${t.refW < Math.round(w) ? ' (poids corrigé)' : ''} = ${(t.waterBase / 1000).toFixed(1).replace('.', ',')} L, +0,5 L les jours de sport${['DZ', 'MA', 'TN', 'SN', 'CI'].includes(p.country) ? ', +0,3 L de juin à septembre (chaleur)' : ''}. C'est l'eau à <b>boire</b> (eau, thé, lait…) : l'eau des aliments et des soupes s'ajoute en plus. Repère officiel (EFSA) : environ 2 L de boissons par jour pour un homme, 1,6 L pour une femme.</li>
    </ul></details>`;
}
if (!S.settings?.keepSkinPhotos && S.skin?.photos?.length) { S.skin.photos = []; save(); }
onSave(() => schedulePush());
render();
initCloud(() => rerender());
