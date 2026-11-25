/* Mission Maths — aide.js
   Échelle d'aide (décisions D37 à D40), sur une même ligne de l'élève :
     erreurs 1 et 2  explication ciblée de l'erreur commise (la 2e formulée autrement)          marche 1
     erreur 3        sa ligne, le ou les termes fautifs entourés, sans la réponse                 marche 2
     erreur 4        sa ligne, les termes fautifs remplacés par des cases à compléter             marche 3
     erreur 5        la ligne est montrée, il la tape lui-même ; un exercice jumeau suivra        marche 4
   Tout est calculé à partir de sa ligne et de la ligne précédente. Fonctions pures, sans accès à l'écran.
   Trois sortes de lignes : "equation" ({ g, d } de termes), "expression" (termes), "nombre" (arbre de nombres). */
(function (G) {
  "use strict";
  const MM = G.MM || (G.MM = {});
  if (typeof require === "function") { if (!MM.diag) require("./diag.js"); if (!MM.nombres) require("./nombres.js"); }
  const E = MM.expr, T = MM.etapes, D = MM.diag, N = MM.nombres, MOINS = E.MOINS;

  /* ---------- niveaux d'aide (rapport parent, D39) ---------- */
  const NIVEAUX = ["juste seul", "juste après explication", "juste après indice", "complétée (ligne à trous)", "recopiée"];
  const marche = n => n <= 0 ? 0 : n <= 2 ? 1 : n === 3 ? 2 : n === 4 ? 3 : 4;
  /* Niveau d'une ligne acceptée : la marche atteinte, ou « après indice » si le bouton indice a servi. */
  const niveau = (nbErreurs, indiceDemande) => Math.max(marche(nbErreurs), indiceDemande ? 2 : 0);
  /* D38 : plus de la moitié des lignes complétées ou recopiées → série à refaire. */
  function serieAFaire(niveaux) {
    const n = niveaux.length, lourds = niveaux.filter(v => v >= 3).length;
    return n > 0 && lourds * 2 > n;
  }

  /* ---------- éléments comparables d'une ligne ---------- */
  const xn = d => d === 0 ? "" : d === 1 ? "x" : d === 2 ? "x²" : "x^" + d;
  function elementsTermes(ts) {
    const out = ts.filter(t => t.inner || !t.c.estNul()).map(t => ({
      deg: t.inner ? -1 : t.d, c: t.c, cle: t.inner ? "p:" + E.ecrireTerme(t) : t.d + ":" + t.c.cle(),
      signe: t.c.signe() < 0 ? -1 : 1, corps: E.corpsTerme(Object.assign({}, t, { c: t.c.abs() }))
    }));
    return out.length ? out : [{ deg: 0, c: MM.F(0), cle: "0:0", signe: 1, corps: "0" }];
  }
  function elementsNombre(ast) {
    return N.plats(ast).map(p => {
      const v = N.valeurTerme(p);
      return { deg: p.sorte === "nombre" ? 0 : -1, c: v, cle: (p.sorte === "nombre" ? "0:" : "p:") + v.cle(), signe: p.s, corps: N.ecrire(p.n) };
    });
  }
  function cotes(type, ligne) {
    if (type === "equation") return [elementsTermes(ligne.g), elementsTermes(ligne.d)];
    if (type === "expression") return [elementsTermes(ligne)];
    return [elementsNombre(ligne)];
  }

  /* ---------- lignes modèles possibles pour l'étape ---------- */
  const xADroite = eq => ({ g: T.opp(eq.d), d: T.opp(eq.g) });
  function modeles(type, prev, forme) {
    if (type === "equation") {
      const c = T.chaine(prev), out = [];
      if (forme === "developpe") out.push(c.dev);
      else if (forme === "reduit") out.push(c.red);
      else if (forme === "regroupe") out.push(c.regRed, c.reg, xADroite(c.regRed));
      else if (forme === "solution") out.push(c.solEq || c.regRed);
      else out.push(c.dev, c.red, c.reg, c.regRed, c.solEq);
      return out.filter(Boolean).map(eq => ({ g: T.devCote(eq.g), d: T.devCote(eq.d) }));
    }
    if (type === "expression") return forme === "reduit" ? [T.redCote(prev)] : forme === "developpe" ? [T.devCote(prev)] : [T.devCote(prev), T.redCote(prev)];
    const formes = forme ? [forme] : ["parenthese", "produit", "nombre"];
    return formes.map(f => E.arbre(N.prochaine(prev, f)));
  }
  function ecrireModele(type, m) { return type === "equation" ? E.ecrireEquation(m) : type === "expression" ? E.ecrireCote(m) : N.ecrire(m); }

  /* ---------- alignement de sa ligne sur une ligne modèle, côté par côté ---------- */
  function aligner(S, M) {
    const reste = M.map(m => ({ m, pris: false })), res = S.map(s => ({ s, ok: false, m: null, sorte: null }));
    res.forEach(r => { const k = reste.find(x => !x.pris && x.m.cle === r.s.cle); if (k) { k.pris = true; r.ok = true; r.m = k.m; } });
    const criteres = [
      ["signe", (s, m) => s.deg >= 0 && s.deg === m.deg && s.c.abs().egal(m.c.abs())],
      ["valeur", (s, m) => s.deg >= 0 && s.deg === m.deg && s.c.signe() === m.c.signe()],
      ["terme", (s, m) => s.deg === m.deg],
      ["terme", () => true]];
    for (const [sorte, f] of criteres) res.filter(r => !r.ok && !r.m).forEach(r => { const k = reste.find(x => !x.pris && f(r.s, x.m)); if (k) { k.pris = true; r.m = k.m; r.sorte = sorte; } });
    res.forEach(r => { if (!r.ok && !r.m) r.sorte = "trop"; });
    const manques = reste.filter(x => !x.pris).map(x => x.m);
    return { res, manques, cout: res.filter(r => !r.ok).length + manques.length };
  }
  /* Les fautes de sa ligne : le modèle le plus proche (et le sens d'écriture le plus proche). */
  function fautes(type, prev, cur, forme) {
    const C = cotes(type, cur);
    let mieux = null;
    for (const m of modeles(type, prev, forme)) {
      const Mc = cotes(type, m);
      const sens = type === "equation" ? [false, true] : [false];
      for (const inv of sens) {
        const MM2 = inv ? [Mc[1], Mc[0]] : Mc;
        const al = C.map((s, i) => aligner(s, MM2[i])), cout = al.reduce((a, x) => a + x.cout, 0);
        if (!mieux || cout < mieux.cout) mieux = { cout, al, modele: inv ? { g: m.d, d: m.g } : m };
      }
    }
    return { nbFautes: mieux.cout, cotes: mieux.al, modele: mieux.modele, ecritModele: ecrireModele(type, mieux.modele) };
  }

  /* ---------- marche 2 : sa ligne, termes fautifs entourés ---------- */
  const joint = (el, premier) => premier ? (el.signe < 0 ? MOINS : "") + el.corps : (el.signe < 0 ? " " + MOINS + " " : " + ") + el.corps;
  const MESSAGES = {
    signe: "Regarde le signe du terme entouré.",
    valeur: "Le signe est bon. Regarde la valeur du terme entouré.",
    terme: "Regarde le terme entouré : d'où vient-il ?",
    trop: "Le terme entouré est-il à sa place ?",
    manque: "Il manque un terme de ce côté."
  };
  function pointer(type, prev, cur, forme, code) {
    const f = fautes(type, prev, cur, forme);
    const segments = f.cotes.map(c => {
      const parts = c.res.map((r, i) => ({ texte: joint(r.s, i === 0), faux: !r.ok, sorte: r.sorte }));
      if (c.manques.length) parts.push({ texte: parts.length ? " + …" : "…", faux: true, sorte: "manque" });
      return parts;
    });
    const premiere = segments.flat().find(p => p.faux);
    const nb = segments.flat().filter(p => p.faux).length;
    const message = (premiere ? MESSAGES[premiere.sorte] : "Relis ta ligne terme par terme.") + (nb > 1 ? " Même chose pour les autres termes entourés." : "")
      + (code && D.CATALOGUE[code] ? " " + D.CATALOGUE[code].reflexe : "");
    return { segments, message, nbFautes: nb };
  }

  /* ---------- marche 3 : sa ligne, termes fautifs remplacés par des cases ----------
     Jetons : { fixe: "texte" } ou { trou: i, sorte: "terme" | "signe" | "valeur", premier }. */
  function aTrous(type, prev, cur, forme) {
    const f = fautes(type, prev, cur, forme), jetons = [];
    let n = 0;
    f.cotes.forEach((c, k) => {
      if (k === 1) jetons.push({ fixe: " = " });
      c.res.forEach((r, i) => {
        const premier = i === 0;
        // « attendu » ne s'affiche jamais : il sert aux tests (remplir les cases avec la bonne réponse donne une ligne juste)
        const valeurM = r.m ? (r.m.deg > 0 && r.m.c.abs().egal(1) ? "1" : r.m.c.abs().texte()) : "";
        if (r.ok) jetons.push({ fixe: joint(r.s, premier) });
        else if (r.sorte === "signe") { jetons.push({ trou: n++, sorte: "signe", premier, attendu: r.m.signe < 0 ? MOINS : "+", saisi: r.s.signe < 0 ? MOINS : "+" }); jetons.push({ fixe: (premier ? "" : " ") + r.s.corps }); }
        else if (r.sorte === "valeur" && r.s.deg >= 0) {
          jetons.push({ fixe: premier ? (r.s.signe < 0 ? MOINS : "") : (r.s.signe < 0 ? " " + MOINS + " " : " + ") });
          jetons.push({ trou: n++, sorte: "valeur", premier, attendu: valeurM, saisi: r.s.c.abs().texte() });
          if (r.s.deg > 0) jetons.push({ fixe: xn(r.s.deg) });
        } else jetons.push({ trou: n++, sorte: "terme", premier, attendu: r.m ? joint(r.m, true) : "", saisi: joint(r.s, true) });
      });
      c.manques.forEach(m => jetons.push({ trou: n++, sorte: "terme", premier: !c.res.length, attendu: joint(m, true), saisi: "" }));
    });
    return { jetons, nbTrous: n, modele: f.ecritModele };
  }
  /* Recolle la ligne à partir des cases remplies. Une case « terme » vide fait disparaître le terme. */
  function assembler(jetons, valeurs) {
    let s = "", vide = false;
    const nettoie = v => String(v == null ? "" : v).trim();
    for (const j of jetons) {
      if (j.fixe != null) { s += j.fixe; continue; }
      const v = nettoie(valeurs[j.trou]);
      if (j.sorte === "signe") { const moins = /^[-−]/.test(v); s += j.premier ? (moins ? "-" : "") : (moins ? " - " : " + "); if (!/^[-−+]$/.test(v)) vide = true; }
      else if (j.sorte === "valeur") { if (!v) vide = true; s += v; }
      else if (v) s += j.premier || /^[-−+]/.test(v) ? (j.premier ? v : " " + v) : " + " + v;
    }
    s = s.replace(/=\s*$/, "= 0").replace(/^\s*=/, "0 =").replace(/=\s+\+\s*/, "= ").replace(/^\s*\+\s*/, "");
    return { texte: s, incomplet: vide };
  }

  /* ---------- marche 1 : l'explication, première ou deuxième formulation ---------- */
  function expliquer(type, d, variante) {
    if (d && d.aff && MM.affine) return MM.affine.expliquer(d, variante);         // repère et fonctions affines (lot 4a)
    if (d && d.geo && MM.geo) return MM.geo.expliquer(d, variante);               // géométrie (lot express)
    if (d && d.p5 && MM.second) return MM.second.expliquer(d, variante);          // second degré (lot 3)
    return type === "nombre" || type === "coefs" ? N.expliquer(d, variante) : D.expliquer(d, variante);
  }
  /* La variante de l'explication : la 2e erreur du même type est formulée autrement ; un autre type a sa première explication. */
  const variante = (nbErreurs, code, codePrecedent) => nbErreurs === 2 && code === codePrecedent ? 2 : 1;

  MM.aide = { NIVEAUX, marche, niveau, serieAFaire, modeles, fautes, pointer, aTrous, assembler, expliquer, variante, cotes };
  if (typeof module !== "undefined" && module.exports) module.exports = MM;
})(typeof globalThis !== "undefined" ? globalThis : this);
