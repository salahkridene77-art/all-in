/* ============================================================
   ALL IN — Serveur IA (fonction Vercel)
   - Vérifie que l'utilisateur est connecté (jeton Firebase)
   - Appelle Gemini avec la clé gardée secrète côté serveur
   Tâches : coach (discussion), brief (message du jour), skin (photo de peau), meal (photo de repas)
   Variables d'environnement :
     GEMINI_API_KEY      (obligatoire)
     FIREBASE_PROJECT_ID (obligatoire)
     GEMINI_MODEL        (facultatif, défaut gemini-2.5-flash)
     DAILY_LIMIT         (facultatif, défaut 60 requêtes / utilisateur / jour)
     ALLOWED_ORIGINS     (facultatif, liste séparée par des virgules)
   ============================================================ */
import { createRemoteJWKSet, jwtVerify } from 'jose';

const JWKS = createRemoteJWKSet(new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'));
const DEFAULT_ORIGINS = ['https://salahkridene77-art.github.io', 'http://localhost:8765'];
const usage = new Map(); // limite simple par instance

const ZONES = ['front', 'nez', 'joue_g', 'joue_d', 'menton', 'yeux'];
const ISSUES = ['brillance', 'boutons', 'points', 'rougeurs', 'secheresse', 'taches', 'rides', 'cernes', 'terne'];
const TYPES = ['grasse', 'mixte', 'seche', 'normale', 'sensible'];

const SAFETY = `Règles de sécurité, toujours prioritaires :
- Tu n'es ni médecin ni diététicien : jamais de diagnostic, jamais de traitement médicamenteux.
- Douleur dans la poitrine, malaise, essoufflement anormal, blessure, douleur vive ou qui dure, grossesse, maladie chronique : conseille d'arrêter et de consulter un médecin.
- Jamais de régime sous 1200 kcal/jour pour une femme ou 1500 kcal/jour pour un homme, jamais de jeûne extrême, de « sèche » express, de produits dopants, stéroïdes, coupe-faim ou laxatifs.
- Si la personne montre des signes de rapport difficile à la nourriture ou à son corps (peur de manger, culpabilité, se faire vomir, compenser par le sport), réponds avec douceur, sans chiffres de calories ni de poids, et encourage-la à en parler à un professionnel de santé.
- Ne juge jamais le physique de la personne.`;

const COACH_SYSTEM = `Tu es le coach d'All In, une appli de sport, nutrition, sommeil, hydratation et skincare.
Tu tutoies, tu es motivant, chaleureux et très concret. Tu réponds dans la langue de l'utilisateur (français par défaut).
Réponses courtes et lisibles sur téléphone : 120 mots maximum sauf si on te demande un programme détaillé ; listes courtes avec « - » ; **gras** pour l'essentiel ; pas de titres.
Appuie-toi sur les données de l'utilisateur fournies dans le contexte (objectif, cibles, eau, pas, sommeil, repas, séance du jour) et cite-les quand c'est utile.
Si on te demande d'adapter une séance, propose une version concrète (exercices, séries, répétitions) faisable avec le lieu indiqué (maison ou salle).
${SAFETY}`;

const BRIEF_SYSTEM = `Tu es le coach d'All In. Rédige le brief du jour de l'utilisateur à partir de ses données : un titre de 2 à 5 mots, un message de 2 phrases maximum qui relie ses chiffres récents (sommeil, eau, pas, séance, nutrition) à ce qu'il doit faire aujourd'hui, et UNE action prioritaire très concrète. Tutoiement, ton motivant, en français.
${SAFETY}`;

const WEEKLY_SYSTEM = `Tu es le coach d'All In. Rédige le bilan de la semaine écoulée de l'utilisateur à partir de ses données (séances faites, eau, sommeil, pas, calories, poids, retours sur les exercices).
- titre : 3 à 6 mots, positif et honnête.
- resume : 2 phrases qui racontent la semaine avec ses vrais chiffres.
- points_forts : 2 ou 3 réussites concrètes (avec chiffres quand c'est possible).
- a_ameliorer : 1 ou 2 points, formulés avec bienveillance, sans culpabiliser.
- objectifs : exactement 3 objectifs précis et mesurables pour la semaine qui vient, adaptés à son objectif.
Tutoiement, en français, ton motivant.
${SAFETY}`;

const SKIN_SYSTEM = `Tu es l'assistant skincare d'All In. Tu donnes des conseils COSMÉTIQUES, tu n'es pas dermatologue et tu ne poses aucun diagnostic médical.
On t'envoie une photo de visage (selfie), le sexe et l'âge de la personne, et son pays.
- Décris uniquement l'état visible de la peau : brillance, boutons, points noirs/pores, rougeurs, sécheresse, taches, ridules, cernes, teint terne.
- Ne commente jamais la beauté, les traits, l'âge, le poids, l'origine ou la couleur de peau.
- C'est TOI qui repères les problèmes : observe attentivement chaque zone (front, nez, joues, menton, contour des yeux) et liste ce que tu vois réellement, avec son intensité.
- Zones possibles : front, nez, joue_g (joue gauche sur la photo), joue_d, menton, yeux.
- Si la photo est floue, trop sombre, sans visage ou maquillée au point d'empêcher l'analyse, mets quality à "bad" et explique pourquoi dans qualityNote.
- Sois prudent : n'indique un problème que s'il est réellement visible. En cas de doute, ne le signale pas.
- seeDoctor = true seulement si tu vois une lésion inhabituelle (grain de beauté irrégulier, plaie, lésion qui saigne, éruption étendue ou inflammatoire importante).
- tips : 3 ou 4 conseils concrets, en français, tutoiement, basés sur ingrédients et gestes (pas de marques).`;

const PRODUCT_RULES = (country) => `Produits à recommander (champ products) :
- Pays de l'utilisateur : ${country?.label || 'France'}. Propose 5 ou 6 produits RÉELS, vendus couramment dans ce pays (pharmacie, parapharmacie, grande surface ou boutique en ligne locale fiable), adaptés au type de peau et aux préoccupations.
- Couvre la routine : un nettoyant, un hydratant, une protection solaire, puis 1 à 3 soins ciblés (sérum, traitement, contour des yeux ou masque) selon les besoins.
- Varie les budgets et inclus au moins deux produits « petit prix ». Champ budget : « petit prix », « moyen » ou « premium ».
- Champ prix : un prix approximatif en ${country?.currency || 'monnaie locale'} (ex. « env. 1 800 DA », « env. 15 € »). Champ ou : où l'acheter dans ce pays (ex. « pharmacie », « parapharmacie », « grande surface »).
- N'invente jamais un produit : ne cite que des produits dont tu es certain qu'ils existent. Si tu doutes du nom exact, cite la gamme de la marque (ex. « gamme Effaclar »). Privilégie les marques réellement distribuées dans ce pays.
- Jamais de médicament ni de produit sur ordonnance (trétinoïne, isotrétinoïne, antibiotiques, hydroquinone, corticoïdes).
- Champ pourquoi : une phrase simple, en français, avec tutoiement, qui relie le produit à la peau de la personne.

Ingrédients (champs privilegier et eviter) :
- privilegier : 3 à 5 ingrédients actifs vraiment utiles pour CETTE peau (ingredient : nom court comme « Niacinamide » ou « Acide salicylique » ; pourquoi : une phrase simple). Pas d'ingrédients contradictoires entre eux.
- eviter : 3 à 5 ingrédients ou types de produits à éviter pour cette peau (quoi, pourquoi, exemples : les types de produits courants dans ce pays qui en contiennent souvent, par exemple « savons solides classiques, gommages aux grains » — SANS citer de marque).
- Chaque produit recommandé doit contenir au moins un ingrédient de privilegier : liste-les dans contient en reprenant EXACTEMENT les mêmes noms. Aucun produit ne doit contenir un élément de eviter.`;

const PRODUCTS_SYSTEM = `Tu es l'assistant skincare d'All In (conseils COSMÉTIQUES, pas médicaux). On te donne le profil de peau d'une personne et son pays : recommande-lui des produits adaptés et disponibles chez elle.`;

const MEAL_SYSTEM = `Tu es le module nutrition d'All In. On t'envoie la photo d'un repas.
Identifie chaque aliment visible et estime une portion réaliste (en grammes) puis ses calories, protéines (p), glucides (g) et lipides (l). Pense aux plats maghrébins et français courants (couscous, chorba, tajine, msemen, kesra, loubia, etc.) et à l'huile de cuisson.
Si l'image ne montre pas de nourriture, mets isFood à false et items vide.
Le champ comment donne en une phrase un conseil bienveillant pour équilibrer ce repas, en français, tutoiement, sans culpabiliser.`;

const S = (type, extra = {}) => ({ type, ...extra });
const PRODUCT_LIST = S('ARRAY', { items: S('OBJECT', {
  properties: {
    etape: S('STRING', { enum: ['Nettoyant', 'Sérum', 'Traitement', 'Contour des yeux', 'Hydratant', 'Protection solaire', 'Masque'] }),
    marque: S('STRING'), produit: S('STRING'), contient: S('ARRAY', { items: S('STRING') }), pourquoi: S('STRING'), prix: S('STRING'), ou: S('STRING'),
    budget: S('STRING', { enum: ['petit prix', 'moyen', 'premium'] }),
  },
  required: ['etape', 'marque', 'produit', 'contient', 'pourquoi', 'prix', 'ou', 'budget'],
}) });
const INGR = {
  privilegier: S('ARRAY', { items: S('OBJECT', { properties: { ingredient: S('STRING'), pourquoi: S('STRING') }, required: ['ingredient', 'pourquoi'] }) }),
  eviter: S('ARRAY', { items: S('OBJECT', { properties: { quoi: S('STRING'), pourquoi: S('STRING'), exemples: S('STRING') }, required: ['quoi', 'pourquoi', 'exemples'] }) }),
};
const SCHEMAS = {
  brief: S('OBJECT', { properties: { title: S('STRING'), message: S('STRING'), action: S('STRING') }, required: ['title', 'message', 'action'] }),
  skin: S('OBJECT', {
    properties: {
      quality: S('STRING', { enum: ['good', 'medium', 'bad'] }),
      qualityNote: S('STRING'),
      skinType: S('STRING', { enum: TYPES }),
      observations: S('ARRAY', { items: S('OBJECT', { properties: { zone: S('STRING', { enum: ZONES }), issue: S('STRING', { enum: ISSUES }), level: S('STRING', { enum: ['léger', 'modéré', 'marqué'] }), note: S('STRING') }, required: ['zone', 'issue', 'level'] }) }),
      summary: S('STRING'),
      tips: S('ARRAY', { items: S('STRING') }),
      seeDoctor: S('BOOLEAN'),
      seeDoctorReason: S('STRING'),
      ...INGR,
      products: PRODUCT_LIST,
    },
    required: ['quality', 'skinType', 'observations', 'summary', 'tips', 'seeDoctor', 'privilegier', 'eviter', 'products'],
  }),
  products: S('OBJECT', { properties: { ...INGR, products: PRODUCT_LIST }, required: ['privilegier', 'eviter', 'products'] }),
  weekly: S('OBJECT', {
    properties: { titre: S('STRING'), resume: S('STRING'), points_forts: S('ARRAY', { items: S('STRING') }), a_ameliorer: S('ARRAY', { items: S('STRING') }), objectifs: S('ARRAY', { items: S('STRING') }) },
    required: ['titre', 'resume', 'points_forts', 'a_ameliorer', 'objectifs'],
  }),
  meal: S('OBJECT', {
    properties: {
      isFood: S('BOOLEAN'),
      items: S('ARRAY', { items: S('OBJECT', { properties: { name: S('STRING'), portion: S('STRING'), grams: S('NUMBER'), kcal: S('NUMBER'), p: S('NUMBER'), g: S('NUMBER'), l: S('NUMBER') }, required: ['name', 'portion', 'kcal', 'p', 'g', 'l'] }) }),
      comment: S('STRING'),
    },
    required: ['isFood', 'items', 'comment'],
  }),
};

function cors(req, res) {
  const allowed = (process.env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
  const list = allowed.length ? allowed : DEFAULT_ORIGINS;
  const origin = req.headers.origin || '';
  const ok = list.includes(origin) || /\.vercel\.app$/.test(origin);
  if (ok) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');
}

async function verifyUser(req) {
  const pid = process.env.FIREBASE_PROJECT_ID;
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!pid || !token) return null;
  try {
    const { payload } = await jwtVerify(token, globalThis.__ALLIN_TEST_JWKS || JWKS, { issuer: `https://securetoken.google.com/${pid}`, audience: pid });
    return payload.sub || null;
  } catch { return null; }
}

function underLimit(uid) {
  const limit = Number(process.env.DAILY_LIMIT || 60);
  const day = new Date().toISOString().slice(0, 10);
  const u = usage.get(uid);
  if (!u || u.day !== day) { usage.set(uid, { day, n: 1 }); return true; }
  if (u.n >= limit) return false;
  u.n++;
  return true;
}

async function gemini({ system, contents, schema, temperature = 0.6 }) {
  const key = process.env.GEMINI_API_KEY;
  // Modèle principal puis modèles de secours (quotas et charge séparés)
  // Modèles testés avec la clé du projet (nov. 2026) : 2.5 fermé aux nouvelles clés, 3.5+ souvent saturés
  const models = [...new Set([process.env.GEMINI_MODEL || 'gemini-3-flash-preview', 'gemini-flash-lite-latest', 'gemini-3.1-flash-lite'])];
  const deadline = Date.now() + 100000;
  let lastErr = { status: 502, msg: 'Aucun modèle disponible' };
  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      if (Date.now() > deadline - 8000) throw { status: 504, msg: 'L\'IA met trop de temps à répondre. Réessaie dans un instant.' };
      const legacy = model.startsWith('gemini-2.5');
      // Gemini 3 : température par défaut recommandée, réflexion courte pour répondre vite
      const generationConfig = { maxOutputTokens: 8192, ...(legacy ? { temperature, thinkingConfig: { thinkingBudget: 0 } } : { thinkingConfig: { thinkingLevel: 'low' } }) };
      if (schema) { generationConfig.responseMimeType = 'application/json'; generationConfig.responseSchema = schema; }
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), Math.min(model === models[0] ? 45000 : 30000, deadline - Date.now()));
      let r;
      try {
        r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
          method: 'POST',
          signal: ctrl.signal,
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: system }] },
            contents,
            generationConfig,
            safetySettings: ['HARM_CATEGORY_HARASSMENT', 'HARM_CATEGORY_HATE_SPEECH', 'HARM_CATEGORY_SEXUALLY_EXPLICIT', 'HARM_CATEGORY_DANGEROUS_CONTENT'].map((category) => ({ category, threshold: 'BLOCK_MEDIUM_AND_ABOVE' })),
          }),
        });
      } catch (e) {
        clearTimeout(timer);
        console.error('Gemini timeout/réseau', model, e?.name);
        lastErr = { status: 504, msg: 'L\'IA met trop de temps à répondre. Réessaie dans un instant.', keep: true };
        break; // modèle suivant
      }
      clearTimeout(timer);
      if (r.status === 404) { console.error('Gemini modèle absent', model); if (lastErr.status === 502 && !lastErr.keep) lastErr = { status: 502, msg: `Modèle ${model} introuvable` }; break; }
      if (r.status === 429) { console.error('Gemini quota', model, (await r.text()).slice(0, 400)); lastErr = { status: 429, msg: 'Quota Gemini atteint. Réessaie dans un moment.', keep: true }; break; }
      if (r.status === 503 || r.status === 500) {
        console.error('Gemini surchargé', model, r.status);
        lastErr = { status: 503, msg: 'L\'IA est très demandée en ce moment. Réessaie dans quelques secondes.', keep: true };
        await new Promise((ok) => setTimeout(ok, 1200 * (attempt + 1)));
        continue; // on réessaie, puis modèle suivant
      }
      if (!r.ok) { const t = (await r.text()).slice(0, 400); console.error('Gemini erreur', model, r.status, t); lastErr = { status: 502, msg: `Erreur Gemini (${r.status})`, keep: true }; break; }
      const data = await r.json();
      const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';
      if (!text) throw { status: 502, msg: 'Réponse vide de l\'IA', detail: data.promptFeedback?.blockReason || data.candidates?.[0]?.finishReason };
      if (!schema) return text.trim();
      try { return JSON.parse(text); }
      catch { console.error('Gemini JSON invalide', model, text.slice(0, 200)); lastErr = { status: 502, msg: 'Réponse de l\'IA incomplète, réessaie.', keep: true }; continue; }
    }
  }
  throw lastErr;
}

const img = (b64) => ({ inline_data: { mime_type: 'image/jpeg', data: String(b64).replace(/^data:image\/\w+;base64,/, '') } });
const ctxText = (c) => `Contexte utilisateur (données de l'appli, JSON) :\n${JSON.stringify(c || {}).slice(0, 6000)}`;

/* Diagnostic (protégé par DIAG_TOKEN) : modèles accessibles avec la clé et test rapide de chacun */
async function diag(res, req) {
  const key = process.env.GEMINI_API_KEY;
  const out = { models: [], tests: {} };
  try {
    const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=200', { headers: { 'x-goog-api-key': key }, signal: AbortSignal.timeout(10000) });
    const j = await r.json();
    out.listStatus = r.status;
    out.models = (j.models || []).filter((m) => (m.supportedGenerationMethods || []).includes('generateContent')).map((m) => m.name.replace('models/', ''));
  } catch (e) { out.listError = String(e); }
  if (req.query?.selftest) {
    // Test réel : petite image grise + format de réponse de l'appli
    const tiny = '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';
    const t0 = Date.now();
    try {
      const kind = req.query.selftest;
      const r = kind === 'weekly'
        ? await gemini({ system: WEEKLY_SYSTEM, schema: SCHEMAS.weekly, contents: [{ role: 'user', parts: [{ text: 'Contexte : objectif masse musculaire, homme 30 ans, 3 séances prévues.\n\nBilan de la semaine : {"seances":"2/3","eau_moyenne_ml":1700,"sommeil_moyen_min":405,"pas_moyens":6200,"kcal_moyennes":2300,"poids_debut":82,"poids_fin":82.4,"retours_exercices":{"trop_dur":1,"parfait":6,"trop_facile":3}}' }] }] })
        : kind === 'products'
        ? await gemini({ system: `${PRODUCTS_SYSTEM}\n\n${PRODUCT_RULES({ label: 'Algérie', currency: 'dinars algériens (DA)' })}`, schema: SCHEMAS.products, contents: [{ role: 'user', parts: [{ text: 'Profil de peau : {"type":"Peau mixte","preoccupations":["Points noirs / pores","Brillance"],"sexe":"homme","age":30}' }] }] })
        : await gemini({ system: `${SKIN_SYSTEM}\n\n${PRODUCT_RULES({ label: 'Algérie', currency: 'dinars algériens (DA)' })}`, schema: SCHEMAS.skin, contents: [{ role: 'user', parts: [{ text: 'Analyse cette photo.' }, img(tiny)] }] });
      return res.status(200).json({ ok: true, ms: Date.now() - t0, keys: Object.keys(r), sample: JSON.stringify(r).slice(0, 900) });
    } catch (e) { return res.status(200).json({ ok: false, ms: Date.now() - t0, err: e?.msg || String(e) }); }
  }
  const cands = req.query?.models ? String(req.query.models).split(',').slice(0, 8) : out.models.filter((m) => /flash/.test(m) && !/image|tts|audio|live|preview-0|exp/.test(m)).slice(0, 8);
  const lvl = req.query?.level;
  await Promise.all(cands.map(async (m) => {
    const t0 = Date.now();
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key }, body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'Donne 5 conseils skincare courts en JSON.' }] }], generationConfig: { maxOutputTokens: 600, responseMimeType: 'application/json', ...(lvl ? { thinkingConfig: { thinkingLevel: lvl } } : {}) } }), signal: AbortSignal.timeout(20000) });
      const txt = await r.text();
      out.tests[m] = { status: r.status, ms: Date.now() - t0, body: r.ok ? '' : txt.slice(0, 220), usage: r.ok ? JSON.parse(txt).usageMetadata : undefined };
    } catch (e) { out.tests[m] = { error: String(e).slice(0, 80), ms: Date.now() - t0 }; }
  }));
  return res.status(200).json(out);
}

export default async function handler(req, res) {
  cors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method === 'GET' && process.env.DIAG_TOKEN && req.query?.diag === process.env.DIAG_TOKEN) return diag(res, req);
  if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée' });
  if (!process.env.GEMINI_API_KEY || !process.env.FIREBASE_PROJECT_ID) return res.status(503).json({ error: 'Serveur IA pas encore configuré (clé Gemini ou projet Firebase manquant).' });

  const uid = await verifyUser(req);
  if (!uid) return res.status(401).json({ error: 'Connecte-toi pour utiliser l\'IA.' });
  if (!underLimit(uid)) return res.status(429).json({ error: 'Limite quotidienne atteinte. Reviens demain 🙂' });

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  try {
    let out;
    if (body.task === 'coach') {
      const history = (body.messages || []).slice(-16).map((m) => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: String(m.text).slice(0, 2000) }] }));
      if (!history.length || history[history.length - 1].role !== 'user') return res.status(400).json({ error: 'Message manquant' });
      const contents = [];
      [{ role: 'user', parts: [{ text: ctxText(body.context) }] }, { role: 'model', parts: [{ text: 'Compris, je m\'appuie sur ces données.' }] }, ...history].forEach((m) => {
        const last = contents[contents.length - 1];
        if (last && last.role === m.role) last.parts[0].text += '\n\n' + m.parts[0].text;
        else contents.push({ role: m.role, parts: [{ text: m.parts[0].text }] });
      });
      out = { text: await gemini({ system: COACH_SYSTEM, contents, temperature: 0.7 }) };
    } else if (body.task === 'weekly') {
      out = await gemini({ system: WEEKLY_SYSTEM, schema: SCHEMAS.weekly, contents: [{ role: 'user', parts: [{ text: `${ctxText(body.context)}\n\nBilan de la semaine : ${JSON.stringify(body.week || {}).slice(0, 4000)}` }] }] });
    } else if (body.task === 'brief') {
      out = await gemini({ system: BRIEF_SYSTEM, schema: SCHEMAS.brief, contents: [{ role: 'user', parts: [{ text: ctxText(body.context) }] }], temperature: 0.8 });
    } else if (body.task === 'skin') {
      if (!body.image) return res.status(400).json({ error: 'Photo manquante' });
      out = await gemini({ system: `${SKIN_SYSTEM}\n\n${PRODUCT_RULES(body.country)}`, schema: SCHEMAS.skin, temperature: 0.2, contents: [{ role: 'user', parts: [{ text: `Réponses au questionnaire : ${JSON.stringify(body.answers || {}).slice(0, 2000)}\nAnalyse cette photo.` }, img(body.image)] }] });
    } else if (body.task === 'products') {
      const exclude = (body.exclude || []).slice(0, 12).join(', ');
      out = await gemini({ system: `${PRODUCTS_SYSTEM}\n\n${PRODUCT_RULES(body.country)}`, schema: SCHEMAS.products, temperature: 0.5, contents: [{ role: 'user', parts: [{ text: `Profil de peau : ${JSON.stringify(body.skin || {}).slice(0, 2500)}${exclude ? `\nPropose des produits différents de : ${exclude}.` : ''}` }] }] });
    } else if (body.task === 'meal') {
      if (!body.image) return res.status(400).json({ error: 'Photo manquante' });
      out = await gemini({ system: MEAL_SYSTEM, schema: SCHEMAS.meal, temperature: 0.2, contents: [{ role: 'user', parts: [{ text: body.note ? `Précision de l'utilisateur : ${String(body.note).slice(0, 300)}` : 'Analyse ce repas.' }, img(body.image)] }] });
    } else {
      return res.status(400).json({ error: 'Tâche inconnue' });
    }
    return res.status(200).json(out);
  } catch (e) {
    console.error('AI error', e?.msg || e, e?.detail || '');
    return res.status(e?.status || 500).json({ error: e?.msg || 'Erreur du serveur IA' });
  }
}
