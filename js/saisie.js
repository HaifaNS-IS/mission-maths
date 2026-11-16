/* Mission Maths — saisie.js
   Saisie tolérante : lit un nombre, une expression, une équation ou un point, et compare sans se soucier de l'écriture.
   0,25 = 0.25 = 1/4 ; « −5x+6 » = « 6−5x » ; (4;−1) = (4,−1) ; espaces ignorés. */
(function (G) {
  "use strict";
  const MM = G.MM || (G.MM = {});
  if (typeof require === "function" && !MM.expr) require("./expr.js");
  const E = MM.expr, Fraction = MM.Fraction;

  const MESSAGES = {
    "vide": "Écris ta ligne avant de valider.",
    "egal-manquant": "Il manque le signe =.",
    "egal-multiple": "Garde un seul signe = par ligne.",
    "egal-en-trop": "Pas de signe = ici : écris seulement l'expression.",
    "nombre": "Un nombre est mal écrit. Exemple : 0,5.",
    "parenthese": "Une parenthèse n'est pas fermée, ou il y en a une en trop.",
    "parenthese-vide": "Il n'y a rien dans la parenthèse.",
    "incomplet": "Il manque quelque chose après un signe.",
    "ordre": "Écris le nombre avant le x : 2x. Pour un carré, touche ².",
    "exposant": "Je ne lis que les petites puissances, comme x².",
    "division-x": "Je ne sais pas lire une division par x.",
    "division-zero": "On ne divise jamais par zéro.",
    "separateur": "Écris un point comme ça : (4 ; −1).",
    "pas-un-nombre": "J'attends un nombre, sans x."
  };
  function messageLecture(code, info) {
    if (code === "symbole") return "Je ne connais pas le symbole « " + (info && info.symbole || "?") + " ».";
    return MESSAGES[code] || "Je n'arrive pas à lire ta ligne.";
  }
  function essayer(fn) {
    try { return Object.assign({ ok: true }, fn()); }
    catch (e) {
      if (e instanceof MM.ErreurLecture) return { ok: false, raison: e.code, message: messageLecture(e.code, e.info) };
      if (e instanceof RangeError) return { ok: false, raison: "division-zero", message: messageLecture("division-zero") };
      throw e;
    }
  }

  /* Une expression en x : { termes, poly } */
  const lireExpression = t => essayer(() => E.lireExpression(t));
  /* Une équation : { eq: { g, d } } */
  const lireEquation = t => essayer(() => ({ eq: E.lireEquation(t) }));
  /* Un nombre (calcul sans x accepté : 1/4, −3, 2+3) : { valeur } */
  const lireNombre = t => essayer(() => {
    const p = E.lireExpression(t).poly;
    if (p.degre() > 0) throw new MM.ErreurLecture("pas-un-nombre");
    return { valeur: p.coef(0) };
  });
  /* Une solution : « x = 1/4 », « 1/4 = x » ou « 1/4 » : { valeur } */
  const lireSolution = t => essayer(() => {
    const s = E.normaliser(t);
    if (!s.includes("=")) { const p = E.lireExpression(s).poly; if (p.degre() > 0) throw new MM.ErreurLecture("pas-un-nombre"); return { valeur: p.coef(0) }; }
    const eq = E.lireEquation(s), pg = E.polyDeTermes(eq.g), pd = E.polyDeTermes(eq.d);
    const estX = p => p.degre() === 1 && p.coef(1).egal(1) && p.coef(0).estNul();
    if (estX(pg) && pd.degre() <= 0) return { valeur: pd.coef(0) };
    if (estX(pd) && pg.degre() <= 0) return { valeur: pg.coef(0) };
    throw new MM.ErreurLecture("pas-un-nombre");
  });
  /* Un point : (4 ; −1), (4,−1), A(4;-1), 4;−1 : { x, y } */
  const lirePoint = t => essayer(() => {
    let s = String(t == null ? "" : t).replace(/[\s   ]/g, "");
    if (!s) throw new MM.ErreurLecture("vide");
    s = s.replace(/^[A-Za-z](?=\()/, "");
    if (s.startsWith("(") && s.endsWith(")")) s = s.slice(1, -1);
    let parts;
    if (s.includes(";")) parts = s.split(";");
    else {
      const idx = []; for (let i = 0; i < s.length; i++) if (s[i] === ",") idx.push(i);
      if (idx.length === 1) parts = [s.slice(0, idx[0]), s.slice(idx[0] + 1)];
      else if (idx.length === 3) parts = [s.slice(0, idx[1]), s.slice(idx[1] + 1)];     // (0,5,1,5) = (0,5 ; 1,5)
      else throw new MM.ErreurLecture("separateur");
    }
    if (parts.length !== 2 || !parts[0] || !parts[1]) throw new MM.ErreurLecture("separateur");
    const num = u => { const p = E.lireExpression(u).poly; if (p.degre() > 0) throw new MM.ErreurLecture("pas-un-nombre"); return p.coef(0); };
    return { x: num(parts[0]), y: num(parts[1]) };
  });

  /* Comparaison tolérante selon la nature de la réponse attendue. Retour : { ok, egal } (ok faux = illisible). */
  function comparer(type, saisie, attendu) {
    const lire = { nombre: lireNombre, solution: lireSolution, expression: lireExpression, point: lirePoint, equation: lireEquation }[type];
    if (!lire) throw new Error("type de saisie inconnu : " + type);
    const a = lire(saisie), b = lire(attendu);
    if (!b.ok) throw new Error("valeur attendue illisible : " + attendu);
    if (!a.ok) return { ok: false, egal: false, raison: a.raison, message: a.message };
    let egal;
    if (type === "nombre" || type === "solution") egal = a.valeur.egal(b.valeur);
    else if (type === "expression") egal = a.poly.egal(b.poly);
    else if (type === "point") egal = a.x.egal(b.x) && a.y.egal(b.y);
    else egal = MM.etapes.signature(a.eq) === MM.etapes.signature(b.eq);
    return { ok: true, egal };
  }

  MM.saisie = { messageLecture, lireExpression, lireEquation, lireNombre, lireSolution, lirePoint, comparer };
  if (typeof module !== "undefined" && module.exports) module.exports = MM;
})(typeof globalThis !== "undefined" ? globalThis : this);
