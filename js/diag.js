/* Mission Maths — diag.js
   Catalogue des erreurs (cahier des charges, section 4) et diagnostic.
   Principe : on applique à la ligne précédente de l'élève chaque erreur type ; si le résultat est sa ligne, on sait laquelle il a faite.
   Aucune réponse fausse n'est écrite à la main : chacune est calculée. */
(function (G) {
  "use strict";
  const MM = G.MM || (G.MM = {});
  if (typeof require === "function" && !MM.etapes) require("./etapes.js");
  const E = MM.expr, T = MM.etapes, Fraction = MM.Fraction, mono = E.mono, poly = E.polyDeTermes;

  /* Les 17 codes du cahier des charges, plus CALC, PRIO, SOL-NB et A-UN. actif = détection livrée ; sinon, lot prévu. */
  const CATALOGUE = {
    "SIG-PAR":   { nom: "Signe moins non distribué", exemple: "−5(x + 8) → −5x + 40", reflexe: "Le moins se colle à chaque terme de la parenthèse.", actif: true },
    "SIG-REL":   { nom: "Règle des signes", exemple: "−3 × −4 = −12", reflexe: "Moins par moins donne plus. Pense à l'ascenseur.", actif: true },
    "DIST-PART": { nom: "Distribution partielle", exemple: "7(x − 4) → 7x − 4", reflexe: "Le nombre devant multiplie chaque terme de la parenthèse.", actif: true },
    "RED-MIX":   { nom: "Mélange x et nombres", exemple: "7x − 28 → −21x", reflexe: "On n'additionne pas des pommes et des poires.", actif: true },
    "TRANS-SIG": { nom: "Passage d'un côté sans changer le signe", exemple: "x + 5 = 9 → x = 14", reflexe: "La balance : même opération des deux côtés.", actif: true },
    "DIV-INV":   { nom: "Division inversée", exemple: "4x = 1 → x = 4", reflexe: "On divise par ce qui est collé au x.", actif: true },
    /* Ajout au catalogue minimum, validé le 15/11/2026 : erreurs de table, d'addition, de division. */
    "CALC":      { nom: "Erreur de calcul", exemple: "3 × 5 = 12", reflexe: "Un calcul à la fois, au brouillon.", actif: true, ajout: "2026-11-15" },
    /* Ajout validé le 23/11/2026 (lot 2, palier P1). */
    "PRIO":      { nom: "Priorités de calcul", exemple: "2 + 3 × 4 = 20", reflexe: "Le × et le ÷ passent avant le + et le −.", actif: true, ajout: "2026-11-23" },
    /* Lot 3 (palier P5). ABC-SIG vaut aussi pour a quand a est négatif (−x²). */
    "ABC-SIG":   { nom: "b ou c pris sans son signe", exemple: "b = 13 au lieu de −13", reflexe: "Le signe fait partie du nombre.", actif: true },
    "DELTA-SQ":  { nom: "(−b)² ou −b mal calculé", exemple: "−(−13) = −13", reflexe: "Parenthèses obligatoires quand b est négatif.", actif: true },
    "RAC-SQ":    { nom: "Racine confondue avec carré", exemple: "√49 = 49²", reflexe: "La racine, c'est le chemin retour du carré.", actif: true },
    /* Ajouts validés le 24/11/2026 (D57). */
    /* Le nom et le réflexe s'affichent à l'élève dès la 1re erreur : ils ne donnent ni a = 1, ni la règle complète du signe de Δ (D50). */
    "SOL-NB":    { nom: "Nombre de solutions mal déduit de Δ", exemple: "Δ = −23 → deux solutions", reflexe: "Le signe de Δ décide du nombre de solutions.", actif: true, ajout: "2026-11-24" },
    "A-UN":      { nom: "Nombre caché devant x², lu comme 0", exemple: "x² − 13x + 30 = 0 → a = 0", reflexe: "Un x² seul cache un nombre, jamais 0.", actif: true, ajout: "2026-11-24" },
    "M-MX":      { nom: "m confondu avec mx", exemple: "m = −3x", reflexe: "m est le nombre devant x, sans le x.", actif: true, ajout: "2026-11-25" },
    "B-SIG":     { nom: "b sans son signe", exemple: "y = −3x − 5 → b = 5", reflexe: "b garde son signe.", actif: true, ajout: "2026-11-25" },
    "ORD-INV":   { nom: "Forme inversée mal lue", exemple: "y = 6 − 5x → m = 6", reflexe: "On réécrit d'abord y = −5x + 6.", actif: true, ajout: "2026-11-25" },
    "M-ZERO":    { nom: "Fonction constante", exemple: "y = 8 → m = 8", reflexe: "Pas de x, donc m = 0.", actif: true, ajout: "2026-11-25" },
    "XY-INV":    { nom: "Coordonnées inversées", exemple: "(−1 ; 4) au lieu de (4 ; −1)", reflexe: "x d'abord : la rue, puis l'étage.", actif: true, ajout: "2026-11-25" },
    /* Lot 4a (js/affine.js) : M-MX, B-SIG, ORD-INV, M-ZERO et XY-INV détectés. Lot express du 29/11 (géométrie, js/geo.js) : AXE-INV et PENTE-ORD. */
    "AXE-INV":   { nom: "Mauvais axe pour l'intersection", exemple: "axe des ordonnées avec y = 0", reflexe: "Sur l'axe des ordonnées, x vaut 0.", actif: true },
    "PENTE-ORD": { nom: "Ordre des points mélangé", exemple: "(11 − 5) / (1 − 4)", reflexe: "Même point en premier en haut et en bas.", actif: true },
    "AIRE-2":    { nom: "Oubli du / 2", exemple: "aire = 24", reflexe: "Un triangle, c'est la moitié d'un rectangle.", lot: 4 },
    /* Ajouts validés le 25/11/2026 (lot express, D70). Le réflexe ne donne pas la valeur juste (D50). */
    "RAC-OUB":   { nom: "Racine oubliée", exemple: "AB² = 25 → AB = 25", reflexe: "La distance, c'est la racine du résultat.", actif: true, ajout: "2026-11-25" },
    "HYPO":      { nom: "Hypoténuse mal repérée", exemple: "côté² = 10² + 6²", reflexe: "L'hypoténuse est en face de l'angle droit.", actif: true, ajout: "2026-11-25" }
  };
  /* À égalité, le code le plus précis l'emporte : une faute de signe sur une parenthèse est toujours SIG-PAR. */
  const PRIORITE = ["SIG-PAR", "DIST-PART", "RED-MIX", "TRANS-SIG", "DIV-INV", "SIG-REL", "A-UN", "ABC-SIG", "DELTA-SQ", "SOL-NB", "RAC-SQ", "HYPO", "PENTE-ORD", "AXE-INV", "RAC-OUB", "XY-INV", "ORD-INV", "M-ZERO", "M-MX", "B-SIG"];
  /* Doublons de structure, pas des coïncidences : un signe retourné sur un produit de parenthèse est aussi une faute de signe,
     un terme qui change de côté sans changer de signe aussi. Le code précis garde la réponse, SIG-REL la lâche. */
  const STRUCTUREL = [["SIG-PAR", "SIG-REL"], ["TRANS-SIG", "SIG-REL"]];
  const sansDoublonStructurel = codes => codes.filter(c => !STRUCTUREL.some(([precis, large]) => c === large && codes.includes(precis)));

  const signe = t => (t.c.signe() < 0 ? "" : "+") + E.ecrireTerme(t);
  const entrePar = v => v.signe() < 0 ? "(" + v.texte() + ")" : v.texte();
  const termePar = t => t.c.signe() < 0 ? "(" + E.ecrireTerme(t) + ")" : E.ecrireTerme(t);

  /* ---------- erreurs types en développant ---------- */
  const FAUX_DEV = {
    "SIG-PAR": t => t.c.signe() < 0 ? t.inner.map((u, k) => mono(k === 0 ? t.c.fois(u.c) : t.c.abs().fois(u.c), t.d + u.d)) : null,
    "DIST-PART": t => t.inner.map((u, k) => k === 0 ? mono(t.c.fois(u.c), t.d + u.d) : mono(u.c, u.d))
  };
  function detailDev(t, faux) {
    const bon = T.devTerme(t);
    return { terme: E.ecrireTerme(t), facteur: t.c, premier: bon[0], u: t.inner[1], faux: faux[1], bon: bon[1], t, fauxTermes: faux };
  }
  function malDevelopper(eq) {
    const out = [], places = [];
    for (const cote of ["g", "d"]) eq[cote].forEach((t, i) => { if (t.inner && !t.opaque && t.inner.length >= 2) places.push({ cote, i }); });
    for (const code of ["SIG-PAR", "DIST-PART"]) {
      const app = places.filter(p => { const t = eq[p.cote][p.i], w = FAUX_DEV[code](t); return w && !poly(w).egal(poly(T.devTerme(t))); }).slice(0, 4);
      for (let m = 1; m < (1 << app.length); m++) {
        const choisis = app.filter((_, k) => (m >> k) & 1);
        const cote = c => eq[c].flatMap((t, i) => choisis.some(p => p.cote === c && p.i === i) ? FAUX_DEV[code](t) : T.devTerme(t));
        const t0 = eq[choisis[0].cote][choisis[0].i];
        const detail = detailDev(t0, FAUX_DEV[code](t0));
        detail.autres = choisis.slice(1).map(p => E.ecrireTerme(eq[p.cote][p.i]));
        out.push({ code, n: choisis.length, eq: { g: cote("g"), d: cote("d") }, detail });
      }
    }
    return out;
  }

  /* ---------- erreurs types en réduisant un côté déjà développé ---------- */
  function malReduire(ts) {
    const out = [], groupes = new Map(), ordre = [];
    for (const t of ts) { if (!groupes.has(t.d)) { groupes.set(t.d, []); ordre.push(t.d); } groupes.get(t.d).push(t); }
    const bon = T.redCote(ts);
    if (groupes.size === 2 && groupes.has(0) && groupes.has(1)) {            // RED-MIX : tout additionné ensemble
      const total = ts.reduce((s, t) => s.plus(t.c), Fraction.ZERO);
      for (const d of [1, 0]) {
        const cote = total.estNul() ? [] : [mono(total, d)];
        out.push({ code: "RED-MIX", sorte: d, cote, detail: { termes: E.ecrireCote(ts), faux: E.ecrireCote(cote), bon: E.ecrireCote(bon) } });
      }
    }
    for (const d of ordre) {                                                   // SIG-REL : signe faux en additionnant
      const g = groupes.get(d);
      if (g.length < 2) continue;
      const somme = g.reduce((s, t) => s.plus(t.c), Fraction.ZERO);
      const vus = new Set([somme.cle()]);
      const variantes = [somme.oppose()];
      g.forEach(t => variantes.push(somme.moins(t.c).moins(t.c)));         // un terme dont le signe a été oublié, le premier compris
      for (const v of variantes) {
        if (vus.has(v.cle())) continue;
        vus.add(v.cle());
        out.push({ code: "SIG-REL", cote: T.redCote(ts, { [d]: v }),
          detail: { calcul: E.ecrireCote(g), faux: E.ecrireCote(v.estNul() ? [] : [mono(v, d)]), bon: E.ecrireCote(somme.estNul() ? [] : [mono(somme, d)]) } });
      }
    }
    return out;
  }

  /* ---------- toutes les lignes fausses « connues » à partir d'une ligne ---------- */
  function candidats(prev) {
    const out = [];
    const aj = (stade, code, eq, detail, n, fusion) => { if (!T.equivalentes(eq, prev)) out.push({ code, stade, eq, detail, n: n || 1, fusion: fusion || 0 }); };
    const dev = T.developper(prev), red = T.reduire(dev);
    // stade 0 : développer
    for (const c of malDevelopper(prev)) aj(0, c.code, c.eq, c.detail, c.n);
    // stade 1 : réduire (faute d'un côté ; RED-MIX possible des deux côtés à la fois)
    const mg = malReduire(dev.g), md = malReduire(dev.d);
    for (const c of mg) aj(1, c.code, { g: c.cote, d: red.d }, c.detail, 1, c.code === "RED-MIX" ? 1 : 0);
    for (const c of md) aj(1, c.code, { g: red.g, d: c.cote }, c.detail, 1, c.code === "RED-MIX" ? 1 : 0);
    for (const a of mg) for (const b of md) if (a.code === "RED-MIX" && b.code === "RED-MIX") aj(1, "RED-MIX", { g: a.cote, d: b.cote }, a.detail, 2, 2);
    // stade 2 : regrouper (seulement s'il reste quelque chose à déplacer)
    if (!T.FORMES.regroupe(red)) {
      const gX = T.lesX(red.g), gC = T.lesNombres(red.g), dX = T.lesX(red.d), dC = T.lesNombres(red.d), opp = T.opp;
      const det = t => ({ terme: signe(t), inverse: (t.c.signe() < 0 ? "ajoute " : "enlève ") + E.ecrireTerme(mono(t.c.abs(), t.d)) });
      // x vers la gauche
      if (dX.length) aj(2, "TRANS-SIG", { g: [...gX, ...dX], d: [...dC, ...opp(gC)] }, det(dX[0]));
      if (gC.length) aj(2, "TRANS-SIG", { g: [...gX, ...opp(dX)], d: [...dC, ...gC] }, det(gC[0]));
      if (dX.length && gC.length) aj(2, "TRANS-SIG", { g: [...gX, ...dX], d: [...dC, ...gC] }, det(dX[0]), 2);
      // x vers la droite
      if (gX.length) aj(2, "TRANS-SIG", { g: [...gC, ...opp(dC)], d: [...dX, ...gX] }, det(gX[0]));
      if (dC.length) aj(2, "TRANS-SIG", { g: [...gC, ...dC], d: [...dX, ...opp(gX)] }, det(dC[0]));
      if (gX.length && dC.length) aj(2, "TRANS-SIG", { g: [...gC, ...dC], d: [...dX, ...gX] }, det(gX[0]), 2);
      // faute de signe en calculant après avoir regroupé (−x + 5x → 6x)
      const reg = T.regrouper(red);
      for (const c of malReduire(reg.g)) if (c.code === "SIG-REL") aj(2, "SIG-REL", { g: c.cote, d: T.redCote(reg.d) }, c.detail);
      for (const c of malReduire(reg.d)) if (c.code === "SIG-REL") aj(2, "SIG-REL", { g: T.redCote(reg.g), d: c.cote }, c.detail);
    }
    // stade 3 : diviser
    const rr = T.reduire(T.regrouper(red));
    if (rr.g.length === 1 && rr.g[0].d === 1 && rr.d.length === 1 && rr.d[0].d === 0) {
      const a = rr.g[0].c, b = rr.d[0].c;
      if (!a.egal(1)) {
        const bon = b.sur(a);
        aj(3, "DIV-INV", T.eqSolution(a.sur(b)), { a, b, faux: a.sur(b), bon });
        if (a.signe() < 0 || b.signe() < 0) aj(3, "SIG-REL", T.eqSolution(bon.oppose()), { division: true, a, b, faux: bon.oppose(), bon });
      }
    }
    return out;
  }
  function choisir(liste, niveau) {
    if (!liste.length) return null;
    liste = liste.slice().sort((a, b) => a.stade - b.stade || PRIORITE.indexOf(a.code) - PRIORITE.indexOf(b.code) || a.n - b.n);
    const codes = sansDoublonStructurel([...new Set(liste.map(k => k.code))]);
    const premier = liste.find(k => codes.includes(k.code));
    return { code: premier.code, stade: premier.stade, detail: premier.detail, niveau, ambigu: codes.length > 1, autres: codes.filter(c => c !== premier.code) };
  }
  /* Quelle erreur type mène de prev à cur ? D'abord les lignes identiques côté par côté, sinon celles qui ont la même solution. */
  const nbTermes = ts => T.devCote(ts).filter(t => !t.c.estNul()).length;
  function diagnostiquer(prev, cur) {
    const courts = [cur.g, cur.d].filter(ts => nbTermes(ts) <= 1).length;
    const cands = candidats(prev).filter(k => k.fusion <= courts), sig = T.signature(cur);
    return choisir(cands.filter(k => T.memesCotes(k.eq, cur)), 1) || choisir(cands.filter(k => T.signature(k.eq) === sig), 2);
  }
  /* Même chose pour une expression seule (développer, réduire). */
  function candidatsExpression(termes) {
    const out = [], p0 = poly(termes);
    for (const c of malDevelopper({ g: termes, d: [] })) out.push({ code: c.code, stade: 0, n: c.n, termes: c.eq.g, detail: c.detail });
    for (const c of malReduire(T.devCote(termes))) out.push({ code: c.code, stade: 1, n: 1, termes: c.cote, detail: c.detail, fusion: c.code === "RED-MIX" ? 1 : 0 });
    return out.filter(c => !poly(c.termes).egal(p0));
  }
  function diagnostiquerExpression(termes, polySaisi, termesSaisis) {
    const court = termesSaisis ? (nbTermes(termesSaisis) <= 1 ? 1 : 0) : 1;
    return choisir(candidatsExpression(termes).filter(c => (c.fusion || 0) <= court && poly(c.termes).egal(polySaisi)), 1);
  }

  /* Table « code → réponses finales fausses » d'une équation : l'erreur est faite une fois, la suite est juste. */
  function reponsesFausses(eq0) {
    const table = {};
    for (const c of candidats(eq0)) {
      const s = T.resoudre(c.eq);
      if (s.type !== "une") continue;
      (table[c.code] || (table[c.code] = new Set())).add(s.x.cle());
    }
    for (const [precis, large] of STRUCTUREL) if (table[precis] && table[large]) for (const v of table[precis]) table[large].delete(v);
    const out = {};
    for (const code of Object.keys(table)) if (table[code].size) out[code] = [...table[code]];
    return out;
  }
  /* Valeurs revendiquées par deux codes différents : diagnostic ambigu, le générateur doit retirer une graine. */
  function collisions(table) {
    const vu = new Map(), out = [];
    for (const code of Object.keys(table)) for (const v of table[code]) {
      if (vu.has(v) && vu.get(v) !== code) out.push({ valeur: v, codes: [vu.get(v), code] });
      else vu.set(v, code);
    }
    return out;
  }
  /* Diagnostic sur la seule réponse finale (mode seul sans lignes). */
  function diagnostiquerReponse(table, valeur) {
    const k = MM.F(valeur).cle();
    const codes = Object.keys(table).filter(c => table[c].includes(k)).sort((a, b) => PRIORITE.indexOf(a) - PRIORITE.indexOf(b));
    return codes.length ? { code: codes[0], ambigu: codes.length > 1 } : null;
  }

  /* ---------- erreur hors catalogue : trouver l'endroit exact ----------
     On compare la ligne de l'élève aux lignes modèles possibles (développée, réduite, regroupée, solution).
     Si un seul terme diffère, on remonte à l'opération qui le produit : un produit, une somme, une division, une recopie. */
  const sansZero = ts => ts.filter(t => !t.c.estNul());
  const cleMono = t => t.d + ":" + t.c.cle();
  function apparier(eleve, modele) {
    const pile = new Map();
    for (const t of modele) { const k = cleMono(t); if (!pile.has(k)) pile.set(k, []); pile.get(k).push(t); }
    const restE = [], communs = [];
    for (const t of eleve) { const l = pile.get(cleMono(t)); if (l && l.length) { l.pop(); communs.push(t); } else restE.push(t); }
    const restM = []; for (const l of pile.values()) restM.push(...l);
    return { restE, restM, communs };
  }
  const somme = ts => ts.reduce((a, t) => a.plus(t.c), Fraction.ZERO);
  /* D'où vient le terme attendu ? Un produit (position connue ou cherchée), une somme, une division, ou une simple recopie. */
  function origine(sorte, chaine, prev, cote, m, index) {
    const memeDegre = ts => sansZero(ts).filter(t => t.d === m.d);
    if (sorte === "dev") {
      const sources = prev[cote].flatMap(t => t.inner ? t.inner.map(u => ({ m: mono(t.c.fois(u.c), t.d + u.d), f1: mono(t.c, t.d), f2: u })) : [{ m: mono(t.c, t.d) }]).filter(x => !x.m.c.estNul());
      const s0 = index != null && sources[index] && sources[index].m.c.egal(m.c) && sources[index].m.d === m.d ? sources[index] : sources.find(x => x.f1 && x.m.c.egal(m.c) && x.m.d === m.d);
      return s0 && s0.f1 ? { op: "produit", f1: s0.f1, f2: s0.f2 } : { op: "copie" };
    }
    if (sorte === "sol") {
      const r = chaine.regRed;
      if (r.g.length === 1 && r.g[0].d === 1 && r.d.length === 1 && r.d[0].d === 0) return { op: "division", a: r.g[0].c, b: r.d[0].c };
      return { op: "copie" };
    }
    const sources = sorte === "red" ? memeDegre(T.devCote(prev[cote])) : sorte === "regRed" ? memeDegre(chaine.reg[cote]) : [];
    return sources.length >= 2 ? { op: "somme", termes: sources } : { op: "copie" };
  }
  const NATUREL = ["dev", "red", "reg", "regRed", "sol"];
  const PREFERENCE = { solution: ["sol", "regRed", "reg", "red", "dev"], regroupe: ["regRed", "reg", "red", "dev", "sol"], reduit: ["red", "dev", "regRed", "reg", "sol"], developpe: NATUREL, aucune: NATUREL };
  function comparer(Se, A) {
    // 1. par position : même nombre de termes, un seul diffère
    if (Se.g.length === A.g.length && Se.d.length === A.d.length) {
      const diffs = [];
      for (const c of ["g", "d"]) Se[c].forEach((t, i) => { if (cleMono(t) !== cleMono(A[c][i])) diffs.push({ c, i }); });
      if (diffs.length === 1) {
        const { c, i } = diffs[0];
        return { loc: "remplace", cote: c, index: i, faux: Se[c][i], bon: A[c][i], communs: [...Se.g.filter((t, k) => !(c === "g" && k === i)), ...Se.d.filter((t, k) => !(c === "d" && k === i))] };
      }
    }
    // 2. sans tenir compte de l'ordre
    const rg = apparier(Se.g, A.g), rd = apparier(Se.d, A.d), nE = rg.restE.length + rd.restE.length, nM = rg.restM.length + rd.restM.length;
    const c = (rg.restE.length || rg.restM.length) ? "g" : "d", r = c === "g" ? rg : rd, communs = rg.communs.concat(rd.communs);
    if (nE === 1 && nM === 1 && rg.restE.length === rg.restM.length) return { loc: "remplace", cote: c, index: null, faux: r.restE[0], bon: r.restM[0], communs };
    if (nE + nM === 1) return { loc: nM ? "manque" : "trop", cote: c, faux: r.restE[0] || null, bon: r.restM[0] || null, communs };
    return null;
  }
  /* Plusieurs termes faux : on aligne sa ligne sur la ligne modèle la plus proche, terme à terme.
     Chaque terme faux est rattaché à l'opération qui devait le produire ; les termes en trop ou oubliés sont nommés. */
  const avecZero = ts => { const r = sansZero(ts); return r.length ? r : [mono(0, 0)]; };     // « x = 0 » : le 0 est un terme comme un autre
  function nature(f, b) { return f.c.abs().egal(b.c.abs()) ? "signe" : f.c.signe() === b.c.signe() ? "valeur" : "tout"; }
  function plusieurs(cands, S, estExpression, ch, prev, cur) {
    let mieux = null;
    for (const k of cands) for (const inv of estExpression ? [false] : [false, true]) {
      const A = { g: avecZero(k.eq.g), d: avecZero(k.eq.d) }, fautes = [], manques = [], trops = [], communs = [];
      for (const c of estExpression ? ["g"] : ["g", "d"]) {
        const se = inv ? (c === "g" ? S.d : S.g) : S[c], r = apparier(se, A[c]), restM = r.restM.slice();
        communs.push(...r.communs);
        for (const crit of [(f, b) => f.d === b.d && f.c.abs().egal(b.c.abs()), (f, b) => f.d === b.d, () => true])
          for (const f of r.restE.filter(x => !fautes.some(y => y.faux === x) && !trops.includes(x))) {
            const j = restM.findIndex(b => crit(f, b));
            if (j >= 0 && (crit.length === 2 || restM.length === r.restE.filter(x => !fautes.some(y => y.faux === x)).length)) fautes.push({ cote: c, faux: f, bon: restM.splice(j, 1)[0] });
          }
        trops.push(...r.restE.filter(x => !fautes.some(y => y.faux === x)));
        manques.push(...restM.map(b => ({ cote: c, bon: b })));
      }
      const cout = fautes.length + trops.length + manques.length;
      if (cout >= 2 && (!mieux || cout < mieux.cout)) mieux = { cout, k, fautes, manques, trops, communs };
    }
    if (!mieux || mieux.cout > 5) return null;
    const { k } = mieux;
    const rang = t => { const ts = S.g.concat(S.d); const i = ts.indexOf(t); return i < 0 ? 99 : i; };   // dans l'ordre de sa ligne
    mieux.fautes.sort((a, b) => rang(a.faux) - rang(b.faux));
    const fautes = mieux.fautes.map(x => Object.assign({ faux: x.faux, bon: x.bon }, x.faux.d === x.bon.d ? origine(k.sorte, ch, prev, x.cote, x.bon, null) : { op: "degre" }, { nature: nature(x.faux, x.bon) }));
    const manques = mieux.manques.map(x => Object.assign({ bon: x.bon }, origine(k.sorte, ch, prev, x.cote, x.bon, null)));
    const detail = { loc: "plusieurs", fautes, manques, trops: mieux.trops, communs: mieux.communs, expression: !!estExpression, test: testChiffre(k.sorte, prev, cur, estExpression) };
    // le moins devant la parenthèse oublié sur tous ses termes : c'est SIG-PAR (« −7(x − 5) → 7x − 35 »)
    const f1 = fautes[0] && fautes[0].f1;
    if (f1 && f1.c.signe() < 0 && !manques.length && !mieux.trops.length && fautes.every(f => f.op === "produit" && f.f1 && f.f1.c.egal(f1.c) && f.f1.d === f1.d && f.faux.c.egal(f.bon.c.oppose()))) {
      const t = prev.g.concat(prev.d).find(u => u.inner && u.c.egal(f1.c) && u.d === f1.d && u.inner.length === fautes.length);
      if (t) return { code: "SIG-PAR", localise: true, detail: { tout: true, terme: E.ecrireTerme(t), facteur: t.c, t, fauxTermes: T.devTerme(t).map(u => mono(u.c.oppose(), u.d)), autres: [] } };
    }
    const calcul = fautes.length && !manques.length && !mieux.trops.length && fautes.every(f => ["produit", "somme", "division"].includes(f.op));
    return { code: calcul ? "CALC" : null, localise: true, detail };
  }
  /* Le test chiffré de la 2e explication : quand le côté doit garder sa valeur (développer, réduire), on le calcule pour un x. */
  function testChiffre(sorte, prev, cur, estExpression) {
    if (!(estExpression || sorte === "dev" || sorte === "red")) return null;
    for (const c of estExpression ? ["g"] : ["g", "d"]) {
      const v = xTest(prev[c], cur[c]);
      if (v != null) return { x: v, cote: estExpression ? null : c, avant: valeurEn(prev[c], v), tienne: valeurEn(cur[c], v) };
    }
    return null;
  }
  function localiser(prev, cur, estExpression) {
    const ch = T.chaine(prev);
    const r0 = T.reduire(prev), axb = ts => ts.length === 1 && ts[0].d === 1, nb = ts => ts.length === 1 && ts[0].d === 0;
    const resteDivision = (axb(r0.g) && nb(r0.d)) || (axb(r0.d) && nb(r0.g));
    let cands = [{ sorte: "dev", eq: ch.dev }, { sorte: "red", eq: ch.red }];
    if (!estExpression) { cands.push({ sorte: "reg", eq: ch.reg }, { sorte: "regRed", eq: ch.regRed }); if (ch.solEq && resteDivision) cands.push({ sorte: "sol", eq: ch.solEq }); }
    const vus = new Set();                                   // deux modèles identiques : on garde le plus tôt (sa provenance est plus riche)
    cands = cands.filter(k => { const c = E.ecrireEquation(k.eq); if (vus.has(c)) return false; vus.add(c); return true; });
    const formeMax = estExpression ? (T.FORMES.reduit({ g: cur.g, d: [mono(0, 0)] }) ? "reduit" : "developpe") : (["solution", "regroupe", "reduit", "developpe"].find(f => T.FORMES[f](cur)) || "aucune");
    cands.sort((a, b) => PREFERENCE[formeMax].indexOf(a.sorte) - PREFERENCE[formeMax].indexOf(b.sorte));
    const S = { g: avecZero(T.devCote(cur.g)), d: avecZero(T.devCote(cur.d)) };
    const essais = [];
    for (const k of cands) for (const inv of estExpression ? [false] : [false, true]) {
      const r = comparer(inv ? { g: S.d, d: S.g } : S, { g: avecZero(k.eq.g), d: avecZero(k.eq.d) });
      if (r) essais.push(Object.assign(r, { k }));
    }
    const e = essais.find(x => x.loc === "remplace") || essais[0];
    if (e) {
      const detail = { loc: e.loc, cote: e.cote, faux: e.faux, bon: e.bon, communs: e.communs };
      if (e.loc === "remplace" && e.faux.d === e.bon.d) Object.assign(detail, origine(e.k.sorte, ch, prev, e.cote, e.bon, e.index));
      else if (e.loc === "manque") { const o = origine(e.k.sorte, ch, prev, e.cote, e.bon, null); if (o.op === "produit") Object.assign(detail, { op: "produit-manque", f1: o.f1, f2: o.f2 }); }
      else if (e.loc === "remplace") detail.op = "degre";
      const calcul = ["produit", "somme", "division"].includes(detail.op);       // table, addition, division : code CALC
      return { code: calcul ? "CALC" : null, localise: true, detail };
    }
    // plusieurs termes faux (recette du 23/11) : on les retrouve tous, chacun avec l'opération qui le produit
    // … sauf un saut direct à une solution « x = … » quand la division n'est pas encore possible : rien de fiable à pointer
    const m = estExpression || !T.FORMES.solution(cur) || cands.some(k => k.sorte === "sol") ? plusieurs(cands, S, estExpression, ch, prev, cur) : null;
    if (m) return m;
    // sinon, au moins dire quel côté tient encore
    const pg = poly(cur.g), pd = poly(cur.d);
    if (!estExpression) for (const k of cands) {
      if (k.sorte === "sol") continue;
      if (poly(k.eq.g).egal(pg) && !poly(k.eq.d).egal(pd)) return { code: null, localise: false, detail: { loc: "cote", juste: "g" } };
      if (poly(k.eq.d).egal(pd) && !poly(k.eq.g).egal(pg)) return { code: null, localise: false, detail: { loc: "cote", juste: "d" } };
    }
    return { code: null, localise: false, detail: { loc: "inconnu", expression: !!estExpression } };
  }

  /* ---------- l'explication du prof : ce qui est juste, l'endroit exact où ça déraille, la règle ---------- */
  const ecr = t => E.ecrireTerme(t);
  /* Variante 2 (D37) : la même erreur, expliquée autrement (autre image, ou vérification avec des nombres). */
  function autrement(r, regle) { return Object.assign(r, { regle, variante: 2 }); }
  /* La valeur d'une écriture pour un x donné : sert à « tester avec x = 1 ». */
  const valeurEn = (termes, x) => poly(termes).valeur(x);
  function xTest(a, b) { for (const v of [1, 2, 3, -1, 10]) if (!valeurEn(a, v).egal(valeurEn(b, v))) return v; return null; }
  function expliquerHorsCatalogue(x, code, variante) {
    const r = expliquerHorsCatalogue1(x, code);
    if (variante !== 2) return r;
    if (x.loc === "remplace" && x.op === "produit") return autrement(r, "Fais-le en deux temps : le signe d'abord, puis " + x.f1.c.abs().texte() + " × " + x.f2.c.abs().texte() + ".");
    if (x.loc === "remplace" && x.op === "somme") return autrement(r, "Range : les plus ensemble, les moins ensemble. Puis fais la différence.");
    if (x.loc === "remplace" && x.op === "division") return autrement(r, "Pose la division au brouillon, puis simplifie la fraction.");
    if (x.loc === "manque" || x.loc === "trop") return autrement(r, "Compte les termes de la ligne d'avant, puis ceux de ta ligne.");
    if (x.loc === "plusieurs" && x.test) return autrement(r, "Teste avec x = " + x.test.x + " : " + (x.test.cote ? "à " + (x.test.cote === "g" ? "gauche" : "droite") + ", " : "") + "la ligne d'avant vaut " + x.test.avant.texte() + ", la tienne " + x.test.tienne.texte() + ".");
    if (x.loc === "plusieurs") return autrement(r, "Reprends la ligne d'avant et refais un terme à la fois.");
    return autrement(r, "Relis ta ligne terme par terme. Compare-la à la ligne d'avant.");
  }
  function expliquerHorsCatalogue1(x, code) {
    const base = { code: code || null, reflexe: code ? CATALOGUE[code].reflexe : "", suite: "" };
    const autres = (x.communs || []).filter(t => !t.c.estNul());
    const bonAvant = autres.length === 1 ? "Ton " + ecr(autres[0]) + " est bon." : autres.length ? "Le reste de ta ligne est juste." : "Tu es sur la bonne étape.";
    if (x.loc === "remplace" && x.op === "produit") {
      const v = x.f1.c.fois(x.f2.c).abs();
      return Object.assign(base, { titre: "Erreur de calcul", bon: bonAvant, resume: ecr(x.f1) + " × " + termePar(x.f2) + " = " + ecr(x.bon) + ", pas " + ecr(x.faux),
        ou: "Mais " + ecr(x.f1) + " × " + termePar(x.f2) + " ne fait pas " + ecr(x.faux) + " : " + (x.bon.c.abs().egal(x.faux.c.abs()) ? "regarde le signe." : "refais le calcul.") + "",
        regle: x.f1.d + x.f2.d === 0 ? "Le signe d'abord, puis la table de " + x.f1.c.abs().texte() + "." : "Refais ce produit au brouillon." });
    }
    if (x.loc === "remplace" && x.op === "somme") {
      const calc = E.ecrireCote(x.termes);
      return Object.assign(base, { titre: "Erreur de calcul", bon: bonAvant, resume: calc + " = " + ecr(x.bon) + ", pas " + ecr(x.faux),
        ou: "Mais " + calc + " ne fait pas " + ecr(x.faux) + " : " + (x.bon.c.abs().egal(x.faux.c.abs()) ? "regarde le signe." : "refais le calcul.") + "", regle: "Calcule un terme après l'autre, au brouillon." });
    }
    if (x.loc === "remplace" && x.op === "division") {
      const ab = x.b.texte() + " ÷ " + entrePar(x.a);
      return Object.assign(base, { titre: "Erreur de calcul", bon: "Tu as bien isolé x.", resume: ab + " = " + x.bon.c.texte() + ", pas " + x.faux.c.texte(),
        ou: "Mais " + ab + " ne fait pas " + x.faux.c.texte() + ".", regle: "Vérifie en remultipliant : " + x.a.texte() + " × " + entrePar(x.faux.c) + " = " + x.a.fois(x.faux.c).texte() + ", pas " + x.b.texte() + "." });
    }
    if (x.loc === "remplace" && x.op === "degre") return Object.assign(base, { titre: "Un x s'est égaré", bon: bonAvant, resume: ecr(x.bon) + " attendu, pas " + ecr(x.faux),
      ou: x.bon.d === 0 ? "Mais " + ecr(x.faux) + " ne doit pas avoir de x." : "Mais il manque le x dans " + ecr(x.faux) + ".", regle: x.bon.d === 0 ? "Un nombre seul n'a pas de x." : "Ce terme garde son x." });
    if (x.loc === "remplace") return Object.assign(base, { titre: "Erreur de recopie", bon: bonAvant, resume: ecr(x.bon) + " attendu, pas " + ecr(x.faux),
      ou: "Mais " + ecr(x.faux) + " ne vient pas de la ligne d'avant : relis-la.", regle: "Recopie chaque terme avec son signe." });
    if (x.loc === "manque") return Object.assign(base, { titre: "Un terme a disparu", bon: bonAvant, resume: "terme oublié : " + ecr(x.bon),
      ou: x.op === "produit-manque" ? "Mais il manque le terme qui vient de " + ecr(x.f1) + " × " + termePar(x.f2) + "." : "Mais il manque un terme de la ligne d'avant.", regle: "Chaque terme doit se retrouver dans la ligne suivante." });
    if (x.loc === "trop") return Object.assign(base, { titre: "Un terme en trop", bon: bonAvant, resume: "terme en trop : " + ecr(x.faux),
      ou: "Mais le terme " + signe(x.faux) + " n'a rien à faire là.", regle: "Vérifie d'où vient chaque terme." });
    if (x.loc === "plusieurs") return Object.assign(base, plusieursTextes(x, bonAvant));
    if (x.loc === "cote") return Object.assign(base, { titre: "Un côté ne tient plus", bon: "Ton côté " + (x.juste === "g" ? "gauche" : "droit") + " est juste.",
      resume: "côté " + (x.juste === "g" ? "droit" : "gauche") + " faux", ou: "Le côté " + (x.juste === "g" ? "droit" : "gauche") + " contient plusieurs erreurs.", regle: "Refais ce côté terme par terme." });
    return Object.assign(base, { titre: "Quelque chose ne va pas", bon: "Je ne trouve pas l'erreur exacte.", resume: "",
      ou: x.expression ? "Ta ligne n'est plus égale à l'expression de départ." : "Ta ligne n'a plus la même solution que la ligne d'avant.",
      regle: "Reprends la ligne d'avant, un terme à la fois." });
  }
  /* Plusieurs termes faux : pour chacun, l'opération à refaire, sans en donner le résultat (D37). Le parent a le détail chiffré. */
  const NATURE = { signe: "regarde le signe.", valeur: "la valeur est fausse.", tout: "signe et valeur." };
  function plusieursTextes(x, bonAvant) {
    const phrase = f => {
      if (f.op === "produit") return "Pour " + ecr(f.faux) + ", refais " + ecr(f.f1) + " × " + termePar(f.f2) + " : " + NATURE[f.nature];
      if (f.op === "somme") return "Pour " + ecr(f.faux) + ", refais " + E.ecrireCote(f.termes) + " : " + NATURE[f.nature];
      if (f.op === "division") return "Pour " + ecr(f.faux) + ", refais " + f.b.texte() + " ÷ " + entrePar(f.a) + ".";
      if (f.op === "degre") return "Pour " + ecr(f.faux) + ", regarde le x : " + (f.bon.d === 0 ? "ce terme n'en a pas." : "il en faut un.");
      return "Le terme " + ecr(f.faux) + " a changé en route : " + (f.nature === "signe" ? "regarde son signe." : "reprends-le dans la ligne d'avant.");
    };
    const manque = m => m.op === "produit" ? "Il manque le terme qui vient de " + ecr(m.f1) + " × " + termePar(m.f2) + "." : "Il manque un terme de la ligne d'avant.";
    const phrases = x.fautes.map(phrase).concat(x.manques.map(manque), x.trops.map(t => "Le terme " + ecr(t) + " n'a rien à faire là."));
    const chiffre = f => f.op === "produit" ? ecr(f.f1) + " × " + termePar(f.f2) + " = " + ecr(f.bon) + ", pas " + ecr(f.faux) : f.op === "somme" ? E.ecrireCote(f.termes) + " = " + ecr(f.bon) + ", pas " + ecr(f.faux) : ecr(f.bon) + " attendu, pas " + ecr(f.faux);
    const resume = x.fautes.map(chiffre).concat(x.manques.map(m => "oublié : " + ecr(m.bon)), x.trops.map(t => "en trop : " + ecr(t))).join(" ; ");
    const calcul = x.fautes.length && !x.manques.length && !x.trops.length && x.fautes.every(f => ["produit", "somme", "division"].includes(f.op));
    return { titre: calcul ? "Plusieurs erreurs de calcul" : "Plusieurs termes à revoir", bon: bonAvant.replace("Tu es sur la bonne étape.", "Tu es sur la bonne étape, mais plusieurs termes coincent."),
      resume, ou: phrases.length > 3 ? phrases.slice(0, 2).join(" ") + " Et " + (phrases.length - 2) + " autres termes." : phrases.join(" "),
      regle: "Un calcul à la fois : le signe d'abord, puis la valeur." };
  }
  function expliquer(d, variante) {
    const code = d && d.code, x = d && d.detail;
    if ((!code || code === "CALC") && x && x.loc) return expliquerHorsCatalogue(x, code, variante);
    if (!code || !CATALOGUE[code]) return expliquerHorsCatalogue({ loc: "inconnu" }, null, variante);
    const cat = CATALOGUE[code];
    let bon, ou, regle;
    if (!x) { bon = "Ta démarche est bonne jusqu'ici."; ou = "Une erreur connue s'est glissée : " + cat.nom.toLowerCase() + "."; regle = cat.reflexe; }
    else if (code === "SIG-PAR" && x.tout) {
      bon = "Tu as bien multiplié par " + x.facteur.abs().texte() + ".";
      ou = "Mais le moins devant le " + x.facteur.abs().texte() + " a disparu, sur chaque terme.";
      regle = "Dans " + x.terme + ", le moins se colle à chaque terme de la parenthèse.";
    }
    else if (code === "SIG-PAR") {
      bon = x.facteur.abs().egal(1) ? "Tu as bien enlevé la parenthèse." : "Tu as bien multiplié par " + x.facteur.abs().texte() + ".";
      ou = "Mais dans " + x.terme + ", le moins touche aussi le terme " + signe(x.u) + ".";
      regle = x.facteur.texte() + " × " + termePar(x.u) + " ne fait pas " + signe(x.faux) + " : " + (x.u.c.signe() < 0 ? "moins par moins donne plus." : "moins par plus donne moins.");
    } else if (code === "DIST-PART") {
      bon = "Ton " + E.ecrireTerme(x.premier) + " est bon.";
      ou = "Mais dans " + x.terme + ", le " + x.facteur.texte() + " multiplie aussi le terme " + signe(x.u) + ".";
      regle = "Refais " + x.facteur.texte() + " × " + termePar(x.u) + ", et garde le signe du résultat.";
    } else if (code === "RED-MIX") {
      bon = "Tu as bien vu qu'il fallait réduire.";
      ou = "Mais " + x.termes + " ne donne pas " + x.faux + ".";
      regle = "Les x et les nombres ne se mélangent pas : garde-les séparés.";
    } else if (code === "TRANS-SIG") {
      bon = "Tu as bien rangé : les x d'un côté, les nombres de l'autre.";
      ou = "Mais " + x.terme + " a changé de côté sans changer de signe.";
      regle = "La balance : pour faire partir " + x.terme + ", on " + x.inverse + " des deux côtés.";
    } else if (code === "DIV-INV") {
      bon = "Tu as bien vu qu'il restait une division.";
      ou = "Mais tu as divisé dans le mauvais sens.";
      regle = "On divise par le nombre collé au x, jamais l'inverse.";
    } else if (code === "SIG-REL" && x.division) {
      bon = "Tu as bien divisé par le nombre collé au x.";
      ou = "Mais " + x.b.texte() + " ÷ " + entrePar(x.a) + " ne fait pas " + x.faux.texte() + " : regarde le signe.";
      regle = "Signes différents : résultat négatif. Mêmes signes : résultat positif.";
    } else {
      bon = "Tu as regroupé les bons termes.";
      ou = "Mais " + x.calcul + " ne fait pas " + x.faux + " : regarde le signe.";
      regle = "L'ascenseur : avec +, tu montes. Avec −, tu descends.";
    }
    const suite = x && x.autres && x.autres.length ? "Même piège dans " + x.autres.join(" et ") + "." : "";
    if (variante === 2 && x) regle = regle2(code, x) || regle;
    return { code, titre: cat.nom, bon, ou, regle, suite, reflexe: cat.reflexe, variante: variante === 2 ? 2 : 1 };
  }
  /* Deuxième formulation : vérifier avec des nombres, ou une autre image. Tout est calculé. */
  function regle2(code, x) {
    if ((code === "SIG-PAR" || code === "DIST-PART") && x.t && x.fauxTermes) {
      const v = xTest([x.t], x.fauxTermes); if (v == null) return null;
      return "Teste avec x = " + v + " : " + x.terme + " vaut " + valeurEn([x.t], v).texte() + ", ta version vaut " + valeurEn(x.fauxTermes, v).texte() + ".";
    }
    if (code === "RED-MIX") {
      const a = E.lireExpression(x.termes).termes, b = x.faux && x.faux !== "0" ? E.lireExpression(x.faux).termes : [mono(0, 0)], v = xTest(a, b);
      return v == null ? null : "Teste avec x = " + v + " : " + x.termes + " vaut " + valeurEn(a, v).texte() + ", mais " + x.faux + " vaut " + valeurEn(b, v).texte() + ".";
    }
    if (code === "TRANS-SIG") return "Un terme qui traverse le signe = change de signe. Comme sur un pont : il change de côté et de signe.";
    if (code === "DIV-INV") return "Vérifie en remultipliant : " + x.a.texte() + " × " + entrePar(x.faux) + " = " + x.a.fois(x.faux).texte() + ", pas " + x.b.texte() + ".";
    if (code === "SIG-REL" && x.division) return "Compte les signes moins : un seul donne un résultat négatif, deux donnent positif.";
    if (code === "SIG-REL") return "Avec de l'argent : un moins, c'est une dette. Fais le compte terme par terme.";
    return null;
  }

  MM.diag = { CATALOGUE, PRIORITE, STRUCTUREL, candidats, localiser, diagnostiquer, candidatsExpression, diagnostiquerExpression, reponsesFausses, collisions, diagnostiquerReponse, expliquer, malDevelopper, malReduire };
  if (typeof module !== "undefined" && module.exports) module.exports = MM;
})(typeof globalThis !== "undefined" ? globalThis : this);
