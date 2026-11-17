/* ============================================================
   ALL IN — Comptes (Firebase Auth), synchronisation (Firestore) et appels IA
   Principe : l'appli reste « local d'abord ». Le téléphone garde tout ;
   quand on est connecté, les changements sont envoyés au cloud en arrière-plan
   et récupérés sur les autres appareils.
   Les photos de peau ne quittent jamais le téléphone (sauf envoi ponctuel à l'IA).
   ============================================================ */
import { FIREBASE_CONFIG, API_URL, FIREBASE_SDK } from './config.js';
import { S, saveQuiet } from './core.js';

export const cloud = { enabled: !!FIREBASE_CONFIG, ready: !FIREBASE_CONFIG, user: null, syncing: false, lastSync: 0, error: '' };
let fb = null;
let onChangeCb = () => {};
let pushT = null;

// Mode test (uniquement sur localhost) : simule un compte et l'IA
const MOCK = location.hostname === 'localhost' && localStorage.getItem('allin_mock') === '1';

/* ---------- Initialisation ---------- */
export async function initCloud(onChange) {
  onChangeCb = onChange || onChangeCb;
  if (MOCK) {
    cloud.enabled = true; cloud.ready = true;
    cloud.user = localStorage.getItem('allin_mock_user') ? { uid: 'mock', email: 'test@all-in.app', name: 'Test' } : null;
    onChangeCb(); return;
  }
  if (!FIREBASE_CONFIG) return;
  try {
    const base = `https://www.gstatic.com/firebasejs/${FIREBASE_SDK}/`;
    const [appM, A, F] = await Promise.all([import(base + 'firebase-app.js'), import(base + 'firebase-auth.js'), import(base + 'firebase-firestore.js')]);
    const app = appM.initializeApp(FIREBASE_CONFIG);
    const auth = A.getAuth(app);
    auth.languageCode = 'fr';
    const db = F.initializeFirestore(app, { localCache: F.memoryLocalCache() });
    fb = { auth, db, A, F };
    A.getRedirectResult(auth).catch(() => {});
    A.onAuthStateChanged(auth, async (u) => {
      cloud.user = u ? { uid: u.uid, email: u.email, name: u.displayName } : null;
      cloud.ready = true;
      if (u) await pullAndMerge();
      onChangeCb();
    });
  } catch (e) {
    cloud.enabled = false; cloud.ready = true;
    cloud.error = 'Connexion au cloud impossible (hors ligne ?)';
    onChangeCb();
  }
}

/* ---------- Authentification ---------- */
const ERRORS = {
  'auth/invalid-email': 'Adresse e-mail invalide.',
  'auth/missing-password': 'Entre un mot de passe.',
  'auth/weak-password': 'Mot de passe trop court (6 caractères minimum).',
  'auth/email-already-in-use': 'Un compte existe déjà avec cet e-mail. Connecte-toi.',
  'auth/invalid-credential': 'E-mail ou mot de passe incorrect.',
  'auth/wrong-password': 'E-mail ou mot de passe incorrect.',
  'auth/user-not-found': 'Aucun compte avec cet e-mail.',
  'auth/too-many-requests': 'Trop de tentatives. Réessaie dans quelques minutes.',
  'auth/network-request-failed': 'Pas de connexion internet.',
  'auth/popup-closed-by-user': 'Connexion Google annulée.',
  'auth/unauthorized-domain': 'Ce site n\'est pas encore autorisé dans Firebase (domaines autorisés).',
  'auth/operation-not-allowed': 'Ce mode de connexion n\'est pas activé dans Firebase.',
};
export const authError = (e) => ERRORS[e?.code] || e?.message || 'Erreur inconnue.';

export async function signUp(email, pass) {
  if (MOCK) return mockLogin();
  await fb.A.createUserWithEmailAndPassword(fb.auth, email, pass);
}
export async function signIn(email, pass) {
  if (MOCK) return mockLogin();
  await fb.A.signInWithEmailAndPassword(fb.auth, email, pass);
}
export async function signInGoogle() {
  if (MOCK) return mockLogin();
  const provider = new fb.A.GoogleAuthProvider();
  const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  if (standalone) return fb.A.signInWithRedirect(fb.auth, provider);
  try { await fb.A.signInWithPopup(fb.auth, provider); }
  catch (e) {
    if (['auth/popup-blocked', 'auth/operation-not-supported-in-this-environment', 'auth/cancelled-popup-request'].includes(e.code)) return fb.A.signInWithRedirect(fb.auth, provider);
    throw e;
  }
}
export async function resetPassword(email) {
  if (MOCK) return;
  await fb.A.sendPasswordResetEmail(fb.auth, email);
}
export async function signOutUser() {
  if (MOCK) { localStorage.removeItem('allin_mock_user'); cloud.user = null; onChangeCb(); return; }
  await fb.A.signOut(fb.auth);
}
function mockLogin() {
  localStorage.setItem('allin_mock_user', '1');
  cloud.user = { uid: 'mock', email: 'test@all-in.app', name: 'Test' };
  onChangeCb();
}

/* ---------- Synchronisation ---------- */
const syncKey = () => `allin_sync_${cloud.user?.uid}`;
const loadSync = () => { try { return JSON.parse(localStorage.getItem(syncKey())) || { main: '', mainAt: 0, days: {} }; } catch { return { main: '', mainAt: 0, days: {} }; } };
const storeSync = (s) => { try { localStorage.setItem(syncKey(), JSON.stringify(s)); } catch { /* plein */ } };

function mainPayload() {
  const { photos, ...skin } = S.skin || {};
  return { profile: S.profile, weights: S.weights, skin, settings: S.settings || {}, coach: (S.coach || []).slice(-40), brief: S.brief || null };
}
const dayStr = (d) => { const { u, ...rest } = d; return JSON.stringify(rest); };
const isEmptyDay = (d) => !d || (!d.water && !d.steps && !(d.meals || []).length && !d.sleep && !d.workout);

function mergeDays(a, b) {
  // Fusion champ par champ quand le même jour a changé sur deux appareils
  const key = (m) => `${m.at || ''}|${m.n}|${m.k}|${m.meal}`;
  const meals = [...(a.meals || [])];
  (b.meals || []).forEach((m) => { if (!meals.some((x) => key(x) === key(m))) meals.push(m); });
  return { ...b, ...a, water: Math.max(a.water || 0, b.water || 0), steps: Math.max(a.steps || 0, b.steps || 0), meals, sleep: a.sleep || b.sleep || null, workout: a.workout || b.workout || null };
}

export async function pullAndMerge() {
  if (MOCK || !fb || !cloud.user) return;
  const { db, F } = fb;
  const uid = cloud.user.uid;
  cloud.syncing = true; onChangeCb();
  try {
    const sync = loadSync();
    const mainSnap = await F.getDoc(F.doc(db, 'users', uid));
    const daysSnap = await F.getDocs(F.collection(db, 'users', uid, 'days'));
    // Données principales (profil, pesées, peau, coach)
    if (mainSnap.exists()) {
      const r = mainSnap.data();
      const localDirty = JSON.stringify(mainPayload()) !== sync.main;
      const remoteChanged = (r.mainAt || 0) > (sync.mainAt || 0);
      if (!S.profile || (remoteChanged && (!localDirty || !sync.main))) {
        if (r.profile) S.profile = r.profile;
        const byDate = {};
        [...(S.weights || []), ...(r.weights || [])].forEach((w) => { byDate[w.date] = w; });
        (r.weights || []).forEach((w) => { byDate[w.date] = w; });
        S.weights = Object.values(byDate).sort((x, y) => x.date.localeCompare(y.date));
        S.skin = { ...S.skin, ...(r.skin || {}), photos: S.skin?.photos || [] };
        S.settings = r.settings || S.settings || {};
        S.coach = r.coach || S.coach || [];
        if (r.brief) S.brief = r.brief;
        sync.main = JSON.stringify(mainPayload());
        sync.mainAt = r.mainAt || 0;
      }
    }
    // Jours
    daysSnap.forEach((snap) => {
      const k = snap.id, r = snap.data();
      const local = S.days[k];
      const prev = sync.days[k] || ['', 0];
      const localDirty = local && dayStr(local) !== prev[0];
      const remoteChanged = (r.u || 0) > (prev[1] || 0);
      if (isEmptyDay(local) || (remoteChanged && !localDirty)) S.days[k] = r;
      else if (remoteChanged && localDirty) S.days[k] = mergeDays(local, r);
      if (remoteChanged) sync.days[k] = [S.days[k] === r ? dayStr(r) : prev[0], r.u || 0];
    });
    storeSync(sync);
    saveQuiet();
    await push();
  } catch (e) {
    cloud.error = 'Synchronisation impossible pour le moment.';
    console.warn(e);
  } finally {
    cloud.syncing = false; onChangeCb();
  }
}

export function schedulePush() {
  if (!cloud.user || MOCK) return;
  clearTimeout(pushT);
  pushT = setTimeout(() => push().catch((e) => console.warn(e)), 1500);
}

export async function push() {
  if (MOCK || !fb || !cloud.user || !S.profile) return;
  const { db, F } = fb;
  const uid = cloud.user.uid;
  const sync = loadSync();
  const batch = F.writeBatch(db);
  let n = 0;
  const now = Date.now();
  const main = mainPayload();
  const mainS = JSON.stringify(main);
  if (mainS !== sync.main) { batch.set(F.doc(db, 'users', uid), { ...main, mainAt: now, email: cloud.user.email || '' }); sync.main = mainS; sync.mainAt = now; n++; }
  for (const [k, d] of Object.entries(S.days)) {
    if (isEmptyDay(d) && !sync.days[k]) continue;
    const s = dayStr(d);
    if (s !== (sync.days[k] || [''])[0]) {
      d.u = now;
      batch.set(F.doc(db, 'users', uid, 'days', k), JSON.parse(JSON.stringify(d)));
      sync.days[k] = [s, now];
      if (++n >= 450) break;
    }
  }
  if (!n) { cloud.lastSync = now; return; }
  await batch.commit();
  storeSync(sync);
  saveQuiet();
  cloud.lastSync = now; cloud.error = '';
}

/* ---------- Appels IA ---------- */
export async function ai(task, payload = {}) {
  if (!cloud.user) { const e = new Error('Connecte-toi pour utiliser l\'IA.'); e.code = 'login'; throw e; }
  if (MOCK) return mockAi(task, payload);
  const token = await fb.auth.currentUser.getIdToken();
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 60000);
  try {
    const r = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ task, ...payload }), signal: ctrl.signal });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error || `Erreur ${r.status}`);
    return data;
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('L\'IA met trop de temps à répondre. Réessaie.');
    if (e instanceof TypeError) throw new Error('Impossible de joindre le serveur IA. Vérifie ta connexion.');
    throw e;
  } finally { clearTimeout(t); }
}

async function mockAi(task, p) {
  await new Promise((r) => setTimeout(r, 400));
  if (task === 'brief') return { title: 'Garde le rythme', message: `Tu as bu ${p.context?.aujourdhui?.eau_ml ?? 0} ml d'eau. Ta séance du jour t'attend.`, action: 'Bois 2 verres d\'eau avant midi' };
  if (task === 'coach') return { text: 'Bonne question ! Voici ce que je te propose :\n- **Échauffe-toi** 5 min\n- Fais 3 séries de squats\n- Bois un grand verre d\'eau' };
  if (task === 'skin') return { quality: 'good', qualityNote: '', skinType: 'mixte', observations: [{ zone: 'nez', issue: 'points', level: 'modéré', note: 'Pores dilatés sur le nez' }, { zone: 'front', issue: 'brillance', level: 'léger', note: '' }], summary: 'Peau plutôt mixte avec quelques points noirs sur le nez.', tips: ['Utilise un BHA 2 à 3 soirs par semaine', 'Garde un hydratant léger'], seeDoctor: false, seeDoctorReason: '', products: [] };
  const prods = [
    { etape: 'Nettoyant', marque: 'La Roche-Posay', produit: 'Effaclar Gel moussant purifiant', pourquoi: 'Nettoie sans dessécher ta peau mixte.', prix: 'env. 15 €', ou: 'pharmacie', budget: 'moyen' },
    { etape: 'Protection solaire', marque: 'Garnier', produit: 'Ambre Solaire Super UV fluide SPF 50+', pourquoi: 'Texture légère qui ne brille pas.', prix: 'env. 12 €', ou: 'grande surface', budget: 'petit prix' },
  ];
  if (task === 'products') return { products: prods };
  if (task === 'meal') return { isFood: true, items: [{ name: 'Couscous au poulet', portion: '1 assiette', grams: 350, kcal: 560, p: 32, g: 70, l: 15 }, { name: 'Salade verte', portion: '1 bol', grams: 80, kcal: 25, p: 1, g: 4, l: 0 }], comment: 'Bon équilibre, ajoute un fruit en dessert.' };
  return {};
}
