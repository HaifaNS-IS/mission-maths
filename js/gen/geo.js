/* Mission Maths — gen/geo.js
   Générateurs du lot express (contrôle du 29/11). Ils ne tirent que des nombres : l'exercice est construit et vérifié par MM.geo.construire.
     dist   G1 distance           1 : triplet (3-4-5, 6-8-10, 5-12-13), longueur entière    2 : longueur non entière (√… ou au centième), négatifs
     mil    G2 milieu             1 : coordonnées positives, milieu entier                  2 : négatifs, milieu en ,5
     pente  G3 pente et équation  1 : pente entière                                          2 : pente décimale ou fraction (4/3)
     axes   G4 intersections      1 : y = mx + b, points entiers                             2 : x décimal sur l'axe des abscisses
     comb   G5 combiné            1 : triangle isocèle (format de la prof)                   2 : segment, milieu, longueurs, équation
     pyth   G6 Pythagore          1 : hypoténuse (triplet)    2 : un côté de l'angle droit (triplet)    3 : non entier, au centième
     georef les exercices des fiches de la prof, valeurs exactes (rejeu des tests) */
(function (G) {
  "use strict";
  const MM = G.MM || (G.MM = {});
  if (typeof require === "function") { if (!MM.geo) require("../geo.js"); if (!MM.gen) require("./algebre.js"); }
  const GEO = MM.geo, GEN = MM.gen;
  const fait = m => GEO.construire(m);
  const signe = rnd => rnd.suivant() < 0.5 ? -1 : 1;
  const TRIPLETS = [[3, 4], [4, 3], [6, 8], [8, 6], [5, 12], [12, 5]];
  const carre = n => Number.isInteger(Math.sqrt(n));
  const NOMS = [["A", "B"], ["C", "D"], ["E", "F"], ["A", "B"]];
  const deux = (rnd, p, q) => { const [a, b] = rnd.choix(NOMS); return { [a]: p, [b]: q }; };

  GEN.definir("dist", { palier: "G1", niveaux: [1, 2], tirer(niveau, rnd) {
    let dx, dy, p;
    if (niveau === 1) { [dx, dy] = rnd.choix(TRIPLETS.slice(0, 4)); dx *= rnd.suivant() < 0.7 ? 1 : -1; dy *= rnd.suivant() < 0.7 ? 1 : -1; p = [rnd.entier(-3, 5), rnd.entier(-3, 5)]; }
    else { dx = rnd.nonNul(-7, 7); dy = rnd.nonNul(-7, 7); if (carre(dx * dx + dy * dy)) return null; p = [rnd.entier(-5, 5), rnd.entier(-5, 5)]; }
    const q = [p[0] + dx, p[1] + dy];
    if (niveau === 2 && ![...p, ...q].some(v => v < 0)) return null;           // au moins un négatif : le piège des signes
    return fait({ sorte: "distance", points: deux(rnd, p, q) });
  } });
  GEN.definir("mil", { palier: "G2", niveaux: [1, 2], tirer(niveau, rnd) {
    const r = () => niveau === 1 ? rnd.entier(0, 10) : rnd.entier(-8, 8);
    const p = [r(), r()], q = [r(), r()];
    if (niveau === 1 && ((p[0] + q[0]) % 2 || (p[1] + q[1]) % 2)) return null;
    if (niveau === 2 && (![...p, ...q].some(v => v < 0) || !((p[0] + q[0]) % 2 || (p[1] + q[1]) % 2))) return null;
    return fait({ sorte: "milieu", points: deux(rnd, p, q) });
  } });
  GEN.definir("pente", { palier: "G3", niveaux: [1, 2], tirer(niveau, rnd) {
    let dx, dy;
    if (niveau === 1) { dx = rnd.entier(1, 4) * signe(rnd); dy = dx * rnd.nonNul(-3, 3); }
    else { dx = rnd.choix([2, 4, 5, 3, 3]) * signe(rnd); dy = rnd.nonNul(-8, 8); if (dy % dx === 0) return null; }
    const p = [rnd.entier(-4, 4), rnd.entier(-4, 4)], q = [p[0] + dx, p[1] + dy];
    return fait({ sorte: rnd.suivant() < 0.5 ? "droite" : "ldroite", points: deux(rnd, p, q) });
  } });
  GEN.definir("axes", { palier: "G4", niveaux: [1, 2], tirer(niveau, rnd) {
    if (niveau === 1) { const m = rnd.nonNul(-4, 4), r = rnd.nonNul(-6, 6); return fait({ sorte: "axes", m, b: -m * r }); }
    const m = rnd.choix([2, -2, 4, -4, 5, -5]), b = rnd.nonNul(-12, 12);
    if (b % m === 0) return null;
    return fait({ sorte: "axes", m, b });
  } });
  GEN.definir("comb", { palier: "G5", niveaux: [1, 2], tirer(niveau, rnd) {
    if (niveau === 1) {
      const [k, h] = rnd.choix([[3, 4], [4, 3], [6, 8]]), x0 = k === 6 ? rnd.entier(-6, 0) : rnd.entier(-3, 2), y0 = rnd.entier(-3, 2), s = rnd.suivant() < 0.8 ? 1 : -1;
      return fait({ sorte: "isocele", points: { A: [x0, y0], B: [x0 + 2 * k, y0], C: [x0 + k, y0 + s * h] } });
    }
    const [u, v] = rnd.choix([[3, 4], [4, 3]]), c = [rnd.entier(-4, 3), rnd.entier(-4, 3)], d = [c[0] + 2 * u * signe(rnd), c[1] + 2 * v * signe(rnd)];
    return fait({ sorte: "segment", points: { C: c, D: d } });
  } });
  const TRIANGLES = [["AC", "AB", "BC", "B"], ["DF", "DE", "EF", "E"], ["MP", "MN", "NP", "N"]];
  GEN.definir("pyth", { palier: "G6", niveaux: [1, 2, 3], tirer(niveau, rnd) {
    const noms = rnd.choix(TRIANGLES), angle = noms[3];
    if (niveau === 1) { const [a, b] = rnd.choix([[3, 4], [6, 8], [5, 12], [9, 12], [8, 15]]); return fait({ sorte: "pythagore", hyp: true, a, b, noms, angle }); }
    if (niveau === 2) { const [a, b, c] = rnd.choix([[3, 4, 5], [6, 8, 10], [5, 12, 13], [9, 12, 15], [8, 15, 17]]), petit = rnd.suivant() < 0.5 ? a : b; return fait({ sorte: "pythagore", hyp: false, a: c, b: petit, noms, angle }); }
    const a = rnd.entier(2, 9), b = rnd.entier(2, 9);
    if (rnd.suivant() < 0.5) { if (carre(a * a + b * b)) return null; return fait({ sorte: "pythagore", hyp: true, a, b, noms, angle }); }
    const c = Math.max(a, b) + rnd.entier(1, 4), x = Math.min(a, b);
    if (carre(c * c - x * x)) return null;
    return fait({ sorte: "pythagore", hyp: false, a: c, b: x, noms, angle });
  } });

  /* Les fiches de la prof (photos du 25/11), dans l'ordre. */
  const FICHES = [
    { sorte: "distance", points: { A: [1, 2], B: [5, 5] } },
    { sorte: "distance", points: { C: [-2, 4], D: [4, -4] } },
    { sorte: "distance", points: { E: [-3, -1], F: [2, 3] } },
    { sorte: "ldroite", points: { A: [1, 1], B: [5, 3] } },
    { sorte: "segment", points: { C: [-2, 6], D: [4, -2] } },
    { sorte: "isocele", points: { A: [0, 0], B: [6, 0], C: [3, 4] } },
    { sorte: "distance", points: { A: [2, 3], B: [5, 4] } },
    { sorte: "axes", m: -2, b: 12 },
    { sorte: "milieu", points: { A: [0, 12], B: [6, 0] } },
    { sorte: "distance", points: { C: [3, 6], A: [0, 12] } },
    { sorte: "pythagore", hyp: true, a: 6, b: 8, noms: ["AC", "AB", "BC"], angle: "B" },
    { sorte: "pythagore", hyp: true, a: 5, b: 12, noms: ["DF", "DE", "EF"], angle: "E" }
  ];
  GEN.definir("georef", { palier: "T", niveaux: FICHES.map((_, i) => i + 1), tirer: niveau => fait(FICHES[niveau - 1]) });
  GEN.reference.fiches = () => FICHES.map((_, i) => GEN.creer("georef", i + 1, 0));

  if (typeof module !== "undefined" && module.exports) module.exports = MM;
})(typeof globalThis !== "undefined" ? globalThis : this);
