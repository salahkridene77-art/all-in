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

## Feuille de route V2
Coach IA, scan IA du visage, photo de repas, synchro Apple Santé / Google Fit, comptes utilisateurs, rappels, défis entre amis.
