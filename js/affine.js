/* Mission Maths — affine.js
   Lot 4a : P6 (repère et points) et P7 (fonctions affines), au format de l'ex. 3a du contrôle.
     lire    un point dessiné : abscisse, ordonnée, puis le point écrit A(4, −1) (guidé) ; le point seul sinon
     placer  un point à placer au toucher dans le repère (la page envoie « (x ; y) »)
     ligne   une ligne du tableau : (réécrire la forme inversée), m, b, le point sur l'axe des ordonnées, le sens de variation
     eqmb    la ligne vide : m et b donnés → l'équation, le point sur l'axe des ordonnées, le sens de variation
     tracer  depuis m et b : placer (0, b), puis un 2e point de la droite
   Même interface que MM.geo et MM.second : la page déroule les étapes de la même façon (et.p5, et.aff).
   Règle centrale : chaque étape est jugée à partir des valeurs DE L'ÉLÈVE (pas de double pénalité).
   Rien n'est écrit à la main : chaque bonne valeur et chaque réponse fausse est calculée. */
(function (G) {
  "use strict";
  const MM = G.MM || (G.MM = {});
  if (typeof require === "function") { if (!MM.geo) require("./geo.js"); }
  const N = MM.nombres, F = MM.F, GEO = MM.geo, MOINS = MM.expr.MOINS;
  const ecr = v => GEO.ecr(F(v));
  const pointTexte = (nom, x, y) => { x = F(x); y = F(y); return (nom || "") + "(" + (x.estEntier() && y.estEntier() ? ecr(x) + ", " + ecr(y) : ecr(x) + " ; " + ecr(y)) + ")"; };
  const cleP = (x, y) => "(" + F(x).cle() + ";" + F(y).cle() + ")";
  const VARIATIONS = ["croissante", "décroissante", "constante"];
  const sensDe = m => { m = F(m); return m.signe() > 0 ? "croissante" : m.signe() < 0 ? "décroissante" : "constante"; };

  /* ---------- les sortes d'étapes ---------- */
  const SORTES = {
    abscisse: { type: "valeur", prefixe: "x = ", consigne: "Descends du point jusqu'à l'axe horizontal : lis x.",
      indice: "L'axe horizontal, c'est l'axe des x : la rue. Compte les carreaux depuis O." },
    ordonnee: { type: "valeur", prefixe: "y = ", consigne: "Va du point jusqu'à l'axe vertical : lis y.",
      indice: "L'axe vertical, c'est l'axe des y : l'étage. Sous O, c'est négatif." },
    point: { type: "point", prefixe: "", consigne: "Écris le point : son nom, puis (x, y).", indice: "x d'abord : la rue, puis l'étage." },
    placer: { type: "placer", prefixe: "", consigne: "Touche le repère à l'endroit du point, puis valide.",
      indice: "Depuis O : avance de x (vers la gauche s'il est négatif), puis monte de y (descends s'il est négatif)." },
    reecrire: { type: "droite", prefixe: "", consigne: "Réécris l'équation sous la forme y = mx + b : le terme en x d'abord.",
      indice: "Garde chaque terme avec son signe : seul l'ordre change." },
    m: { type: "valeur", prefixe: "m = ", consigne: "m est le nombre devant x, avec son signe.", indice: "Pas de x dans l'équation : la droite est plate. Un x seul cache un 1." },
    b: { type: "valeur", prefixe: "b = ", consigne: "b est le nombre seul, avec son signe.", indice: "Pas de nombre seul : b vaut 0." },
    oy: { type: "point", prefixe: "", consigne: "Le point où la droite coupe l'axe des ordonnées.", indice: "Sur l'axe des ordonnées, x = 0 : le point est (0, b)." },
    variation: { type: "choix", prefixe: "", choix: VARIATIONS, consigne: "Croissante, décroissante ou constante ?",
      indice: "Regarde le signe de m : positif, la rampe monte ; négatif, elle descend ; 0, elle est plate." },
    equation: { type: "droite", prefixe: "", consigne: "Écris l'équation : remplace m et b dans y = mx + b.", indice: "m devant x, b tout seul, chacun avec son signe." },
    t1: { type: "placer", prefixe: "", consigne: "Place le point de départ, sur l'axe des ordonnées.", indice: "Le départ est (0, b) : sur l'axe vertical, à la hauteur b." },
    t2: { type: "placer", prefixe: "", consigne: "Avance de 1 vers la droite, monte de m : place un 2e point.", indice: "m positif : on monte. m négatif : on descend. Un carreau vers la droite à chaque fois." }
  };
  const etape = spec => Object.assign({ p5: true, aff: true, simple: true }, SORTES[spec.sorte], spec, { voirPrefixe: !!(SORTES[spec.sorte].prefixe || spec.prefixe) });

  /* ---------- l'état : SES valeurs ---------- */
  const clone = o => JSON.parse(JSON.stringify(o));
  function etatInitial() { return { v: {} }; }
  const sa = (s, id) => s && s.v && s.v[id] != null ? s.v[id] : null;
  const mDe = (s, exo) => sa(s, "m") != null ? F(sa(s, "m")) : F(exo.m);
  const bDe = (s, exo) => sa(s, "b") != null ? F(sa(s, "b")) : F(exo.b);

  /* ---------- le chemin ---------- */
  function plan(exo, mode) {
    const g = mode === "guide";
    switch (exo.modele) {
      case "lire": return (g ? [{ id: "x", sorte: "abscisse", nom: "L'abscisse de " + exo.nom }, { id: "y", sorte: "ordonnee", nom: "L'ordonnée de " + exo.nom }] : []).concat([{ id: "pt", sorte: "point", nom: "Le point " + exo.nom }]);
      case "placer": return [{ id: "pl", sorte: "placer", nom: "Place " + exo.nom }];
      case "ligne": return (g && exo.forme === "bmx" ? [{ id: "eq0", sorte: "reecrire", nom: "Réécris l'équation" }] : [])
        .concat([{ id: "m", sorte: "m", nom: "La pente m" }, { id: "b", sorte: "b", nom: "L'ordonnée à l'origine b" }, { id: "oy", sorte: "oy", nom: "Sur l'axe des ordonnées" }, { id: "var", sorte: "variation", nom: "Sens de variation" }]);
      case "eqmb": return [{ id: "eq", sorte: "equation", nom: "L'équation" }, { id: "oy", sorte: "oy", nom: "Sur l'axe des ordonnées" }, { id: "var", sorte: "variation", nom: "Sens de variation" }];
      case "tracer": return [{ id: "t1", sorte: "t1", nom: "Le point de départ" }, { id: "t2", sorte: "t2", nom: "Un 2e point" }];
    }
    return [];
  }
  function etapes(exo, mode, etat) {
    etat = etat || etatInitial(exo);
    return plan(exo, mode).map(sp => { const e = etape(sp); e.attendu = attenduTexte(e, etat, exo); return e; });
  }
  /* La valeur attendue : un nombre (Fraction), un point [x, y], un mot ou une droite { m, b }. */
  function attendu(e, s, exo) {
    switch (e.id) {
      case "x": return F(exo.pt[0]);
      case "y": return F(exo.pt[1]);
      case "pt": return [sa(s, "x") != null ? F(sa(s, "x")) : F(exo.pt[0]), sa(s, "y") != null ? F(sa(s, "y")) : F(exo.pt[1])];
      case "pl": return exo.pt.map(F);
      case "m": return F(exo.m);
      case "b": return F(exo.b);
      case "oy": return [F(0), bDe(s, exo)];
      case "var": return sensDe(mDe(s, exo));
      case "eq0": case "eq": return { m: F(exo.m), b: F(exo.b) };
      case "t1": return [F(0), F(exo.b)];
      case "t2": { const p = depart2(s, exo), m = F(exo.m), q = [p[0].plus(1), p[1].plus(m)]; return q[1].abs().cmp(6) <= 0 && q[0].cmp(6) <= 0 ? q : [p[0].moins(1), p[1].moins(m)]; }
    }
    return null;
  }
  const depart2 = (s, exo) => sa(s, "t1") ? sa(s, "t1").map(F) : [F(0), F(exo.b)];
  function attenduTexte(e, s, exo) {
    const a = attendu(e, s, exo);
    if (a == null) return "";
    if (e.id === "pt") return pointTexte(exo.nom, a[0], a[1]);
    if (Array.isArray(a)) return pointTexte("", a[0], a[1]);
    if (typeof a === "string") return a;
    if (a.m) return "y = " + GEO.affine(a.m, a.b);
    return (e.prefixe || "") + ecr(a);
  }
  const lireDepart = () => null;

  /* ---------- lectures ---------- */
  const normal = t => String(t == null ? "" : t).replace(/\s+/g, "").replace(/[–-]/g, MOINS);
  /* Un point : « A(4, −1) », « (4 ; −1) », « 4 ; −1 »… (D88). La virgule sépare x et y s'il n'y a pas de « ; ». */
  function lirePoint(texte) {
    let t = normal(texte), nom = null;
    const non = message => ({ ok: false, message });
    if (!t) return non("Écris le point : (x, y).");
    const m = /^([A-Za-z])\(/.exec(t);
    if (m) { nom = m[1].toUpperCase(); t = t.slice(1); }
    else if (/^[A-Za-z]/.test(t)) return non("Écris le point avec ses deux nombres : (x, y).");
    if (t.startsWith("(")) { if (!t.endsWith(")")) return non("Ferme la parenthèse du point."); t = t.slice(1, -1); }
    let parts;
    if (t.includes(";")) parts = t.split(";");
    else if ((t.match(/,/g) || []).length === 1) parts = t.split(",");
    else if ((t.match(/,/g) || []).length > 1) return non("Sépare x et y par « ; » : ici, une virgule est aussi celle d'un nombre.");
    else return non("Écris les deux coordonnées, séparées par une virgule : (x, y).");
    if (parts.length !== 2) return non("Un point a deux coordonnées : (x, y).");
    if (parts.some(p => !p)) return non("Il manque une coordonnée : (x, y).");
    if (/[a-zA-Z]/.test(parts.join(""))) return non("Dans le point, écris seulement des nombres.");
    const v = parts.map(p => N.lire(p));
    const ko = v.find(x => !x.ok);
    if (ko) return non(ko.message || "Je n'arrive pas à lire ce point.");
    return { ok: true, x: v[0].valeur, y: v[1].valeur, nom };
  }
  /* Un nombre, avec ou sans le nom recopié devant (« m = −3 ») ; « −3x » est signalé (M-MX). */
  function lireValeur(e, texte) {
    let t = normal(texte);
    const nom = (e.prefixe || "").replace(/\s|=/g, "");
    if (nom && t.toLowerCase().startsWith(nom.toLowerCase() + "=")) t = t.slice(nom.length + 1);
    if (!t) return { ok: false, message: "Écris un nombre." };
    const avecX = /^([+−]?)([0-9,./]*)x$/.exec(t);
    if (avecX) {
      const c = avecX[2] ? N.lire(avecX[2]) : { ok: true, valeur: F(1) };
      if (c.ok) return { ok: true, valeur: avecX[1] === MOINS ? c.valeur.oppose() : c.valeur, avecX: true, ecrit: t };
    }
    if (/[a-zA-Z]/.test(t)) return { ok: false, message: e.id === "m" ? "m est un nombre : écris-le sans lettre." : "Écris seulement un nombre." };
    const l = N.lire(t);
    if (!l.ok) return { ok: false, message: l.message };
    if (!N.FORMES.nombre(l.ast) && !/^[+−]?\d+([,.]\d+)?\/\d+$/.test(t)) return { ok: false, message: "Écris un seul nombre, sans calcul." };
    return { ok: true, valeur: l.valeur, ecrit: ecr(l.valeur) };
  }
  function lireVariation(texte) {
    const t = String(texte == null ? "" : texte).trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    const i = ["croissante", "decroissante", "constante"].indexOf(t);
    return i < 0 ? { ok: false, message: "Choisis : croissante, décroissante ou constante." } : { ok: true, mot: VARIATIONS[i] };
  }

  /* ---------- erreurs types (calculées) ---------- */
  /* Pour un point attendu (a, b) : XY-INV, puis les signes (sans code). */
  function candidatsPoint(e, a, b, exo) {
    const out = [], aj = (code, x, y, detail) => { if (!out.some(k => k.x.egal(x) && k.y.egal(y)) && !(x.egal(a) && y.egal(b))) out.push({ code, x, y, detail: Object.assign({ aff: true }, detail) }); };
    if (!a.egal(b)) aj("XY-INV", b, a, { sorte: "xyInv", ou: e.id });
    if (e.id === "oy" && !F(exo.m).estNul() && !b.estNul()) aj("AXE-INV", b.oppose().sur(F(exo.m)), F(0), { sorte: "axeInv" });
    if (e.id === "t1" && !F(exo.m).estNul() && !b.estNul()) aj(null, b.oppose().sur(F(exo.m)), F(0), { sorte: "axeInvT" });
    if (!a.estNul()) aj(null, a.oppose(), b, { sorte: "signeX", a: a.signe() });
    if (!b.estNul()) aj(null, a, b.oppose(), { sorte: "signeY", b: b.signe() });
    if (!a.estNul() && !b.estNul()) aj(null, a.oppose(), b.oppose(), { sorte: "deuxSignes" });
    return out;
  }
  /* Pour une étape « valeur » : les nombres faux qu'une erreur type produit. */
  function candidatsValeur(e, exo) {
    const out = [], aj = (code, v, detail) => { v = F(v); if (!out.some(k => k.v.egal(v))) out.push({ code, v, detail: Object.assign({ aff: true }, detail) }); };
    const m = F(exo.m || 0), b = F(exo.b || 0);
    if (e.id === "x") { if (!F(exo.pt[1]).egal(F(exo.pt[0]))) aj("XY-INV", exo.pt[1], { sorte: "xyInv", ou: "x" }); if (!F(exo.pt[0]).estNul()) aj(null, F(exo.pt[0]).oppose(), { sorte: "signeX", a: F(exo.pt[0]).signe() }); }
    if (e.id === "y") { if (!F(exo.pt[1]).egal(F(exo.pt[0]))) aj("XY-INV", exo.pt[0], { sorte: "xyInv", ou: "y" }); if (!F(exo.pt[1]).estNul()) aj(null, F(exo.pt[1]).oppose(), { sorte: "signeY", b: F(exo.pt[1]).signe() }); }
    if (e.id === "m") {
      if (exo.forme === "bmx") aj("ORD-INV", b, { sorte: "ordInv", ou: "m" });
      if (exo.forme === "cst") aj("M-ZERO", b, { sorte: "mZero" });
      if (exo.forme === "un") aj(null, 0, { sorte: "unCache" });
      if (!m.estNul()) aj(null, m.oppose(), { sorte: "signeM" });
      if (exo.forme === "mxb" && !b.estNul()) aj(null, b, { sorte: "mEtB" });
    }
    if (e.id === "b") {
      if (exo.forme === "bmx") aj("ORD-INV", m, { sorte: "ordInv", ou: "b" });
      if (b.signe() < 0) aj("B-SIG", b.abs(), { sorte: "bSig" });
      if (b.signe() > 0) aj(null, b.oppose(), { sorte: "signeB" });
      if (exo.forme === "mx" && !m.estNul()) aj(null, m, { sorte: "bEtM" });
    }
    return out.filter(k => !k.v.egal(attendu(e, etatInitial(), exo)));
  }

  /* ---------- jugement d'une étape ---------- */
  const illisible = message => ({ statut: "illisible", message });
  function verdict(e, statut, o) {
    const v = Object.assign({ statut, code: null, diag: null, fin: true }, o);
    v.saisie = v.ecrit = (e.prefixe || "") + (o.ecrit || "");
    v.ast = v.ecrit;
    const CAT = MM.diag.CATALOGUE;
    if (statut === "faux" && v.precision && v.code && CAT[v.code]) v.precision = CAT[v.code].nom + " : " + v.precision;
    return v;
  }
  const faux = (e, o, code, detail, precision) => verdict(e, "faux", Object.assign(o, { code: code || null, diag: { aff: true, code: code || null, detail: Object.assign({ aff: true }, detail) }, precision }));
  function juger(e, s, prev, premiere, entree, exo) {
    if (e.type === "point" || e.type === "placer") return jugerPoint(e, s, entree, exo);
    if (e.type === "valeur") return jugerValeur(e, s, entree, exo);
    if (e.type === "choix") return jugerVariation(e, s, entree, exo);
    if (e.type === "droite") return jugerDroite(e, s, entree, exo);
    return illisible("Étape inconnue.");
  }
  function jugerPoint(e, s, texte, exo) {
    const p = lirePoint(texte);
    if (!p.ok) return illisible(e.type === "placer" ? "Touche le repère pour placer le point." : p.message);
    const nom = e.id === "pt" ? exo.nom : "", ecrit = pointTexte(nom, p.x, p.y), o = { ecrit, valeur: cleP(p.x, p.y), point: [p.x.cle(), p.y.cle()] };
    if (e.id === "t2") return jugerT2(e, s, p, o, exo);
    const [a, b] = attendu(e, s, exo), vrai = attendu(e, etatInitial(), exo);
    o.attendu = attenduTexte(e, s, exo);
    // juste à partir de SA ligne, ou juste tout court (une seule erreur n'est jamais comptée deux fois)
    if ((p.x.egal(a) && p.y.egal(b)) || (p.x.egal(vrai[0]) && p.y.egal(vrai[1]))) return verdict(e, "juste", o);
    const k = candidatsPoint(e, a, b, exo).find(c => c.x.egal(p.x) && c.y.egal(p.y));
    const precision = o.attendu + " attendu, pas " + ecrit;
    if (k) return faux(e, o, k.code, k.detail, precision);
    const d = p.x.moins(a).abs().plus(p.y.moins(b).abs());
    return faux(e, o, null, { sorte: d.egal(1) ? "decale" : "pointAutre", ou: e.id }, precision);
  }
  function jugerT2(e, s, p, o, exo) {
    const d = depart2(s, exo), m = F(exo.m), dx = p.x.moins(d[0]), dy = p.y.moins(d[1]);
    o.attendu = attenduTexte(e, s, exo);
    if (dx.estNul() && dy.estNul()) return illisible("Ce point est déjà placé : place un 2e point de la droite.");
    if (dy.egal(m.fois(dx)) && !dx.estNul()) return verdict(e, "juste", o);
    if (!p.x.estNul() && p.y.egal(m.fois(p.x).plus(F(exo.b)))) return verdict(e, "juste", o);       // sur la vraie droite
    const precision = "un point de la droite attendu, pas " + o.ecrit;
    if (!dx.estNul() && dy.egal(m.oppose().fois(dx))) return faux(e, o, null, { sorte: "penteSigne" }, precision);
    if (!dy.estNul() && dx.egal(m.fois(dy)) && !m.abs().egal(1)) return faux(e, o, null, { sorte: "penteInverse" }, precision);
    return faux(e, o, null, { sorte: "penteAutre" }, precision);
  }
  function jugerValeur(e, s, texte, exo) {
    const l = lireValeur(e, texte);
    if (!l.ok) return illisible(l.message);
    const bon = attendu(e, s, exo), o = { ecrit: l.ecrit, valeur: l.valeur.cle(), attendu: attenduTexte(e, s, exo) };
    const precision = o.attendu + " attendu, pas " + (e.prefixe || "") + l.ecrit;
    if (l.avecX) return e.id === "m" ? faux(e, o, "M-MX", { sorte: "mMx" }, precision) : illisible("Écris seulement un nombre, sans x.");
    if (l.valeur.egal(bon)) return verdict(e, "juste", o);
    const k = candidatsValeur(e, exo).find(c => c.v.egal(l.valeur));
    return k ? faux(e, o, k.code, k.detail, precision) : faux(e, o, null, { sorte: "valeurAutre", ou: e.id }, precision);
  }
  function jugerVariation(e, s, texte, exo) {
    const l = lireVariation(texte);
    if (!l.ok) return illisible(l.message);
    const bon = attendu(e, s, exo), o = { ecrit: l.mot, valeur: l.mot, attendu: bon };
    if (l.mot === bon || l.mot === attendu(e, etatInitial(), exo)) return verdict(e, "juste", o);
    const precision = bon + " attendue, pas " + l.mot, b = F(exo.b);
    if (bon === "constante") return faux(e, o, null, { sorte: "varZero" }, precision);
    if (!b.estNul() && l.mot === sensDe(b) && l.mot !== "constante") return faux(e, o, null, { sorte: "varB" }, precision);
    return faux(e, o, null, { sorte: "variation" }, precision);
  }
  /* La droite : réécrire (même droite, forme y = mx + b) ou écrire l'équation depuis m et b. */
  function jugerDroite(e, s, texte, exo) {
    let t = String(texte == null ? "" : texte).trim();
    if (!/=/.test(t)) t = "y = " + t;
    const lu = GEO.lireDroite(t);
    if (lu.erreur) return illisible(lu.erreur);
    if (lu.pasDroite) return illisible("Une droite s'écrit y = mx + b, sans x² ni x × y.");
    const B = lu.B;
    if (B.estNul()) return illisible("Il manque y : écris y = …");
    const m = lu.A.sur(B).oppose(), b = lu.C.sur(B).oppose(), att = attendu(e, s, exo);
    if (!lu.finale) return illisible(e.id === "eq0" ? "Mets le terme en x en premier : y = …x + …" : "Termine : y seul à gauche, puis mx + b.");
    const o = { ecrit: lu.ecrit, valeur: m.cle() + "x+" + b.cle(), attendu: "y = " + GEO.affine(att.m, att.b), droite: { m: m.cle(), b: b.cle() } };
    if (e.id === "eq0" && m.egal(att.m) && b.egal(att.b) && xEnTete(t)) return verdict(e, "juste", o);
    if (e.id === "eq0" && m.egal(att.m) && b.egal(att.b)) return illisible("Mets le terme en x en premier : y = …x + …");
    if (e.id === "eq" && m.egal(att.m) && b.egal(att.b)) return verdict(e, "juste", o);
    const precision = o.attendu + " attendu, pas " + lu.ecrit;
    if (e.id === "eq") {
      if (m.egal(att.b) && b.egal(att.m)) return faux(e, o, null, { sorte: "echangeMB" }, precision);
      if (m.egal(att.m) && att.b.signe() < 0 && b.egal(att.b.abs())) return faux(e, o, "B-SIG", { sorte: "bSig" }, precision);
      if (m.egal(att.m.oppose()) && b.egal(att.b)) return faux(e, o, null, { sorte: "signeM" }, precision);
      return faux(e, o, null, { sorte: "remplaceEq" }, precision);
    }
    if ((m.egal(att.m.oppose()) && b.egal(att.b)) || (m.egal(att.m) && b.egal(att.b.oppose()))) return faux(e, o, null, { sorte: "signeReecrit" }, precision);
    return faux(e, o, null, { sorte: "reecrire" }, precision);
  }
  /* « y = −5x + 6 » : à droite du =, le terme en x vient en premier. */
  const xEnTete = t => { const d = t.split("=")[1].replace(/\s/g, ""); const i = d.indexOf("x"), j = d.slice(1).search(/[+−-]/); return i >= 0 && (j < 0 || i < j + 1); };

  /* ---------- après une étape finie : SES valeurs deviennent l'état ---------- */
  function apres(s, e, v) {
    const o = clone(s); o.v = o.v || {};
    if (e.type === "valeur" && v.valeur != null) o.v[e.id] = F(v.valeur).cle();
    if ((e.id === "pt" || e.id === "t1") && v.point) o.v[e.id] = v.point;
    if (e.id === "eq" && v.droite) { o.v.m = v.droite.m; o.v.b = v.droite.b; }
    return o;
  }

  /* ---------- déroulé sans aide : le même code sert à l'app et aux tests ---------- */
  function entrer(Q) { Q.prev = null; }
  const premiereLigne = (Q, e) => !Q.acceptees.some(a => a.etape === e.id);
  function terminer(Q, e, v) {
    Q.p5 = apres(Q.p5, e, v);
    Q.etapes = etapes(Q.exo, Q.modeP5, Q.p5);
    Q.k = Q.etapes.findIndex(x => x.id === e.id) + 1;
    entrer(Q);
    Q.fini = Q.k >= Q.etapes.length;
  }
  function pas(Q, entree) {
    const e = Q.etapes[Q.k]; if (!e || Q.fini) return null;
    const v = juger(e, Q.p5, Q.prev, premiereLigne(Q, e), entree, Q.exo);
    if (v.statut === "illisible") return v;
    Q.journal.push({ etape: e.id, saisie: v.saisie, juste: v.statut !== "faux", statut: v.statut, code: v.code || null, precision: v.statut === "faux" ? v.precision || null : null });
    Q.acceptees.push({ etape: e.id, nom: e.nom, texte: v.ecrit, statut: v.statut, code: v.code || null, attendu: v.attendu || null, diag: v.statut === "faux" ? v.diag : null, typeLigne: e.type });
    terminer(Q, e, v);
    return v;
  }
  function nouveau(exo, mode) {
    const p5 = etatInitial(exo), Q = { exo, modeP5: mode, p5, etapes: etapes(exo, mode, p5), k: 0, prev: null, journal: [], acceptees: [], fini: false };
    return Q;
  }
  function jouer(exo, mode, entrees) {
    const Q = nouveau(exo, mode);
    Q.illisibles = [];
    for (const x of entrees) { if (Q.fini) break; const v = pas(Q, x); if (v && v.statut === "illisible") Q.illisibles.push(v.message); }
    return Q;
  }
  const score = (journal, liste) => MM.second.score(journal, liste);

  /* ---------- table des réponses fausses (D53 : clés « étape:valeur ») ---------- */
  function reponsesFausses(exo) {
    const t = {}, s = etatInitial(exo);
    const aj = (code, cle) => { if (!code) return; const l = t[code] || (t[code] = []); if (!l.includes(cle)) l.push(cle); };
    for (const e of etapes(exo, "guide", s)) {
      if (e.type === "valeur") { for (const k of candidatsValeur(e, exo)) aj(k.code, e.id + ":" + k.v.cle()); if (e.id === "m") aj("M-MX", "m:" + F(exo.m).cle() + "x"); }
      if ((e.type === "point" || e.type === "placer") && e.id !== "t2") { const [a, b] = attendu(e, s, exo); for (const k of candidatsPoint(e, a, b, exo)) aj(k.code, e.id + ":" + cleP(k.x, k.y)); }
      if (e.id === "eq" && F(exo.b).signe() < 0) aj("B-SIG", "eq:" + F(exo.m).cle() + "x+" + F(exo.b).abs().cle());
    }
    return t;
  }

  /* ---------- le corrigé : la démarche modèle (saisie = ce qu'il taperait) ---------- */
  const carreaux = (n, plus, moins) => { n = F(n); const k = n.abs(); return k.estNul() ? null : ecr(k) + " carreau" + (k.egal(1) ? "" : "x") + " vers " + (n.signe() > 0 ? plus : moins); };
  function chemin(x, y) {
    const l = [carreaux(x, "la droite", "la gauche"), carreaux(y, "le haut", "le bas")].filter(Boolean);
    return l.length ? "Depuis O : " + l.join(", puis ") + "." : "C'est l'origine O.";
  }
  function corrige(exo) {
    const out = [], L = (id, nom, ligne, pourquoi, saisie, guideSeul) => out.push({ id, nom, ligne, pourquoi, saisie: saisie === undefined ? ligne : saisie, guideSeul: !!guideSeul });
    const m = F(exo.m || 0), b = F(exo.b || 0), sens = sensDe(m);
    const pourquoiVar = { croissante: "m est positif : la rampe monte quand on avance vers la droite.", "décroissante": "m est négatif : la rampe descend quand on avance vers la droite.", constante: "m = 0 : la droite est plate." }[sens];
    switch (exo.modele) {
      case "lire": {
        const [x, y] = exo.pt.map(F);
        L("x", "Abscisse", "x = " + ecr(x), "L'abscisse (x) : on descend du point jusqu'à l'axe horizontal.", ecr(x), true);
        L("y", "Ordonnée", "y = " + ecr(y), "L'ordonnée (y) : on va du point jusqu'à l'axe vertical.", ecr(y), true);
        L("pt", "Le point", pointTexte(exo.nom, x, y), "x d'abord : la rue, puis l'étage.");
        break;
      }
      case "placer": { const [x, y] = exo.pt.map(F); L("pl", "Placer", pointTexte(exo.nom, x, y), chemin(x, y), "(" + ecr(x) + " ; " + ecr(y) + ")"); break; }
      case "ligne": case "eqmb": {
        if (exo.modele === "eqmb") L("eq", "L'équation", "y = " + GEO.affine(m, b), "On remplace m et b dans y = mx + b.");
        else {
          if (exo.forme === "bmx") L("eq0", "Réécrire", "y = " + GEO.affine(m, b), "On réécrit d'abord : le terme en x en premier, chacun garde son signe.", undefined, true);
          const pm = { cst: "Pas de x : la droite est plate, m = 0.", un: "Un x seul cache un 1 : m = " + ecr(m) + "." }[exo.forme] || "m est le nombre devant x, avec son signe : c'est la pente.";
          L("m", "m", "m = " + ecr(m), pm, ecr(m));
          L("b", "b", "b = " + ecr(b), exo.forme === "mx" ? "Pas de nombre seul : b = 0." : "b est le nombre seul, avec son signe : la hauteur du départ.", ecr(b));
        }
        L("oy", "Axe des ordonnées", pointTexte("", 0, b), "Sur l'axe des ordonnées, x = 0, donc y = b.");
        L("var", "Sens de variation", sens, pourquoiVar);
        break;
      }
      case "tracer": {
        const q = [F(1), b.plus(m)];
        L("t1", "Le départ", pointTexte("", 0, b), "Le départ : sur l'axe des ordonnées, à la hauteur b.", "(0 ; " + ecr(b) + ")");
        L("t2", "Un 2e point", pointTexte("", q[0], q[1]), "On avance de 1 vers la droite et on " + (m.signe() > 0 ? "monte" : "descend") + " de " + ecr(m.abs()) + ".", "(1 ; " + ecr(q[1]) + ")");
        L("fin", "La droite", "y = " + GEO.affine(m, b), "On trace la droite qui passe par les deux points.", null);
        break;
      }
    }
    return out;
  }
  function reponseTexte(exo) {
    const m = F(exo.m || 0), b = F(exo.b || 0), oy = pointTexte("", 0, b);
    switch (exo.modele) {
      case "lire": case "placer": return pointTexte(exo.nom, exo.pt[0], exo.pt[1]);
      case "ligne": return "m = " + ecr(m) + " ; b = " + ecr(b) + " ; " + oy + " ; " + sensDe(m);
      case "eqmb": return "y = " + GEO.affine(m, b) + " ; " + oy + " ; " + sensDe(m);
      case "tracer": return oy + " et " + pointTexte("", 1, b.plus(m));
    }
    return "";
  }

  /* ---------- un exercice, à partir d'un modèle ----------
     { sorte: "lire" | "placer", nom, point: [x, y] } · { sorte: "ligne", forme: "mxb"|"bmx"|"cst"|"mx"|"un", m, b } · { sorte: "eqmb", m, b } · { sorte: "tracer", m, b }
     null si hors du repère ou si le diagnostic est ambigu (D53). */
  function enonceLigne(forme, m, b) {
    m = F(m); b = F(b);
    if (forme === "bmx") { const k = m.abs(), t = k.egal(1) ? "x" : (k.estEntier() || k.decimal() ? ecr(k) : "(" + ecr(k) + ")") + "x"; return "y = " + ecr(b) + (m.signe() < 0 ? " " + MOINS + " " : " + ") + t; }
    return "y = " + GEO.affine(m, b);
  }
  function construire(modele) {
    const md = modele, exo = { type: "affine", modele: md.sorte };
    if (md.sorte === "lire" || md.sorte === "placer") {
      const [x, y] = md.point;
      if (![x, y].every(v => Number.isInteger(v) && Math.abs(v) <= 6)) return null;
      Object.assign(exo, { nom: md.nom || "A", pt: [x, y], modelePt: [x, y] });
      exo.enonceRapport = (md.sorte === "lire" ? "Lire " : "Placer ") + pointTexte(exo.nom, x, y);
      exo.figureCorrige = { points: [{ nom: exo.nom, x, y }], droites: [] };
      if (md.sorte === "lire") Object.assign(exo, { consigne: "Le point " + exo.nom + " est dessiné dans le repère.", enonce: "Lis les coordonnées de " + exo.nom + ".",
        figure: { points: [{ nom: exo.nom, x, y }], droites: [] } });
      else Object.assign(exo, { consigne: "Place ce point dans le repère.", enonce: pointTexte(exo.nom, x, y), figure: null });
    } else if (md.sorte === "ligne" || md.sorte === "eqmb" || md.sorte === "tracer") {
      const m = F(md.m), b = F(md.b), forme = md.sorte === "ligne" ? md.forme : "mxb";
      if (m.abs().cmp(9) > 0 || b.abs().cmp(12) > 0) return null;
      if (forme === "cst" && !m.estNul()) return null;
      if (forme === "mx" && !b.estNul()) return null;
      if (forme === "un" && !m.abs().egal(1)) return null;
      if (forme === "bmx" && (m.estNul() || b.estNul())) return null;
      Object.assign(exo, { m: m.cle(), b: b.cle(), forme, modeleMB: { m: m.cle(), b: b.cle(), forme },
        illustration: m.estEntier() && b.abs().cmp(6) <= 0 ? { points: [{ nom: "", x: 0, y: Number(b.cle()) }], droites: [{ m: Number(m.cle()), b: Number(b.cle()) }] } : null });
      if (md.sorte === "ligne") Object.assign(exo, { consigne: "Pour cette droite, donne m, b, le point sur l'axe des ordonnées et le sens de variation.", enonce: enonceLigne(forme, m, b), formules: "y = mx + b" });
      else if (md.sorte === "eqmb") Object.assign(exo, { consigne: "La droite a pour pente m et pour ordonnée à l'origine b. Écris son équation, puis complète.", enonce: "m = " + ecr(m) + " et b = " + ecr(b), formules: "y = mx + b" });
      else {
        if (!m.estEntier() || m.estNul() || !b.estEntier() || b.abs().cmp(6) > 0 || b.plus(m).abs().cmp(6) > 0) return null;
        Object.assign(exo, { consigne: "Trace cette droite : place 2 de ses points, à partir de m et b.", enonce: "y = " + GEO.affine(m, b), droite: { m: Number(m.cle()), b: Number(b.cle()) }, formules: "y = mx + b",
          figureCorrige: { points: [{ nom: "", x: 0, y: Number(b.cle()) }, { nom: "", x: 1, y: Number(b.plus(m).cle()) }], droites: [{ m: Number(m.cle()), b: Number(b.cle()) }] } });
      }
    } else return null;
    exo.etapes = etapes(exo, "guide", etatInitial(exo));
    exo.erreurs = reponsesFausses(exo);
    if (MM.diag.collisions(exo.erreurs).length) return null;
    exo.corrige = corrige(exo);
    exo.reponseTexte = reponseTexte(exo);
    exo.reponse = exo.reponseTexte;
    return exo;
  }

  /* ---------- le piège d'une leçon (lecon.preparer) : la ligne piégée, calculée sur l'exemple ---------- */
  function piege(exo, code, parade) {
    const CAT = MM.diag.CATALOGUE, nom = CAT[code] ? CAT[code].nom : code;
    const fin = (depart, fauxL, bon, detail) => ({ code, nom, type: "affine", depart, faux: fauxL, bon, explication: expliquer({ aff: true, code, detail: Object.assign({ aff: true }, detail) }), parade });
    if (code === "XY-INV" && (exo.modele === "lire" || exo.modele === "placer")) {
      const [x, y] = exo.pt.map(F); if (x.egal(y)) return null;
      return fin("x = " + ecr(x) + " et y = " + ecr(y), pointTexte(exo.nom, y, x), pointTexte(exo.nom, x, y), { sorte: "xyInv", ou: "pt" });
    }
    if (code === "XY-INV" && (exo.modele === "ligne" || exo.modele === "eqmb")) {
      const b = F(exo.b); if (b.estNul()) return null;
      return fin(exo.enonce, pointTexte("", b, 0), pointTexte("", 0, b), { sorte: "xyInv", ou: "oy" });
    }
    if (exo.modele !== "ligne") return null;
    const m = F(exo.m), b = F(exo.b);
    if (code === "ORD-INV" && exo.forme === "bmx") return fin(exo.enonce, "m = " + ecr(b), "m = " + ecr(m), { sorte: "ordInv", ou: "m" });
    if (code === "M-ZERO" && exo.forme === "cst") return fin(exo.enonce, "m = " + ecr(b), "m = 0", { sorte: "mZero" });
    if (code === "B-SIG" && b.signe() < 0) return fin(exo.enonce, "b = " + ecr(b.abs()), "b = " + ecr(b), { sorte: "bSig" });
    if (code === "M-MX" && !m.estNul()) return fin(exo.enonce, "m = " + GEO.affine(m, 0), "m = " + ecr(m), { sorte: "mMx" });
    return null;
  }

  /* ---------- l'explication du prof : ce qui est juste, l'endroit exact, la règle ; jamais la valeur juste (D50) ---------- */
  function expliquer(d, variante) {
    const CAT = MM.diag.CATALOGUE, x = (d && d.detail) || {}, code = (d && d.code) || null, v2 = variante === 2;
    const fin = (titre, bon, ou, regle, suite) => ({ code, titre, bon, ou, regle, suite: suite || "", reflexe: code && CAT[code] ? CAT[code].reflexe : "", variante: v2 ? 2 : 1 });
    const nom = c => (CAT[c] && CAT[c].nom) || "Erreur";
    switch (x.sorte) {
      case "xyInv":
        if (x.ou === "x") return fin(nom("XY-INV"), "Tu as bien lu un nombre du point.", "Mais celui-ci se lit sur l'axe vertical : c'est l'ordonnée, pas l'abscisse.", v2 ? "L'abscisse se lit en descendant jusqu'à l'axe horizontal." : "x se lit sur l'axe horizontal : la rue.");
        if (x.ou === "y") return fin(nom("XY-INV"), "Tu as bien lu un nombre du point.", "Mais celui-ci se lit sur l'axe horizontal : c'est l'abscisse, pas l'ordonnée.", v2 ? "L'ordonnée se lit en allant jusqu'à l'axe vertical." : "y se lit sur l'axe vertical : l'étage.");
        if (x.ou === "oy" || x.ou === "t1") return fin(nom("XY-INV"), "Tu as les bons nombres.", "Mais sur l'axe des ordonnées, c'est x qui vaut 0 : il s'écrit en premier.", v2 ? "Un point de l'axe vertical : rue 0, puis l'étage." : "x d'abord, puis y : (0, …).");
        return fin(nom("XY-INV"), "Tu as les bons nombres.", "Mais ils sont dans le désordre : x vient en premier.", v2 ? "L'abscisse se lit sur l'axe horizontal, l'ordonnée sur l'axe vertical." : "x d'abord : la rue, puis l'étage.");
      case "axeInv": return fin(nom("AXE-INV"), "Tu es sur la bonne droite.", "Mais sur l'axe des ordonnées, c'est x qui vaut 0.", v2 ? "L'axe des ordonnées est l'axe vertical : tous ses points ont x = 0." : "Remplace x par 0 : le point est sur l'axe vertical.");
      case "axeInvT": return fin("Le mauvais axe", "Tu as bien cherché un point de la droite.", "Mais le départ est sur l'axe vertical, celui des ordonnées.", v2 ? "Sur l'axe des ordonnées, x vaut 0 : la hauteur, c'est b." : "Le point de départ a x = 0.");
      case "signeX": return fin("Le signe de x", "Tu as compté le bon nombre de carreaux.", x.a > 0 ? "Mais le point est à droite de O : x est positif." : "Mais le point est à gauche de O : x est négatif.", v2 ? "À droite de O : x positif. À gauche : x négatif." : "Le côté de O donne le signe de x.");
      case "signeY": return fin("Le signe de y", "Tu as compté le bon nombre de carreaux.", x.b > 0 ? "Mais le point est au-dessus de O : y est positif." : "Mais le point est sous O : y est négatif.", v2 ? "Au-dessus de O : y positif. En dessous : y négatif." : "Le haut ou le bas donne le signe de y.");
      case "deuxSignes": return fin("Les deux signes", "Tu as compté les bons carreaux.", "Mais les deux signes sont à l'envers.", v2 ? "À gauche ou en bas de O : négatif. À droite ou en haut : positif." : "Regarde de quel côté de O est le point, en largeur puis en hauteur.");
      case "decale": return fin("Un carreau de décalage", "Tu es tout près.", "Mais le point est à un carreau du bon endroit.", v2 ? "Pose le doigt sur O, puis avance carreau par carreau." : "Compte les carreaux depuis O, sans compter O.");
      case "pointAutre": return fin("Le point ne tient pas", "Tu as écrit un point.", "Mais ce n'est pas le bon endroit.", v2 ? "Pars de O : d'abord x sur l'axe horizontal, puis y vers le haut ou le bas." : "x d'abord : la rue, puis l'étage.");
      case "mMx": return fin(nom("M-MX"), "Tu as trouvé le bon morceau de l'équation.", "Mais m est un nombre : le x n'en fait pas partie.", v2 ? "Dans y = mx + b, m multiplie x : on écrit m sans le x." : "m est le nombre devant x, sans le x.");
      case "bSig": return fin(nom("B-SIG"), "Tu as trouvé le nombre seul.", "Mais tu as perdu son signe.", v2 ? "Le signe juste devant le nombre fait partie de b." : "b garde son signe.");
      case "signeB": return fin("Le signe de b", "Tu as trouvé le nombre seul.", "Mais son signe a changé en route.", v2 ? "Le signe juste devant le nombre fait partie de b." : "b garde son signe.");
      case "ordInv": return fin(nom("ORD-INV"), "Tu as bien lu les nombres de l'équation.", x.ou === "b" ? "Mais b est le nombre seul, pas le nombre devant x." : "Mais ici, le terme en x est à la fin : m n'est pas le premier nombre.",
        v2 ? "m est collé au x, où qu'il soit ; b est le nombre seul." : "Réécris d'abord l'équation sous la forme y = mx + b.");
      case "mZero": return fin(nom("M-ZERO"), "Tu as bien lu le nombre de l'équation.", "Mais il n'y a pas de x : ce nombre, c'est b.", v2 ? "Quel nombre devant x fait disparaître le x ?" : "Une droite sans x est plate : sa pente ne monte ni ne descend.");
      case "unCache": return fin("Le 1 caché", "Tu as bien cherché le nombre devant x.", "Mais un x seul n'est pas « 0 fois x ».", v2 ? "Remplace x par 2 : x seul vaut 2. Quel nombre, fois 2, donne 2 ?" : "Un x tout seul cache un nombre devant lui : cherche-le.");
      case "signeM": return fin("Le signe de m", "Tu as le bon nombre devant x.", "Mais son signe s'est perdu.", v2 ? "Le signe juste devant x fait partie de m." : "m garde son signe, comme b.");
      case "mEtB": return fin("m et b mélangés", "Tu as bien lu les nombres de l'équation.", "Mais m est collé au x : ce nombre-là, c'est b.", v2 ? "Entoure le nombre collé au x : c'est m." : "m multiplie x ; b est le nombre seul.");
      case "bEtM": return fin("m et b mélangés", "Tu as bien lu le nombre de l'équation.", "Mais ce nombre est collé au x : c'est m, pas b.", v2 ? "Pas de nombre seul dans l'équation : que vaut b ?" : "b est le nombre seul ; ici, il n'y en a pas.");
      case "valeurAutre": return fin("Ce nombre ne tient pas", "Tu es sur la bonne étape.", x.ou === "x" || x.ou === "y" ? "Mais ce n'est pas le bon nombre de carreaux." : "Mais ce nombre n'est pas dans l'équation à cette place.",
        x.ou === "x" || x.ou === "y" ? (v2 ? "Compte les carreaux depuis O, un par un." : "Pars de O et compte les carreaux.") : (v2 ? "Réécris l'équation sous la forme y = mx + b, puis lis." : "m est devant x, b est seul, chacun avec son signe."));
      case "varB": return fin("Le sens de variation", "Tu as bien pensé au sens de la droite.", "Mais c'est le signe de m qui décide, pas celui de b.", v2 ? "Avance de 1 vers la droite : la droite monte de m. Si m est négatif, elle descend." : "Regarde le signe de m : positif, la rampe monte ; négatif, elle descend ; 0, elle est plate.");
      case "varZero": return fin("Le sens de variation", "Tu as bien pensé au sens de la droite.", "Mais regarde la valeur de m.", v2 ? "Une droite de pente nulle reste toujours à la même hauteur." : "Le signe de m décide : positif, négatif ou nul.");
      case "variation": return fin("Le sens de variation", "Tu as bien pensé au sens de la droite.", "Mais le sens dépend du signe de m.", v2 ? "Imagine une rampe de skate : m positif, elle monte vers la droite." : "Regarde le signe de m : positif, la rampe monte ; négatif, elle descend ; 0, elle est plate.");
      case "echangeMB": return fin("m et b échangés", "Tu as écrit une équation de droite.", "Mais m va devant x, et b reste seul.", v2 ? "Dans y = mx + b, m est collé au x." : "Remplace m devant x, puis b à la fin.");
      case "remplaceEq": return fin("Le remplacement ne tient pas", "Tu as écrit une équation de droite.", "Mais elle ne suit pas y = mx + b avec ces nombres.", v2 ? "Écris y = mx + b, puis remplace une lettre à la fois." : "m devant x, b tout seul, chacun avec son signe.");
      case "signeReecrit": return fin("Un signe a changé", "Tu as bien mis le terme en x en premier.", "Mais un signe a changé en route.", v2 ? "Chaque terme part avec le signe juste devant lui." : "On change l'ordre, pas les signes.");
      case "reecrire": return fin("La réécriture ne tient pas", "Tu as écrit une équation de droite.", "Mais ce n'est plus la même droite.", v2 ? "Recopie chaque terme avec son signe, le terme en x d'abord." : "On change seulement l'ordre des termes.");
      case "penteSigne": return fin("Le sens de la pente", "Ton point de départ est le bon.", "Mais ton 2e point part dans le mauvais sens.", v2 ? "Avance d'un carreau vers la droite : m positif, monte ; m négatif, descends." : "Regarde le signe de m avant de monter ou de descendre.");
      case "penteInverse": return fin("Avancer, puis monter", "Ton point de départ est le bon.", "Mais tu as avancé de m et monté de 1.", v2 ? "La pente, c'est ce qu'on monte quand on avance de 1." : "On avance de 1 vers la droite, puis on monte de m.");
      case "penteAutre": return fin("Le 2e point ne tient pas", "Ton point de départ est placé.", "Mais le 2e point n'est pas sur la droite.", v2 ? "Depuis ton 1er point : 1 carreau à droite, puis m vers le haut." : "Avance de 1 vers la droite, monte de m.");
      default: return GEO.expliquer(d, variante);
    }
  }

  MM.affine = { SORTES, VARIATIONS, etape, etatInitial, etapes, attenduTexte, lireDepart, juger, apres, entrer, terminer, pas, nouveau, jouer, score, premiereLigne,
    reponsesFausses, corrige, construire, expliquer, piege, lirePoint, lireVariation, ecr, pointTexte, sensDe };
  if (typeof module !== "undefined" && module.exports) module.exports = MM;
})(typeof globalThis !== "undefined" ? globalThis : this);
