# All In

Application web (PWA) tout-en-un : sport, nutrition, eau, sommeil, pas et skincare.

## Fonctionnalités (V1)
- **Profil et objectifs** : questionnaire (objectif, niveau, lieu, rythme) → calories, protéines, eau, pas et sommeil calculés automatiquement.
- **Sport** : programme généré selon l'objectif (perte de poids, masse musculaire, prise de masse, remise en forme, endurance), maison ou salle, 2 à 6 séances/semaine. Mode séance guidé avec minuteur de repos et chrono.
- **Nutrition** : journal par repas, base de 60+ aliments (dont plats maghrébins), macros, 14 recettes healthy, conseils.
- **Eau** : verre animé, ajouts rapides, historique 7 jours.
- **Sommeil** : saisie des nuits, qualité, historique, calculateur de cycles.
- **Pas** : saisie manuelle, compteur en direct via le capteur du téléphone, distance et calories.
- **Corps** : pesées, courbe, IMC.
- **Peau** : photo guidée (contrôle de la lumière), carte des zones du visage, questionnaire de routine → type de peau, score skincare /100, routine matin/soir, ingrédients à privilégier ou à éviter, journal photo.

Toutes les données restent sur l'appareil (localStorage). Export/import JSON depuis le profil.

## Technique
HTML, CSS et JavaScript (modules ES), sans étape de build. Hébergé sur GitHub Pages.
Fonctionne hors ligne grâce au service worker (`sw.js`). Installable sur l'écran d'accueil.

## Mise à jour
Après chaque modification, incrémenter `CACHE` dans `sw.js` pour que les téléphones récupèrent la nouvelle version.

## V2 : comptes et IA
- **Comptes** (Firebase Auth : e-mail ou Google) et **synchronisation** Firestore, local d'abord. Les photos de peau restent sur l'appareil.
- **Coach IA** (Gemini) : brief du jour et discussion, avec les données de l'utilisateur en contexte.
- **Scan IA du visage** et **photo de repas** (Gemini, avec consentement avant envoi).
- Serveur IA : `api/ai.js` (fonction Vercel). Vérifie le jeton Firebase, garde la clé Gemini secrète.

### Configuration
- `js/config.js` : bloc `firebaseConfig` (public) et adresse du serveur IA.
- Vercel, variables : `GEMINI_API_KEY` (secret), `FIREBASE_PROJECT_ID`, facultatif `GEMINI_MODEL`, `DAILY_LIMIT`.
- Firebase : coller `firestore.rules` dans Firestore > Règles. Ajouter le domaine GitHub Pages dans Authentication > Domaines autorisés.

## À venir
Synchro Apple Santé / Google Fit, rappels, défis entre amis, bilans mensuels.
