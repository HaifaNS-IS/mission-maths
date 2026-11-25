/* Lot 4a — module Repère SVG (js/repere.js) : dessin du repère de −6 à 6, accroche d'un toucher au nœud le plus proche, droite coupée au cadre.
   Oracle : la géométrie du cadre (marge 16, 12 unités sur 288 px), recalculée ici à la main du test, pas par le module. */
const { MM, test, egal, vrai } = require("./_harnais.js");
const R = MM.repere;
const UNITE = (320 - 2 * 16) / 12;                     // 24 px par carreau
const vue = (x, y) => [16 + (x + 6) * UNITE, 16 + (6 - y) * UNITE];

test("repère : fenêtre de −6 à 6 sur les deux axes, viewBox 320 (D91)", () => {
  egal(R.FEN.min, -6); egal(R.FEN.max, 6); egal(R.VUE, 320);
  for (const [x, y] of [[0, 0], [-6, 6], [6, -6], [3, -2]]) { const p = R.versVue(x, y), q = vue(x, y); egal(p[0], q[0], "x " + x); egal(p[1], q[1], "y " + y); }
});

test("accroche : un toucher va au nœud le plus proche, jusqu'à un demi-carreau de distance", () => {
  for (let x = -6; x <= 6; x++) for (let y = -6; y <= 6; y++) {
    const [px, py] = vue(x, y);
    for (const [dx, dy] of [[0, 0], [11, -11], [-11, 11], [0.49 * UNITE, 0], [0, -0.49 * UNITE]]) {
      const a = R.accroche(px + dx, py + dy);
      egal(a.x + "," + a.y, x + "," + y, "toucher près de (" + x + ", " + y + ")");
    }
  }
});

test("accroche : un toucher hors du cadre reste sur le bord (jamais un point hors du repère)", () => {
  const a = R.accroche(-50, 400), b = R.accroche(400, -50);
  egal(a.x + "," + a.y, "-6,-6"); egal(b.x + "," + b.y, "6,6");
  // String(−0) vaut "0" : seul Object.is voit un −0 (il s'écrirait « −0 » dans certains affichages)
  for (const [x, y] of [[-0.2, -0.2], [-0.4, 3], [2, -0.3]]) { const a = R.accroche(...vue(x, y)); vrai(!Object.is(a.x, -0) && !Object.is(a.y, -0), "−0 pour (" + x + ", " + y + ")"); }
});

test("droite coupée au cadre : 200 droites, les deux bouts sont sur la droite et dans le cadre", () => {
  let n = 0;
  for (let m = -5; m <= 5; m++) for (let b = -10; b <= 10; b++) {
    const c = R.coupe(m, b);
    if (!c) { for (let x = -6; x <= 6; x += 0.01) vrai(Math.abs(m * x + b) > 6, "droite visible refusée : " + m + "x + " + b); continue; }
    n++;
    for (const [x, y] of c) { vrai(Math.abs(y - (m * x + b)) < 1e-9, "bout hors de la droite"); vrai(x >= -6 - 1e-9 && x <= 6 + 1e-9 && y >= -6 - 1e-9 && y <= 6 + 1e-9, "bout hors du cadre"); }
    vrai(c[0][0] < c[1][0], "bouts dans l'ordre");
  }
  vrai(n > 150, "trop peu de droites visibles : " + n);
});

test("SVG : bien formé, un cercle par point, son nom, la droite, et le point en cours de placement sans ses coordonnées (D90)", () => {
  const s = R.svg({ points: [{ nom: "A", x: 4, y: -1 }, { nom: "B", x: -3, y: 2 }], droites: [{ m: 2, b: 3 }], candidat: { nom: "C", x: 1, y: 5 }, interactif: true });
  vrai(/^<svg [^>]*viewBox="0 0 320 320"/.test(s), "en-tête");
  vrai(s.endsWith("</svg>"), "fin");
  egal((s.match(/<circle /g) || []).length, 3);
  vrai(/>A</.test(s) && />B</.test(s) && />C</.test(s), "noms");
  egal((s.match(/<line [^>]*class="droite/g) || []).length, 1);
  vrai(!/\(1[,;] ?5\)/.test(s), "coordonnées du point en cours affichées");
  vrai(/data-repere/.test(s), "repère interactif repérable par la page");
  // les graduations : −6 à 6 sauf 0 sur chaque axe, et O
  for (const k of [-6, -5, -1, 1, 5, 6]) vrai(new RegExp(">" + (k < 0 ? "−" + (-k) : k) + "<").test(s), "graduation " + k);
  vrai(/>O</.test(s));
  // pas de balise ouverte non fermée
  const ouvertes = (s.match(/<(svg|g|text)\b/g) || []).length, fermees = (s.match(/<\/(svg|g|text)>/g) || []).length;
  egal(ouvertes, fermees);
});

test("SVG : un nom ou un texte avec < ou & est échappé", () => {
  const s = R.svg({ points: [{ nom: "<A&", x: 1, y: 1 }] });
  vrai(s.includes("&lt;A&amp;") && !s.includes("<A&"));
});
