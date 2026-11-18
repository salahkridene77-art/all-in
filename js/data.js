/* ============================================================
   ALL IN — Données de l'application (V1, sans IA)
   Valeurs nutritionnelles approximatives, à titre indicatif.
   ============================================================ */

export const GOALS = {
  perte_poids: { label: 'Perte de poids', icon: '🔥', desc: 'Brûler du gras tout en gardant le muscle', kcal: -0.20, prot: 1.6, steps: 10000 },
  muscle:      { label: 'Masse musculaire', icon: '💪', desc: 'Se muscler et se dessiner, sans prendre de gras', kcal: 0.0, prot: 1.8, steps: 8000 },
  prise_masse: { label: 'Prise de masse', icon: '🏋️', desc: 'Prendre du poids et du volume', kcal: 0.12, prot: 1.7, steps: 7000 },
  forme:       { label: 'Remise en forme', icon: '⚡', desc: "Retrouver de l'énergie et bouger plus", kcal: 0.0, prot: 1.2, steps: 8000 },
  endurance:   { label: 'Endurance', icon: '🏃', desc: 'Améliorer le cardio et le souffle', kcal: 0.05, prot: 1.4, steps: 10000 },
};

export const LEVELS = {
  1: { label: 'Débutant', desc: "Je reprends ou je n'ai jamais fait de sport" },
  2: { label: 'Intermédiaire', desc: "Je m'entraîne de temps en temps" },
  3: { label: 'Avancé', desc: "Je m'entraîne régulièrement depuis plus d'un an" },
};

export const ACTIVITY = {
  1.2:   { label: 'Sédentaire', desc: 'Travail assis, peu de marche' },
  1.375: { label: 'Légèrement actif', desc: 'Un peu de marche chaque jour' },
  1.55:  { label: 'Actif', desc: 'Debout souvent, travail physique léger' },
  1.725: { label: 'Très actif', desc: 'Travail physique ou beaucoup de marche' },
};

/* ---------- Exercices ----------
   slot : catégorie utilisée par le générateur de programme
   place : maison | salle | both
   lvl : niveau minimum (1-3)
   unit : reps | time | cardio
*/
export const EXERCISES = {
  // Jambes
  squat:        { name: 'Squat au poids du corps', icon: '🦵', slot: 'legs', place: 'maison', lvl: 1, unit: 'reps', muscles: 'Cuisses, fessiers',
    steps: ['Pieds largeur d\'épaules, pointes légèrement ouvertes', 'Descends comme pour t\'asseoir, dos droit, poitrine haute', 'Remonte en poussant dans les talons'], tip: 'Les genoux suivent la direction des pieds, ils ne rentrent pas vers l\'intérieur.' },
  fentes:       { name: 'Fentes alternées', icon: '🚶', slot: 'legs', place: 'both', lvl: 1, unit: 'reps', muscles: 'Cuisses, fessiers, équilibre',
    steps: ['Debout, fais un grand pas en avant', 'Descends jusqu\'à ce que le genou arrière frôle le sol', 'Reviens et change de jambe'], tip: 'Le buste reste droit, le genou avant ne dépasse pas trop la pointe du pied.' },
  chaise:       { name: 'Chaise contre le mur', icon: '🧱', slot: 'legs', place: 'maison', lvl: 1, unit: 'time', muscles: 'Quadriceps',
    steps: ['Dos contre un mur', 'Descends jusqu\'à ce que les cuisses soient parallèles au sol', 'Tiens la position en respirant'], tip: 'Les genoux au-dessus des chevilles, pas plus loin.' },
  squat_saute:  { name: 'Squat sauté', icon: '🦘', slot: 'legs', place: 'maison', lvl: 2, unit: 'reps', muscles: 'Cuisses, fessiers, cardio',
    steps: ['Fais un squat', 'Remonte en sautant de façon explosive', 'Réception souple, enchaîne directement'], tip: 'Atterris sur l\'avant du pied en amortissant avec les genoux.' },
  goblet:       { name: 'Goblet squat (haltère)', icon: '🏺', slot: 'legs', place: 'salle', lvl: 1, unit: 'reps', muscles: 'Cuisses, fessiers, gainage',
    steps: ['Tiens un haltère contre la poitrine', 'Descends en squat profond, coudes entre les genoux', 'Remonte en gardant le dos droit'], tip: 'Excellent pour apprendre le squat avant la barre.' },
  squat_barre:  { name: 'Squat à la barre', icon: '🏋️', slot: 'legs', place: 'salle', lvl: 2, unit: 'reps', muscles: 'Cuisses, fessiers, lombaires',
    steps: ['Barre sur le haut du dos, pieds largeur d\'épaules', 'Inspire, gaine le ventre, descends sous la parallèle si possible', 'Remonte en expirant'], tip: 'Commence léger et soigne la technique avant d\'ajouter du poids.' },
  presse:       { name: 'Presse à cuisses', icon: '🦿', slot: 'legs', place: 'salle', lvl: 1, unit: 'reps', muscles: 'Quadriceps, fessiers',
    steps: ['Pieds au milieu de la plateforme', 'Descends jusqu\'à 90° aux genoux', 'Pousse sans verrouiller les genoux en haut'], tip: 'Le bas du dos reste collé au dossier.' },
  leg_curl:     { name: 'Leg curl (ischios)', icon: '🦵', slot: 'legs', place: 'salle', lvl: 1, unit: 'reps', muscles: 'Ischio-jambiers',
    steps: ['Allongé ou assis sur la machine', 'Ramène les talons vers les fesses', 'Reviens lentement'], tip: 'Contrôle la descente, c\'est là que le muscle travaille le plus.' },

  // Fessiers / chaîne arrière
  pont:         { name: 'Pont fessier', icon: '🌉', slot: 'glutes', place: 'maison', lvl: 1, unit: 'reps', muscles: 'Fessiers, ischios',
    steps: ['Allongé sur le dos, genoux pliés', 'Pousse dans les talons et monte le bassin', 'Serre les fessiers 1 seconde en haut'], tip: 'Ne cambre pas le bas du dos, c\'est le fessier qui pousse.' },
  bulgare:      { name: 'Squat bulgare', icon: '🪑', slot: 'glutes', place: 'both', lvl: 2, unit: 'reps', muscles: 'Fessiers, cuisses',
    steps: ['Pied arrière posé sur une chaise ou un banc', 'Descends sur la jambe avant', 'Remonte, fais toutes les répétitions puis change'], tip: 'Penche légèrement le buste en avant pour cibler les fessiers.' },
  hip_thrust:   { name: 'Hip thrust', icon: '🍑', slot: 'glutes', place: 'salle', lvl: 2, unit: 'reps', muscles: 'Fessiers',
    steps: ['Haut du dos contre un banc, barre sur les hanches', 'Monte le bassin jusqu\'à l\'alignement genoux-hanches-épaules', 'Redescends contrôlé'], tip: 'Menton rentré, regard vers l\'avant.' },
  rdl:          { name: 'Soulevé de terre roumain', icon: '🏗️', slot: 'glutes', place: 'salle', lvl: 2, unit: 'reps', muscles: 'Ischios, fessiers, lombaires',
    steps: ['Barre ou haltères devant les cuisses', 'Recule les hanches, dos plat, jambes presque tendues', 'Remonte en poussant les hanches vers l\'avant'], tip: 'La charge glisse le long des jambes. Dos toujours plat.' },

  // Poussée
  pompes_genoux:{ name: 'Pompes sur les genoux', icon: '🙌', slot: 'push', place: 'maison', lvl: 1, unit: 'reps', muscles: 'Pectoraux, triceps',
    steps: ['Mains un peu plus larges que les épaules, genoux au sol', 'Descends la poitrine vers le sol', 'Pousse pour remonter'], tip: 'Le corps reste aligné des genoux à la tête.' },
  pompes:       { name: 'Pompes', icon: '💪', slot: 'push', place: 'maison', lvl: 2, unit: 'reps', muscles: 'Pectoraux, triceps, épaules',
    steps: ['Planche sur les mains, corps gainé', 'Descends jusqu\'à frôler le sol, coudes à 45°', 'Remonte en poussant fort'], tip: 'Trop dur ? Fais-les sur les genoux ou mains sur une table.' },
  pompes_diam:  { name: 'Pompes diamant', icon: '💎', slot: 'push', place: 'maison', lvl: 3, unit: 'reps', muscles: 'Triceps, pectoraux',
    steps: ['Mains rapprochées, pouces et index forment un losange', 'Descends la poitrine vers les mains', 'Remonte'], tip: 'Coudes près du corps.' },
  dc:           { name: 'Développé couché', icon: '🏋️', slot: 'push', place: 'salle', lvl: 2, unit: 'reps', muscles: 'Pectoraux, triceps, épaules',
    steps: ['Allongé, pieds au sol, omoplates serrées', 'Descends la barre au milieu de la poitrine', 'Pousse en expirant'], tip: 'Utilise un partenaire ou des sécurités quand tu charges lourd.' },
  dev_incline:  { name: 'Développé incliné haltères', icon: '📐', slot: 'push', place: 'salle', lvl: 1, unit: 'reps', muscles: 'Haut des pectoraux, épaules',
    steps: ['Banc incliné à 30°', 'Haltères au niveau de la poitrine', 'Pousse vers le haut en rapprochant les haltères'], tip: 'Descends lentement, en 2 à 3 secondes.' },

  // Épaules
  pike:         { name: 'Pike push-up', icon: '🔺', slot: 'shoulders', place: 'maison', lvl: 2, unit: 'reps', muscles: 'Épaules, triceps',
    steps: ['Position en V inversé, fesses hautes', 'Descends la tête vers le sol entre les mains', 'Pousse pour remonter'], tip: 'Plus les pieds sont proches des mains, plus c\'est dur.' },
  elev_lat_b:   { name: 'Élévations latérales (bouteilles)', icon: '🧴', slot: 'shoulders', place: 'maison', lvl: 1, unit: 'reps', muscles: 'Épaules',
    steps: ['Une bouteille d\'eau pleine dans chaque main', 'Monte les bras sur les côtés jusqu\'aux épaules', 'Redescends lentement'], tip: 'Coudes légèrement fléchis, ne hausse pas les épaules.' },
  dev_mil:      { name: 'Développé militaire haltères', icon: '⬆️', slot: 'shoulders', place: 'salle', lvl: 1, unit: 'reps', muscles: 'Épaules, triceps',
    steps: ['Assis ou debout, haltères à hauteur des oreilles', 'Pousse au-dessus de la tête', 'Redescends contrôlé'], tip: 'Gaine le ventre pour ne pas cambrer.' },
  elev_lat:     { name: 'Élévations latérales', icon: '🪽', slot: 'shoulders', place: 'salle', lvl: 1, unit: 'reps', muscles: 'Épaules (deltoïdes)',
    steps: ['Haltères légers le long du corps', 'Monte sur les côtés jusqu\'à l\'horizontale', 'Redescends en 2 secondes'], tip: 'Prends léger : c\'est un petit muscle.' },

  // Tirage
  superman:     { name: 'Superman', icon: '🦸', slot: 'pull', place: 'maison', lvl: 1, unit: 'reps', muscles: 'Dos, lombaires',
    steps: ['Allongé sur le ventre, bras tendus devant', 'Décolle bras et jambes du sol', 'Tiens 2 secondes et redescends'], tip: 'Regarde le sol pour garder la nuque neutre.' },
  rowing_sac:   { name: 'Rowing avec sac à dos', icon: '🎒', slot: 'pull', place: 'maison', lvl: 1, unit: 'reps', muscles: 'Dos, biceps',
    steps: ['Remplis un sac à dos (livres, bouteilles)', 'Buste penché, dos plat', 'Tire le sac vers le nombril'], tip: 'Serre les omoplates en haut du mouvement.' },
  traction:     { name: 'Tractions', icon: '🧗', slot: 'pull', place: 'both', lvl: 3, unit: 'reps', muscles: 'Dos, biceps',
    steps: ['Suspendu à une barre, mains plus larges que les épaules', 'Tire jusqu\'à passer le menton au-dessus de la barre', 'Redescends bras tendus'], tip: 'Pas encore ? Fais des suspensions ou la phase de descente seule.' },
  tirage:       { name: 'Tirage vertical', icon: '⬇️', slot: 'pull', place: 'salle', lvl: 1, unit: 'reps', muscles: 'Dos (grand dorsal), biceps',
    steps: ['Assis, barre en prise large', 'Tire la barre vers le haut de la poitrine', 'Remonte lentement bras tendus'], tip: 'Pense à tirer avec les coudes, pas avec les mains.' },
  rowing_h:     { name: 'Rowing haltère', icon: '🚣', slot: 'pull', place: 'salle', lvl: 1, unit: 'reps', muscles: 'Dos, biceps',
    steps: ['Une main et un genou sur un banc', 'Tire l\'haltère vers la hanche', 'Redescends bras tendu'], tip: 'Le dos reste plat et immobile.' },

  // Bras
  curl_b:       { name: 'Curl biceps (bouteilles)', icon: '🧴', slot: 'arms', place: 'maison', lvl: 1, unit: 'reps', muscles: 'Biceps',
    steps: ['Bouteilles ou sac en mains, bras le long du corps', 'Plie les coudes pour monter', 'Redescends lentement'], tip: 'Les coudes restent collés au corps.' },
  dips_chaise:  { name: 'Dips sur chaise', icon: '🪑', slot: 'arms', place: 'maison', lvl: 1, unit: 'reps', muscles: 'Triceps',
    steps: ['Mains sur le bord d\'une chaise stable, dans ton dos', 'Plie les coudes pour descendre', 'Pousse pour remonter'], tip: 'Garde le dos proche de la chaise.' },
  curl:         { name: 'Curl haltères', icon: '💪', slot: 'arms', place: 'salle', lvl: 1, unit: 'reps', muscles: 'Biceps',
    steps: ['Haltères en mains, paumes vers l\'avant', 'Monte en pliant les coudes', 'Redescends en contrôlant'], tip: 'Pas d\'élan avec le dos.' },
  triceps_p:    { name: 'Extension triceps poulie', icon: '🔽', slot: 'arms', place: 'salle', lvl: 1, unit: 'reps', muscles: 'Triceps',
    steps: ['Face à la poulie haute, corde ou barre en main', 'Tends les bras vers le bas', 'Remonte jusqu\'à 90°'], tip: 'Les coudes ne bougent pas.' },

  // Abdos / gainage
  planche:      { name: 'Gainage planche', icon: '📏', slot: 'core', place: 'both', lvl: 1, unit: 'time', muscles: 'Abdos, gainage profond',
    steps: ['Sur les avant-bras et les pointes de pieds', 'Corps aligné de la tête aux talons', 'Rentre le nombril et respire'], tip: 'Fesses ni trop hautes ni trop basses.' },
  gainage_lat:  { name: 'Gainage latéral', icon: '📐', slot: 'core', place: 'both', lvl: 1, unit: 'time', muscles: 'Obliques',
    steps: ['Sur un avant-bras, sur le côté', 'Monte le bassin, corps aligné', 'Tiens, puis change de côté'], tip: 'Débutant : genoux au sol.' },
  crunch:       { name: 'Crunchs', icon: '🌀', slot: 'core', place: 'both', lvl: 1, unit: 'reps', muscles: 'Abdominaux',
    steps: ['Sur le dos, genoux pliés', 'Enroule le haut du dos en expirant', 'Redescends sans reposer la tête'], tip: 'Ne tire pas sur la nuque avec les mains.' },
  releves:      { name: 'Relevés de jambes', icon: '🦵', slot: 'core', place: 'both', lvl: 2, unit: 'reps', muscles: 'Bas des abdos',
    steps: ['Sur le dos, mains sous les fesses', 'Monte les jambes tendues à la verticale', 'Redescends sans toucher le sol'], tip: 'Le bas du dos reste plaqué au sol.' },
  mountain:     { name: 'Mountain climbers', icon: '⛰️', slot: 'core', place: 'both', lvl: 2, unit: 'time', muscles: 'Abdos, cardio',
    steps: ['Position de pompe, bras tendus', 'Ramène un genou vers la poitrine', 'Alterne vite les jambes'], tip: 'Garde les hanches basses.' },

  // Cardio
  jumping:      { name: 'Jumping jacks', icon: '⭐', slot: 'cardio', place: 'maison', lvl: 1, unit: 'time', muscles: 'Cardio, tout le corps',
    steps: ['Debout, pieds joints', 'Saute en écartant bras et jambes', 'Reviens et enchaîne'], tip: 'Version douce : écarte une jambe à la fois sans sauter.' },
  genoux:       { name: 'Montées de genoux', icon: '🏃', slot: 'cardio', place: 'maison', lvl: 1, unit: 'time', muscles: 'Cardio, cuisses',
    steps: ['Cours sur place', 'Monte les genoux à hauteur des hanches', 'Bouge les bras en rythme'], tip: 'Reste sur l\'avant des pieds.' },
  burpees:      { name: 'Burpees', icon: '💥', slot: 'cardio', place: 'maison', lvl: 2, unit: 'time', muscles: 'Tout le corps, cardio',
    steps: ['Accroupis-toi, mains au sol', 'Lance les pieds en arrière en planche', 'Reviens et saute bras en l\'air'], tip: 'Version douce : sans saut et sans pompe.' },
  corde:        { name: 'Corde à sauter', icon: '🪢', slot: 'cardio', place: 'maison', lvl: 2, unit: 'time', muscles: 'Cardio, mollets',
    steps: ['Poignets qui tournent, coudes près du corps', 'Petits sauts sur l\'avant des pieds', 'Garde un rythme régulier'], tip: 'Pas de corde ? Fais le geste sans corde.' },
  tapis:        { name: 'Tapis de course / marche inclinée', icon: '🏃', slot: 'cardio', place: 'salle', lvl: 1, unit: 'cardio', muscles: 'Cardio',
    steps: ['Échauffe-toi 3 min en marchant', 'Monte la vitesse ou l\'inclinaison', 'Tu dois pouvoir parler mais pas chanter'], tip: 'La marche inclinée brûle bien sans abîmer les articulations.' },
  velo:         { name: 'Vélo', icon: '🚴', slot: 'cardio', place: 'salle', lvl: 1, unit: 'cardio', muscles: 'Cardio, jambes',
    steps: ['Règle la selle à hauteur de hanche', 'Pédale à un rythme soutenu', 'Option : 30 s rapide / 30 s lent'], tip: 'Doux pour les genoux.' },
  rameur:       { name: 'Rameur', icon: '🚣', slot: 'cardio', place: 'salle', lvl: 2, unit: 'cardio', muscles: 'Cardio, dos, jambes',
    steps: ['Pousse d\'abord avec les jambes', 'Puis tire avec le dos et les bras', 'Reviens dans l\'ordre inverse'], tip: 'La puissance vient des jambes (60 %).' },
};

/* Modèles de séances : liste de [slot, variante] */
export const TEMPLATES = {
  fullA:  { name: 'Full body A', focus: 'Tout le corps', slots: [['legs',0],['push',0],['pull',0],['glutes',0],['core',0]] },
  fullB:  { name: 'Full body B', focus: 'Tout le corps', slots: [['legs',1],['shoulders',0],['pull',1],['arms',0],['core',1]] },
  fullC:  { name: 'Full body C', focus: 'Tout le corps', slots: [['glutes',1],['push',1],['pull',2],['legs',2],['core',2]] },
  upper:  { name: 'Haut du corps', focus: 'Pecs, dos, épaules, bras', slots: [['push',0],['pull',0],['shoulders',0],['push',1],['pull',1],['arms',0]] },
  upper2: { name: 'Haut du corps 2', focus: 'Pecs, dos, épaules, bras', slots: [['pull',2],['push',2],['shoulders',1],['pull',0],['arms',1],['core',0]] },
  lower:  { name: 'Bas du corps', focus: 'Jambes, fessiers, abdos', slots: [['legs',0],['glutes',0],['legs',1],['glutes',1],['core',0],['core',1]] },
  lower2: { name: 'Bas du corps 2', focus: 'Jambes, fessiers, abdos', slots: [['legs',2],['glutes',2],['legs',3],['glutes',0],['core',2],['core',3]] },
  push:   { name: 'Push', focus: 'Pectoraux, épaules, triceps', slots: [['push',0],['shoulders',0],['push',1],['shoulders',1],['arms',1],['core',0]] },
  pull:   { name: 'Pull', focus: 'Dos, biceps', slots: [['pull',0],['pull',1],['pull',2],['arms',0],['core',1]] },
  legs:   { name: 'Legs', focus: 'Jambes, fessiers', slots: [['legs',0],['glutes',0],['legs',1],['glutes',1],['legs',2],['core',2]] },
  cardio: { name: 'Cardio & abdos', focus: 'Souffle et gainage', slots: [['cardio',0],['core',0],['cardio',1],['core',1],['cardio',2],['core',2]] },
};

export const SPLITS = {
  2: () => ['fullA', 'fullB'],
  3: () => ['fullA', 'fullB', 'fullC'],
  4: () => ['upper', 'lower', 'upper2', 'lower2'],
  5: (goal) => ['muscle', 'prise_masse'].includes(goal) ? ['push', 'pull', 'legs', 'upper', 'lower'] : ['fullA', 'cardio', 'fullB', 'cardio', 'fullC'],
  6: () => ['push', 'pull', 'legs', 'push', 'pull', 'legs'],
};

/* Jours d'entraînement (1 = lundi ... 7 = dimanche) */
export const TRAINING_DAYS = { 2: [1, 4], 3: [1, 3, 5], 4: [1, 2, 4, 5], 5: [1, 2, 3, 4, 5], 6: [1, 2, 3, 4, 5, 6] };

/* Paramètres de séries/répétitions selon l'objectif */
export const SCHEMES = {
  perte_poids: { sets: [2, 3, 3], reps: '12-15', time: '30-40 s', rest: 40, finisher: 'Finisher : 10 min de cardio (marche rapide, vélo ou corde)' },
  muscle:      { sets: [3, 3, 4], reps: '10-12', time: '40-50 s', rest: 60, finisher: null },
  prise_masse: { sets: [3, 4, 4], reps: '8-10',  time: '40-60 s', rest: 90, finisher: null },
  forme:       { sets: [2, 3, 3], reps: '12',    time: '30 s',    rest: 45, finisher: 'Bonus : 15 min de marche après la séance' },
  endurance:   { sets: [3, 3, 4], reps: '15-20', time: '45 s',    rest: 30, finisher: 'Finisher : 15 min de cardio à allure modérée' },
};

/* ---------- Aliments (portion standard) ----------
   k = kcal, p = protéines (g), g = glucides (g), l = lipides (g)
*/
export const FOODS = [
  // Protéines
  { n: 'Œuf', u: '1 œuf', k: 72, p: 6.3, g: 0.4, l: 4.8, c: 'Protéines' },
  { n: 'Blanc de poulet cuit', u: '100 g', k: 165, p: 31, g: 0, l: 3.6, c: 'Protéines' },
  { n: 'Viande hachée 5 %', u: '100 g', k: 140, p: 22, g: 0, l: 5.5, c: 'Protéines' },
  { n: 'Viande d\'agneau cuite', u: '100 g', k: 290, p: 25, g: 0, l: 21, c: 'Protéines' },
  { n: 'Thon au naturel', u: '1 boîte (100 g)', k: 116, p: 26, g: 0, l: 1, c: 'Protéines' },
  { n: 'Sardines à l\'huile', u: '100 g', k: 210, p: 24, g: 0, l: 12, c: 'Protéines' },
  { n: 'Saumon', u: '100 g', k: 208, p: 20, g: 0, l: 13, c: 'Protéines' },
  { n: 'Poisson blanc (merlan, colin)', u: '100 g', k: 90, p: 20, g: 0, l: 1, c: 'Protéines' },
  { n: 'Crevettes', u: '100 g', k: 99, p: 24, g: 0.2, l: 0.3, c: 'Protéines' },
  { n: 'Whey protéine', u: '1 dose (30 g)', k: 120, p: 24, g: 2.5, l: 1.5, c: 'Protéines' },
  { n: 'Barre protéinée', u: '1 barre', k: 200, p: 20, g: 20, l: 7, c: 'Protéines' },
  // Féculents
  { n: 'Riz blanc cuit', u: '150 g', k: 195, p: 4, g: 43, l: 0.5, c: 'Féculents' },
  { n: 'Riz complet cuit', u: '150 g', k: 185, p: 4, g: 39, l: 1.5, c: 'Féculents' },
  { n: 'Pâtes cuites', u: '150 g', k: 235, p: 8, g: 46, l: 1.4, c: 'Féculents' },
  { n: 'Couscous (semoule) cuit', u: '150 g', k: 168, p: 5.7, g: 35, l: 0.2, c: 'Féculents' },
  { n: 'Lentilles cuites', u: '150 g', k: 174, p: 13.5, g: 30, l: 0.6, c: 'Féculents' },
  { n: 'Pois chiches cuits', u: '150 g', k: 246, p: 13, g: 41, l: 4, c: 'Féculents' },
  { n: 'Pomme de terre cuite', u: '150 g', k: 130, p: 3, g: 29, l: 0.2, c: 'Féculents' },
  { n: 'Patate douce cuite', u: '150 g', k: 135, p: 2.4, g: 31, l: 0.2, c: 'Féculents' },
  { n: 'Flocons d\'avoine', u: '40 g', k: 150, p: 5, g: 24, l: 3, c: 'Féculents' },
  { n: 'Baguette', u: '1/4 (60 g)', k: 160, p: 5, g: 33, l: 1, c: 'Féculents' },
  { n: 'Pain complet', u: '1 tranche (40 g)', k: 100, p: 4, g: 17, l: 1.4, c: 'Féculents' },
  { n: 'Galette (kesra)', u: '1 part (80 g)', k: 250, p: 6, g: 40, l: 7, c: 'Féculents' },
  { n: 'Msemen', u: '1 pièce (80 g)', k: 290, p: 5, g: 38, l: 13, c: 'Féculents' },
  // Laitiers
  { n: 'Yaourt nature', u: '1 pot (125 g)', k: 76, p: 5, g: 6, l: 3.5, c: 'Laitiers' },
  { n: 'Yaourt grec / skyr 0 %', u: '150 g', k: 90, p: 15, g: 6, l: 0.3, c: 'Laitiers' },
  { n: 'Fromage blanc 0 %', u: '100 g', k: 47, p: 7.5, g: 4, l: 0.2, c: 'Laitiers' },
  { n: 'Lben', u: '1 verre (25 cl)', k: 100, p: 8, g: 12, l: 2, c: 'Laitiers' },
  { n: 'Lait demi-écrémé', u: '1 verre (25 cl)', k: 115, p: 8, g: 12, l: 4, c: 'Laitiers' },
  { n: 'Fromage à pâte dure', u: '30 g', k: 113, p: 8.5, g: 0, l: 8.7, c: 'Laitiers' },
  { n: 'Fromage fondu', u: '1 portion', k: 45, p: 2, g: 1, l: 3.7, c: 'Laitiers' },
  // Fruits & légumes
  { n: 'Banane', u: '1 fruit', k: 105, p: 1.3, g: 27, l: 0.4, c: 'Fruits & légumes' },
  { n: 'Pomme', u: '1 fruit', k: 80, p: 0.4, g: 21, l: 0.3, c: 'Fruits & légumes' },
  { n: 'Orange', u: '1 fruit', k: 62, p: 1.2, g: 15, l: 0.2, c: 'Fruits & légumes' },
  { n: 'Dattes', u: '3 dattes', k: 70, p: 0.6, g: 18, l: 0.1, c: 'Fruits & légumes' },
  { n: 'Fraises', u: '150 g', k: 48, p: 1, g: 11, l: 0.5, c: 'Fruits & légumes' },
  { n: 'Pastèque', u: '200 g', k: 60, p: 1.2, g: 15, l: 0.3, c: 'Fruits & légumes' },
  { n: 'Avocat', u: '1/2 avocat', k: 160, p: 2, g: 8.5, l: 14.7, c: 'Fruits & légumes' },
  { n: 'Salade / crudités', u: '1 bol', k: 25, p: 1.5, g: 4, l: 0.3, c: 'Fruits & légumes' },
  { n: 'Légumes cuits', u: '200 g', k: 70, p: 3, g: 12, l: 0.5, c: 'Fruits & légumes' },
  { n: 'Tomate', u: '1 tomate', k: 22, p: 1, g: 4.8, l: 0.2, c: 'Fruits & légumes' },
  // Matières grasses & oléagineux
  { n: 'Huile d\'olive', u: '1 c. à soupe', k: 90, p: 0, g: 0, l: 10, c: 'Gras & oléagineux' },
  { n: 'Beurre', u: '10 g', k: 75, p: 0, g: 0, l: 8.3, c: 'Gras & oléagineux' },
  { n: 'Amandes', u: '30 g', k: 175, p: 6, g: 6, l: 15, c: 'Gras & oléagineux' },
  { n: 'Noix', u: '30 g', k: 196, p: 4.6, g: 4, l: 19.5, c: 'Gras & oléagineux' },
  { n: 'Cacahuètes', u: '30 g', k: 170, p: 7.7, g: 4.8, l: 14.8, c: 'Gras & oléagineux' },
  { n: 'Beurre de cacahuète', u: '1 c. à soupe', k: 94, p: 4, g: 3, l: 8, c: 'Gras & oléagineux' },
  // Plats
  { n: 'Chorba', u: '1 bol (300 ml)', k: 220, p: 12, g: 25, l: 7, c: 'Plats' },
  { n: 'Couscous viande et légumes', u: '1 assiette', k: 650, p: 30, g: 85, l: 20, c: 'Plats' },
  { n: 'Tajine de poulet', u: '1 portion', k: 400, p: 32, g: 20, l: 20, c: 'Plats' },
  { n: 'Loubia (haricots en sauce)', u: '1 bol', k: 300, p: 15, g: 40, l: 8, c: 'Plats' },
  { n: 'Pizza', u: '2 parts', k: 540, p: 23, g: 66, l: 20, c: 'Plats' },
  { n: 'Burger', u: '1 burger', k: 500, p: 25, g: 40, l: 26, c: 'Plats' },
  { n: 'Sandwich chawarma', u: '1 sandwich', k: 650, p: 30, g: 60, l: 30, c: 'Plats' },
  { n: 'Frites', u: '100 g', k: 312, p: 3.4, g: 41, l: 15, c: 'Plats' },
  // Sucré & boissons
  { n: 'Chocolat noir', u: '2 carrés (20 g)', k: 110, p: 1.6, g: 6.5, l: 8.5, c: 'Sucré & boissons' },
  { n: 'Pâtisserie / gâteau', u: '1 part', k: 350, p: 4, g: 45, l: 17, c: 'Sucré & boissons' },
  { n: 'Makrout', u: '1 pièce', k: 200, p: 2, g: 28, l: 9, c: 'Sucré & boissons' },
  { n: 'Chips', u: '30 g', k: 160, p: 2, g: 15, l: 10, c: 'Sucré & boissons' },
  { n: 'Miel', u: '1 c. à café', k: 30, p: 0, g: 8, l: 0, c: 'Sucré & boissons' },
  { n: 'Soda', u: '1 canette (33 cl)', k: 140, p: 0, g: 35, l: 0, c: 'Sucré & boissons' },
  { n: 'Jus d\'orange', u: '1 verre (25 cl)', k: 110, p: 1.5, g: 25, l: 0.5, c: 'Sucré & boissons' },
  { n: 'Thé à la menthe sucré', u: '1 verre', k: 50, p: 0, g: 13, l: 0, c: 'Sucré & boissons' },
  { n: 'Café au lait sucré', u: '1 tasse', k: 60, p: 2, g: 8, l: 2, c: 'Sucré & boissons' },
];

/* ---------- Recettes healthy ---------- */
export const RECIPES = [
  { id: 'oats', name: 'Overnight oats banane-dattes', icon: '🥣', time: 5, kcal: 420, p: 22, tags: ['muscle', 'prise_masse', 'forme'], meal: 'Petit-déjeuner',
    ing: ['50 g de flocons d\'avoine', '150 g de yaourt grec', '10 cl de lait', '1 banane', '2 dattes hachées', '1 pincée de cannelle'],
    steps: ['Mélange avoine, yaourt, lait et cannelle dans un bocal', 'Ajoute la banane en rondelles et les dattes', 'Laisse une nuit au frigo, déguste froid le matin'] },
  { id: 'omelette', name: 'Omelette épinards et feta', icon: '🍳', time: 10, kcal: 310, p: 24, tags: ['perte_poids', 'muscle', 'forme'], meal: 'Petit-déjeuner',
    ing: ['3 œufs', '1 grosse poignée d\'épinards', '20 g de feta', '1 c. à café d\'huile d\'olive', 'Sel, poivre, cumin'],
    steps: ['Fais tomber les épinards 2 min dans la poêle huilée', 'Verse les œufs battus et assaisonnés', 'Émiette la feta, plie l\'omelette et sers'] },
  { id: 'pancakes', name: 'Pancakes protéinés à l\'avoine', icon: '🥞', time: 15, kcal: 380, p: 28, tags: ['muscle', 'prise_masse'], meal: 'Petit-déjeuner',
    ing: ['50 g de flocons d\'avoine mixés', '2 œufs', '100 g de fromage blanc', '1/2 banane', '1 c. à café de levure'],
    steps: ['Mixe tous les ingrédients', 'Cuis de petites louches dans une poêle antiadhésive, 2 min par face', 'Sers avec des fruits rouges'] },
  { id: 'chorba', name: 'Chorba légère au poulet', icon: '🍲', time: 40, kcal: 290, p: 26, tags: ['perte_poids', 'forme'], meal: 'Dîner',
    ing: ['200 g de blanc de poulet', '1 oignon, 2 tomates, 1 courgette, 1 carotte', '30 g de frik (ou vermicelles)', '50 g de pois chiches cuits', 'Coriandre, menthe, ras el hanout'],
    steps: ['Fais revenir l\'oignon et le poulet en dés avec les épices', 'Ajoute les légumes en dés, les tomates et 1 L d\'eau, laisse mijoter 25 min', 'Ajoute frik et pois chiches 10 min, puis les herbes fraîches'] },
  { id: 'mechouia', name: 'Salade méchouia au thon et œuf', icon: '🥗', time: 25, kcal: 350, p: 30, tags: ['perte_poids', 'muscle'], meal: 'Déjeuner',
    ing: ['2 poivrons, 2 tomates', '1 boîte de thon au naturel', '1 œuf dur', '1 c. à soupe d\'huile d\'olive', 'Ail, cumin, citron'],
    steps: ['Grille poivrons et tomates, pèle-les et hache-les', 'Assaisonne avec ail, cumin, citron et huile', 'Ajoute le thon émietté et l\'œuf en quartiers'] },
  { id: 'bowl', name: 'Bowl quinoa, poulet et avocat', icon: '🥙', time: 20, kcal: 560, p: 40, tags: ['muscle', 'prise_masse'], meal: 'Déjeuner',
    ing: ['150 g de quinoa ou riz complet cuit', '120 g de poulet grillé', '1/2 avocat', 'Concombre, tomates cerises, maïs', 'Sauce yaourt-citron'],
    steps: ['Dispose le quinoa au fond du bol', 'Ajoute le poulet en lamelles et les légumes', 'Termine par l\'avocat et la sauce yaourt-citron'] },
  { id: 'sardines', name: 'Sardines au four, légumes rôtis', icon: '🐟', time: 30, kcal: 420, p: 32, tags: ['perte_poids', 'muscle', 'forme'], meal: 'Dîner',
    ing: ['250 g de sardines fraîches', '1 courgette, 1 poivron, 1 oignon rouge', '1 c. à soupe d\'huile d\'olive', 'Chermoula : ail, cumin, paprika, coriandre, citron'],
    steps: ['Badigeonne les sardines de chermoula', 'Mets les légumes en morceaux sur une plaque avec l\'huile, 15 min à 200 °C', 'Ajoute les sardines et cuis encore 12 min'] },
  { id: 'lentilles', name: 'Soupe de lentilles corail', icon: '🥣', time: 25, kcal: 330, p: 18, tags: ['perte_poids', 'forme', 'endurance'], meal: 'Dîner',
    ing: ['100 g de lentilles corail', '1 oignon, 1 carotte, 1 tomate', '1 c. à café de cumin, curcuma', '1 c. à café d\'huile d\'olive', 'Jus de citron'],
    steps: ['Fais revenir l\'oignon avec les épices', 'Ajoute lentilles, légumes et 75 cl d\'eau, 20 min', 'Mixe, ajoute le citron au moment de servir'] },
  { id: 'tajine', name: 'Tajine de poulet aux légumes', icon: '🫕', time: 45, kcal: 450, p: 38, tags: ['muscle', 'perte_poids', 'forme'], meal: 'Déjeuner',
    ing: ['2 cuisses de poulet sans peau', '2 carottes, 1 courgette, 1 oignon', '1 c. à soupe d\'huile d\'olive', 'Gingembre, curcuma, cumin, olives, citron confit'],
    steps: ['Fais dorer le poulet et l\'oignon avec les épices', 'Ajoute les légumes et un verre d\'eau, couvre', 'Laisse mijoter 30 min, ajoute olives et citron confit'] },
  { id: 'wrap', name: 'Wrap thon, crudités, yaourt', icon: '🌯', time: 10, kcal: 400, p: 32, tags: ['perte_poids', 'muscle', 'forme'], meal: 'Déjeuner',
    ing: ['1 galette de blé complet', '1 boîte de thon au naturel', '2 c. à soupe de yaourt grec', 'Salade, tomate, oignon rouge', 'Citron, poivre, herbes'],
    steps: ['Mélange le thon avec le yaourt, le citron et les herbes', 'Garnis la galette de crudités et de thon', 'Roule bien serré et coupe en deux'] },
  { id: 'smoothie', name: 'Smoothie prise de masse', icon: '🥤', time: 5, kcal: 650, p: 35, tags: ['prise_masse'], meal: 'Collation',
    ing: ['30 cl de lait', '1 banane', '40 g de flocons d\'avoine', '1 c. à soupe de beurre de cacahuète', '3 dattes', '1 dose de whey (facultatif)'],
    steps: ['Mets tout dans le blender', 'Mixe 1 minute jusqu\'à obtenir une texture lisse', 'Bois après la séance ou en collation'] },
  { id: 'pasta', name: 'Pâtes complètes bolognaise maison', icon: '🍝', time: 25, kcal: 620, p: 42, tags: ['prise_masse', 'muscle', 'endurance'], meal: 'Dîner',
    ing: ['100 g de pâtes complètes (crues)', '150 g de viande hachée 5 %', '200 g de tomates concassées', '1 oignon, 1 gousse d\'ail', 'Basilic, origan'],
    steps: ['Fais cuire les pâtes', 'Dore l\'oignon, l\'ail et la viande, ajoute les tomates et les herbes, 15 min', 'Mélange avec les pâtes égouttées'] },
  { id: 'skyr', name: 'Bol skyr, fruits rouges et amandes', icon: '🍓', time: 3, kcal: 260, p: 20, tags: ['perte_poids', 'muscle', 'forme'], meal: 'Collation',
    ing: ['150 g de skyr ou yaourt grec 0 %', '100 g de fruits rouges', '15 g d\'amandes', '1 c. à café de miel'],
    steps: ['Verse le skyr dans un bol', 'Ajoute les fruits et les amandes concassées', 'Un filet de miel et c\'est prêt'] },
  { id: 'patate', name: 'Patate douce farcie au poulet', icon: '🍠', time: 35, kcal: 480, p: 34, tags: ['muscle', 'endurance', 'prise_masse'], meal: 'Dîner',
    ing: ['1 grosse patate douce', '120 g de poulet effiloché', '2 c. à soupe de yaourt grec', 'Ciboulette, paprika fumé'],
    steps: ['Cuis la patate douce 30 min au four à 200 °C (ou 8 min au micro-ondes)', 'Ouvre-la et écrase un peu la chair', 'Garnis de poulet assaisonné, yaourt et ciboulette'] },
];

/* ---------- Conseils ---------- */
export const TIPS = {
  general: [
    'Bois un grand verre d\'eau dès le réveil : ton corps sort de 8 h sans boire.',
    'Une marche de 10 minutes après le repas aide à mieux digérer et à stabiliser la glycémie.',
    'La régularité bat l\'intensité : 3 séances par semaine tenues pendant 3 mois valent mieux que 6 séances abandonnées.',
    'Mets des protéines à chaque repas : elles rassasient et protègent tes muscles.',
    'Écrans coupés 30 min avant de dormir = endormissement plus rapide.',
    'Prépare tes repas du lendemain le soir : moins de grignotage imprévu.',
    'Prends les escaliers : c\'est du cardio gratuit.',
    'Remplis la moitié de ton assiette de légumes.',
    'La récupération fait partie de l\'entraînement : le muscle se construit au repos.',
    'Une photo de progression par mois motive plus que la balance.',
  ],
  perte_poids: [
    'Vise un déficit modéré : perdre 0,5 à 1 % de ton poids par semaine préserve le muscle.',
    'Les boissons sucrées sont des calories cachées : remplace-les par de l\'eau ou du thé sans sucre.',
    'Mange lentement : le signal de satiété arrive après environ 20 minutes.',
    'Garde la musculation : elle évite de perdre du muscle pendant le régime.',
    'Fais tes 10 000 pas : c\'est souvent ce qui fait la différence sur la balance.',
  ],
  muscle: [
    'Augmente un peu la charge ou les répétitions chaque semaine : c\'est la surcharge progressive.',
    'Vise environ 2 g de protéines par kilo de poids de corps, réparties sur la journée.',
    'Dors 7 à 9 h : l\'hormone de croissance est libérée surtout la nuit.',
    'Note tes charges pour savoir quoi battre à la prochaine séance.',
  ],
  prise_masse: [
    'Tu n\'as pas faim ? Ajoute des calories liquides : smoothie lait-banane-avoine.',
    'Fais 4 à 5 repas par jour plutôt que 2 gros repas.',
    'Les oléagineux (amandes, noix) sont denses en calories et faciles à grignoter.',
    'Vise +0,25 à 0,5 kg par semaine pour prendre surtout du muscle.',
  ],
  forme: [
    'Commence petit : 20 minutes de mouvement par jour suffisent pour sentir la différence.',
    'Trouve une activité que tu aimes, c\'est elle que tu continueras.',
    'Étire-toi 5 minutes le soir pour mieux dormir et réduire les tensions.',
  ],
  endurance: [
    'Fais 80 % de ton cardio à allure facile (tu peux parler) et 20 % intense.',
    'Hydrate-toi avant d\'avoir soif pendant les longues séances.',
    'Les glucides sont ton carburant : ne les supprime pas.',
  ],
  water: [
    'Garde une bouteille visible sur ton bureau : on boit ce qu\'on voit.',
    'Ton urine doit être jaune clair : c\'est le meilleur indicateur.',
    'Ajoute citron, menthe ou concombre si l\'eau plate t\'ennuie.',
    'Bois un verre avant chaque repas.',
    'Quand il fait chaud ou après le sport, augmente tes apports.',
  ],
  sleep: [
    'Couche-toi et lève-toi à la même heure, même le week-end.',
    'Chambre fraîche (18-19 °C), sombre et calme.',
    'Pas de café après 14 h : la caféine agit jusqu\'à 6 h.',
    'Lumière du jour le matin = meilleur sommeil le soir.',
    'Évite les repas lourds dans les 2 h avant le coucher.',
    'Un cycle de sommeil dure environ 90 min : se réveiller entre deux cycles évite d\'être groggy.',
  ],
  steps: [
    'Fais tes appels téléphoniques en marchant.',
    'Descends un arrêt plus tôt ou gare-toi plus loin.',
    'Une marche de 15 min après chaque repas = environ 4 500 pas de plus.',
    'Monte ton objectif de 1 000 pas par semaine jusqu\'à l\'objectif final.',
  ],
};

/* ---------- Skincare ---------- */
export const SKIN_ZONES = {
  front: 'Front', nez: 'Nez', joue_g: 'Joue gauche', joue_d: 'Joue droite', menton: 'Menton', yeux: 'Contour des yeux',
};

export const SKIN_ISSUES = {
  brillance: { label: 'Brillance', icon: '✨' },
  boutons:   { label: 'Boutons', icon: '🔴' },
  points:    { label: 'Points noirs / pores', icon: '⚫' },
  rougeurs:  { label: 'Rougeurs', icon: '🌹' },
  secheresse:{ label: 'Sécheresse', icon: '🏜️' },
  taches:    { label: 'Taches', icon: '🟤' },
  rides:     { label: 'Ridules', icon: '〰️' },
  cernes:    { label: 'Cernes', icon: '🌙' },
  terne:     { label: 'Teint terne', icon: '🌫️' },
};

export const SKIN_TYPES = {
  grasse:  { label: 'Peau grasse', desc: 'Brillance sur tout le visage, pores visibles, tendance aux imperfections.',
    cleanser: 'Gel nettoyant doux moussant (sans savon)', moisturizer: 'Gel-crème léger, non comédogène', spf: 'SPF 50 fluide, texture mate' },
  mixte:   { label: 'Peau mixte', desc: 'Zone T (front, nez, menton) qui brille, joues normales ou sèches.',
    cleanser: 'Gel nettoyant doux', moisturizer: 'Émulsion légère (plus riche sur les joues si besoin)', spf: 'SPF 50 fluide' },
  seche:   { label: 'Peau sèche', desc: 'Tiraillements, sensation d\'inconfort, peu de brillance.',
    cleanser: 'Lait ou crème nettoyante, ou huile démaquillante', moisturizer: 'Crème riche aux céramides', spf: 'SPF 50 crème hydratante' },
  normale: { label: 'Peau normale', desc: 'Confortable, peu de brillance, peu d\'imperfections.',
    cleanser: 'Gel ou lait nettoyant doux', moisturizer: 'Crème hydratante légère', spf: 'SPF 30 à 50 au quotidien' },
  sensible:{ label: 'Peau sensible', desc: 'Réagit facilement : rougeurs, picotements, échauffements.',
    cleanser: 'Nettoyant ultra-doux sans parfum (eau micellaire ou lait)', moisturizer: 'Crème apaisante sans parfum', spf: 'SPF 50 minéral, sans parfum' },
};

/* Recommandations par problématique */
export const SKIN_ADVICE = {
  boutons:   { use: ['Acide salicylique (BHA) 0,5-2 %', 'Niacinamide 4-10 %', 'Peroxyde de benzoyle 2,5 % (en local)', 'Zinc'],
               avoid: ['Huiles lourdes (huile de coco)', 'Gommages à grains', 'Percer les boutons', 'Crèmes trop riches'],
               why: 'Les boutons viennent d\'un excès de sébum et de pores bouchés. Le BHA désincruste, la niacinamide régule le sébum.' },
  points:    { use: ['Acide salicylique (BHA)', 'Masque à l\'argile 1 fois par semaine', 'Niacinamide'],
               avoid: ['Les extraire aux doigts', 'Gommages agressifs quotidiens', 'Huiles comédogènes'],
               why: 'Le BHA pénètre dans le pore pour dissoudre le sébum oxydé.' },
  brillance: { use: ['Niacinamide', 'Hydratant gel non comédogène', 'Papier matifiant en journée'],
               avoid: ['Nettoyants trop décapants (ils relancent le sébum)', 'Sauter l\'hydratant'],
               why: 'Une peau qui brille a quand même besoin d\'eau : la décaper la pousse à produire plus de sébum.' },
  rougeurs:  { use: ['Centella asiatica', 'Acide azélaïque', 'Niacinamide à faible dose', 'SPF minéral'],
               avoid: ['Parfums et huiles essentielles', 'Alcool', 'Gommages', 'Eau très chaude'],
               why: 'Les rougeurs signalent souvent une barrière cutanée fragilisée : on apaise avant tout.' },
  secheresse:{ use: ['Céramides', 'Acide hyaluronique', 'Glycérine', 'Beurre de karité (le soir)'],
               avoid: ['Savons classiques', 'Douches très chaudes', 'Alcool dénaturé'],
               why: 'La peau sèche manque de lipides : on nourrit et on protège la barrière.' },
  taches:    { use: ['Vitamine C le matin', 'Niacinamide', 'Acide azélaïque', 'SPF 50 tous les jours (indispensable)'],
               avoid: ['Le soleil sans protection', 'Gratter les boutons (cela laisse des marques)'],
               why: 'Sans protection solaire quotidienne, aucun actif anti-taches ne fonctionne.' },
  rides:     { use: ['Rétinol le soir (progressivement)', 'Vitamine C le matin', 'Peptides', 'SPF quotidien'],
               avoid: ['Rétinol + acides le même soir', 'Rétinol pendant la grossesse'],
               why: 'Le rétinol stimule le renouvellement cellulaire ; le soleil est la 1re cause du vieillissement cutané.' },
  cernes:    { use: ['Contour des yeux à la caféine', 'Sommeil régulier', 'Compresses froides le matin'],
               avoid: ['Frotter les yeux', 'Se démaquiller trop fort'],
               why: 'Le sommeil et l\'hydratation jouent beaucoup sur les cernes.' },
  terne:     { use: ['Vitamine C', 'Acide lactique (AHA doux) 1 à 2 fois par semaine', 'Hydratation'],
               avoid: ['Exfolier tous les jours'],
               why: 'Une exfoliation douce et régulière ravive l\'éclat.' },
};

/* Questions sur la routine actuelle (score /100) */
export const SKIN_ROUTINE_Q = [
  { id: 'clean_pm', q: 'Tu nettoies ton visage le soir ?', opts: [['Tous les soirs', 15], ['Parfois', 6], ['Rarement', 0]] },
  { id: 'moist',    q: 'Tu mets une crème hydratante ?', opts: [['Tous les jours', 15], ['Parfois', 6], ['Jamais', 0]] },
  { id: 'spf',      q: 'Tu mets une protection solaire (SPF) ?', opts: [['Tous les jours', 20], ['Seulement l\'été ou au soleil', 8], ['Jamais', 0]] },
  { id: 'exfo',     q: 'Tu fais un gommage / exfoliant ?', opts: [['1 à 2 fois par semaine', 10], ['Jamais', 4], ['Tous les jours', 0]] },
  { id: 'adapted',  q: 'Tes produits sont adaptés à ton type de peau ?', opts: [['Oui, je les ai choisis pour ça', 10], ['Je ne sais pas', 4], ['Non / savon classique', 0]] },
  { id: 'touch',    q: 'Tu touches ou perces tes boutons ?', opts: [['Jamais', 10], ['Parfois', 4], ['Souvent', 0]] },
  { id: 'pillow',   q: 'Tu changes ta taie d\'oreiller…', opts: [['Chaque semaine', 10], ['Toutes les 2 semaines', 5], ['Moins souvent', 0]] },
  { id: 'sleep',    q: 'Tu dors combien d\'heures en moyenne ?', opts: [['7 h ou plus', 10], ['6 h environ', 5], ['Moins de 6 h', 0]] },
];

export const SKIN_FEEL_Q = {
  q: 'En fin de journée, ta peau est plutôt…',
  opts: [
    ['brille_tout', 'Brillante sur tout le visage'],
    ['brille_t', 'Brillante sur le front, le nez et le menton'],
    ['tiraille', 'Elle tiraille, elle est sèche'],
    ['confort', 'Confortable, rien de spécial'],
    ['reagit', 'Elle rougit ou picote facilement'],
  ],
};

export const V2_FEATURES = [
  ['⌚', 'Apple Santé / Google Fit', 'Pas et sommeil synchronisés automatiquement'],
  ['🔔', 'Rappels', 'Notifications pour boire, dormir et t\'entraîner'],
  ['🤝', 'Défis entre amis', 'Classements et défis à plusieurs'],
  ['🌙', 'Mode Ramadan', 'Repas, hydratation et séances adaptés au jeûne'],
];

/* ---------- Pays (produits conseillés selon le pays) ---------- */
export const COUNTRIES = {
  FR: { label: 'France', flag: '🇫🇷', cur: 'euros (€)' },
  DZ: { label: 'Algérie', flag: '🇩🇿', cur: 'dinars algériens (DA)' },
  MA: { label: 'Maroc', flag: '🇲🇦', cur: 'dirhams (MAD)' },
  TN: { label: 'Tunisie', flag: '🇹🇳', cur: 'dinars tunisiens (TND)' },
  BE: { label: 'Belgique', flag: '🇧🇪', cur: 'euros (€)' },
  CH: { label: 'Suisse', flag: '🇨🇭', cur: 'francs suisses (CHF)' },
  CA: { label: 'Canada', flag: '🇨🇦', cur: 'dollars canadiens ($ CA)' },
  LU: { label: 'Luxembourg', flag: '🇱🇺', cur: 'euros (€)' },
  SN: { label: 'Sénégal', flag: '🇸🇳', cur: 'francs CFA (FCFA)' },
  CI: { label: 'Côte d\'Ivoire', flag: '🇨🇮', cur: 'francs CFA (FCFA)' },
  OTHER: { label: 'Autre pays', flag: '🌍', cur: 'monnaie locale' },
};

/* ---------- Offre ---------- */
// Limites de l'offre gratuite, par semaine
export const FREE_LIMITS = { coach: 5, scan: 1, meal: 3, review: 0 };
export const LIMIT_LABELS = { coach: 'messages au coach', scan: 'scan peau avec IA', meal: 'photos de repas', review: 'bilans IA' };
export const PREMIUM_FEATURES = [
  ['🤖', 'Coach IA illimité', 'Pose toutes tes questions, il adapte tes séances à ta forme du jour'],
  ['✨', 'Scans peau illimités', 'Suis l\'évolution de ta peau, avec les produits de ton pays'],
  ['📸', 'Photos de repas illimitées', 'Les calories se remplissent toutes seules'],
  ['📊', 'Bilan du dimanche par le coach', 'Ce qui a marché, ce qui coince, tes 3 objectifs de la semaine'],
  ['📈', 'Programme qui évolue avec toi', 'Charges, répétitions et semaines légères ajustées à tes retours'],
];

/* ============================================================
   V4 — Questions du scan (banque qui varie), Le savais-tu, progression
   ============================================================ */
// opts : [libellé, points, conseil spécifique facultatif]. Le score final est ramené sur 100.
// core : posées à chaque scan. Les autres tournent (5 par scan, en priorité celles pas posées la dernière fois).
export const SKIN_Q_POOL = [
  { id: 'clean_pm', core: true, q: 'Tu nettoies ton visage le soir ?', opts: [['Tous les soirs', 15], ['Parfois', 6], ['Rarement', 0]], good: 'Nettoyage du soir régulier', fix: 'Nettoie ton visage chaque soir : sébum, pollution et crème solaire bouchent les pores pendant la nuit.' },
  { id: 'moist', core: true, q: 'Tu mets une crème hydratante ?', opts: [['Tous les jours', 15], ['Parfois', 6], ['Jamais', 0]], good: 'Hydratation quotidienne', fix: 'Hydrate ta peau matin et soir, même si elle est grasse.' },
  { id: 'spf', core: true, q: 'Tu mets une protection solaire (SPF) ?', opts: [['Tous les jours', 20], ['Seulement l\'été ou au soleil', 8], ['Jamais', 0]], good: 'Protection solaire tous les jours', fix: 'Mets un SPF tous les jours, même quand il fait gris : c\'est le meilleur anti-taches et anti-âge.' },
  { id: 'exfo', q: 'Tu fais un gommage ou un exfoliant ?', opts: [['1 à 2 fois par semaine', 10], ['Jamais', 4, 'Une exfoliation douce 1 à 2 fois par semaine aide à désincruster les pores et à raviver l\'éclat.'], ['Tous les jours', 0, 'Exfolier tous les jours abîme la barrière de la peau : limite-toi à 1 ou 2 fois par semaine.']], good: 'Exfoliation à la bonne fréquence' },
  { id: 'adapted', q: 'Tes produits sont adaptés à ton type de peau ?', opts: [['Oui, je les ai choisis pour ça', 10], ['Je ne sais pas', 4], ['Non, j\'utilise un savon classique', 0]], good: 'Produits adaptés à ta peau', fix: 'Le savon classique décape la peau : passe à un nettoyant doux adapté à ton type de peau.' },
  { id: 'touch', q: 'Tu touches ou perces tes boutons ?', opts: [['Jamais', 10], ['Parfois', 4], ['Souvent', 0]], good: 'Tu ne touches pas tes boutons', fix: 'Toucher et percer les boutons propage les bactéries et laisse des marques brunes.' },
  { id: 'pillow', q: 'Tu changes ta taie d\'oreiller…', opts: [['Chaque semaine', 10], ['Toutes les 2 semaines', 5], ['Moins souvent', 0]], good: 'Taie d\'oreiller changée souvent', fix: 'Change ta taie d\'oreiller chaque semaine : elle accumule sébum et bactéries.' },
  { id: 'sleep', q: 'Tu dors combien d\'heures en moyenne ?', opts: [['7 h ou plus', 10], ['6 h environ', 5], ['Moins de 6 h', 0]], good: 'Bon sommeil', fix: 'Dors 7 h ou plus : la peau se répare surtout la nuit, et les cernes diminuent.' },
  { id: 'water', q: 'Tu bois combien d\'eau par jour ?', opts: [['1,5 L ou plus', 10], ['Autour de 1 L', 5], ['Moins d\'1 L', 0]], good: 'Bonne hydratation', fix: 'Bois régulièrement dans la journée : une peau déshydratée tiraille et marque plus les ridules.' },
  { id: 'makeup', q: 'Le soir, tu te démaquilles ?', opts: [['Je ne me maquille pas', 10], ['Toujours avant de dormir', 10], ['Parfois je dors maquillé(e)', 0]], good: 'Peau démaquillée chaque soir', fix: 'Ne dors jamais maquillé(e) : le maquillage mélangé au sébum bouche les pores toute la nuit.' },
  { id: 'phone', q: 'Tu nettoies l\'écran de ton téléphone ?', opts: [['Chaque semaine', 10], ['De temps en temps', 5], ['Jamais', 0]], good: 'Téléphone propre', fix: 'Nettoie ton écran chaque semaine : il touche ta joue à chaque appel et transporte beaucoup de bactéries.' },
  { id: 'towel', q: 'Pour sécher ton visage, tu utilises…', opts: [['Une serviette propre réservée au visage', 10], ['La même serviette que pour le corps', 4], ['Je frotte fort avec n\'importe quelle serviette', 0]], good: 'Serviette visage dédiée', fix: 'Sèche ton visage en tapotant avec une serviette propre réservée au visage, changée souvent.' },
  { id: 'hotwater', q: 'Tu te rinces le visage à l\'eau…', opts: [['Tiède', 10], ['Froide', 8], ['Très chaude', 0]], good: 'Rinçage à l\'eau tiède', fix: 'Évite l\'eau très chaude sur le visage : elle dessèche et accentue les rougeurs. Préfère l\'eau tiède.' },
  { id: 'sport_rinse', q: 'Après le sport, tu rinces ton visage ?', opts: [['Oui, rapidement', 10], ['Parfois', 5], ['Non, j\'attends le soir', 0]], good: 'Visage rincé après le sport', fix: 'Rince ton visage juste après le sport : la sueur et le sébum mélangés favorisent les boutons.' },
  { id: 'stress', q: 'En ce moment, ton niveau de stress est…', opts: [['Bas', 10], ['Moyen', 6], ['Élevé', 2]], good: 'Stress maîtrisé', fix: 'Le stress augmente le sébum et les poussées de boutons : marche, respiration lente et sommeil t\'aideront.' },
  { id: 'sugar', q: 'Sucreries, sodas, fast-food… tu en manges ?', opts: [['Rarement', 10], ['Quelques fois par semaine', 5], ['Presque tous les jours', 0]], good: 'Alimentation peu sucrée', fix: 'Limite sodas, sucreries et produits très raffinés : chez beaucoup de personnes, ils aggravent les boutons.' },
  { id: 'veggies', q: 'Fruits et légumes, tu en manges…', opts: [['À presque chaque repas', 10], ['Une fois par jour', 5], ['Rarement', 0]], good: 'Assez de fruits et légumes', fix: 'Ajoute des fruits et légumes colorés à chaque repas : leurs antioxydants protègent ta peau.' },
  { id: 'smoke', q: 'Tu fumes ou tu vapotes ?', opts: [['Non', 10], ['Un peu', 3], ['Oui, chaque jour', 0]], good: 'Pas de tabac', fix: 'Le tabac réduit l\'oxygénation de la peau et accélère les rides : réduire, c\'est déjà gagner.' },
  { id: 'spf_reapply', q: 'Quand tu restes longtemps dehors, tu remets de la crème solaire ?', opts: [['Oui, toutes les 2 heures', 10], ['Parfois', 5], ['Non, une fois le matin suffit', 0]], good: 'SPF renouvelé dehors', fix: 'Dehors au soleil, remets ta protection solaire toutes les 2 heures : elle s\'use avec la sueur et le temps.' },
  { id: 'hands', q: 'Avant d\'appliquer tes soins, tu te laves les mains ?', opts: [['Toujours', 10], ['Parfois', 5], ['Jamais', 0]], good: 'Mains propres pour les soins', fix: 'Lave-toi les mains avant tes soins : sinon tu déposes des bactéries directement sur ta peau.' },
  { id: 'patch', q: 'Quand tu testes un nouveau produit…', opts: [['Je l\'essaie d\'abord sur une petite zone', 10], ['Je l\'applique directement partout', 3], ['J\'en change très souvent', 0]], good: 'Nouveaux produits testés avant', fix: 'Teste chaque nouveau produit 2 ou 3 jours sur une petite zone, et n\'en change pas trop souvent.' },
  { id: 'neck', q: 'Tes soins, tu les appliques aussi sur le cou ?', opts: [['Oui, toujours', 10], ['Parfois', 5], ['Jamais', 2]], good: 'Le cou n\'est pas oublié', fix: 'Prolonge crème et SPF jusqu\'au cou : sa peau est fine et marque vite.' },
];
export const SKIN_FEEL_VARIANTS = [
  'En fin de journée, ta peau est plutôt…',
  'Vers 17 h, quand tu te regardes dans le miroir, ta peau est…',
  'Juste après la douche, sans rien mettre, ta peau…',
  'Si tu passes un mouchoir sur ton visage en fin d\'après-midi, ta peau est…',
];

/* Le savais-tu ? — petits pense-bêtes santé et soin */
export const FACTS = [
  // Peau
  ['peau', '☀️', 'Les UVA traversent les nuages et les vitres : ils font vieillir la peau même quand il fait gris.'],
  ['peau', '🧴', 'Pour bien protéger le visage, il faut environ 2 doigts de crème solaire (la longueur de l\'index et du majeur).'],
  ['peau', '💧', 'Une peau grasse peut aussi être déshydratée : la grasse produit trop de sébum, la déshydratée manque d\'eau.'],
  ['peau', '🫧', 'Nettoyer son visage plus de 2 fois par jour peut rendre la peau encore plus grasse : elle compense.'],
  ['peau', '🔁', 'La peau renouvelle sa surface en 4 à 6 semaines : laisse au moins 4 semaines à un produit avant de juger.'],
  ['peau', '🍋', 'Le citron pur sur la peau est une fausse bonne idée : il irrite et peut provoquer des taches au soleil.'],
  ['peau', '🌙', 'La nuit, la peau se répare davantage : c\'est le meilleur moment pour les soins actifs comme le rétinol.'],
  ['peau', '👆', 'Un bouton percé met souvent plus longtemps à guérir et peut laisser une tache brune pendant des mois.'],
  ['peau', '🧊', 'Un glaçon enveloppé dans un tissu, quelques secondes, peut dégonfler un bouton rouge et douloureux.'],
  ['peau', '📱', 'Ton écran de téléphone touche ta joue à chaque appel : le nettoyer aide à limiter les boutons de ce côté.'],
  ['peau', '🛏️', 'Une taie d\'oreiller garde sébum, cheveux et produits : la changer chaque semaine aide les peaux à boutons.'],
  ['peau', '🧪', 'Niacinamide : elle aide à réguler le sébum, resserrer l\'aspect des pores et atténuer les marques.'],
  ['peau', '🧪', 'Acide salicylique (BHA) : il pénètre dans le pore pour le désincruster, idéal contre les points noirs.'],
  ['peau', '🧪', 'Acide hyaluronique : il retient l\'eau dans la peau. Applique-le sur peau encore un peu humide.'],
  ['peau', '⚠️', 'Rétinol et acides exfoliants le même soir, c\'est souvent trop : alterne-les pour éviter les irritations.'],
  ['peau', '🤰', 'Pendant la grossesse, on évite le rétinol : demande conseil à ton médecin ou ton pharmacien.'],
  ['peau', '👀', 'La peau autour des yeux est environ 4 fois plus fine qu\'ailleurs : applique les soins en tapotant.'],
  ['peau', '🧔', 'Après le rasage, un soin apaisant sans alcool limite le feu du rasoir et les poils incarnés.'],
  ['peau', '💄', 'Dormir maquillé(e) bouche les pores : même fatigué(e), une eau micellaire vaut mieux que rien.'],
  ['peau', '🌡️', 'L\'eau très chaude dessèche la peau et accentue les rougeurs : rince ton visage à l\'eau tiède.'],
  ['peau', '🧼', 'Le savon de Marseille ou le gel douche sur le visage décapent : prends un nettoyant doux pour visage.'],
  ['peau', '🕶️', 'Les mains et le cou vieillissent aussi : pense à y mettre ta crème et ta protection solaire.'],
  // Eau
  ['eau', '🧠', 'Perdre 1 à 2 % de son eau suffit à faire baisser la concentration et l\'énergie.'],
  ['eau', '🍉', 'Environ 20 % de l\'eau de la journée vient des aliments : soupes, fruits, légumes, laitages.'],
  ['eau', '🚽', 'Des urines jaune pâle sont un bon signe d\'hydratation. Foncées : il est temps de boire.'],
  ['eau', '🍽️', 'On confond parfois soif et faim : un verre d\'eau avant de grignoter aide à faire la différence.'],
  ['eau', '☕', 'Le thé et le café comptent aussi dans ton eau de la journée, s\'ils ne sont pas trop sucrés.'],
  ['eau', '🏃', 'Pendant le sport, boire par petites gorgées régulières vaut mieux que beaucoup d\'un coup à la fin.'],
  // Sommeil
  ['sommeil', '📵', 'La lumière des écrans retarde l\'endormissement : coupe-les 30 à 60 min avant de dormir.'],
  ['sommeil', '⏰', 'Se lever à la même heure chaque jour, même le week-end, est le meilleur réglage pour bien dormir.'],
  ['sommeil', '☕', 'La caféine agit plusieurs heures : évite café, thé fort et sodas caféinés après 15 h.'],
  ['sommeil', '🌡️', 'Une chambre fraîche (autour de 18-19 °C) aide à s\'endormir plus vite.'],
  ['sommeil', '💪', 'C\'est pendant le sommeil profond que le corps libère le plus d\'hormone de croissance : tes muscles s\'y réparent.'],
  ['sommeil', '🍕', 'Mal dormir augmente l\'appétit, surtout pour le sucré et le gras, le lendemain.'],
  ['sommeil', '😴', 'Une sieste de 10 à 20 minutes recharge sans laisser la tête lourde.'],
  // Sport
  ['sport', '🔥', 'Les muscles se construisent pendant la récupération, pas pendant la séance : les jours de repos comptent.'],
  ['sport', '🦵', 'Les cuisses et les fessiers sont les plus gros muscles du corps : les travailler fait dépenser plus d\'énergie.'],
  ['sport', '🚶', '30 minutes de marche rapide par jour améliorent déjà le cœur, le moral et le sommeil.'],
  ['sport', '🧘', 'S\'échauffer 5 minutes réduit le risque de blessure et rend les premières séries plus efficaces.'],
  ['sport', '📈', 'Pour progresser, le corps a besoin d\'un peu plus de difficulté chaque semaine : c\'est la surcharge progressive.'],
  ['sport', '🤕', 'Avoir des courbatures n\'est pas obligatoire pour progresser : elles diminuent quand le corps s\'habitue.'],
  ['sport', '🏋️', 'Les femmes ne prennent pas un « gros volume » facilement avec la musculation : elles gagnent surtout en tonus et en force.'],
  ['sport', '❤️', 'Bouger régulièrement réduit le stress : l\'effet sur le moral se ressent souvent dès la première séance.'],
  ['sport', '🪑', 'Rester assis longtemps fatigue le dos : lève-toi et bouge 2 minutes toutes les heures.'],
  // Nutrition
  ['nutrition', '🥚', 'Les protéines rassasient plus que les glucides et les graisses : elles aident à moins grignoter.'],
  ['nutrition', '🍽️', 'Manger lentement aide à mieux sentir la satiété : il faut environ 20 minutes pour que le cerveau la ressente.'],
  ['nutrition', '🥗', 'Les fibres (légumes, légumineuses, céréales complètes) nourrissent les bonnes bactéries de l\'intestin.'],
  ['nutrition', '🫒', 'Les bonnes graisses (huile d\'olive, noix, poissons gras) sont utiles pour la peau, le cœur et le cerveau.'],
  ['nutrition', '🥤', 'Une canette de soda contient l\'équivalent d\'environ 7 morceaux de sucre.'],
  ['nutrition', '🍌', 'Avant le sport, un fruit 30 à 60 minutes avant donne de l\'énergie sans peser sur l\'estomac.'],
  ['nutrition', '🫘', 'Lentilles, pois chiches et haricots sont riches en protéines et en fibres, et peu chers.'],
  ['nutrition', '🍞', 'Un régime trop strict finit souvent par craquer : mieux vaut un petit déficit tenu longtemps.'],
  ['nutrition', '🥛', 'Un yaourt nature ou un fromage blanc après la séance apporte des protéines facilement.'],
  // Santé / mental
  ['santé', '🧠', 'Prendre 10 minutes de lumière naturelle le matin aide à régler l\'horloge du corps et le moral.'],
  ['santé', '🌬️', 'Respirer lentement (inspirer 4 s, expirer 6 s) pendant 2 minutes calme le stress.'],
  ['santé', '🪥', 'Se brosser les dents 2 minutes, 2 fois par jour : la santé de la bouche joue aussi sur celle du cœur.'],
  ['santé', '👂', 'Un écouteur à fond plus d\'une heure fatigue l\'oreille : garde le volume sous 60 %.'],
  ['santé', '🩺', 'Un bilan de santé de temps en temps permet de vérifier tension, sucre et cholestérol avant qu\'ils posent problème.'],
  ['santé', '🤝', 'Voir ses proches et rire ensemble fait vraiment du bien au moral et réduit le stress.'],
];
export const FACT_CATS = { peau: 'Peau', eau: 'Hydratation', sommeil: 'Sommeil', sport: 'Sport', nutrition: 'Nutrition', 'santé': 'Santé' };

/* Progression : niveaux et badges */
export const LEVELS_XP = [
  [0, 'Débutant', '🌱'], [300, 'Motivé', '🔥'], [800, 'Régulier', '💪'], [1600, 'Déterminé', '⚡'],
  [2800, 'Athlète', '🏅'], [4500, 'Warrior', '🛡️'], [7000, 'Champion', '🏆'], [10000, 'Légende', '👑'],
];
export const XP_RULES = [
  ['🏋️', 'Séance terminée', 50], ['💧', 'Objectif d\'eau atteint', 20], ['👟', 'Objectif de pas atteint', 20],
  ['😴', 'Nuit notée', 10], ['🍽️', 'Journée de repas notée', 10], ['⚖️', 'Pesée', 5], ['✨', 'Scan de peau', 40],
];

/* Scan détaillé : indicateurs et zones fines */
export const SKIN_INDIC = { hydratation: ['💧', 'Hydratation'], sebum: ['✨', 'Équilibre du sébum'], pores: ['⚫', 'Pores'], texture: ['🧱', 'Texture'], eclat: ['🌟', 'Éclat'], uniformite: ['🎨', 'Uniformité du teint'], rougeurs: ['🌹', 'Rougeurs'], imperfections: ['🔴', 'Imperfections'] };
export const SKIN_DZONES = { front: 'Front', tempes: 'Tempes', entre_sourcils: 'Entre les sourcils', contour_yeux: 'Contour des yeux', nez: 'Nez', ailes_nez: 'Ailes du nez', joue_g: 'Joue gauche', joue_d: 'Joue droite', tour_bouche: 'Tour de la bouche', menton: 'Menton', machoire: 'Mâchoire' };
export const SCAN_ANGLES = [
  { id: 'face', label: 'De face', hint: 'Regarde l\'objectif, visage dans l\'ovale', wait: 3 },
  { id: 'gauche', label: 'Côté gauche', hint: '⬅ Tourne doucement la tête vers ta gauche', wait: 4 },
  { id: 'droite', label: 'Côté droit', hint: 'Tourne doucement la tête vers ta droite ➡', wait: 4 },
];
