/* Mission Maths — gen/second.js
   Générateurs du palier P5 (second degré). Ils ne tirent que des nombres : l'exercice est construit et vérifié par MM.second.construire.
     deg2    résoudre ax² + bx + c = 0     1 : a = 1, deux solutions entières (format de l'ex. 2 du contrôle)
                                          2 : a ≠ 1 (dont −x², le −1 caché), deux solutions entières
                                          3 : Δ = 0 ou Δ < 0, mêlés à des Δ > 0
     abc     repérer a, b et c            1 : a = 1 caché     2 : a ≠ 1
     delta   calculer Δ seulement         1 : a = 1, b négatif (le piège (−b)²)     2 : a ≠ 1, a ou c négatif (le signe de −4ac)
     deg2d   diagnostic P0 : écrire la plus grande (1) ou la plus petite (2) solution
     eq2ref  l'exercice 2 de l'examen de référence, valeurs exactes du cahier des charges
   Bornes (D51) : |a| ≤ 5, |b| ≤ 20, |c| ≤ 100, |4ac| ≤ 400, √Δ ≤ 20. */
(function (G) {
  "use strict";
  const MM = G.MM || (G.MM = {});
  if (typeof require === "function") { if (!MM.second) require("../second.js"); if (!MM.gen) require("./algebre.js"); }
  const S2 = MM.second, GEN = MM.gen;

  /* Deux solutions entières distinctes, non nulles ; b négatif 7 fois sur 10 (comme au contrôle : x² − 13x + 30). */
  function deuxRacines(rnd, a, max) {
    let r1 = rnd.nonNul(-max, max), r2 = rnd.nonNul(-max, max);
    if (r1 === r2) return null;
    if (-a * (r1 + r2) > 0 && rnd.suivant() < 0.7) { r1 = -r1; r2 = -r2; }
    return { a, b: -a * (r1 + r2), c: a * r1 * r2 };
  }
  const A2 = [-1, -1, 2, -2, 3, -3, 4, -4, 5, -5];
  function tirage(niveau, rnd) {
    if (niveau === 1) return deuxRacines(rnd, 1, 12);
    if (niveau === 2) return deuxRacines(rnd, rnd.choix(A2), 8);
    const u = rnd.suivant();
    if (u < 0.4) {                                        // Δ = 0 : une solution double
      const a = rnd.choix([1, 1, -1, 2, -2, 3]), r = rnd.nonNul(-9, 9);
      return { a, b: -2 * a * r, c: a * r * r };
    }
    if (u < 0.8) {                                        // Δ < 0 : c du signe de a, assez grand
      const a = rnd.choix([1, 1, -1, 2, -2]), b = rnd.nonNul(-12, 12), min = Math.floor(b * b / (4 * Math.abs(a))) + 1, max = Math.min(100, Math.floor(100 / Math.abs(a)));
      if (min > max) return null;
      return { a, b, c: Math.sign(a) * rnd.entier(min, max) };
    }
    return deuxRacines(rnd, rnd.choix([1, 1, -1]), 10);
  }
  const fait = (t, opts) => t ? S2.construire(t.a, t.b, t.c, opts) : null;

  GEN.definir("deg2", { palier: "P5", niveaux: [1, 2, 3], tirer: (niveau, rnd) => fait(tirage(niveau, rnd)) });
  GEN.definir("abc", { palier: "P5", niveaux: [1, 2], tirer: (niveau, rnd) => fait(tirage(niveau, rnd), { partie: ["coefs"], consigne: "Donne a, b et c." }) });
  GEN.definir("delta", { palier: "P5", niveaux: [1, 2], tirer(niveau, rnd) {
    const t = tirage(niveau, rnd);
    if (!t || (niveau === 1 && t.b > 0) || (niveau === 2 && t.a > 0 && t.c > 0)) return null;
    return fait(t, { partie: ["delta"], consigne: "Calcule le discriminant Δ." });
  } });
  GEN.definir("deg2d", { palier: "P5", niveaux: [1, 2], tirer: (niveau, rnd) => fait(tirage(niveau, rnd),
    { diag: niveau === 1 ? "max" : "min", consigne: "Résous, puis écris la plus " + (niveau === 1 ? "grande" : "petite") + " solution." }) });
  GEN.definir("eq2ref", { palier: "T", niveaux: [1], tirer: () => S2.construire(1, -13, 30) });
  GEN.reference.ex2 = () => GEN.creer("eq2ref", 1, 0);

  if (typeof module !== "undefined" && module.exports) module.exports = MM;
})(typeof globalThis !== "undefined" ? globalThis : this);
