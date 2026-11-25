/* Mission Maths — gen/affine.js
   Générateurs du lot 4a. Ils ne tirent que des nombres : l'exercice est construit et vérifié par MM.affine.construire.
     lire    P6  lire un point dessiné     1 : x et y positifs     2 : les 4 quarts, un négatif au moins     3 : un point sur un axe
     placer  P6  placer un point au toucher (mêmes niveaux)
     ligne   P7  une ligne du tableau de l'ex. 3a   1 : y = mx + b     2 : forme inversée y = b + mx     3 : y = b (constante)     4 : y = mx ou le 1 caché
     eqmb    P7  la ligne vide : m et b donnés, écrire l'équation
     tracer  P7  tracer depuis m et b       1 : m positif      2 : m négatif
     affref  l'ex. 3a du contrôle, valeurs exactes (rejeu des tests)
   Repère de −6 à 6 (D91) ; |x| ≠ |y| pour qu'une inversion ne se confonde pas avec deux signes perdus. */
(function (G) {
  "use strict";
  const MM = G.MM || (G.MM = {});
  if (typeof require === "function") { if (!MM.affine) require("../affine.js"); if (!MM.gen) require("./algebre.js"); }
  const AF = MM.affine, GEN = MM.gen;
  const NOMS = ["A", "B", "C", "D", "E", "M", "P"];
  const signe = rnd => rnd.suivant() < 0.5 ? -1 : 1;

  function tirerPoint(niveau, rnd) {
    let x, y;
    if (niveau === 1) { x = rnd.entier(1, 6); y = rnd.entier(1, 6); }
    else if (niveau === 2) { x = rnd.nonNul(-6, 6); y = rnd.nonNul(-6, 6); if (x > 0 && y > 0) return null; }
    else { const v = rnd.nonNul(-6, 6); [x, y] = rnd.suivant() < 0.5 ? [v, 0] : [0, v]; }
    if (x && y && Math.abs(x) === Math.abs(y)) return null;
    return [x, y];
  }
  for (const sorte of ["lire", "placer"]) GEN.definir(sorte, { palier: "P6", niveaux: [1, 2, 3], tirer(niveau, rnd) {
    const p = tirerPoint(niveau, rnd);
    return p ? AF.construire({ sorte, nom: rnd.choix(NOMS), point: p }) : null;
  } });

  GEN.definir("ligne", { palier: "P7", niveaux: [1, 2, 3, 4], tirer(niveau, rnd) {
    const m = rnd.nonNul(-9, 9), b = rnd.nonNul(-12, 12);
    if (niveau === 1) return Math.abs(m) === 1 ? null : AF.construire({ sorte: "ligne", forme: "mxb", m, b });
    if (niveau === 2) return AF.construire({ sorte: "ligne", forme: "bmx", m, b });
    if (niveau === 3) return AF.construire({ sorte: "ligne", forme: "cst", m: 0, b });
    return rnd.suivant() < 0.5 ? AF.construire({ sorte: "ligne", forme: "mx", m, b: 0 }) : AF.construire({ sorte: "ligne", forme: "un", m: signe(rnd), b });
  } });
  GEN.definir("eqmb", { palier: "P7", niveaux: [1], tirer(niveau, rnd) {
    const m = rnd.suivant() < 0.3 ? signe(rnd) : rnd.nonNul(-6, 6), b = rnd.nonNul(-9, 9);
    return m === b ? null : AF.construire({ sorte: "eqmb", m, b });
  } });
  GEN.definir("tracer", { palier: "P7", niveaux: [1, 2], tirer(niveau, rnd) {
    const m = rnd.entier(1, 4) * (niveau === 1 ? 1 : -1), b = rnd.entier(-4, 4);
    return AF.construire({ sorte: "tracer", m, b });
  } });

  /* L'ex. 3a du contrôle, ligne par ligne (cahier des charges, section 2). */
  const TABLE = [
    { sorte: "ligne", forme: "mxb", m: -3, b: -5 },
    { sorte: "ligne", forme: "mxb", m: 4, b: 9 },
    { sorte: "ligne", forme: "cst", m: 0, b: 8 },
    { sorte: "ligne", forme: "bmx", m: -5, b: 6 },
    { sorte: "eqmb", m: -1, b: 7 }
  ];
  GEN.definir("affref", { palier: "T", niveaux: TABLE.map((_, i) => i + 1), tirer: niveau => AF.construire(TABLE[niveau - 1]) });
  GEN.reference.ex3a = () => TABLE.map((_, i) => GEN.creer("affref", i + 1, 0));

  if (typeof module !== "undefined" && module.exports) module.exports = MM;
})(typeof globalThis !== "undefined" ? globalThis : this);
