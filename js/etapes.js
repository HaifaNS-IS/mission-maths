/* Mission Maths — etapes.js
   Les transformations justes d'une équation (développer, réduire, regrouper, diviser),
   la forme attendue à chaque étape, et le jugement ligne à ligne.
   Règle centrale : chaque ligne est jugée par rapport à la ligne précédente DE L'ÉLÈVE, jamais par rapport au corrigé. */
(function (G) {
  "use strict";
  const MM = G.MM || (G.MM = {});
  if (typeof require === "function" && !MM.saisie) require("./saisie.js");
  const E = MM.expr, Fraction = MM.Fraction, mono = E.mono, poly = E.polyDeTermes;

  /* ---------- transformations justes ---------- */
  const devTerme = t => t.inner ? t.inner.map(u => mono(t.c.fois(u.c), t.d + u.d)) : [mono(t.c, t.d)];
  const devCote = ts => ts.flatMap(devTerme);
  const developper = eq => ({ g: devCote(eq.g), d: devCote(eq.d) });
  function redCote(ts, remplace) {            // remplace : { degré: valeur imposée } (sert aux erreurs types)
    const ordre = [], somme = new Map();
    for (const t of devCote(ts)) {
      if (!somme.has(t.d)) { somme.set(t.d, Fraction.ZERO); ordre.push(t.d); }
      somme.set(t.d, somme.get(t.d).plus(t.c));
    }
    if (remplace) for (const d of Object.keys(remplace)) somme.set(Number(d), remplace[d]);
    return ordre.filter(d => !somme.get(d).estNul()).map(d => mono(somme.get(d), d));
  }
  const reduire = eq => ({ g: redCote(eq.g), d: redCote(eq.d) });
  const opp = ts => ts.map(t => mono(t.c.oppose(), t.d));
  const lesX = ts => ts.filter(t => t.d > 0), lesNombres = ts => ts.filter(t => t.d === 0);
  function regrouper(eq) {                    // x à gauche, nombres à droite ; un terme qui change de côté change de signe
    const r = reduire(eq);
    return { g: [...lesX(r.g), ...opp(lesX(r.d))], d: [...lesNombres(r.d), ...opp(lesNombres(r.g))] };
  }
  const difference = eq => poly(eq.g).moins(poly(eq.d));
  function resoudre(eq) {
    const p = difference(eq), n = p.degre();
    if (n === 1) return { type: "une", x: p.coef(0).oppose().sur(p.coef(1)) };
    if (n <= 0) return { type: p.estNul() ? "toutes" : "aucune" };
    return { type: "degre" + n };
  }
  /* Deux équations sont équivalentes si elles ont la même signature (mêmes solutions). */
  function signature(eq) {
    const p = difference(eq), n = p.degre();
    if (n < 0) return "TOUT";
    if (n === 0) return "RIEN";
    const k = p.coef(n);
    return "D" + n + ":" + p.c.slice(0, n).map(v => v.sur(k).cle()).join(";");
  }
  const equivalentes = (a, b) => signature(a) === signature(b);
  function memesCotes(a, b) {
    const ag = poly(a.g), ad = poly(a.d), bg = poly(b.g), bd = poly(b.d);
    return (ag.egal(bg) && ad.egal(bd)) || (ag.egal(bd) && ad.egal(bg));
  }
  const eqSolution = x => ({ g: [mono(1, 1)], d: [mono(x, 0)] });

  /* ---------- formes : ce que l'étape demande d'avoir fait ---------- */
  const nul = t => t.c.estNul();
  const estX = ts => ts.length === 1 && !ts[0].inner && ts[0].simple && ts[0].d === 1 && ts[0].c.egal(1);
  const estNombre = ts => ts.length === 1 && !ts[0].inner && ts[0].simple && ts[0].d === 0;
  const xPuisNombres = (a, b) => a.length >= 1 && a.every(t => t.d > 0 && !nul(t)) && b.every(t => t.d === 0);
  const FORMES = {
    developpe: eq => [...eq.g, ...eq.d].every(t => !t.inner),
    reduit: eq => FORMES.developpe(eq) && [eq.g, eq.d].every(ts => {
      if (ts.length === 1 && nul(ts[0])) return true;
      const vus = new Set();
      return ts.length > 0 && ts.every(t => { if (!t.simple || nul(t) || vus.has(t.d)) return false; vus.add(t.d); return true; });
    }),
    regroupe: eq => FORMES.developpe(eq) && (xPuisNombres(eq.g, eq.d) || xPuisNombres(eq.d, eq.g)),
    solution: eq => (estX(eq.g) && estNombre(eq.d)) || (estX(eq.d) && estNombre(eq.g))
  };
  const ORDRE = ["developpe", "reduit", "regroupe", "solution"];
  const ETAPES = {
    developpe: { nom: "Développe", consigne: "Enlève les parenthèses.",
      indice: "Multiplie chaque terme de la parenthèse par le nombre devant. Surveille le signe moins.",
      manque: "C'est juste, mais il reste une parenthèse. Développe-la.",
      pourquoi: "On multiplie chaque terme de chaque parenthèse par le nombre devant." },
    reduit: { nom: "Réduis", consigne: "De chaque côté : les x ensemble, les nombres ensemble.",
      indice: "Additionne les x entre eux, puis les nombres entre eux. Fais-le à gauche, puis à droite.",
      manque: "C'est juste, mais tu peux encore réduire. Les x ensemble, les nombres ensemble.",
      pourquoi: "De chaque côté, on additionne les x entre eux et les nombres entre eux." },
    regroupe: { nom: "Regroupe les x", consigne: "Mets les x d'un côté, les nombres de l'autre.",
      indice: "La balance : fais la même opération des deux côtés. Un terme qui change de côté change de signe.",
      manque: "C'est juste, mais il reste des x et des nombres du même côté.",
      pourquoi: "Les x à gauche, les nombres à droite. Un terme qui change de côté change de signe." },
    solution: { nom: "Trouve x", consigne: "Laisse x tout seul.",
      indice: "Divise les deux côtés par le nombre collé au x.",
      manque: "C'est juste, mais x n'est pas encore tout seul.",
      pourquoi: "On divise les deux côtés par le nombre collé au x." }
  };

  /* ---------- démarche modèle, calculée depuis n'importe quelle ligne ---------- */
  function chaine(eq0) {
    const dev = developper(eq0), red = reduire(dev), reg = regrouper(red), regRed = reduire(reg), sol = resoudre(eq0);
    return { depart: eq0, dev, red, reg, regRed, sol, solEq: sol.type === "une" ? eqSolution(sol.x) : null };
  }
  /* La ligne modèle qui atteint la forme demandée à partir de prev (ou la prochaine étape utile si forme absente). */
  function prochaine(prev, forme) {
    const c = chaine(prev);
    if (!forme) forme = ORDRE.find(f => !FORMES[f](prev)) || "solution";
    if (forme === "developpe") return c.dev;
    if (forme === "reduit") return c.red;
    if (forme === "regroupe") return c.regRed;
    return c.solEq || c.regRed;
  }
  /* Écriture d'une solution : « x = 1/4 » et, si elle tombe juste, « = 0,25 ». */
  function ecrireSolution(x) {
    const dec = x.estEntier() ? null : x.decimal();
    return "x = " + x.texte() + (dec ? " = " + dec : "");
  }
  /* Corrigé pas à pas : uniquement les lignes qui changent quelque chose. */
  function corrige(eq0) {
    const c = chaine(eq0), out = [], ec = E.ecrireEquation;
    let der = ec(eq0);
    const pousser = (id, eq, pourquoi, ligne) => { const l = ligne || ec(eq); if (l !== der) { out.push({ id, nom: ETAPES[id].nom, ligne: l, pourquoi }); der = l; } };
    if (!FORMES.developpe(eq0)) pousser("developpe", c.dev, ETAPES.developpe.pourquoi);
    pousser("reduit", c.red, ETAPES.reduit.pourquoi);
    if (c.sol.type !== "une") return out;
    if (!FORMES.regroupe(c.red)) {
      pousser("regroupe", c.reg, ETAPES.regroupe.pourquoi);
      pousser("regroupe", c.regRed, "On calcule de chaque côté.");
    }
    const a = c.regRed.g.length === 1 ? c.regRed.g[0].c : Fraction.UN;
    pousser("solution", c.solEq, a.egal(1) ? "x est déjà tout seul." : "On divise les deux côtés par " + a.texte() + ".", ecrireSolution(c.sol.x));
    return out;
  }
  /* Les étapes guidées d'une équation : seulement celles qui ont quelque chose à faire. */
  function etapesUtiles(eq0) {
    const vues = new Set(), out = [];
    for (const l of corrige(eq0)) if (!vues.has(l.id)) { vues.add(l.id); out.push(l.id); }
    return out;
  }

  /* ---------- jugement d'une ligne ---------- */
  function jugerLigne(prev, texte, forme) {
    const lu = MM.saisie.lireEquation(texte);
    if (!lu.ok) return { statut: "illisible", raison: lu.raison, message: lu.message };
    const cur = lu.eq, ecrit = E.ecrireEquation(cur), formes = ORDRE.filter(f => FORMES[f](cur));
    if (equivalentes(prev, cur)) {
      if (forme && !FORMES[forme](cur)) return { statut: "incomplet", eq: cur, ecrit, formes, manque: forme, message: ETAPES[forme].manque };
      const aSimplifier = FORMES.solution(cur) && [...cur.g, ...cur.d].some(t => t.aSimplifier);
      return { statut: "juste", eq: cur, ecrit, formes, aSimplifier };
    }
    /* Un code du catalogue trouvé seulement par coïncidence de solution (niveau 2) cède la place
       à une localisation précise appuyée sur au moins deux termes justes. */
    let d = MM.diag.diagnostiquer(prev, cur);
    if (!d || d.niveau === 2) { const l = MM.diag.localiser(prev, cur, false); if (!d || (l.localise && l.detail.communs.length >= 2)) d = l; }
    return { statut: "faux", eq: cur, ecrit, formes, code: d ? d.code : null, diag: d, attendu: E.ecrireEquation(prochaine(prev, forme)) };
  }

  /* Une démarche entière, jugée d'un coup (mode seul, examens). Pas de double pénalité :
     après une ligne fausse, la suivante est jugée à partir de cette ligne-là. */
  function evaluerDemarche(eq0, lignes, formes) {
    let prev = eq0, nbErreurs = 0, premiere = -1;
    const res = lignes.map((txt, i) => {
      const v = jugerLigne(prev, txt, formes ? formes[i] : null);
      if (v.statut === "faux") { nbErreurs++; if (premiere < 0) premiere = i; }
      if (v.eq) prev = v.eq;
      return v;
    });
    const der = res.length ? res[res.length - 1] : null;
    const fini = !!(der && der.eq && FORMES.solution(der.eq));
    return { lignes: res, nbErreurs, premiereErreur: premiere, fini, resultatJuste: fini && equivalentes(eq0, der.eq) };
  }

  /* ---------- jugement d'une expression (une seule réponse : développer, réduire) ---------- */
  const FORMES_EXPR = {
    developpe: ts => ts.every(t => !t.inner),
    reduit: ts => FORMES.reduit({ g: ts, d: [mono(0, 0)] })
  };
  function attenduExpr(depart, forme) { return forme === "reduit" ? redCote(depart) : devCote(depart); }
  function jugerExpression(depart, texte, forme) {
    const lu = MM.saisie.lireExpression(texte);
    if (!lu.ok) return { statut: "illisible", raison: lu.raison, message: lu.message };
    const ecrit = E.ecrireCote(lu.termes);
    if (lu.poly.egal(poly(depart))) {
      if (forme && !FORMES_EXPR[forme](lu.termes)) return { statut: "incomplet", ecrit, manque: forme, message: ETAPES[forme].manque };
      return { statut: "juste", ecrit };
    }
    const d = MM.diag.diagnostiquerExpression(depart, lu.poly, lu.termes) || MM.diag.localiser({ g: depart, d: [] }, { g: lu.termes, d: [] }, true);
    return { statut: "faux", ecrit, code: d ? d.code : null, diag: d, attendu: E.ecrireCote(attenduExpr(depart, forme)) };
  }

  MM.etapes = { developper, devCote, devTerme, reduire, redCote, regrouper, resoudre, signature, equivalentes, memesCotes, eqSolution,
    FORMES, ORDRE, ETAPES, chaine, prochaine, corrige, etapesUtiles, ecrireSolution, jugerLigne, evaluerDemarche, jugerExpression, attenduExpr, lesX, lesNombres, opp };
  if (typeof module !== "undefined" && module.exports) module.exports = MM;
})(typeof globalThis !== "undefined" ? globalThis : this);
