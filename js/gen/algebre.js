/* Mission Maths — gen/algebre.js
   Générateurs d'exercices d'algèbre (paliers P2 à P4).
     red     réduire une expression                 P2  1 : 4 termes     2 : 5 termes, coefficients négatifs
     dev1    développer k(x + a)                    P2  1 : k > 0        2 : k < 0        3 : k(ax + b)
     devred  développer puis réduire                P2  1 : a(…) + b(…)  2 : a(…) − b(…)  3 : a(…) − b(…) + c
     eqs     équations simples (la balance)         P3  1 : x + a = b    2 : ax = b       3 : ax + b = c
     eqxx    x des deux côtés                       P4  1 : solution entière              2 : solution fraction simple
     eq1par  équation avec parenthèses              P4  (format de l'ex. 1 du contrôle au niveau 3)
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
      erreurs: D.reponsesFausses(eq0), corrige: T.corrige(eq0), verification: verification(eq0, sol.x)
    };
  }
  /* « Vérifie » (P4, guidé) : chaque côté de l'énoncé, x remplacé par la solution. Seulement si x est entier. */
  function verification(eq0, x) {
    if (!x.estEntier() || !MM.nombres) return null;
    const N = MM.nombres, g = N.substituer(eq0.g, x), d = N.substituer(eq0.d, x);
    return { x: x.cle(), gauche: N.ecrire(g), droite: N.ecrire(d), valeur: N.valeur(g).cle() };
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
  /* Exercice « expression » : développer et/ou réduire. Table des erreurs : code → réponses fausses écrites (réduites). */
  function exoExpression(depart, consigne, formes, codes) {
    const erreurs = {}, parPoly = {};
    for (const c of D.candidatsExpression(depart)) {
      const red = T.redCote(c.termes), cle = E.polyDeTermes(red).cle();
      (erreurs[c.code] || (erreurs[c.code] = [])).includes(E.ecrireCote(red)) || erreurs[c.code].push(E.ecrireCote(red));
      (parPoly[c.code] || (parPoly[c.code] = [])).push(cle);
    }
    // doublons de structure (un signe retourné dans une parenthèse est aussi une faute de signe) : le code précis garde la réponse
    for (const [precis, large] of D.STRUCTUREL) if (parPoly[precis] && parPoly[large]) {
      const garde = parPoly[large].map((k, i) => !parPoly[precis].includes(k));
      erreurs[large] = (erreurs[large] || []).filter(e => !parPoly[precis].includes(E.lireExpression(e).poly.cle()));
      parPoly[large] = parPoly[large].filter((k, i) => garde[i]);
      if (!parPoly[large].length) { delete parPoly[large]; delete erreurs[large]; }
    }
    if (D.collisions(parPoly).length) return null;
    if (!codes.every(code => erreurs[code])) return null;
    const lignes = { developpe: T.devCote(depart), reduit: T.redCote(depart) };
    if (![depart, lignes.developpe, lignes.reduit].every(ts => dansLesBornes([{ g: ts, d: [] }]))) return null;
    const etapes = [], corrige = [];
    let der = E.ecrireCote(depart);
    for (const f of formes) {
      const l = E.ecrireCote(lignes[f]);
      if (l === der) continue;
      etapes.push({ id: f, nom: T.ETAPES[f].nom, forme: f, consigne: T.ETAPES[f].consigne, indice: T.ETAPES[f].indice, attendu: l });
      corrige.push({ id: f, nom: T.ETAPES[f].nom, ligne: l, pourquoi: T.ETAPES[f].pourquoi });
      der = l;
    }
    if (!etapes.length) return null;
    return { type: "expression", consigne, enonce: E.ecrireCote(depart), etapes, reponse: der, reponseTexte: der, erreurs, corrige };
  }
  definir("dev1", {
    palier: "P2", niveaux: [1, 2, 3],
    tirer(niveau, rnd) {
      const k = niveau === 1 ? rnd.entier(2, 9) : niveau === 2 ? -rnd.entier(2, 9) : rnd.nonNul(-9, 9), a = rnd.nonNul(-9, 9);
      if (niveau === 3 && Math.abs(k) < 2) return null;
      const ax = rnd.nonNul(-5, 5);
      if (niveau === 3 && Math.abs(ax) < 2) return null;
      const inner = niveau === 3 ? [mono(ax, 1), mono(a, 0)] : xPlus(a);
      return exoExpression([par(k, inner)], "Développe.", ["developpe"], niveau === 1 ? ["DIST-PART"] : ["SIG-PAR", "DIST-PART"].filter(c => k < 0 || c !== "SIG-PAR"));
    }
  });
  definir("red", {
    palier: "P2", niveaux: [1, 2],
    tirer(niveau, rnd) {
      const n = niveau === 1 ? 4 : 5, ts = [];
      for (let i = 0; i < n; i++) ts.push(mono(niveau === 1 && i < 2 ? rnd.entier(1, 9) : rnd.nonNul(-9, 9), i % 2 === 0 ? 1 : 0));
      // mélange l'ordre : x et nombres alternés, puis un échange au hasard
      if (rnd.suivant() < 0.5) [ts[1], ts[2]] = [ts[2], ts[1]];
      const red = T.redCote(ts);
      if (red.length !== 2) return null;                                     // ni x qui s'annule, ni nombre qui disparaît
      return exoExpression(ts, "Réduis.", ["reduit"], ["RED-MIX", "SIG-REL"]);
    }
  });
  definir("devred", {
    palier: "P2", niveaux: [1, 2, 3],
    tirer(niveau, rnd) {
      const a = rnd.entier(2, 9), b = rnd.entier(2, 9), p = rnd.nonNul(-9, 9), q = rnd.nonNul(-9, 9);
      if (a === b && niveau > 1) return null;
      const depart = [par(a, xPlus(p)), par(niveau === 1 ? b : -b, xPlus(q))];
      if (niveau === 3) depart.push(mono(rnd.nonNul(-20, 20), 0));
      const red = T.redCote(depart);
      if (red.length !== 2) return null;
      return exoExpression(depart, "Développe, puis réduis.", ["developpe", "reduit"], niveau === 1 ? ["DIST-PART"] : ["SIG-PAR", "DIST-PART"]);
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
    palier: "P4", niveaux: [1, 2, 3],
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

  /* ---------- eqs : équations simples (P3) ---------- */
  const REGLES_EQS = {
    1: { xMax: 20, denominateurs: [1], codes: ["TRANS-SIG"] },
    2: { xMax: 12, denominateurs: [1], codes: ["DIV-INV"] },
    3: { xMax: 12, denominateurs: [1], codes: ["TRANS-SIG", "DIV-INV"] }
  };
  definir("eqs", {
    palier: "P3", niveaux: [1, 2, 3],
    tirer(niveau, rnd) {
      const x = rnd.nonNul(-12, 12);
      let eq0;
      if (niveau === 1) { const a = rnd.nonNul(-20, 20); eq0 = { g: xPlus(a), d: [mono(x + a, 0)] }; if (x + a === 0) return null; }
      else if (niveau === 2) { const a = rnd.nonNul(-9, 9); if (Math.abs(a) < 2) return null; eq0 = { g: [mono(a, 1)], d: [mono(a * x, 0)] }; }
      else { const a = rnd.nonNul(-9, 9), b = rnd.nonNul(-20, 20); if (Math.abs(a) < 2 || a * x + b === 0) return null; eq0 = { g: [mono(a, 1), mono(b, 0)], d: [mono(a * x + b, 0)] }; }
      const exo = exoEquation(eq0);
      return equationValable(eq0, exo, REGLES_EQS[niveau]) ? exo : null;
    }
  });
  /* ---------- eqxx : x des deux côtés, sans parenthèses (P4) ---------- */
  const REGLES_EQXX = {
    1: { xMax: 12, denominateurs: [1], codes: ["TRANS-SIG", "DIV-INV"] },
    2: { xMax: 10, denominateurs: [2, 4, 5], codes: ["TRANS-SIG", "DIV-INV"] }
  };
  definir("eqxx", {
    palier: "P4", niveaux: [1, 2],
    tirer(niveau, rnd) {
      const a = rnd.nonNul(-9, 9), c = rnd.nonNul(-9, 9), b = rnd.nonNul(-20, 20);
      if (a === c || Math.abs(a - c) < 2) return null;
      let d;
      if (niveau === 1) { const x = rnd.nonNul(-10, 10); d = (a - c) * x + b; }
      else d = rnd.nonNul(-30, 30);
      if (d === 0) return null;
      const eq0 = { g: [mono(a, 1), mono(b, 0)], d: [mono(c, 1), mono(d, 0)] };
      if (rnd.suivant() < 0.5) eq0.d.reverse();                              // parfois « 6 − 5x » : la forme inversée
      const exo = exoEquation(eq0);
      return equationValable(eq0, exo, REGLES_EQXX[niveau]) ? exo : null;
    }
  });

  /* eq1ref : l'exercice 1 de l'examen de référence, valeurs exactes du cahier des charges (la graine ne change rien). */
  definir("eq1ref", {
    palier: "T", niveaux: [3],
    tirer() { return exoEquation(eq1parTermes(3, { a: 7, p: -4, b: 8, q: -7, c: 69, d: 5, r: 8 })); }
  });
  const reference = { ex1: () => creer("eq1ref", 3, 0) };          // ex2 : gen/second.js (lot 3)

  /* Reconstruit le point de départ du moteur à partir de l'énoncé affiché (une seule source : l'énoncé). */
  function depart(exo) { return exo.type === "second" ? null : exo.type === "equation" ? E.lireEquation(exo.enonce) : exo.type === "nombre" ? E.arbre(exo.enonce) : E.lireExpression(exo.enonce).termes; }

  MM.gen = { definir, creer, depart, exoEquation, exoExpression, reference, liste: () => Object.keys(REGISTRE), def: id => REGISTRE[id] };
  if (typeof module !== "undefined" && module.exports) module.exports = MM;
})(typeof globalThis !== "undefined" ? globalThis : this);
