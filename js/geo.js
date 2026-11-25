/* Mission Maths — geo.js
   Lot express du 29/11 : géométrie analytique et Pythagore, au format des fiches de la prof.
     G1 distance   AB² = (x₂ − x₁)² + (y₂ − y₁)², puis AB = √… (valeur exacte ou arrondie au centième)
     G2 milieu     xM = (x₁ + x₂) ÷ 2, puis yM
     G3 droite     m = (y₂ − y₁) ÷ (x₂ − x₁), puis y − y₁ = m(x − x₁) jusqu'à y = mx + b
     G4 axes       x = 0 → y ; y = 0 → l'équation en x
     G5 combiné    triangle isocèle ou segment : longueurs, milieu, médiane, équation
     G6 Pythagore  hypoténuse² = côté² + côté² (ou côté² = hypoténuse² − côté²), puis √
   Même interface que MM.second (P5) : la page déroule les étapes de la même façon (et.p5).
   Règle centrale : chaque étape est jugée à partir des valeurs DE L'ÉLÈVE (pas de double pénalité).
   Rien n'est écrit à la main : chaque bonne valeur et chaque réponse fausse est calculée. */
(function (G) {
  "use strict";
  const MM = G.MM || (G.MM = {});
  if (typeof require === "function") { if (!MM.second) require("./second.js"); }
  const E = MM.expr, N = MM.nombres, T = MM.etapes, F = MM.F, MOINS = E.MOINS, S2 = MM.second;
  const ecr = S2.ecr;
  const par = v => F(v).signe() < 0 ? "(" + ecr(v) + ")" : ecr(v);
  const CENT = F("0.005");
  const proche = (v, x, tol) => F(v).moins(F(x)).abs().cmp(tol || CENT) <= 0;
  const auCentieme = v => F(v).fois(100).estEntier();
  const decimalExact = v => auCentieme(v) || !!F(v).decimal();
  /* Un nombre ou une fraction a/b (la pente 4/3 se laisse en fraction). */
  const sansGrp = n => { while (n && n.t === "grp") n = n.a; return n; };
  const estFraction = n => { n = sansGrp(n); if (n && n.t === "neg") n = sansGrp(n.a); return !!n && n.t === "div" && N.FORMES.nombre(n.a) && N.FORMES.nombre(n.b); };
  /* Une fraction finie : irréductible, comme 4/3 ou −1/2 (2/4 reste à simplifier). */
  const fractionFinie = n => {
    if (!estFraction(n)) return false;
    let m = sansGrp(n); if (m.t === "neg") m = sansGrp(m.a);
    const haut = m.a.t === "neg" ? m.a.a : m.a;
    if (m.b.t !== "num" || haut.t !== "num") return false;                         // 2 ÷ (−3) se termine : −2/3
    const a = N.valeur(m.a).abs(), b = N.valeur(m.b).abs(), v = a.sur(b);
    return !v.estEntier() && v.texte() === ecr(a) + "/" + ecr(b);
  };
  /* Un coefficient devant x ou devant une parenthèse : 2, −2, 0,5, (4/3). */
  const coef = v => { v = F(v); return v.estEntier() || v.decimal() ? ecr(v) : "(" + ecr(v) + ")"; };
  /* « mx + b » : 0,5x + 0,5 ; −x ; (4/3)x ; 12 */
  function affine(m, b) {
    m = F(m); b = F(b);
    let t = m.estNul() ? "" : m.egal(1) ? "x" : m.egal(-1) ? MOINS + "x" : coef(m) + "x";
    if (b.estNul()) return t || "0";
    if (!t) return ecr(b);
    return t + (b.signe() < 0 ? " " + MOINS + " " + ecr(b.abs()) : " + " + ecr(b));
  }
  const point = (nom, p) => nom + "(" + (p.every(v => F(v).estEntier()) ? ecr(p[0]) + ", " + ecr(p[1]) : ecr(p[0]) + " ; " + ecr(p[1])) + ")";

  /* ---------- les sortes d'étapes ---------- */
  const SORTES = {
    carres: { type: "nombre", forme: "nombre", multi: true, consigne: "Remplace dans (x₂ − x₁)² + (y₂ − y₁)², puis calcule.",
      indice: "Un écart négatif se met entre parenthèses avant le carré : son carré est positif." },
    pyth: { type: "nombre", forme: "nombre", multi: true, consigne: "Écris l'égalité de Pythagore avec tes nombres, puis calcule.",
      indice: "L'hypoténuse est en face de l'angle droit : c'est le côté le plus long." },
    racine: { type: "racine", simple: true, consigne: "Prends la racine carrée : valeur exacte (√…) ou arrondie au centième.",
      indice: "Si le nombre est un carré parfait (25, 100…), donne le nombre entier." },
    milieu: { type: "nombre", forme: "nombre", multi: true, consigne: "Remplace dans (x₁ + x₂) ÷ 2, puis calcule.",
      indice: "Le milieu, c'est la moyenne : on additionne, puis on divise par 2." },
    pente: { type: "nombre", forme: "nombre", multi: true, consigne: "Remplace dans (y₂ − y₁) ÷ (x₂ − x₁), puis calcule.",
      indice: "Le même point en premier, en haut et en bas." },
    droite: { type: "droite", simple: true, consigne: "Écris y − y₁ = m(x − x₁) avec tes nombres, puis isole y : y = mx + b.",
      indice: "Remplace x₁, y₁ et m. Développe, puis fais passer le nombre de l'autre côté." },
    axeY: { type: "nombre", forme: "nombre", multi: true, consigne: "Sur l'axe des ordonnées, x = 0 : remplace x par 0.",
      indice: "m × 0 vaut 0." },
    axeX: { type: "equation", forme: "solution", consigne: "Sur l'axe des abscisses, y = 0 : résous l'équation.",
      indice: "Fais passer le nombre de l'autre côté, puis divise par le nombre devant x." }
  };
  const etape = spec => Object.assign({ p5: true, geo: true, voirPrefixe: !!spec.prefixe }, SORTES[spec.sorte], spec);

  /* ---------- l'état : SES valeurs (clés exactes) et les points (le milieu M devient le sien) ---------- */
  const clone = o => JSON.parse(JSON.stringify(o));
  function etatInitial(exo) { return { points: clone(exo.points), v: {} }; }
  const pt = (s, nom) => s.points[nom].map(F);
  // la base ne garde pas une table vide : après « Reprendre », s.v peut manquer (recette du 25/11)
  const valeurDe = (s, exo, id) => s.v && s.v[id] != null ? F(s.v[id]) : exo ? F(exo.valeurs[id]) : null;

  /* ---------- le chemin : toutes les étapes du plan (pas de chemin qui change, sauf les valeurs) ---------- */
  function etapes(exo, mode, etat) {
    etat = etat || etatInitial(exo);
    return exo.plan.map(sp => { const e = etape(sp); e.attendu = attenduTexte(e, etat, exo); return e; });
  }
  /* La valeur attendue d'une étape de calcul (Fraction), à partir de son état. */
  function attenduValeur(e, s, exo) {
    if (e.sorte === "carres") { const p = pt(s, e.P), q = pt(s, e.Q), dx = q[0].moins(p[0]), dy = q[1].moins(p[1]); return dx.fois(dx).plus(dy.fois(dy)); }
    if (e.sorte === "pyth") { const a = F(e.a), b = F(e.b); return e.hyp ? a.fois(a).plus(b.fois(b)) : a.fois(a).moins(b.fois(b)); }
    if (e.sorte === "racine") { const R = valeurDe(s, exo, e.de); return R && R.signe() >= 0 ? R.racine() : null; }
    if (e.sorte === "milieu") { const i = e.axe === "x" ? 0 : 1; return pt(s, e.P)[i].plus(pt(s, e.Q)[i]).sur(2); }
    if (e.sorte === "pente") { const p = pt(s, e.P), q = pt(s, e.Q); return q[1].moins(p[1]).sur(q[0].moins(p[0])); }
    if (e.sorte === "axeY") return F(e.b);
    if (e.sorte === "axeX") return F(e.b).oppose().sur(F(e.m));
    return null;
  }
  const penteDe = (e, s, exo) => valeurDe(s, exo, e.de);
  function droiteAttendue(e, s, exo) {              // y = m x + b, avec SA pente et le point P
    const m = penteDe(e, s, exo), p = pt(s, e.P);
    return { m, b: p[1].moins(m.fois(p[0])) };
  }
  function attenduTexte(e, s, exo) {
    if (e.sorte === "droite") { const d = droiteAttendue(e, s, exo); return "y = " + affine(d.m, d.b); }
    if (e.sorte === "racine") return racineTexte(valeurDe(s, exo, e.de));
    if (e.sorte === "axeX") { const v = attenduValeur(e, s, exo); return "x = " + ecr(v); }
    const v = attenduValeur(e, s, exo);
    return v == null ? "" : ecr(v);
  }
  /* √25 = 5 ; √41 ≈ 6,4 → « √41 » (valeur exacte) ; l'arrondi au centième est aussi accepté. */
  function arrondi(R) { R = F(R); const x = Math.round(Math.sqrt(R.approx()) * 100) / 100; return F(x.toFixed(2)); }
  function racineTexte(R) { if (R == null || F(R).signe() < 0) return ""; const r = F(R).racine(); return r ? ecr(r) : "√" + ecr(R); }
  const centiemeTexte = v => { const t = ecr(v); return /,\d$/.test(t) ? t + "0" : /,/.test(t) ? t : t + ",00"; };

  /* La ligne de départ d'une étape : la formule, remplacée avec SES valeurs. */
  function departEtape(e, s, exo) {
    if (e.sorte === "carres") {
      const p = pt(s, e.P), q = pt(s, e.Q);
      return "(" + ecr(q[0]) + " " + MOINS + " " + par(p[0]) + ")² + (" + ecr(q[1]) + " " + MOINS + " " + par(p[1]) + ")²";
    }
    if (e.sorte === "pyth") return ecr(e.a) + "² " + (e.hyp ? "+" : MOINS) + " " + ecr(e.b) + "²";
    if (e.sorte === "milieu") { const i = e.axe === "x" ? 0 : 1; return "(" + ecr(pt(s, e.P)[i]) + " + " + par(pt(s, e.Q)[i]) + ") ÷ 2"; }
    if (e.sorte === "pente") { const p = pt(s, e.P), q = pt(s, e.Q); return "(" + ecr(q[1]) + " " + MOINS + " " + par(p[1]) + ") ÷ (" + ecr(q[0]) + " " + MOINS + " " + par(p[0]) + ")"; }
    if (e.sorte === "axeY") { const b = F(e.b); return ecr(e.m) + " × 0 " + (b.signe() < 0 ? MOINS + " " + ecr(b.abs()) : "+ " + ecr(b)); }
    if (e.sorte === "axeX") return "0 = " + affine(e.m, e.b);
    if (e.sorte === "droite") { const m = penteDe(e, s, exo), p = pt(s, e.P); return "y " + MOINS + " " + par(p[1]) + " = " + coef(m) + "(x " + MOINS + " " + par(p[0]) + ")"; }
    return null;
  }
  /* La ligne de départ, lue comme la page la lit (nombre, équation, ou texte pour la droite). */
  function lireDepart(e, s, exo) {
    const d = departEtape(e, s, exo);
    if (d == null) return null;
    return e.type === "equation" ? E.lireEquation(d) : e.type === "droite" || e.type === "racine" ? d : E.arbre(d);
  }

  /* ---------- erreurs types, à la première ligne d'une étape de calcul (calculées) ---------- */
  function candidats(e, s, exo) {
    // une même valeur fausse ne garde que sa première lecture (6 et 8 : 8² − 6² = 2 × 6 + 2 × 8 = 28, HYPO l'emporte)
    const out = [], aj = (code, valeur, detail) => { if (valeur && !out.some(k => k.valeur.egal(F(valeur)))) out.push({ code, valeur: F(valeur), detail: Object.assign({ geo: true }, detail) }); };
    const bon = attenduValeur(e, s, exo);
    if (e.sorte === "carres") {
      const p = pt(s, e.P), q = pt(s, e.Q), dx = q[0].moins(p[0]), dy = q[1].moins(p[1]), sx = q[0].plus(p[0]), sy = q[1].plus(p[1]);
      // « 4 − (−2) » écrit « 4 − 2 » : le moins d'un nombre négatif perdu, sur un écart ou sur les deux
      const ex = p[0].signe() < 0 ? [dx, sx] : [dx], ey = p[1].signe() < 0 ? [dy, sy] : [dy];
      for (const a of ex) for (const b of ey) if (a !== dx || b !== dy) aj(null, a.fois(a).plus(b.fois(b)), { sorte: "moinsMoins" });
      aj(null, dx.plus(dy), { sorte: "sansCarre" });
      aj(null, sx.fois(sx).plus(sy.fois(sy)), { sorte: "somme" });
      if (dx.signe() < 0 || dy.signe() < 0) aj("SIG-REL", dx.fois(dx).fois(dx.signe() < 0 ? -1 : 1).plus(dy.fois(dy).fois(dy.signe() < 0 ? -1 : 1)), { sorte: "carre-neg" });
      aj("CALC", dx.fois(2).plus(dy.fois(2)), { sorte: "carre2" });
    } else if (e.sorte === "pyth") {
      const a = F(e.a), b = F(e.b);
      aj("HYPO", e.hyp ? a.fois(a).moins(b.fois(b)).abs() : a.fois(a).plus(b.fois(b)), { sorte: "hypo", hyp: !!e.hyp });
      if (!e.hyp) aj(null, b.fois(b).moins(a.fois(a)), { sorte: "ordreHyp" });
      aj(null, e.hyp ? a.plus(b) : a.moins(b), { sorte: "sansCarreP" });
      aj("CALC", e.hyp ? a.fois(2).plus(b.fois(2)) : a.fois(2).moins(b.fois(2)), { sorte: "carre2" });
    } else if (e.sorte === "milieu") {
      const i = e.axe === "x" ? 0 : 1, a = pt(s, e.P)[i], b = pt(s, e.Q)[i];
      aj(null, a.plus(b), { sorte: "sansDeux" });
      aj(null, b.moins(a).sur(2), { sorte: "diff" });
      aj(null, a.moins(b).sur(2), { sorte: "diff" });
    } else if (e.sorte === "pente") {
      const p = pt(s, e.P), q = pt(s, e.Q), dy = q[1].moins(p[1]), dx = q[0].moins(p[0]);
      if (!dy.estNul()) aj(null, dx.sur(dy), { sorte: "inverse" });
      aj("PENTE-ORD", dy.oppose().sur(dx), { sorte: "ordre" });
      const sx = q[0].plus(p[0]), sy = q[1].plus(p[1]);
      if (p[1].signe() < 0 && !sx.estNul()) aj(null, sy.sur(dx), { sorte: "moinsMoins" });
      if (p[0].signe() < 0 && !sx.estNul()) aj(null, dy.sur(sx), { sorte: "moinsMoins" });
    } else if (e.sorte === "axeY") {
      if (!F(e.m).estNul()) aj("AXE-INV", F(e.b).oppose().sur(F(e.m)), { sorte: "axeInv", axe: "y" });
      aj(null, F(e.m).plus(F(e.b)), { sorte: "remplace0" });
    }
    return out.filter(k => !(bon && k.valeur.egal(bon)));
  }

  /* ---------- jugement d'une étape ---------- */
  const illisible = message => ({ statut: "illisible", message });
  const SUITE = { nombre: "C'est juste. Continue jusqu'à un seul nombre.", droite: "C'est juste. Continue jusqu'à y = mx + b.", equation: "C'est juste. Continue jusqu'à x = …" };
  function verdict(e, statut, o) {
    const v = Object.assign({ statut, code: null, diag: null, fin: true }, o, { saisie: (e.prefixe || "") + (o.ecrit || "") });
    v.ecrit = v.saisie;                                                             // la ligne s'affiche avec son nom : « AB² = 16 + 9 »
    if (statut === "incomplet" && !v.message) v.message = SUITE[e.type] || SUITE.nombre;
    const CAT = MM.diag.CATALOGUE;
    if (statut === "faux" && v.precision && v.code && CAT[v.code]) v.precision = CAT[v.code].nom + " : " + v.precision;
    return v;
  }
  function juger(e, s, prev, premiere, entree, exo) {
    if (e.sorte === "droite") return jugerDroite(e, s, prev, premiere, entree, exo);
    if (e.sorte === "axeX") return jugerAxeX(e, s, prev, entree);
    const t = sansPrefixe(e, entree);
    if (e.sorte === "racine") return jugerRacine(e, s, t, exo);
    if (/[a-zA-Zα-ωΔ]/.test(t)) return illisible("Ici, écris seulement des nombres et des opérations" + (e.prefixe ? " : le calcul de " + e.prefixe.replace(/\s*=\s*$/, "") + "." : "."));
    return jugerCalcul(e, s, prev, premiere, t, exo);
  }
  /* Recopie du nom écrit devant le champ (« AB² = », « d = », « xM = », « m = », « y = ») : il est accepté et retiré (recette du 25/11). */
  const norme = t => String(t == null ? "" : t).replace(/\s+/g, "").replace(/_/g, "").replace(/\^2/g, "²");
  function sansPrefixe(e, texte) {
    const t = norme(texte), nom = norme(e.prefixe || "").replace(/=$/, "");
    const noms = [nom].concat(e.sorte === "racine" ? ["d"] : e.sorte === "carres" ? ["d²"] : []).filter(Boolean);
    for (const n of noms) if (t.toLowerCase().startsWith(n.toLowerCase() + "=")) return t.slice(n.length + 1);
    return String(texte == null ? "" : texte);
  }
  const precisionNombre = (e, bon, faux) => (e.prefixe || "") + (bon != null ? ecr(bon) : "?") + " attendu, pas " + ecr(faux);

  /* Les lignes de calcul (carrés, Pythagore, milieu, pente, x = 0). La 1re vaut la formule remplacée ; les suivantes, sa ligne d'avant. */
  function jugerCalcul(e, s, prev, premiere, texte, exo) {
    const lu = N.lire(texte);
    if (!lu.ok) return illisible(lu.message);
    const cur = lu.ast, v = lu.valeur, ecrit = S2.ecrireLigne(cur), fini = N.FORMES.nombre(cur) || (e.sorte === "pente" && fractionFinie(cur));
    const o = { ecrit, valeur: v.cle(), ast: cur, fin: fini };
    const pente = (x) => e.sorte === "pente" && fini && !decimalExact(x) && auCentieme(v) && proche(v, x);   // 4/3 arrondi au centième : 1,33
    if (!premiere && prev) {
      const v0 = N.valeur(prev);
      o.attendu = ecr(v0);
      if (v.egal(v0) || pente(v0)) return verdict(e, fini ? "juste" : "incomplet", o);
      const d = carre(prev, cur) || N.diagnostiquer(prev, cur);
      return verdict(e, "faux", Object.assign(o, { code: d.code || null, diag: d, attendu: N.prochaine(prev, N.formeAtteinte(cur) || "nombre"), precision: precisionNombre(e, v0, v) }));
    }
    const bon = attenduValeur(e, s, exo);
    o.attendu = ecr(bon);
    if (v.egal(bon) || pente(bon)) return verdict(e, fini ? "juste" : "incomplet", o);
    // pente 4/3 arrondie de travers (1,3 ; 1,34) : c'est l'arrondi qui coince, pas le calcul
    if (e.sorte === "pente" && fini && !decimalExact(bon) && proche(v, bon, F("0.05"))) return verdict(e, "faux", Object.assign(o, { diag: { geo: true, code: null, detail: { geo: true, sorte: "arrondiM" } }, precision: precisionNombre(e, bon, v) }));
    // ordre : les codes de géométrie, puis ceux du moteur des nombres (signe, priorités, calcul), puis les sortes sans code
    // une erreur de géométrie reconnue (pente à l'envers, ÷ 2 oublié…) est plus précise qu'une « erreur de calcul »
    const ks = candidats(e, s, exo).filter(k => v.egal(k.valeur)), k = ks.find(x => x.code) || ks[0];
    let d = k ? { geo: true, code: k.code, detail: k.detail } : null;
    const n = !d && prev ? carre(prev, cur) || N.diagnostiquer(prev, cur) : null;
    if (n && n.code) d = n;
    if (!d && n && n.detail && n.detail.sorte !== "inconnu" && n.detail.sorte !== "compte") d = n;
    if (!d) d = { geo: true, code: null, detail: { geo: true, sorte: "remplace", etape: e.sorte } };
    return verdict(e, "faux", Object.assign(o, { code: d.code || null, diag: d, precision: precisionNombre(e, bon, v) }));
  }
  /* Sur une ligne d'avant qui contient un carré : un carré d'un négatif rendu négatif (SIG-REL), ou « fois 2 » (CALC). */
  function carre(prev, cur) {
    const P = N.plats(prev), v0 = N.valeur(prev), v = N.valeur(cur);
    for (const p of P) {
      if (p.n.t !== "pow" || p.n.n !== 2) continue;
      const base = N.valeur(p.n.a), c = N.valeurTerme(p), sansLui = v0.moins(c);
      if (base.signe() < 0 && v.egal(v0.moins(c).moins(c))) return { geo: true, code: "SIG-REL", detail: { geo: true, sorte: "carre-neg", carre: N.ecrire(p.n) } };
      for (const f of [base.fois(2), base.fois(2).oppose()]) if (v.egal(sansLui.plus(f.fois(p.s)))) return { geo: true, code: "CALC", detail: { geo: true, sorte: "carre2", carre: N.ecrire(p.n), base: base.cle() } };
    }
    return null;
  }

  /* d = √R : « √41 » (exact), « 6,4 » ou « 6,40 » (au centième), « 5 » si R est un carré parfait. « √25 » : juste, à terminer. */
  function jugerRacine(e, s, texte, exo) {
    const t = String(texte == null ? "" : texte).replace(/\s+/g, "");
    if (!t) return illisible("Écris la longueur : √… ou un nombre.");
    // « √41 ≈ 6,40 » ou « √25 = 5 », comme dans le corrigé : chaque morceau est jugé ; juste seulement si les deux le sont
    const deux = /^(√[^=≈]+)([=≈])([^=≈]+)$/.exec(t);
    if (deux) {
      const a = jugerRacine(e, s, deux[1], exo), b = jugerRacine(e, s, deux[3], exo);
      if (a.statut === "illisible") return a;
      if (b.statut === "illisible") return b;
      const ecrit = a.ecrit.replace(e.prefixe || "", "") + " " + deux[2] + " " + b.ecrit.replace(e.prefixe || "", "");
      const pire = a.statut === "faux" ? a : b.statut === "faux" ? b : null;
      if (pire) return Object.assign({}, pire, { ecrit: (e.prefixe || "") + ecrit, saisie: (e.prefixe || "") + ecrit, ast: ecrit });
      return verdict(e, "juste", { ecrit, ast: ecrit, valeur: b.valeur, attendu: a.attendu, fin: true });
    }
    const R = valeurDe(s, exo, e.de), r = R && R.signe() >= 0 ? R.racine() : null;
    const o = { attendu: racineTexte(R), fin: true };
    if (/^√/.test(t)) {
      const lu = N.lire(t.slice(1));
      if (!lu.ok) return illisible(lu.message);
      const ecrit = "√" + (N.FORMES.nombre(lu.ast) ? ecr(lu.valeur) : "(" + N.ecrire(lu.ast) + ")");
      Object.assign(o, { ecrit, ast: ecrit, valeur: "√" + lu.valeur.cle() });
      if (R && lu.valeur.egal(R)) {
        if (r) return verdict(e, "incomplet", Object.assign(o, { fin: false, message: "C'est juste. " + ecr(R) + " est un carré parfait : termine le calcul." }));
        return verdict(e, "juste", o);
      }
      const d = { geo: true, code: null, detail: { geo: true, sorte: "sousRacine", R: R ? R.cle() : null } };
      return verdict(e, "faux", Object.assign(o, { diag: d, precision: (e.prefixe || "") + "√" + (R ? ecr(R) : "?") + " attendu, pas " + ecrit }));
    }
    if (t.includes("√")) return illisible("Mets √ au début : √41, par exemple.");
    const lu = N.lire(t);
    if (!lu.ok) return illisible(lu.message);
    const v = lu.valeur, ecrit = S2.ecrireLigne(lu.ast);
    Object.assign(o, { ecrit, ast: ecrit, valeur: v.cle() });
    if (!N.FORMES.nombre(lu.ast)) return illisible("Écris un seul nombre, ou √ suivi du nombre.");
    if (!R || R.signe() < 0) return verdict(e, "juste", o);                         // après une erreur, rien à prendre : on ne pénalise pas deux fois
    const juste = r ? v.egal(r) : auCentieme(v) && v.signe() > 0 && v.moins(CENT).fois(v.moins(CENT)).cmp(R) <= 0 && v.plus(CENT).fois(v.plus(CENT)).cmp(R) >= 0;
    if (juste) return verdict(e, "juste", o);
    let code = null, cas = "autre";
    if (v.egal(R)) { code = "RAC-OUB"; cas = "oubli"; }
    else if (v.egal(R.sur(2))) cas = "moitie";
    else if (r && v.egal(r.oppose())) cas = "signe";
    else if (!r && v.signe() > 0 && proche(v, F(Math.sqrt(R.approx()).toFixed(6)), F("0.05"))) cas = "arrondi";
    else if (v.signe() > 0) { code = "CALC"; cas = "essai"; }
    const detail = { geo: true, sorte: "rac", cas, R: R.cle(), saisi: v.cle(), carre: v.fois(v).cle() };
    return verdict(e, "faux", Object.assign(o, { code, diag: { geo: true, code, detail }, precision: "√" + ecr(R) + (r ? " = " + ecr(r) : " ≈ " + centiemeTexte(arrondi(R))) + ", pas " + ecr(v) }));
  }

  /* ---------- la droite : une égalité en x et y, lue par ses coefficients ----------
     On remplace x et y par des nombres : la ligne vaut A·x + B·y + C (gauche − droite). Deux lignes sont la même droite
     si leurs coefficients sont proportionnels. La forme finale est y = mx + b (y seul à gauche, ni y ni parenthèse à droite). */
  const PERMIS = /^[0-9xy=+\-−–×*÷/:().,²^ ]*$/;
  function lireDroite(texte) {
    const t = String(texte == null ? "" : texte).replace(/\s+/g, " ").trim();
    if (!t) return { erreur: "Écris l'équation de la droite." };
    const c = t.split("=");
    if (c.length !== 2 || !c[0].trim() || !c[1].trim()) return { erreur: "Écris une égalité avec un seul signe =, par exemple y = …" };
    const mauvais = [...t].find(ch => !PERMIS.test(ch));
    if (mauvais && /[a-zA-Z₁₂]/.test(mauvais)) return { erreur: "Dans l'équation, il ne reste que x et y : remplace m, x₁ et y₁ par leurs nombres." };
    if (mauvais) return { erreur: "Je ne connais pas le symbole « " + mauvais + " »." };
    const val = (cote, x, y) => { const l = N.lire(cote.replace(/x/g, "(" + x + ")").replace(/y/g, "(" + y + ")")); if (!l.ok) throw new Error(l.message); return l.valeur; };
    const f = (x, y) => val(c[0], x, y).moins(val(c[1], x, y));
    let A, B, C;
    try {
      C = f(0, 0); A = f(1, 0).moins(C); B = f(0, 1).moins(C);
      for (const [x, y] of [[2, 3], [-1, 2], [3, -2], [5, 7]]) if (!f(x, y).egal(A.fois(x).plus(B.fois(y)).plus(C))) return { erreur: null, pasDroite: true, ecrit: ecrireDroite(c) };
    } catch (err) { return { erreur: String(err.message || err) || "Je n'arrive pas à lire cette ligne." }; }
    const g = c[0].replace(/\s/g, ""), d = c[1];
    const finale = g === "y" && !/[y(]/.test(d.replace(/\(\s*[−–-]?[\d,./ ]+\)/g, "1")) && !B.estNul();   // (−4/3)x reste une forme finale
    return { A, B, C, finale, ecrit: ecrireDroite(c) };
  }
  const ecrireDroite = c => c.map(x => x.trim().replace(/-/g, MOINS).replace(/\*/g, "×").replace(/\s*([+−×÷=])\s*/g, " $1 ").replace(/^ − /, MOINS).replace(/\( − /g, "(" + MOINS).replace(/\s+/g, " ").trim()).join(" = ");
  const coefsDe = (m, b) => ({ A: F(m), B: F(-1), C: F(b) });                       // m x − y + b = 0
  const memeDroite = (u, w) => !(u.A.estNul() && u.B.estNul()) && u.A.fois(w.B).egal(u.B.fois(w.A)) && u.A.fois(w.C).egal(u.C.fois(w.A)) && u.B.fois(w.C).egal(u.C.fois(w.B));
  const reduite = u => u.B.estNul() ? null : { m: u.A.sur(u.B).oppose(), b: u.C.sur(u.B).oppose() };
  const presque = (u, w) => { const a = reduite(u), b = reduite(w); return !!(a && b && proche(a.m, b.m, F("0.01")) && proche(a.b, b.b, F("0.01"))); };
  const passePar = (u, p) => u.A.fois(p[0]).plus(u.B.fois(p[1])).plus(u.C).estNul();
  function jugerDroite(e, s, prev, premiere, texte, exo) {
    const lu = lireDroite(texte);
    if (lu.erreur) return illisible(lu.erreur);
    const att = droiteAttendue(e, s, exo), w = coefsDe(att.m, att.b), o = { ecrit: lu.ecrit, ast: lu.ecrit, attendu: "y = " + affine(att.m, att.b), fin: !!lu.finale };
    const approche = !decimalExact(att.m) || !decimalExact(att.b);                    // pente 4/3 : y = 1,33x accepté (arrondi au centième)
    if (lu.pasDroite) return verdict(e, "faux", Object.assign(o, { diag: { geo: true, code: null, detail: { geo: true, sorte: "pasDroite" } }, precision: o.attendu + " attendu, pas " + lu.ecrit }));
    const u = { A: lu.A, B: lu.B, C: lu.C };
    const ref = !premiere && prev ? lireDroite(prev) : null, base = ref && !ref.erreur && !ref.pasDroite ? { A: ref.A, B: ref.B, C: ref.C } : w;
    if (memeDroite(u, base) || (approche && presque(u, base)) || (ref && memeDroite(u, w))) return verdict(e, lu.finale ? "juste" : "incomplet", o);
    // ce qui ne va pas : la pente, le point (souvent un signe), ou la ligne d'avant mal transformée
    const p = pt(s, e.P), r = reduite(u);
    let sorte = "remplaceDroite";
    let code = null;
    if (ref && base !== w) {
      sorte = r && reduite(base) && r.m.egal(reduite(base).m) ? "constante" : "ligne";
      // sa ligne d'avant était la bonne droite : l'erreur de développement ou de changement de côté se reconnaît à son nombre seul
      if (sorte === "constante" && memeDroite(base, w) && r.m.egal(att.m)) {
        const [x1, y1] = p, m = att.m, bonB = y1.moins(m.fois(x1)), K = [];
        if (!x1.estNul() && !m.egal(1)) K.push({ code: "DIST-PART", b: y1.moins(x1), sorte: "distPart" });
        if (!x1.estNul()) K.push({ code: "SIG-PAR", b: y1.plus(m.fois(x1)), sorte: "sigPar" });
        if (!y1.estNul()) K.push({ code: "TRANS-SIG", b: m.fois(x1).oppose().moins(y1), sorte: "transSig" });
        const ok = K.filter(k => !k.b.egal(bonB) && k.b.egal(r.b));
        if (ok.length && ok.every(k => k.code === ok[0].code)) { code = ok[0].code; sorte = ok[0].sorte; }
      }
    }
    else if (passePar(u, p) && r && !r.m.egal(att.m)) sorte = "pente";
    else if (r && r.m.egal(att.m) && [[-1, -1], [-1, 1], [1, -1]].some(([a, b]) => passePar(u, [p[0].fois(a), p[1].fois(b)]))) sorte = "signePoint";
    else if (r && r.m.egal(att.m)) sorte = "point";
    return verdict(e, "faux", Object.assign(o, { code, diag: { geo: true, code, detail: { geo: true, sorte } }, precision: o.attendu + " attendu, pas " + lu.ecrit }));
  }

  /* y = 0 : une équation en x, jugée par le moteur des équations (P3, P4) ; x = b (l'ordonnée à l'origine) est AXE-INV. */
  function jugerAxeX(e, s, prev, texte) {
    const r = T.jugerLigne(prev, texte, "solution");
    if (r.statut === "illisible") return illisible(r.message);
    const o = { ecrit: r.ecrit, eq: r.eq, ast: r.eq, attendu: r.attendu || null, fin: r.statut !== "incomplet", aSimplifier: r.aSimplifier, message: r.statut === "incomplet" ? SUITE.equation : undefined };
    if (r.statut !== "faux") return verdict(e, r.statut, o);
    const sol = T.FORMES.solution(r.eq) ? MM.saisie.lireSolution(texte) : null;
    if (sol && sol.ok && sol.valeur.egal(F(e.b))) return verdict(e, "faux", Object.assign(o, { code: "AXE-INV", diag: { geo: true, code: "AXE-INV", detail: { geo: true, sorte: "axeInv", axe: "x" } }, precision: "x = " + ecr(F(e.b).oppose().sur(F(e.m))) + " attendu, pas x = " + ecr(sol.valeur) }));
    return verdict(e, "faux", Object.assign(o, { code: r.code || null, diag: r.diag, precision: r.attendu ? r.attendu + " attendu, pas " + r.ecrit : null }));
  }

  /* ---------- après une étape finie : SES valeurs deviennent l'état ---------- */
  function apres(s, e, v) {
    const o = clone(s); o.v = o.v || {};
    if (["carres", "pyth", "milieu", "pente", "axeY"].includes(e.sorte) && v.valeur != null) o.v[e.id] = F(v.valeur).cle();
    if (e.sorte === "milieu" && e.sortie) o.points[e.sortie][e.axe === "x" ? 0 : 1] = F(v.valeur).cle();
    return o;
  }

  /* ---------- déroulé sans aide (série sans aide, jumeau) : le même code sert à l'app et aux tests ---------- */
  function entrer(Q) { const e = Q.etapes[Q.k]; if (!e) return; Q.prev = lireDepart(e, Q.p5, Q.exo); }
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
    Q.acceptees.push({ etape: e.id, nom: e.nom, texte: v.ecrit, statut: v.statut, code: v.code || null, attendu: v.attendu || null, diag: v.statut === "faux" ? v.diag : null, typeLigne: e.type, inter: !v.fin });
    if (!v.fin) { Q.prev = v.eq || v.ast; return v; }
    terminer(Q, e, v);
    return v;
  }
  function nouveau(exo, mode) {
    const p5 = etatInitial(exo), Q = { exo, modeP5: mode, p5, etapes: etapes(exo, mode, p5), k: 0, prev: null, journal: [], acceptees: [], fini: false };
    entrer(Q);
    return Q;
  }
  function jouer(exo, mode, entrees) {
    const Q = nouveau(exo, mode);
    Q.illisibles = [];
    for (const x of entrees) { if (Q.fini) break; const v = pas(Q, x); if (v && v.statut === "illisible") Q.illisibles.push(v.message); }
    return Q;
  }
  const score = S2.score;

  /* ---------- table des réponses fausses (D53 : clés « étape:valeur ») ---------- */
  function reponsesFausses(exo) {
    const t = {}, s = etatInitial(exo);
    const aj = (code, cle) => { const l = t[code] || (t[code] = []); if (!l.includes(cle)) l.push(cle); };
    for (const e of etapes(exo, "guide", s)) {
      if (e.sorte === "racine") { const R = valeurDe(s, exo, e.de); aj("RAC-OUB", e.id + ":" + R.cle()); continue; }
      if (e.type !== "nombre") continue;
      const pris = new Set(), bon = attenduValeur(e, s, exo);
      for (const k of candidats(e, s, exo)) if (k.code) { aj(k.code, e.id + ":" + k.valeur.cle()); pris.add(k.valeur.cle()); }
      // les erreurs du moteur des nombres sur la formule remplacée, sauf celles qu'un code de géométrie nomme déjà
      for (const k of N.candidats(E.arbre(departEtape(e, s, exo)))) if (!pris.has(k.valeur.cle()) && !k.valeur.egal(bon)) aj(k.code, e.id + ":" + k.valeur.cle());
    }
    return t;
  }

  /* ---------- le corrigé : la démarche modèle, ligne par ligne ---------- */
  function corrige(exo) {
    const s = etatInitial(exo), out = [];
    const ligne = (id, nom, l, pourquoi) => out.push({ id, nom, ligne: l, pourquoi });
    for (const e of etapes(exo, "guide", s)) {
      const pre = e.prefixe || "";
      if (e.type === "nombre") {
        const dep = departEtape(e, s, exo), bon = attenduValeur(e, s, exo);
        ligne(e.id, e.nom, pre + dep, POURQUOI[e.sorte]);
        const ch = N.chaine(E.arbre(dep));
        ch.forEach((l, i) => { const der = i === ch.length - 1; ligne(e.id, e.nom, pre + (der ? ecr(bon) : S2.ecrireLigne(E.arbre(l.ligne))), der ? "On termine le calcul." : l.pourquoi); });
        if (!ch.length || !F(N.lire(ch[ch.length - 1].ligne).valeur).egal(bon)) ligne(e.id, e.nom, pre + ecr(bon), "On termine le calcul.");
      } else if (e.sorte === "racine") {
        const R = valeurDe(s, exo, e.de), r = R.racine();
        ligne(e.id, e.nom, pre + "√" + ecr(R) + (r ? " = " + ecr(r) : " ≈ " + centiemeTexte(arrondi(R))), r ? ecr(r) + " × " + ecr(r) + " = " + ecr(R) + "." : "Valeur exacte √" + ecr(R) + ", ou arrondie au centième.");
      } else if (e.sorte === "axeX") {
        const dep = departEtape(e, s, exo);
        ligne(e.id, e.nom, dep, "Sur l'axe des abscisses, y = 0.");
        // « x = 5/2 = 2,5 » : sur la copie, une seule égalité par ligne, en décimal comme la consigne le demande
        for (const l of T.corrige(E.lireEquation(dep))) { const c = l.ligne.split(" = "); ligne(e.id, e.nom, c.length > 2 ? c[0] + " = " + c[c.length - 1] : l.ligne, l.pourquoi); }
      } else if (e.sorte === "droite") {
        const d = droiteAttendue(e, s, exo), p = pt(s, e.P);
        ligne(e.id, e.nom, departEtape(e, s, exo), "On remplace m, x₁ et y₁ dans y − y₁ = m(x − x₁).");
        const g = p[1].estNul() ? "y" : "y " + (p[1].signe() < 0 ? "+ " + ecr(p[1].abs()) : MOINS + " " + ecr(p[1]));
        if (!p[0].estNul()) ligne(e.id, e.nom, g + " = " + affine(d.m, d.m.fois(p[0]).oppose()), "On développe : m multiplie x et x₁.");
        const fin = "y = " + affine(d.m, d.b);
        if (out[out.length - 1].ligne !== fin) ligne(e.id, e.nom, fin, p[1].estNul() ? "y est seul : c'est l'équation réduite." : "Le nombre passe de l'autre côté en changeant de signe.");
      }
      if (e.sorte !== "droite" && e.sorte !== "axeX") Object.assign(s, apres(s, e, { valeur: e.sorte === "racine" ? null : attenduValeur(e, s, exo).cle() }));
    }
    for (const c of exo.conclusions || []) ligne("fin", "Conclusion", c.ligne, c.pourquoi);
    return out;
  }
  const POURQUOI = { carres: "On remplace dans (x₂ − x₁)² + (y₂ − y₁)².", pyth: "Pythagore : le carré de l'hypoténuse est la somme des carrés des deux autres côtés.",
    milieu: "Le milieu : on additionne, puis on divise par 2.", pente: "La pente : l'écart des y divisé par l'écart des x.", axeY: "Sur l'axe des ordonnées, x = 0." };

  /* ---------- un exercice, à partir d'un modèle ----------
     modele : { sorte: "distance"|"milieu"|"droite"|"axes"|"isocele"|"segment"|"pythagore", ... } ; null si hors bornes ou ambigu (D53). */
  const F2 = p => p.map(v => F(v).cle());
  function construire(modele) {
    const m = modele, plan = [], conclusions = [];
    let points = {}, consigne, enonce, formules, valeurs = {};
    const nom = (a, b) => a + b;
    const dist = (a, b, id) => { plan.push({ id: id + "2", sorte: "carres", P: a, Q: b, nom: "Calcule " + nom(a, b) + "²", prefixe: nom(a, b) + "² = " }, { id, sorte: "racine", de: id + "2", nom: "Calcule " + nom(a, b), prefixe: nom(a, b) + " = " }); };
    const mil = (a, b, M) => { plan.push({ id: "x" + M, sorte: "milieu", axe: "x", P: a, Q: b, sortie: M, nom: "Calcule x" + M, prefixe: "x" + M + " = " }, { id: "y" + M, sorte: "milieu", axe: "y", P: a, Q: b, sortie: M, nom: "Calcule y" + M, prefixe: "y" + M + " = " }); };
    const dro = (a, b) => { plan.push({ id: "m" + a + b, sorte: "pente", P: a, Q: b, nom: "Calcule la pente de (" + a + b + ")", prefixe: "m = " }, { id: "eq" + a + b, sorte: "droite", P: a, de: "m" + a + b, nom: "Équation de (" + a + b + ")", prefixe: "" }); };
    const pts = l => l.map(k => point(k, points[k])).join(" et ");
    if (["distance", "milieu", "droite", "ldroite", "isocele", "segment", "pente", "mildist"].includes(m.sorte)) {
      for (const [k, p] of Object.entries(m.points)) points[k] = F2(p);
      for (const p of Object.values(points)) if (p.some(v => F(v).abs().cmp(12) > 0)) return null;
    }
    const [A, B] = Object.keys(points);
    if (m.sorte === "distance") {
      if (points[A].every((v, i) => F(v).egal(F(points[B][i])))) return null;
      dist(A, B, A + B); consigne = "Calcule la distance " + A + B + ". Laisse la valeur exacte (√…) ou arrondis au centième."; enonce = pts([A, B]);
      formules = "d = √((x₂ − x₁)² + (y₂ − y₁)²)";
    } else if (m.sorte === "milieu") {
      mil(A, B, "M"); points.M = F2(points[A].map((v, i) => F(v).plus(F(points[B][i])).sur(2)));
      consigne = "Calcule les coordonnées du milieu M de [" + A + B + "]."; enonce = pts([A, B]); formules = "xM = (x₁ + x₂) ÷ 2 · yM = (y₁ + y₂) ÷ 2";
    } else if (m.sorte === "pente") {                                                 // lot 4a, P8 (D95) : la pente seule
      if (F(points[A][0]).egal(F(points[B][0]))) return null;
      plan.push({ id: "m" + A + B, sorte: "pente", P: A, Q: B, nom: "Calcule la pente de (" + A + B + ")", prefixe: "m = " });
      consigne = "Calcule la pente de la droite (" + A + B + ")."; enonce = pts([A, B]); formules = "m = (y₂ − y₁) ÷ (x₂ − x₁)";
    } else if (m.sorte === "mildist") {                                               // lot 4a, P11 (D95) : milieu, puis longueur
      if (points[A].every((v, i) => F(v).egal(F(points[B][i])))) return null;
      mil(A, B, "M"); points.M = F2(points[A].map((v, i) => F(v).plus(F(points[B][i])).sur(2))); dist(A, B, A + B);
      consigne = "Segment [" + A + B + "]. 1) Calcule les coordonnées de son milieu M. 2) Calcule la longueur " + A + B + "."; enonce = pts([A, B]);
      formules = "milieu : (x₁ + x₂) ÷ 2 · d = √((x₂ − x₁)² + (y₂ − y₁)²)";
    } else if (m.sorte === "droite") {
      if (F(points[A][0]).egal(F(points[B][0]))) return null;
      dro(A, B); consigne = "Calcule la pente de (" + A + B + "), puis son équation."; enonce = pts([A, B]); formules = "m = (y₂ − y₁) ÷ (x₂ − x₁) · y − y₁ = m(x − x₁)";
    } else if (m.sorte === "ldroite") {                                                // partie B, ex. 1 : longueur, pente, équation
      if (F(points[A][0]).egal(F(points[B][0]))) return null;
      dist(A, B, A + B); dro(A, B);
      consigne = "Segment [" + A + B + "]. 1) Calcule sa longueur. 2) Calcule la pente de (" + A + B + "), puis son équation."; enonce = pts([A, B]);
      formules = "d = √((x₂ − x₁)² + (y₂ − y₁)²) · m = (y₂ − y₁) ÷ (x₂ − x₁) · y − y₁ = m(x − x₁)";
    } else if (m.sorte === "axes") {
      const pm = F(m.m), b = F(m.b);
      if (pm.estNul() || b.estNul()) return null;
      plan.push({ id: "axeY", sorte: "axeY", m: pm.cle(), b: b.cle(), nom: "Axe des ordonnées (x = 0)", prefixe: "y = " },
        { id: "axeX", sorte: "axeX", m: pm.cle(), b: b.cle(), nom: "Axe des abscisses (y = 0)", prefixe: "" });
      consigne = "Trouve les points où la droite coupe les deux axes."; enonce = "y = " + affine(pm, b); formules = "Axe des ordonnées : x = 0 · axe des abscisses : y = 0";
      const x0 = b.oppose().sur(pm);
      conclusions.push({ ligne: point("A", [F(0), b]) + " et " + point("B", [x0, F(0)]), pourquoi: "La droite coupe l'axe des ordonnées en A et l'axe des abscisses en B." });
    } else if (m.sorte === "isocele") {
      const [, , C] = Object.keys(points);
      dist(A, C, A + C); dist(B, C, B + C); mil(A, B, "M"); points.M = F2(points[A].map((v, i) => F(v).plus(F(points[B][i])).sur(2)));
      dist(C, "M", C + "M"); dro(A, C);
      consigne = "Triangle " + A + B + C + ". 1) Calcule " + A + C + " et " + B + C + " : montre qu'il est isocèle. 2) M est le milieu de [" + A + B + "] : calcule ses coordonnées, puis la médiane " + C + "M. 3) Écris l'équation de (" + A + C + ").";
      enonce = pts([A, B, C]); formules = "d = √((x₂ − x₁)² + (y₂ − y₁)²) · milieu : (x₁ + x₂) ÷ 2 · m = (y₂ − y₁) ÷ (x₂ − x₁)";
    } else if (m.sorte === "segment") {
      mil(A, B, "M"); points.M = F2(points[A].map((v, i) => F(v).plus(F(points[B][i])).sur(2)));
      dist(A, B, A + B); dist(A, "M", A + "M"); dro(A, B);
      consigne = "Segment [" + A + B + "]. 1) Calcule les coordonnées de son milieu M. 2) Calcule " + A + B + " et " + A + "M. 3) Écris l'équation de (" + A + B + ").";
      enonce = pts([A, B]); formules = "milieu : (x₁ + x₂) ÷ 2 · d = √((x₂ − x₁)² + (y₂ − y₁)²) · m = (y₂ − y₁) ÷ (x₂ − x₁)";
    } else if (m.sorte === "pythagore") {
      const [h, a, b] = m.noms || ["AC", "AB", "BC"], angle = m.angle || "B", tri = "Triangle " + [...new Set((h + a + b).split(""))].sort().join("") + " rectangle en " + angle + " : ";
      if (m.hyp) { plan.push({ id: "p2", sorte: "pyth", hyp: true, a: F(m.a).cle(), b: F(m.b).cle(), nom: "Pythagore", prefixe: h + "² = " }, { id: "p", sorte: "racine", de: "p2", nom: "Calcule " + h, prefixe: h + " = " });
        consigne = "Le triangle est rectangle en " + angle + ". Calcule " + h + " (au centième si besoin)."; enonce = tri + a + " = " + ecr(m.a) + " ; " + b + " = " + ecr(m.b); }
      else { if (F(m.a).cmp(F(m.b)) <= 0) return null;
        plan.push({ id: "p2", sorte: "pyth", hyp: false, a: F(m.a).cle(), b: F(m.b).cle(), nom: "Pythagore", prefixe: b + "² = " }, { id: "p", sorte: "racine", de: "p2", nom: "Calcule " + b, prefixe: b + " = " });
        consigne = "Le triangle est rectangle en " + angle + ". Calcule " + b + " (au centième si besoin)."; enonce = tri + h + " = " + ecr(m.a) + " ; " + a + " = " + ecr(m.b); }
      formules = "Hypoténuse² = côté² + côté²";
    } else return null;
    const exo = { type: "geo", modele: m.sorte, consigne, enonce, formules, points, plan, conclusions, valeurs };
    // les valeurs justes de chaque étape, dans l'ordre (le corrigé et les étapes sans état les lisent)
    let s = etatInitial(exo);
    try {
      for (const sp of plan) {
        const e = etape(sp);
        if (e.type === "nombre") { const v = attenduValeur(e, s, exo); if (v == null) return null; valeurs[e.id] = v.cle(); s = apres(s, e, { valeur: v.cle() }); }
      }
    } catch (err) { return null; }                                                 // une pente verticale (division par 0)
    // une pente verticale ou une distance nulle n'a pas de sens ici
    if (plan.some(p => p.sorte === "racine" && F(valeurs[p.de]).estNul())) return null;
    if (m.sorte === "isocele") {
      const C = Object.keys(m.points)[2], ac = F(valeurs[A + C + "2"]), bc = F(valeurs[B + C + "2"]);
      if (!ac.egal(bc)) return null;
      conclusions.push({ ligne: A + C + " = " + B + C + " = " + racineTexte(ac) + " : le triangle " + A + B + C + " est isocèle en " + C + ".", pourquoi: "Deux côtés de même longueur." });
    }
    exo.etapes = etapes(exo, "guide", etatInitial(exo));
    exo.erreurs = reponsesFausses(exo);
    if (MM.diag.collisions(exo.erreurs).length) return null;                     // diagnostic ambigu à une étape : on retire
    exo.corrige = corrige(exo);
    exo.reponseTexte = reponseTexte(exo);
    exo.reponse = exo.reponseTexte;
    return exo;
  }
  function reponseTexte(exo) {
    const s = etatInitial(exo), t = [];
    for (const e of etapes(exo, "guide", s)) {
      if (e.sorte === "racine") { const R = F(exo.valeurs[e.de]), r = R.racine(); t.push(e.prefixe + (r ? ecr(r) : "√" + ecr(R) + " ≈ " + centiemeTexte(arrondi(R)))); }
      else if (e.sorte === "milieu" && e.axe === "y") t.push(point(e.sortie, exo.points[e.sortie].map(F)));
      else if (e.sorte === "pente") t.push("m = " + ecr(exo.valeurs[e.id]));
      else if (e.sorte === "droite" || e.sorte === "axeX" || e.sorte === "axeY") { if (e.sorte === "droite") t.push(attenduTexte(e, s, exo)); }
    }
    if (exo.modele === "axes") t.push(exo.conclusions[0].ligne);
    return t.join(" ; ");
  }

  /* ---------- l'explication du prof : ce qui est juste, l'endroit exact, la règle ; jamais la valeur juste (D50) ---------- */
  function expliquer(d, variante) {
    const CAT = MM.diag.CATALOGUE, x = (d && d.detail) || {}, code = (d && d.code) || null, v2 = variante === 2;
    const fin = (titre, bon, ou, regle, suite) => ({ code, titre, bon, ou, regle, suite: suite || "", reflexe: code && CAT[code] ? CAT[code].reflexe : "", variante: v2 ? 2 : 1 });
    const nom = c => (CAT[c] && CAT[c].nom) || "Erreur";
    switch (x.sorte) {
      case "moinsMoins": return fin("Le moins d'un négatif", "Tu as bien posé la formule.", "Mais une coordonnée négative a perdu son signe dans la soustraction.",
        v2 ? "Mets la coordonnée négative entre parenthèses : 5 − (−3) = 5 + 3." : "Soustraire un nombre négatif, c'est ajouter son opposé.");
      case "ordreHyp": return fin("L'ordre de la soustraction", "Tu as bien choisi de soustraire.", "Mais on part du carré de l'hypoténuse, le plus grand.", v2 ? "Un carré de longueur n'est jamais négatif : le plus grand carré vient en premier." : "Côté² = hypoténuse² − autre côté².");
      case "arrondiM": return fin("Arrondi au centième", "Ta pente est presque juste.", "Mais l'arrondi au centième garde 2 chiffres après la virgule.", v2 ? "Ou garde la fraction exacte, sans arrondir." : "Fais la division à la calculatrice, puis arrondis au centième.");
      case "distPart": return fin(nom("DIST-PART"), "Ta ligne d'avant était juste.", "Mais en développant, m doit multiplier les deux termes de la parenthèse.", v2 ? "Trace une flèche de m vers x, puis une autre vers x₁." : "m(x − x₁) = m × x − m × x₁.");
      case "sigPar": return fin(nom("SIG-PAR"), "Ta ligne d'avant était juste.", "Mais en développant, le signe de m × x₁ s'est perdu.", v2 ? "Un moins dans la parenthèse garde son moins après la multiplication." : "m(x − x₁) = mx − m × x₁ : le moins reste.");
      case "transSig": return fin(nom("TRANS-SIG"), "Ta ligne d'avant était juste.", "Mais y₁ a changé de côté sans changer de signe.", v2 ? "Pour isoler y, fais l'opération inverse des deux côtés." : "Un nombre qui change de côté change de signe.");
      case "sansCarre": return fin("Le carré a disparu", "Tu as les bons écarts.", "Mais chaque écart doit être mis au carré.", v2 ? "Dans la formule, chaque parenthèse porte un ² : l'écart fois lui-même." : "(x₂ − x₁)² : l'écart, puis son carré. Pareil pour les y.");
      case "somme": return fin("Une somme au lieu d'un écart", "Tu as bien pris les coordonnées.", "Mais dans la formule, c'est x₂ − x₁, pas x₂ + x₁.", v2 ? "La distance mesure un écart : on soustrait." : "Dans chaque parenthèse : la coordonnée du 2e point moins celle du 1er.");
      case "carre-neg": return fin(nom("SIG-REL"), "Tu as bien remplacé.", "Mais " + (x.carre ? x.carre + " est un carré : il" : "un carré") + " n'est jamais négatif.", v2 ? "Un nombre fois lui-même : deux signes pareils, donc un résultat positif." : "Moins par moins donne plus.");
      case "carre2": return fin(nom("CALC"), "Tu as bien remplacé.", "Mais le carré, c'est un nombre fois lui-même, pas fois 2.", v2 ? "Au carré : deux fois le même nombre, multipliés entre eux." : "4² = 4 × 4, pas 4 × 2.");
      case "hypo": return fin(nom("HYPO"), "Tu as bien mis les côtés au carré.", x.hyp ? "Mais pour l'hypoténuse, on additionne les deux carrés." : "Mais ce côté n'est pas l'hypoténuse : on soustrait.",
        v2 ? "Repère l'angle droit : l'hypoténuse est en face, c'est le plus long côté." : "Hypoténuse² = côté² + côté². Pour un petit côté : côté² = hypoténuse² − autre côté².");
      case "sansCarreP": return fin("Le carré a disparu", "Tu as les bons côtés.", "Mais Pythagore porte sur les carrés des côtés.", v2 ? "Chaque longueur s'écrit avec un ² dans l'égalité." : "Mets chaque longueur au carré avant d'additionner ou de soustraire.");
      case "sansDeux": return fin("La division a disparu", "Ton addition est juste.", "Mais le milieu, c'est la moyenne : il reste à diviser par 2.", v2 ? "Le milieu est à mi-chemin : la moitié de la somme." : "Relis la formule jusqu'au bout : ÷ 2.");
      case "diff": return fin("Une différence au lieu d'une somme", "Tu as bien pris les coordonnées.", "Mais pour le milieu, on additionne les deux coordonnées.", v2 ? "La moyenne de deux nombres : leur somme, divisée par 2." : "(x₁ + x₂) ÷ 2 : un plus, pas un moins.");
      case "inverse": return fin("Pente à l'envers", "Tu as les bons écarts.", "Mais la pente, c'est l'écart des y divisé par l'écart des x.", v2 ? "La pente dit de combien on monte quand on avance de 1 : les y en haut." : "En haut les y, en bas les x.");
      case "ordre": return fin(nom("PENTE-ORD"), "Tu as les bons nombres.", "Mais tu n'as pas pris le même point en premier en haut et en bas.", v2 ? "Écris y₂ − y₁ en haut, puis x₂ − x₁ en bas, avec le même point 2." : "Même point en premier, en haut et en bas.");
      case "axeInv": return fin(nom("AXE-INV"), "Tu es sur la bonne droite.", x.axe === "y" ? "Mais sur l'axe des ordonnées, c'est x qui vaut 0." : "Mais sur l'axe des abscisses, c'est y qui vaut 0 : il faut résoudre l'équation.",
        v2 ? "Un point de l'axe vertical a son x égal à 0 ; un point de l'axe horizontal a son y égal à 0." : x.axe === "y" ? "Remplace x par 0, puis calcule y." : "Remplace y par 0, puis trouve x.");
      case "remplace0": return fin("Le remplacement ne tient pas", "Tu es sur la bonne étape.", "Mais x vaut 0 : m × 0, ce n'est pas m.", v2 ? "Tout nombre fois 0 donne 0." : "Remplace x par 0, puis calcule.");
      case "remplace": return fin("Le remplacement ne tient pas", "Tu es sur la bonne étape.", "Mais ta ligne ne suit pas la formule avec ces nombres.", v2 ? "Écris la formule, puis remplace une coordonnée à la fois." : "Remplace chaque lettre par son nombre, sans rien changer d'autre.");
      case "rac": {
        const v = F(x.saisi), R = F(x.R), teste = ecr(v) + " × " + ecr(v) + " = " + ecr(F(x.carre)) + ", pas " + ecr(R) + ".";
        const regle = v2 ? "Teste ton nombre : fois lui-même, il doit redonner le nombre sous la racine." : "La racine, c'est le chemin retour du carré.";
        if (x.cas === "oubli") return fin(nom("RAC-OUB"), "Ta somme de carrés est juste.", "Mais la longueur, c'est sa racine carrée : il manque √.", v2 ? "Le carré de la longueur vaut ce nombre ; la longueur, c'est sa racine." : "La formule commence par √ : elle porte sur tout le calcul.");
        if (x.cas === "moitie") return fin("Racine carrée", "Tu es sur la bonne étape.", "Mais la racine carrée n'est pas la moitié.", v2 ? "Teste : " + teste : regle);
        if (x.cas === "signe") return fin("Racine carrée", "Ton nombre est bon, sans le signe.", "Mais une longueur n'est jamais négative.", regle);
        if (x.cas === "arrondi") return fin("Arrondi au centième", "Tu es tout près.", "Mais l'arrondi au centième garde 2 chiffres après la virgule.", v2 ? "Regarde le 3e chiffre après la virgule : 5 ou plus, on arrondit au-dessus." : "Calcule à la calculatrice, puis garde 2 chiffres après la virgule, bien arrondis.");
        if (x.cas === "essai") return fin(nom("CALC"), "Tu cherches le bon nombre.", "Mais " + teste, v2 ? regle : "Essaie un nombre plus " + (F(x.carre).cmp(R) > 0 ? "petit." : "grand."));
        return fin("Racine carrée", "Tu es sur la bonne étape.", "Mais ce nombre, fois lui-même, ne redonne pas le nombre sous la racine.", regle);
      }
      case "sousRacine": return fin("Le nombre sous la racine", "Tu as bien pensé à la racine.", "Mais sous la racine, il faut le résultat de ta ligne d'avant.", v2 ? "Relis ta dernière ligne : c'est ce nombre qui va sous √." : "Recopie sous √ le nombre que tu viens de calculer.");
      case "pasDroite": return fin("Ce n'est pas une droite", "Tu as écrit une égalité.", "Mais une droite s'écrit sans x² ni x × y.", v2 ? "Pars de y − y₁ = m(x − x₁) : x et y n'y sont qu'une fois." : "Recopie la formule y − y₁ = m(x − x₁), puis remplace.");
      case "pente": return fin("La pente ne tient pas", "Ta droite passe bien par le point.", "Mais le nombre devant (x − x₁) doit être ta pente m.", v2 ? "Dans y − y₁ = m(x − x₁), m est la pente que tu viens de calculer." : "Remplace m par la pente de l'étape d'avant.");
      case "signePoint": return fin("Un signe dans le point", "Ta pente est la bonne.", "Mais ta droite ne passe pas par le point : regarde les signes dans y − y₁ et x − x₁.",
        v2 ? "Si y₁ est négatif, y − (−4) devient y + 4." : "Écris y − (y₁) et x − (x₁) avec des parenthèses, puis enlève-les.");
      case "point": return fin("Le point ne tient pas", "Ta pente est la bonne.", "Mais ta droite ne passe pas par le point de départ.", v2 ? "Remplace x et y par les coordonnées du point : l'égalité doit tenir." : "Remplace x₁ et y₁ par les coordonnées d'un des deux points.");
      case "constante": return fin("Le nombre seul ne tient pas", "Ta pente est restée la même.", "Mais le nombre seul a changé en route.", v2 ? "Un nombre qui change de côté change de signe ; m multiplie aussi x₁." : "Regarde comment tu as développé m(x − x₁), puis fait passer y₁ de l'autre côté.");
      case "ligne": return fin("La ligne ne tient plus", "Ta ligne d'avant était juste.", "Mais celle-ci n'est plus la même droite.", v2 ? "Développe d'abord, puis fais passer un seul terme à la fois." : "Une seule transformation par ligne : développer, puis changer de côté.");
      case "remplaceDroite": return fin("Le remplacement ne tient pas", "Tu es sur la bonne étape.", "Mais ta ligne ne suit pas y − y₁ = m(x − x₁) avec tes nombres.", v2 ? "Écris la formule, puis remplace une lettre à la fois." : "Remplace m par ta pente, x₁ et y₁ par les coordonnées du point.");
      default: return N.expliquer(d, variante);
    }
  }

  /* ---------- le piège d'une leçon (lot 4a : P8, P10, P11) : la ligne piégée, calculée sur l'exemple ---------- */
  function piege(exo, code, parade) {
    const CAT = MM.diag.CATALOGUE, s = etatInitial(exo), es = etapes(exo, "guide", s);
    const fin = (depart, faux, bon, detail) => ({ code, nom: CAT[code] ? CAT[code].nom : code, type: "geo", depart, faux, bon, explication: expliquer({ geo: true, code, detail: Object.assign({ geo: true }, detail) }), parade });
    const pt0 = (x, y) => "(" + ecr(x) + ", " + ecr(y) + ")";
    if (code === "AXE-INV") {
      const e = es.find(x => x.sorte === "axeY"); if (!e) return null;
      const m = F(e.m), b = F(e.b), x0 = b.oppose().sur(m);
      return fin("y = " + affine(m, b), x0.estEntier() ? pt0(x0, 0) : "(" + ecr(x0) + " ; 0)", pt0(0, b), { sorte: "axeInv", axe: "y" });
    }
    if (code === "SIG-PAR") {
      const e = es.find(x => x.sorte === "droite"); if (!e) return null;
      const st = clone(s); st.v = {}; st.v[e.de] = exo.valeurs[e.de];
      const m = F(exo.valeurs[e.de]), p = pt(st, e.P);
      if (p[0].estNul() || m.estNul()) return null;
      const g = "y " + (p[1].signe() < 0 ? "+ " + ecr(p[1].abs()) : MOINS + " " + ecr(p[1]));
      if (p[1].estNul()) return null;
      return fin(departEtape(e, st, exo), g + " = " + affine(m, m.fois(p[0])), g + " = " + affine(m, m.fois(p[0]).oppose()), { sorte: "sigPar" });
    }
    if (code === "RAC-OUB") {
      const e = es.find(x => x.sorte === "racine"); if (!e) return null;
      const R = F(exo.valeurs[e.de]), carre = es.find(x => x.id === e.de);
      return fin(carre.prefixe + ecr(R), e.prefixe + ecr(R), e.prefixe + racineTexte(R), { sorte: "rac", cas: "oubli", R: R.cle(), saisi: R.cle(), carre: R.fois(R).cle() });
    }
    return null;
  }

  MM.geo = { SORTES, etape, etatInitial, etapes, attenduValeur, attenduTexte, departEtape, lireDepart, candidats, juger, apres, lireDroite,
    entrer, terminer, pas, nouveau, jouer, score, premiereLigne, reponsesFausses, corrige, construire, expliquer, ecr, affine, racineTexte, piege };
  if (typeof module !== "undefined" && module.exports) module.exports = MM;
})(typeof globalThis !== "undefined" ? globalThis : this);
