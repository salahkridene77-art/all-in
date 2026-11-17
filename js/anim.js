/* ============================================================
   ALL IN — Démonstrations animées des exercices (SVG, hors ligne)
   Un personnage en « fil de fer » est décrit par quelques images clés
   (position du bassin, inclinaison du buste, pieds et mains) ;
   les genoux et coudes sont calculés automatiquement (cinématique inverse)
   puis l'animation est jouée en boucle avec SMIL (sans JavaScript).
   Repère : 200 × 200, sol à y = 180, personnage tourné vers la droite.
   ============================================================ */

const LEN = { torso: 46, neck: 6, head: 9, ua: 25, fa: 25, th: 34, sh: 34 };
const LEG = LEN.th + LEN.sh;
const rad = (d) => (d * Math.PI) / 180;
const dirv = (deg, l) => [Math.cos(rad(deg)) * l, Math.sin(rad(deg)) * l];
const add = (a, b) => [a[0] + b[0], a[1] + b[1]];

/* Cinématique inverse à deux segments : renvoie l'articulation du milieu */
function ik(a, b, l1, l2, sign) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  let d = Math.hypot(dx, dy);
  d = Math.min(Math.max(d, Math.abs(l1 - l2) + 0.01), l1 + l2 - 0.01);
  const base = Math.atan2(dy, dx);
  const ang = Math.acos((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d));
  const t = base + sign * ang;
  const j = [a[0] + Math.cos(t) * l1, a[1] + Math.sin(t) * l1];
  // si la cible est hors de portée, on ramène l'extrémité sur le segment
  const e = [j[0] + Math.cos(Math.atan2(b[1] - j[1], b[0] - j[0])) * l2, j[1] + Math.sin(Math.atan2(b[1] - j[1], b[0] - j[0])) * l2];
  return [j, e];
}

/* Résout une image clé : renvoie les coordonnées de toutes les articulations */
function solve(f, front) {
  const hip = f.hip;
  const t = f.t ?? -90;
  const sh = add(hip, dirv(t, LEN.torso));
  const head = add(sh, dirv(t, LEN.neck + LEN.head));
  const perp = t + 90;
  const shF = front ? add(sh, dirv(perp, -13)) : sh;
  const shB = front ? add(sh, dirv(perp, 13)) : sh;
  const hipF = front ? add(hip, dirv(perp, -8)) : hip;
  const hipB = front ? add(hip, dirv(perp, 8)) : hip;
  const resolveFoot = (v, h) => {
    if (v === 'line') return add(h, dirv(t + 180, LEG - 0.5));
    if (v && v.r) return add(h, v.r);
    return v;
  };
  const resolveHand = (v, s) => (v && v.r ? add(s, v.r) : v);
  const aF = resolveFoot(f.aF, hipF), aB = resolveFoot(f.aB ?? f.aF, hipB);
  const wF = resolveHand(f.wF, shF), wB = resolveHand(f.wB ?? f.wF, shB);
  const [knF, anF] = ik(hipF, aF, LEN.th, LEN.sh, f.k ?? -1);
  const [knB, anB] = ik(hipB, aB, LEN.th, LEN.sh, f.kB ?? f.k ?? -1);
  const [elF, wrF] = ik(shF, wF, LEN.ua, LEN.fa, f.e ?? 1);
  const [elB, wrB] = ik(shB, wB, LEN.ua, LEN.fa, f.eB ?? f.e ?? 1);
  return { hip, sh, head, shF, shB, hipF, hipB, knF, anF, knB, anB, elF, wrF, elB, wrB };
}

/* Les images clés sont résolues en nombres, interpolées, puis résolues à nouveau (membres de longueur constante) */
function numeric(f, front) {
  const t = f.t ?? -90;
  const sh = add(f.hip, dirv(t, LEN.torso));
  const perp = t + 90;
  const hipF = front ? add(f.hip, dirv(perp, -8)) : f.hip;
  const hipB = front ? add(f.hip, dirv(perp, 8)) : f.hip;
  const shF = front ? add(sh, dirv(perp, -13)) : sh;
  const shB = front ? add(sh, dirv(perp, 13)) : sh;
  const foot = (v, h) => (v === 'line' ? add(h, dirv(t + 180, LEG - 0.5)) : v && v.r ? add(h, v.r) : v);
  const hand = (v, s) => (v && v.r ? add(s, v.r) : v);
  return { ...f, t, aF: foot(f.aF, hipF), aB: foot(f.aB ?? f.aF, hipB), wF: hand(f.wF, shF), wB: hand(f.wB ?? f.wF, shB) };
}
const lerp = (a, b, u) => a + (b - a) * u;
const lerpP = (a, b, u) => [lerp(a[0], b[0], u), lerp(a[1], b[1], u)];
const ease = (u) => 0.5 - Math.cos(Math.PI * u) / 2;

function frames(def) {
  const front = def.view === 'front';
  const keys = def.frames.map((f) => numeric(f, front));
  const steps = def.steps ?? 8;
  const out = [];
  for (let i = 0; i < keys.length; i++) {
    const a = keys[i], b = keys[(i + 1) % keys.length];
    const hold = def.hold ?? 0;
    for (let h = 0; h < hold; h++) out.push(solve(a, front));
    for (let s = 0; s < steps; s++) {
      const u = ease(s / steps);
      out.push(solve({
        hip: lerpP(a.hip, b.hip, u), t: lerp(a.t, b.t, u),
        aF: lerpP(a.aF, b.aF, u), aB: lerpP(a.aB, b.aB, u), wF: lerpP(a.wF, b.wF, u), wB: lerpP(a.wB, b.wB, u),
        k: a.k, kB: a.kB, e: a.e, eB: a.eB,
      }, front));
    }
  }
  return out;
}

/* ---------- Bibliothèque de poses ---------- */
const G = 177; // hauteur des chevilles au sol
const stand = (o = {}) => ({ hip: [100, 110], t: -90, aF: [104, G], aB: [96, G], wF: { r: [4, 48] }, wB: { r: [-3, 48] }, ...o });
const planche = (t, x, o = {}) => ({ hip: [x, G - (LEG - 0.5) * Math.sin(rad(-t))], t, aF: 'line', aB: 'line', ...o });

export const ANIMS = {
  // Jambes
  squat: { frames: [stand({ wF: [140, 64], wB: [137, 66] }), { hip: [78, 142], t: -52, aF: [104, G], aB: [96, G], wF: [152, 104], wB: [149, 106] }] },
  goblet: { frames: [stand({ wF: { r: [16, 14] }, wB: { r: [14, 16] }, e: 1 }), { hip: [80, 144], t: -60, aF: [104, G], aB: [96, G], wF: { r: [16, 16] }, wB: { r: [14, 18] }, e: 1 }], props: ['dumbbellF'] },
  squat_barre: { frames: [stand({ wF: { r: [2, -4] }, wB: { r: [-2, -4] }, e: 1 }), { hip: [80, 142], t: -55, aF: [104, G], aB: [96, G], wF: { r: [2, -4] }, wB: { r: [-2, -4] }, e: 1 }], props: ['barbellBack'] },
  presse: { frames: [{ hip: [70, 150], t: -150, aF: [110, 118], aB: [108, 120], wF: [76, 156], k: 1 }, { hip: [70, 150], t: -150, aF: [132, 96], aB: [130, 98], wF: [76, 156], k: 1 }], props: ['pressSeat'] },
  leg_curl: { frames: [{ hip: [100, 128], t: 180, aF: [167, 130], aB: [166, 131], wF: [40, 150], k: 1 }, { hip: [100, 128], t: 180, aF: [112, 84], aB: [114, 86], wF: [40, 150], k: 1 }], props: ['benchFlat'] },
  fentes: { frames: [stand({ wF: { r: [10, 34] }, wB: { r: [6, 36] } }), { hip: [100, 140], t: -90, aF: [132, G], aB: [56, G], wF: { r: [10, 34] }, wB: { r: [6, 36] }, kB: 1 }] },
  chaise: { frames: [{ hip: [64, 142], t: -90, aF: [100, G], aB: [96, G], wF: { r: [24, 30] }, wB: { r: [22, 32] } }, { hip: [64, 141], t: -91, aF: [100, G], aB: [96, G], wF: { r: [24, 30] }, wB: { r: [22, 32] } }], props: ['wall'], dur: 3 },
  squat_saute: { frames: [{ hip: [86, 140], t: -58, aF: [104, G], aB: [96, G], wF: { r: [10, 40] }, wB: { r: [6, 42] } }, { hip: [100, 100], t: -90, aF: [102, 167], aB: [98, 167], wF: { r: [14, -40] }, wB: { r: [10, -40] } }], dur: 1.2 },

  // Fessiers
  pont: { frames: [{ hip: [100, 170], t: 180, aF: [134, G], aB: [132, G], wF: [70, G], k: 1 }, { hip: [100, 140], t: 159, aF: [134, G], aB: [132, G], wF: [70, G], k: 1 }] },
  bulgare: { frames: [stand({ aB: [56, 146], wF: { r: [8, 46] }, kB: 1 }), { hip: [92, 140], t: -80, aF: [126, G], aB: [56, 146], wF: { r: [8, 46] }, kB: 1 }], props: ['chairBack'] },
  hip_thrust: { frames: [{ hip: [100, 168], t: 205, aF: [140, G], aB: [138, G], wF: { r: [44, 8] }, k: 1 }, { hip: [100, 138], t: 180, aF: [140, G], aB: [138, G], wF: { r: [44, 0] }, k: 1 }], props: ['benchThrust', 'barHip'] },
  rdl: { frames: [stand({ wF: { r: [4, 48] }, wB: { r: [0, 48] } }), { hip: [80, 112], t: -14, aF: [102, G], aB: [98, G], wF: { r: [2, 49] }, wB: { r: [0, 49] } }], props: ['barHands'] },

  // Poussée
  pompes_genoux: { frames: [{ hip: [84, 156], t: -30, aF: [38, 176], aB: [38, 176], wF: [126, G], k: -1 }, { hip: [86, 166], t: -8, aF: [38, 176], aB: [38, 176], wF: [126, G], k: -1 }] },
  pompes: { frames: [planche(-27, 98, { wF: [139, G] }), planche(-8, 102, { wF: [139, G] })] },
  pompes_diam: { frames: [planche(-27, 98, { wF: [139, G] }), planche(-8, 102, { wF: [139, G] })] },
  dc: { frames: [{ hip: [96, 142], t: 180, aF: [128, G], aB: [126, G], wF: [50, 92], k: 1 }, { hip: [96, 142], t: 180, aF: [128, G], aB: [126, G], wF: [52, 128], k: 1 }], props: ['benchPress', 'barbellHands'] },
  dev_incline: { frames: [{ hip: [104, 146], t: 205, aF: [138, G], aB: [136, G], wF: [70, 76], k: 1 }, { hip: [104, 146], t: 205, aF: [138, G], aB: [136, G], wF: [74, 112], k: 1 }], props: ['benchIncline', 'dumbbellF'] },

  // Épaules
  pike: { frames: [{ hip: [96, 106], t: 52, aF: [56, G], aB: [56, G], wF: [130, G] }, { hip: [104, 112], t: 74, aF: [56, G], aB: [56, G], wF: [130, G] }] },
  elev_lat_b: { view: 'front', frames: [stand({ hip: [100, 110], aF: [110, G], aB: [90, G], wF: { r: [-4, 48] }, wB: { r: [4, 48] }, e: -1, eB: 1 }), stand({ hip: [100, 110], aF: [110, G], aB: [90, G], wF: { r: [-46, 4] }, wB: { r: [46, 4] }, e: -1, eB: 1 })], props: ['bottlesFront'] },
  elev_lat: { view: 'front', frames: [stand({ hip: [100, 110], aF: [110, G], aB: [90, G], wF: { r: [-4, 48] }, wB: { r: [4, 48] }, e: -1, eB: 1 }), stand({ hip: [100, 110], aF: [110, G], aB: [90, G], wF: { r: [-46, 4] }, wB: { r: [46, 4] }, e: -1, eB: 1 })], props: ['dumbbellsFront'] },
  dev_mil: { view: 'front', frames: [stand({ aF: [110, G], aB: [90, G], wF: { r: [-24, -2] }, wB: { r: [24, -2] }, e: -1, eB: 1 }), stand({ aF: [110, G], aB: [90, G], wF: { r: [-6, -48] }, wB: { r: [6, -48] }, e: -1, eB: 1 })], props: ['dumbbellsFront'] },

  // Tirage
  superman: { frames: [{ hip: [104, 172], t: 180, aF: [172, 175], aB: [171, 176], wF: [8, 170], k: 1 }, { hip: [104, 172], t: 192, aF: [170, 160], aB: [170, 162], wF: [10, 150], k: 1 }] },
  rowing_sac: { frames: [{ hip: [84, 112], t: -28, aF: [104, G], aB: [96, G], wF: { r: [2, 46] }, e: 1 }, { hip: [84, 112], t: -28, aF: [104, G], aB: [96, G], wF: [110, 106], e: 1 }], props: ['bagHand'] },
  rowing_h: { frames: [{ hip: [84, 112], t: -28, aF: [104, G], aB: [96, G], wF: { r: [2, 46] }, e: 1 }, { hip: [84, 112], t: -28, aF: [104, G], aB: [96, G], wF: [110, 106], e: 1 }], props: ['dumbbellF'] },
  traction: { view: 'front', frames: [{ hip: [100, 120], t: -90, aF: { r: [-4, 62] }, aB: { r: [4, 62] }, wF: [70, 22], wB: [130, 22], e: -1, eB: 1 }, { hip: [100, 88], t: -90, aF: { r: [-4, 62] }, aB: { r: [4, 62] }, wF: [70, 22], wB: [130, 22], e: -1, eB: 1 }], props: ['pullBar'] },
  tirage: { view: 'front', frames: [{ hip: [100, 124], t: -90, aF: [84, 168], aB: [116, 168], wF: [66, 20], wB: [134, 20], e: -1, eB: 1 }, { hip: [100, 124], t: -90, aF: [84, 168], aB: [116, 168], wF: [78, 72], wB: [122, 72], e: -1, eB: 1 }], props: ['latBar'] },

  // Bras
  curl_b: { frames: [stand({ wF: { r: [6, 48] }, wB: { r: [2, 48] }, e: 1 }), stand({ wF: { r: [14, 4] }, wB: { r: [10, 6] }, e: -1 })], props: ['bottleF'] },
  curl: { frames: [stand({ wF: { r: [6, 48] }, wB: { r: [2, 48] }, e: 1 }), stand({ wF: { r: [14, 4] }, wB: { r: [10, 6] }, e: -1 })], props: ['dumbbellF'] },
  dips_chaise: { frames: [{ hip: [80, 124], t: -90, aF: [150, G], aB: [148, G], wF: [72, 122], e: 1 }, { hip: [82, 150], t: -86, aF: [150, G], aB: [148, G], wF: [72, 122], e: 1 }], props: ['chairDips'] },
  triceps_p: { frames: [stand({ t: -82, wF: { r: [22, 26] }, wB: { r: [20, 28] }, e: 1 }), stand({ t: -82, wF: { r: [10, 48] }, wB: { r: [8, 48] }, e: 1 })], props: ['cable'] },

  // Abdos
  planche: { frames: [{ hip: [92, 158], t: -12, aF: 'line', aB: 'line', wF: [166, G], e: -1 }, { hip: [92, 156], t: -13, aF: 'line', aB: 'line', wF: [166, G], e: -1 }], dur: 3 },
  gainage_lat: { frames: [{ hip: [92, 150], t: -27, aF: 'line', aB: 'line', wF: [134, G], wB: { r: [0, -48] } }, { hip: [92, 144], t: -30, aF: 'line', aB: 'line', wF: [134, G], wB: { r: [0, -48] } }], dur: 2.6 },
  crunch: { frames: [{ hip: [104, 172], t: 180, aF: [140, G], aB: [138, G], wF: { r: [-10, -14] }, k: 1, e: -1 }, { hip: [104, 172], t: 212, aF: [140, G], aB: [138, G], wF: { r: [-10, -14] }, k: 1, e: -1 }] },
  releves: { frames: [{ hip: [96, 172], t: 180, aF: [163, 174], aB: [163, 175], wF: [72, G], k: 1 }, { hip: [96, 172], t: 180, aF: [100, 105], aB: [100, 106], wF: [72, G], k: 1 }] },
  mountain: { frames: [planche(-22, 98, { aF: [118, 166], wF: [143, G], k: 1 }), planche(-22, 98, { aB: [118, 166], wF: [143, G], kB: 1 })], dur: 0.8 },

  // Cardio
  jumping: { view: 'front', frames: [{ hip: [100, 110], t: -90, aF: [106, G], aB: [94, G], wF: { r: [-4, 48] }, wB: { r: [4, 48] }, e: -1, eB: 1 }, { hip: [100, 104], t: -90, aF: [76, 171], aB: [124, 171], wF: { r: [-30, -38] }, wB: { r: [30, -38] }, e: -1, eB: 1 }], dur: 0.9 },
  genoux: { frames: [stand({ aF: [120, 136], aB: [98, G], wF: { r: [-14, 40] }, wB: { r: [18, 30] }, k: -1, kB: -1 }), stand({ aF: [102, G], aB: [120, 136], wF: { r: [18, 30] }, wB: { r: [-14, 40] }, k: -1, kB: -1 })], dur: 0.7 },
  burpees: { frames: [
    { hip: [100, 104], t: -90, aF: [102, 170], aB: [98, 170], wF: { r: [14, -40] }, wB: { r: [10, -40] } },
    { hip: [90, 146], t: -36, aF: [104, G], aB: [96, G], wF: [134, G] },
    planche(-22, 98, { wF: [143, G] }),
    { hip: [90, 146], t: -36, aF: [104, G], aB: [96, G], wF: [134, G] },
  ], dur: 2.6 },
  corde: { frames: [stand({ hip: [100, 110], wF: { r: [16, 38] }, wB: { r: [12, 40] } }), stand({ hip: [100, 100], aF: [104, 167], aB: [96, 167], wF: { r: [16, 38] }, wB: { r: [12, 40] } })], dur: 0.6 },
  tapis: { frames: [stand({ hip: [100, 112], aF: [124, G], aB: [78, G], wF: { r: [-14, 44] }, wB: { r: [16, 42] } }), stand({ hip: [100, 108], aF: [102, G], aB: [100, 162], wF: { r: [2, 48] }, wB: { r: [0, 48] } }), stand({ hip: [100, 112], aF: [78, G], aB: [124, G], wF: { r: [16, 42] }, wB: { r: [-14, 44] } }), stand({ hip: [100, 108], aF: [100, 162], aB: [102, G], wF: { r: [0, 48] }, wB: { r: [2, 48] } })], props: ['treadmill'], dur: 1.4 },
  velo: { frames: [0, 90, 180, 270].map((a) => ({ hip: [88, 108], t: -62, aF: [110 + 15 * Math.cos(rad(a)), 158 + 15 * Math.sin(rad(a))], aB: [110 - 15 * Math.cos(rad(a)), 158 - 15 * Math.sin(rad(a))], wF: [140, 84] })), props: ['bike'], dur: 1.2, steps: 6 },
  rameur: { frames: [{ hip: [86, 166], t: -64, aF: [140, 168], aB: [139, 169], wF: [150, 146], k: -1 }, { hip: [62, 166], t: -112, aF: [140, 168], aB: [139, 169], wF: [86, 140], k: -1 }], props: ['rower'], dur: 1.8 },
};

/* ---------- Accessoires (statiques ou liés aux mains) ---------- */
const STATIC_PROPS = {
  wall: '<rect x="30" y="40" width="8" height="140" rx="2" class="prop"/>',
  pressSeat: '<path d="M40 175 L66 140 L96 160" class="prop-line"/><rect x="118" y="80" width="10" height="56" rx="3" transform="rotate(35 123 108)" class="prop"/>',
  benchFlat: '<rect x="30" y="134" width="140" height="8" rx="3" class="prop"/><rect x="40" y="142" width="6" height="38" class="prop"/><rect x="150" y="142" width="6" height="38" class="prop"/>',
  chairBack: '<rect x="36" y="146" width="40" height="7" rx="2" class="prop"/><rect x="40" y="153" width="5" height="27" class="prop"/><rect x="68" y="153" width="5" height="27" class="prop"/>',
  benchThrust: '<rect x="24" y="128" width="36" height="52" rx="4" class="prop"/>',
  benchPress: '<rect x="30" y="148" width="100" height="8" rx="3" class="prop"/><rect x="40" y="156" width="6" height="24" class="prop"/><rect x="110" y="156" width="6" height="24" class="prop"/><rect x="34" y="70" width="5" height="110" class="prop"/>',
  benchIncline: '<path d="M60 160 L118 150 M70 158 L44 112" class="prop-line"/><rect x="58" y="160" width="6" height="20" class="prop"/>',
  chairDips: '<rect x="44" y="118" width="40" height="7" rx="2" class="prop"/><rect x="48" y="125" width="5" height="55" class="prop"/><rect x="76" y="125" width="5" height="55" class="prop"/>',
  cable: '<rect x="160" y="10" width="8" height="170" rx="3" class="prop"/>',
  pullBar: '<rect x="40" y="18" width="120" height="5" rx="2" class="prop"/>',
  latBar: '<rect x="96" y="0" width="8" height="12" class="prop"/><rect x="88" y="150" width="24" height="8" rx="3" class="prop"/>',
  treadmill: '<rect x="40" y="180" width="130" height="8" rx="4" class="prop"/><path d="M160 180 L150 100 L135 100" class="prop-line"/>',
  bike: '<circle cx="110" cy="158" r="15" class="prop-ring"/><path d="M88 112 L110 158 L140 92 M80 110 L96 110 M134 86 L146 86" class="prop-line"/>',
  rower: '<rect x="30" y="176" width="140" height="6" rx="3" class="prop"/><rect x="140" y="160" width="8" height="18" class="prop"/>',
};

/* Accessoires qui suivent une main (dessinés à chaque image) */
const HAND_PROPS = {
  dumbbellF: (p) => `<rect x="${p.wrF[0] - 9}" y="${p.wrF[1] - 3}" width="18" height="6" rx="3" class="prop-acc"/>`,
  bottleF: (p) => `<rect x="${p.wrF[0] - 4}" y="${p.wrF[1] - 12}" width="8" height="16" rx="3" class="prop-acc"/>`,
  bagHand: (p) => `<rect x="${p.wrF[0] - 8}" y="${p.wrF[1]}" width="16" height="16" rx="4" class="prop-acc"/>`,
  barbellBack: (p) => `<circle cx="${p.sh[0] - 2}" cy="${p.sh[1] - 3}" r="10" class="prop-acc"/>`,
  barbellHands: (p) => `<circle cx="${p.wrF[0]}" cy="${p.wrF[1]}" r="10" class="prop-acc"/>`,
  barHands: (p) => `<circle cx="${p.wrF[0]}" cy="${p.wrF[1] + 4}" r="11" class="prop-acc"/>`,
  barHip: (p) => `<circle cx="${p.hip[0]}" cy="${p.hip[1] - 8}" r="10" class="prop-acc"/>`,
  dumbbellsFront: (p) => `<rect x="${p.wrF[0] - 3}" y="${p.wrF[1] - 8}" width="6" height="16" rx="3" class="prop-acc"/><rect x="${p.wrB[0] - 3}" y="${p.wrB[1] - 8}" width="6" height="16" rx="3" class="prop-acc"/>`,
  bottlesFront: (p) => `<rect x="${p.wrF[0] - 4}" y="${p.wrF[1] - 6}" width="8" height="14" rx="3" class="prop-acc"/><rect x="${p.wrB[0] - 4}" y="${p.wrB[1] - 6}" width="8" height="14" rx="3" class="prop-acc"/>`,
  rope: (p) => `<path d="M${p.wrF[0]} ${p.wrF[1]} Q ${p.hip[0] + 40} ${G + 6} ${p.wrB[0] - 20} ${p.wrB[1]}" class="prop-rope"/>`,
};

const f1 = (n) => Math.round(n * 10) / 10;

/* Construit le SVG animé d'un exercice. Renvoie '' si l'exercice n'a pas d'animation. */
export function exerciseAnim(id, { size = 200, className = '' } = {}) {
  const def = ANIMS[id];
  if (!def) return '';
  const fr = frames(def);
  const front = def.view === 'front';
  const dur = def.dur ?? 2.2;
  const vals = (fn) => fr.map(fn).map(f1).join(';') + ';' + f1(fn(fr[0]));
  const anim = (attr, fn) => `<animate attributeName="${attr}" dur="${dur}s" repeatCount="indefinite" values="${vals(fn)}"/>`;
  const line = (a, b, cls) => `<line class="${cls}" x1="${f1(fr[0][a][0])}" y1="${f1(fr[0][a][1])}" x2="${f1(fr[0][b][0])}" y2="${f1(fr[0][b][1])}">${anim('x1', (p) => p[a][0])}${anim('y1', (p) => p[a][1])}${anim('x2', (p) => p[b][0])}${anim('y2', (p) => p[b][1])}</line>`;
  const back = front ? 'limb' : 'limb back';
  const handProps = (def.props || []).filter((k) => HAND_PROPS[k]);
  // Les accessoires liés aux mains sont animés image par image (une couche par image, visibilité discrète)
  const handLayer = handProps.length ? fr.map((p, i) => `<g opacity="0">${handProps.map((k) => HAND_PROPS[k](p)).join('')}<animate attributeName="opacity" dur="${dur}s" repeatCount="indefinite" calcMode="discrete" keyTimes="0;${f1(i / fr.length * 1000) / 1000};${f1((i + 1) / fr.length * 1000) / 1000};1" values="0;1;0;0"/></g>`).join('') : '';
  return `<svg class="ex-anim ${className}" viewBox="0 0 200 200" width="${size}" height="${size}" role="img" aria-label="Démonstration animée">
    <line x1="10" y1="${G + 3}" x2="190" y2="${G + 3}" class="ground"/>
    ${(def.props || []).filter((k) => STATIC_PROPS[k]).map((k) => STATIC_PROPS[k]).join('')}
    ${line('hipB', 'knB', back)}${line('knB', 'anB', back)}${line('shB', 'elB', back)}${line('elB', 'wrB', back)}
    ${front ? line('hipF', 'hipB', 'limb') + line('shF', 'shB', 'limb') : ''}
    ${line('hip', 'sh', 'torso')}
    ${line('hipF', 'knF', 'limb')}${line('knF', 'anF', 'limb')}${line('shF', 'elF', 'limb')}${line('elF', 'wrF', 'limb')}
    <circle class="head" r="${LEN.head}" cx="${f1(fr[0].head[0])}" cy="${f1(fr[0].head[1])}">${anim('cx', (p) => p.head[0])}${anim('cy', (p) => p.head[1])}</circle>
    ${handLayer}
  </svg>`;
}

export const hasAnim = (id) => !!ANIMS[id];
