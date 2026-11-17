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

const SKIN_SYSTEM = `Tu es l'assistant skincare d'All In. Tu donnes des conseils COSMÉTIQUES, tu n'es pas dermatologue et tu ne poses aucun diagnostic médical.
On t'envoie une photo de visage (selfie) et les réponses de la personne à un questionnaire.
- Décris uniquement l'état visible de la peau : brillance, boutons, points noirs/pores, rougeurs, sécheresse, taches, ridules, cernes, teint terne.
- Ne commente jamais la beauté, les traits, l'âge, le poids, l'origine ou la couleur de peau.
- Zones possibles : front, nez, joue_g (joue gauche sur la photo), joue_d, menton, yeux.
- Si la photo est floue, trop sombre, sans visage ou maquillée au point d'empêcher l'analyse, mets quality à "bad" et explique pourquoi dans qualityNote.
- Sois prudent : n'indique un problème que s'il est réellement visible. En cas de doute, ne le signale pas.
- seeDoctor = true seulement si tu vois une lésion inhabituelle (grain de beauté irrégulier, plaie, lésion qui saigne, éruption étendue ou inflammatoire importante).
- tips : 3 ou 4 conseils concrets, en français, tutoiement, basés sur ingrédients et gestes (pas de marques).`;

const MEAL_SYSTEM = `Tu es le module nutrition d'All In. On t'envoie la photo d'un repas.
Identifie chaque aliment visible et estime une portion réaliste (en grammes) puis ses calories, protéines (p), glucides (g) et lipides (l). Pense aux plats maghrébins et français courants (couscous, chorba, tajine, msemen, kesra, loubia, etc.) et à l'huile de cuisson.
Si l'image ne montre pas de nourriture, mets isFood à false et items vide.
Le champ comment donne en une phrase un conseil bienveillant pour équilibrer ce repas, en français, tutoiement, sans culpabiliser.`;

const S = (type, extra = {}) => ({ type, ...extra });
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
    },
    required: ['quality', 'skinType', 'observations', 'summary', 'tips', 'seeDoctor'],
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
  const models = [process.env.GEMINI_MODEL || 'gemini-2.5-flash', 'gemini-flash-latest'];
  let lastErr;
  for (const model of [...new Set(models)]) {
    const generationConfig = { temperature, maxOutputTokens: 2048 };
    if (schema) { generationConfig.responseMimeType = 'application/json'; generationConfig.responseSchema = schema; }
    if (model.startsWith('gemini-2.5-flash')) generationConfig.thinkingConfig = { thinkingBudget: 0 };
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents,
        generationConfig,
        safetySettings: ['HARM_CATEGORY_HARASSMENT', 'HARM_CATEGORY_HATE_SPEECH', 'HARM_CATEGORY_SEXUALLY_EXPLICIT', 'HARM_CATEGORY_DANGEROUS_CONTENT'].map((category) => ({ category, threshold: 'BLOCK_MEDIUM_AND_ABOVE' })),
      }),
    });
    if (r.status === 404) { lastErr = { status: 404, msg: `Modèle ${model} introuvable` }; continue; }
    if (r.status === 429) throw { status: 429, msg: 'Quota Gemini atteint. Réessaie dans un moment.' };
    if (!r.ok) throw { status: 502, msg: `Erreur Gemini (${r.status})`, detail: (await r.text()).slice(0, 300) };
    const data = await r.json();
    const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';
    if (!text) throw { status: 502, msg: 'Réponse vide de l\'IA', detail: data.promptFeedback?.blockReason || data.candidates?.[0]?.finishReason };
    return schema ? JSON.parse(text) : text.trim();
  }
  throw lastErr || { status: 502, msg: 'Aucun modèle disponible' };
}

const img = (b64) => ({ inline_data: { mime_type: 'image/jpeg', data: String(b64).replace(/^data:image\/\w+;base64,/, '') } });
const ctxText = (c) => `Contexte utilisateur (données de l'appli, JSON) :\n${JSON.stringify(c || {}).slice(0, 6000)}`;

export default async function handler(req, res) {
  cors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
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
    } else if (body.task === 'brief') {
      out = await gemini({ system: BRIEF_SYSTEM, schema: SCHEMAS.brief, contents: [{ role: 'user', parts: [{ text: ctxText(body.context) }] }], temperature: 0.8 });
    } else if (body.task === 'skin') {
      if (!body.image) return res.status(400).json({ error: 'Photo manquante' });
      out = await gemini({ system: SKIN_SYSTEM, schema: SCHEMAS.skin, temperature: 0.2, contents: [{ role: 'user', parts: [{ text: `Réponses au questionnaire : ${JSON.stringify(body.answers || {}).slice(0, 2000)}\nAnalyse cette photo.` }, img(body.image)] }] });
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
