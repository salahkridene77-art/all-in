/* ============================================================
   ALL IN — Configuration
   FIREBASE_CONFIG : bloc copié depuis la console Firebase (Paramètres du projet > Vos applications > Web).
   Ces valeurs sont publiques par conception : la sécurité vient des règles Firestore (firestore.rules).
   Tant qu'il vaut null, l'appli fonctionne en mode local (V1), sans comptes ni IA.
   ============================================================ */
export const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyBUMS3gJIS1WYtIZJriRYD7oCXrxt-RqM0',
  authDomain: 'all-in-3188d.firebaseapp.com',
  projectId: 'all-in-3188d',
  storageBucket: 'all-in-3188d.firebasestorage.app',
  messagingSenderId: '428779125663',
  appId: '1:428779125663:web:c2ea16cc50d36bd4d05baa',
};

// Adresse du serveur IA (fonction Vercel). Sur le domaine Vercel lui-même, on utilise un chemin relatif.
const VERCEL_API = 'https://all-in-ai-six.vercel.app/api/ai';
export const API_URL = location.hostname.endsWith('.vercel.app') ? '/api/ai' : VERCEL_API;

export const FIREBASE_SDK = '13.2.0';
