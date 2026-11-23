/* Mission Maths — gen/nombres.js
   Générateurs du palier P1 (nombres relatifs). Tout est calculé : énoncé, étapes, bonne réponse, réponses fausses par code.
     rel     sommes de relatifs           1 : a ± b          2 : a ± (−b)              3 : trois termes, au moins un (−b)
     relmul  produits et quotients        1 : a × b          2 : a ÷ b (exact)         3 : a × b × c
     prio    priorités de calcul          1 : a ± b × c      2 : avec des négatifs     3 : a − b × (c − d) */
(function (G) {
  "use strict";
  const MM = G.MM || (G.MM = {});
  if (typeof require === "function") { if (!MM.nombres) require("../nombres.js"); if (!MM.gen) require("./algebre.js"); }
  const E = MM.expr, N = MM.nombres, D = MM.diag, GEN = MM.gen;
  const BORNE = 100;

  /* Un exercice « nombre » complet à partir de son énoncé écrit. */
  function exoNombre(texte, codes) {
    const n0 = E.arbre(texte), v = N.valeur(n0), ch = N.chaine(n0);
    if (!ch.length) return null;
    // bornes : chaque nombre de l'énoncé et de chaque ligne du corrigé reste ≤ 100
    const feuilles = a => a.t === "num" ? [a.v] : ["a", "b"].flatMap(k => a[k] && typeof a[k] === "object" ? feuilles(a[k]) : []);
    const nombres = [n0, ...ch.map(l => E.arbre(l.ligne))].flatMap(a => feuilles(a).concat(N.plats(N.sansParentheses(a)).map(N.valeurTerme)));
    if (!nombres.every(x => x.estEntier() && x.abs().cmp(BORNE) <= 0) || !v.estEntier()) return null;
    const erreurs = N.reponsesFausses(n0);
    if (D.collisions(erreurs).length) return null;                         // deux codes, même réponse fausse : diagnostic ambigu
    if (!(codes || []).every(c => erreurs[c] && erreurs[c].length)) return null;
    return {
      type: "nombre", consigne: "Calcule.", enonce: N.ecrire(n0),
      etapes: ch.map(l => ({ id: l.id, nom: l.nom, forme: l.forme, consigne: N.ETAPES[l.forme].consigne, indice: N.ETAPES[l.forme].indice, attendu: l.ligne })),
      reponse: v.cle(), reponseTexte: v.texte(), erreurs, corrige: ch.map(l => ({ id: l.id, nom: l.nom, ligne: l.ligne, pourquoi: l.pourquoi }))
    };
  }
  const M = E.MOINS;
  const nb = v => v < 0 ? M + (-v) : String(v);                // premier nombre d'une ligne
  const apres = v => v < 0 ? "(" + M + (-v) + ")" : String(v);   // nombre après une opération

  GEN.definir("rel", {
    palier: "P1", niveaux: [1, 2, 3],
    tirer(niveau, rnd) {
      const a = rnd.nonNul(-20, 20);
      if (niveau === 1) {
        const b = rnd.entier(1, 20), plus = rnd.suivant() < 0.5;
        if (a > 0 && (plus || b < a)) return null;                      // au moins un résultat ou un départ négatif
        return exoNombre(nb(a) + (plus ? " + " : " " + M + " ") + b, ["SIG-REL"]);
      }
      if (niveau === 2) return exoNombre(nb(a) + (rnd.suivant() < 0.6 ? " " + M + " " : " + ") + apres(-rnd.entier(1, 20)), ["SIG-REL"]);
      const t = [rnd.nonNul(-15, 15), rnd.nonNul(-15, 15)];
      if (!t.some(v => v < 0)) return null;
      const ops = t.map(() => rnd.suivant() < 0.5 ? " + " : " " + M + " ");
      return exoNombre(nb(a) + ops[0] + apres(t[0]) + ops[1] + apres(t[1]), ["SIG-REL"]);
    }
  });

  GEN.definir("relmul", {
    palier: "P1", niveaux: [1, 2, 3],
    tirer(niveau, rnd) {
      if (niveau === 1) {
        const a = rnd.nonNul(-12, 12), b = rnd.nonNul(-12, 12);
        if (Math.abs(a) < 2 || Math.abs(b) < 2 || (a > 0 && b > 0)) return null;
        return exoNombre(nb(a) + " × " + apres(b), ["SIG-REL"]);
      }
      if (niveau === 2) {
        const q = rnd.nonNul(-12, 12), b = rnd.nonNul(-9, 9);
        if (Math.abs(q) < 2 || Math.abs(b) < 2 || (q > 0 && b > 0)) return null;
        return exoNombre(nb(q * b) + " ÷ " + apres(b), ["SIG-REL"]);
      }
      const f = [rnd.nonNul(-5, 5), rnd.nonNul(-5, 5), rnd.nonNul(-5, 5)];
      if (f.some(v => Math.abs(v) < 2) || !f.some(v => v < 0)) return null;
      return exoNombre(nb(f[0]) + " × " + apres(f[1]) + " × " + apres(f[2]), ["SIG-REL"]);
    }
  });

  GEN.definir("prio", {
    palier: "P1", niveaux: [1, 2, 3],
    tirer(niveau, rnd) {
      const signe = rnd.suivant() < 0.5 ? " + " : " " + M + " ";
      if (niveau === 1) return exoNombre(rnd.entier(10, 99) + signe + rnd.entier(2, 9) + " × " + rnd.entier(2, 9), ["PRIO"]);
      if (niveau === 2) {
        const a = rnd.nonNul(-20, 20), c = rnd.nonNul(-9, 9);
        if (Math.abs(c) < 2 || (a > 0 && c > 0)) return null;
        return exoNombre(nb(a) + signe + rnd.entier(2, 9) + " × " + apres(c), ["PRIO", "SIG-REL"]);
      }
      const c = rnd.entier(1, 12), d = rnd.entier(1, 12);
      if (c === d) return null;
      return exoNombre(rnd.entier(1, 30) + signe + rnd.entier(2, 6) + " × (" + c + " " + M + " " + d + ")", ["PRIO", "SIG-REL"]);
    }
  });

  GEN.exoNombre = exoNombre;
  if (typeof module !== "undefined" && module.exports) module.exports = MM;
})(typeof globalThis !== "undefined" ? globalThis : this);
