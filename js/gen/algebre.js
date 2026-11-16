/* Mission Maths — gen/algebre.js
   Générateurs d'exercices d'algèbre. Lot 1 : deux générateurs de banc d'essai.
     dev1    développer k(x + a)                    une réponse (expression)
     eq1par  équation avec parenthèses              démarche ligne à ligne (format de l'ex. 1 du contrôle)
   Contrat : gen(niveau, graine) → { id, gen, palier, niveau, graine, type, consigne, enonce, etapes, reponse, erreurs, corrige }.
   Tout est calculé : énoncé, étapes, bonne réponse et réponses fausses par code d'erreur. */
(function (G) {
  "use strict";
  const MM = G.MM || (G.MM = {});
  if (typeof require === "function" && !MM.diag) { require("../diag.js"); require("../outils.js"); }
  const E = MM.expr, T = MM.etapes, D = MM.diag, mono = E.mono, par = E.par;

  const REGISTRE = {};
  const BORNE = 100;                                   // cahier des charges : nombres ≤ 100
  const ESSAIS = 400;

  function definir(id, def) { REGISTRE[id] = def; }
  /* Même (id, niveau, graine) → même exercice, sur tous les appareils. */
  function creer(id, niveau, graine) {
    const def = REGISTRE[id];
    if (!def) throw new Error("générateur inconnu : " + id);
    if (!def.niveaux.includes(niveau)) throw new Error("niveau " + niveau + " inconnu pour " + id);
    const rnd = MM.outils.alea(graine);
    for (let i = 0; i < ESSAIS; i++) {
      const exo = def.tirer(niveau, rnd);
      if (exo) return Object.assign(exo, { id: id + "-n" + niveau + "-" + graine, gen: id, palier: def.palier, niveau, graine });
    }
    throw new Error("générateur " + id + " niveau " + niveau + " : aucun tirage valable pour la graine " + graine);
  }

  /* ---------- briques communes ---------- */
  const tousLesCoefs = ts => ts.flatMap(t => t.inner ? [t.c, ...t.inner.map(u => u.c)] : [t.c]);
  const dansLesBornes = lignes => lignes.every(eq => [...tousLesCoefs(eq.g), ...tousLesCoefs(eq.d)].every(c => c.estEntier() && c.abs().cmp(BORNE) <= 0));

  /* Exercice « équation » complet à partir de son énoncé (termes). Sert aussi à rejouer l'examen de référence. */
  function exoEquation(eq0) {
    const sol = T.resoudre(eq0);
    if (sol.type !== "une") return null;
    const c = T.chaine(eq0), utiles = T.etapesUtiles(eq0);
    const ligne = { developpe: c.dev, reduit: c.red, regroupe: c.regRed, solution: c.solEq };
    return {
      type: "equation", consigne: "Résous l'équation.", enonce: E.ecrireEquation(eq0),
      etapes: utiles.map(id => ({ id, nom: T.ETAPES[id].nom, forme: id, consigne: T.ETAPES[id].consigne, indice: T.ETAPES[id].indice, attendu: E.ecrireEquation(ligne[id]) })),
      reponse: sol.x.cle(), reponseTexte: T.ecrireSolution(sol.x),
      erreurs: D.reponsesFausses(eq0), corrige: T.corrige(eq0)
    };
  }
  /* Contraintes du cahier des charges sur une équation tirée au hasard. */
  function equationValable(eq0, exo, regles) {
    if (!exo) return false;
    const c = T.chaine(eq0), x = c.sol.x;
    if (!dansLesBornes([eq0, c.dev, c.red, c.reg, c.regRed])) return false;
    if (x.estNul() || x.abs().cmp(regles.xMax) > 0) return false;
    if (!regles.denominateurs.includes(Number(x.d))) return false;
    if (D.collisions(exo.erreurs).length) return false;                       // diagnostic ambigu : on retire
    if (!regles.codes.every(code => exo.erreurs[code] && exo.erreurs[code].length)) return false;
    return true;
  }
  const xPlus = v => [mono(1, 1), mono(v, 0)];

  /* ---------- dev1 : développer k(x + a) ---------- */
  definir("dev1", {
    palier: "T", niveaux: [1, 2],
    tirer(niveau, rnd) {
      const k = niveau === 1 ? rnd.entier(2, 9) : -rnd.entier(2, 9), a = rnd.nonNul(-9, 9);
      const depart = [par(k, xPlus(a))];
      const erreurs = {};
      for (const c of D.candidatsExpression(depart)) (erreurs[c.code] || (erreurs[c.code] = [])).push(E.ecrireCote(c.termes));
      if (D.collisions(erreurs).length) return null;
      if (!(niveau === 1 ? ["DIST-PART"] : ["SIG-PAR", "DIST-PART"]).every(code => erreurs[code])) return null;
      const bon = E.ecrireCote(T.devCote(depart));
      return {
        type: "expression", consigne: "Développe.", enonce: E.ecrireCote(depart),
        etapes: [{ id: "developpe", nom: T.ETAPES.developpe.nom, forme: "developpe", consigne: T.ETAPES.developpe.consigne, indice: T.ETAPES.developpe.indice, attendu: bon }],
        reponse: bon, reponseTexte: bon, erreurs,
        corrige: [{ id: "developpe", nom: T.ETAPES.developpe.nom, ligne: bon, pourquoi: T.ETAPES.developpe.pourquoi }]
      };
    }
  });

  /* ---------- eq1par : équation du premier degré avec parenthèses ----------
     niveau 1  a(x + p) = bx + c                     solution entière
     niveau 2  a(x + p) − b(x + q) = c               solution entière, un moins devant une parenthèse
     niveau 3  a(x + p) − b(x + q) = c − d(x + r)    format exact de l'ex. 1 du contrôle, solution entière ou décimale simple */
  const REGLES = {
    1: { xMax: 9, denominateurs: [1], codes: ["DIST-PART", "TRANS-SIG"] },
    2: { xMax: 9, denominateurs: [1], codes: ["SIG-PAR", "DIST-PART", "TRANS-SIG"] },
    3: { xMax: 10, denominateurs: [1, 2, 4, 5], codes: ["SIG-PAR", "DIST-PART", "TRANS-SIG", "DIV-INV"] }
  };
  function eq1parTermes(niveau, v) {
    if (niveau === 1) return { g: [par(v.a, xPlus(v.p))], d: [mono(v.b, 1), mono(v.c, 0)] };
    if (niveau === 2) return { g: [par(v.a, xPlus(v.p)), par(-v.b, xPlus(v.q))], d: [mono(v.c, 0)] };
    return { g: [par(v.a, xPlus(v.p)), par(-v.b, xPlus(v.q))], d: [mono(v.c, 0), par(-v.d, xPlus(v.r))] };
  }
  definir("eq1par", {
    palier: "T", niveaux: [1, 2, 3],
    tirer(niveau, rnd) {
      const v = { a: rnd.entier(2, 9), p: rnd.nonNul(-9, 9), b: rnd.entier(2, 9), q: rnd.nonNul(-9, 9), d: rnd.entier(2, 9), r: rnd.nonNul(-9, 9) };
      if (niveau === 1) {
        v.a = rnd.entier(2, 6); v.b = rnd.entier(1, v.a - 1);
        const x = rnd.nonNul(-9, 9);
        v.c = v.a * (x + v.p) - v.b * x;
      } else if (niveau === 2) {
        if (v.a === v.b) return null;
        const x = rnd.nonNul(-9, 9);
        v.c = (v.a - v.b) * x + v.a * v.p - v.b * v.q;
      } else {
        const s = v.a - v.b + v.d;
        if (s === 0 || Math.abs(s) === 1) return null;
        v.c = rnd.nonNul(-99, 99);
      }
      if (v.c === 0) return null;
      const eq0 = eq1parTermes(niveau, v), exo = exoEquation(eq0);
      return equationValable(eq0, exo, REGLES[niveau]) ? exo : null;
    }
  });

  /* eq1ref : l'exercice 1 de l'examen de référence, valeurs exactes du cahier des charges (la graine ne change rien). */
  definir("eq1ref", {
    palier: "T", niveaux: [3],
    tirer() { return exoEquation(eq1parTermes(3, { a: 7, p: -4, b: 8, q: -7, c: 69, d: 5, r: 8 })); }
  });
  const reference = { ex1: () => creer("eq1ref", 3, 0) };

  /* Reconstruit le point de départ du moteur à partir de l'énoncé affiché (une seule source : l'énoncé). */
  function depart(exo) { return exo.type === "equation" ? E.lireEquation(exo.enonce) : E.lireExpression(exo.enonce).termes; }

  MM.gen = { definir, creer, depart, exoEquation, reference, liste: () => Object.keys(REGISTRE), def: id => REGISTRE[id] };
  if (typeof module !== "undefined" && module.exports) module.exports = MM;
})(typeof globalThis !== "undefined" ? globalThis : this);
