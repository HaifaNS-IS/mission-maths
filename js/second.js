/* Mission Maths — second.js
   Palier P5 : résoudre ax² + bx + c = 0 avec les formules fournies, comme au contrôle.
   Étapes (exigence 1) : a, b, c → Δ → nombre de solutions → √Δ → x₁ et x₂ (x seul si Δ = 0 ; rien après si Δ < 0).
   Règle centrale : chaque étape est jugée à partir des valeurs DE L'ÉLÈVE (ses a, b, c, son Δ, sa √Δ) : pas de double pénalité.
   Les lignes de calcul (Δ, x) passent par le moteur des nombres du lot 2 ; ce module ajoute les erreurs du second degré :
   ABC-SIG, A-UN, DELTA-SQ, SOL-NB, RAC-SQ, et des erreurs localisées hors catalogue (division par 2a oubliée, Δ au lieu de √Δ…).
   D53 : la règle « deux codes, jamais la même réponse fausse » se vérifie étape par étape (clés « étape:valeur »).
   Rien n'est écrit à la main : chaque bonne valeur et chaque réponse fausse est calculée. Fonctions pures, sans accès à l'écran. */
(function (G) {
  "use strict";
  const MM = G.MM || (G.MM = {});
  if (typeof require === "function") { if (!MM.nombres) require("./nombres.js"); if (!MM.diag) require("./diag.js"); }
  const E = MM.expr, N = MM.nombres, F = MM.F, MOINS = E.MOINS, mono = E.mono;

  /* ---------- écriture ---------- */
  const ecr = v => { v = F(v); return v.estEntier() ? v.texte() : (v.decimal() || v.texte()); };    // 6,7 plutôt que 67/10
  const par = v => F(v).signe() < 0 ? "(" + ecr(v) + ")" : ecr(v);                                   // un négatif après une opération
  const ecrireLigne = ast => { const m = N.FORMES.nombre(ast) ? N.valeur(ast) : null; return m ? ecr(m) : N.ecrire(ast); };

  /* ---------- les étapes ---------- */
  const ETAPES = {
    coefs: { nom: "Repère a, b, c", type: "coefs", prefixe: "",
      consigne: "a devant x², b devant x, c le nombre seul.", indice: "Le signe juste devant un nombre fait partie du nombre. Un x² seul cache un 1.",
      pourquoi: "a est devant x², b devant x, c est seul. Chacun garde son signe." },
    delta: { nom: "Calcule Δ", type: "nombre", forme: "nombre", multi: true, prefixe: "Δ = ",
      consigne: "Remplace dans b² − 4ac, puis calcule.", indice: "Si b est négatif, écris-le entre parenthèses avant le carré." },
    nb: { nom: "Nombre de solutions", type: "nombre", forme: "nombre", prefixe: "Nombre de solutions : ",
      consigne: "Regarde le signe de Δ. Tape 2, 1 ou 0.", indice: "Δ positif : 2 solutions. Δ nul : 1. Δ négatif : aucune." },
    rac: { nom: "Calcule √Δ", type: "nombre", forme: "nombre", prefixe: "√Δ = ",
      consigne: "Quel nombre, fois lui-même, donne Δ ?", indice: "Récite les carrés : 1, 4, 9, 16, 25, 36… jusqu'à retrouver Δ." },
    x1: { nom: "Calcule x₁", type: "nombre", forme: "nombre", multi: true, prefixe: "x₁ = ",
      consigne: "x₁ = (−b + √Δ) ÷ 2a. Remplace, puis calcule.", indice: "−b, c'est l'opposé de b. Mets tout le haut entre parenthèses." },
    x2: { nom: "Calcule x₂", type: "nombre", forme: "nombre", multi: true, prefixe: "x₂ = ",
      consigne: "x₂ = (−b − √Δ) ÷ 2a. Remplace, puis calcule.", indice: "Même calcul que x₁, avec un moins devant √Δ." },
    x0: { nom: "Calcule x", type: "nombre", forme: "nombre", multi: true, prefixe: "x = ",
      consigne: "Une seule solution : x = −b ÷ 2a.", indice: "−b, c'est l'opposé de b. Puis divise par 2 × a." }
  };
  const etape = id => Object.assign({ id, p5: true }, ETAPES[id]);

  /* ---------- calculs exacts ---------- */
  function calculer(a, b, c) {
    a = F(a); b = F(b); c = F(c);
    const delta = b.fois(b).moins(a.fois(c).fois(4)), nb = delta.signe() > 0 ? 2 : delta.estNul() ? 1 : 0;
    const rac = nb === 2 ? delta.racine() : nb === 1 ? F(0) : null, deuxA = a.fois(2);
    const sols = nb === 1 ? [b.oppose().sur(deuxA)] : nb === 2 && rac ? [b.oppose().plus(rac).sur(deuxA), b.oppose().moins(rac).sur(deuxA)] : [];
    return { a, b, c, delta, nb, rac, sols };
  }
  /* L'état : SES valeurs (clés exactes), mises à jour à chaque étape finie. a0 = le vrai a, pour ne jamais diviser par 0. */
  function etatInitial(exo) {
    return { a: exo.coefs.a, b: exo.coefs.b, c: exo.coefs.c, a0: exo.coefs.a, delta: exo.delta, rac: exo.rac, approx: false, nb: null, x1: null };
  }
  const deltaDe = s => F(s.b).fois(F(s.b)).moins(F(s.a).fois(F(s.c)).fois(4));
  const nbDe = d => { d = F(d); return d.signe() > 0 ? 2 : d.estNul() ? 1 : 0; };
  const deuxADe = s => (F(s.a).estNul() ? F(s.a0) : F(s.a)).fois(2);
  const racDe = s => s.rac != null ? F(s.rac) : F(s.delta).racine();
  /* Les solutions attendues, à partir de SES b, a et √Δ : [x avec +, x avec −], ou [x] si Δ = 0. */
  function solutionsDe(s) {
    const b = F(s.b), d2 = deuxADe(s);
    if (nbDe(s.delta) === 1) return [b.oppose().sur(d2)];
    const r = racDe(s); if (!r) return [];
    return [b.oppose().plus(r).sur(d2), b.oppose().moins(r).sur(d2)];
  }
  /* Tolérance quand SON Δ n'est pas un carré parfait (possible seulement après une erreur, sans aide) : √Δ et x au dixième près. */
  const TOL = F("0.05");
  const proche = (v, x, tol) => tol ? v.moins(x).abs().cmp(TOL) <= 0 : v.egal(x);

  /* ---------- le chemin : les étapes à faire, selon le mode et le signe de SON Δ ---------- */
  function etapes(exo, mode, etat) {
    etat = etat || etatInitial(exo);
    const d = F(etat.delta);
    let ids = ["coefs", "delta", "nb"];
    if (d.signe() > 0) ids.push("rac", "x1", "x2"); else if (d.estNul()) ids.push("x0");
    if (exo.partie) ids = ids.filter(i => exo.partie.includes(i));
    if (mode === "semi") { const s = ids.filter(i => i !== "coefs" && i !== "rac"); if (s.length) ids = s; }
    return ids.map(i => Object.assign(etape(i), { attendu: attenduTexte(etape(i), etat) }));
  }
  /* La valeur attendue d'une étape (Fraction), à partir de son état. x₂ : la solution qu'il n'a pas déjà trouvée. */
  function attenduValeur(e, s) {
    if (e.id === "delta") return deltaDe(s);
    if (e.id === "nb") return F(nbDe(s.delta));
    if (e.id === "rac") return F(s.delta).racine();
    const sols = solutionsDe(s);
    if (e.id === "x0") return sols[0];
    if (e.id === "x1") return sols[0];
    if (e.id === "x2") return s.x1 != null && sols[1] && proche(F(s.x1), sols[1], s.approx) ? sols[0] : sols[1];
    return null;
  }
  function attenduTexte(e, s) {
    if (e.id === "coefs") return "a = " + ecr(s.a) + " ; b = " + ecr(s.b) + " ; c = " + ecr(s.c);
    const v = attenduValeur(e, s);
    return v == null ? "" : ecr(v);
  }
  /* La ligne de départ d'une étape de calcul : la formule, remplacée avec SES valeurs (sert de modèle à l'échelle d'aide). */
  function departEtape(e, s) {
    if (e.id === "coefs") return null;
    if (e.id === "delta") return (F(s.b).signe() < 0 ? "(" + ecr(s.b) + ")" : ecr(s.b)) + "² " + MOINS + " 4 × " + par(s.a) + " × " + par(s.c);
    if (e.id === "nb") return String(nbDe(s.delta));
    if (e.id === "rac") { const r = F(s.delta).racine(); return r ? ecr(r) : null; }
    const a = F(s.a).estNul() ? F(s.a0) : F(s.a), bas = a.egal(1) ? "2" : "(2 × " + par(a) + ")", mb = ecr(F(s.b).oppose());
    if (e.id === "x0") return ecr(F(s.b).oppose()) + " ÷ " + bas;
    const r = racDe(s); if (!r) return null;
    let signe = e.id === "x1" ? "+" : MOINS;
    if (e.id === "x2" && s.x1 != null) { const sols = solutionsDe(s); if (sols[1] && proche(F(s.x1), sols[1], s.approx)) signe = "+"; }
    return "(" + mb + " " + signe + " " + ecr(r) + ") ÷ " + bas;
  }

  /* ---------- erreurs types, à la première ligne d'une étape (calculées à partir de SES valeurs) ----------
     { code, valeur, detail } ; code null = erreur localisée hors catalogue. Les valeurs acceptées sont retirées. */
  function candidats(e, s) {
    const out = [], a = F(s.a).estNul() ? F(s.a0) : F(s.a), b = F(s.b), c = F(s.c);
    const aj = (code, valeur, detail) => { if (valeur) out.push({ code, valeur, detail: Object.assign({ p5: true }, detail) }); };
    if (e.id === "delta") {
      const ac4 = a.fois(c).fois(4);
      if (b.signe() < 0) aj("DELTA-SQ", b.fois(b).oppose().moins(ac4), { sorte: "carre", b: b.cle(), etape: "delta" });
      if (a.signe() < 0 || c.signe() < 0) aj("ABC-SIG", b.fois(b).plus(ac4), { sorte: "abc-delta" });
    } else if (e.id === "x1" || e.id === "x2") {
      const r = racDe(s), d2 = a.fois(2), mb = b.oppose(), dlt = F(s.delta);
      if (!r) return out;
      for (const sg of [1, -1]) aj("DELTA-SQ", b.plus(r.fois(sg)).sur(d2), { sorte: "moinsb", b: b.cle() });
      for (const sg of [1, -1]) aj("PRIO", mb.plus(r.fois(sg).sur(d2)), { sorte: "haut" });
      for (const sg of [1, -1]) aj(null, mb.plus(r.fois(sg)), { sorte: "sans2a" });
      if (!a.egal(1)) for (const sg of [1, -1]) aj(null, mb.plus(r.fois(sg)).sur(a), { sorte: "sans2" });
      if (!dlt.egal(r)) for (const sg of [1, -1]) aj(null, mb.plus(dlt.fois(sg)).sur(d2), { sorte: "deltaPasRacine" });
    } else if (e.id === "x0") {
      aj("DELTA-SQ", b.sur(a.fois(2)), { sorte: "moinsb", b: b.cle() });
      aj(null, b.oppose(), { sorte: "sans2a" });
      if (!a.egal(1)) aj(null, b.oppose().sur(a), { sorte: "sans2" });
    }
    const bons = valeursAcceptees(e, s).valeurs;
    return out.filter(k => !bons.some(x => proche(k.valeur, x, s.approx)));
  }
  /* Ce qui est accepté à une étape : x₁ et x₂ dans n'importe quel ordre (QA 5). */
  function valeursAcceptees(e, s) {
    if (e.id === "x1") return { valeurs: solutionsDe(s), tol: s.approx };
    if (e.id === "x2") {
      const sols = solutionsDe(s), deja = s.x1 != null ? sols.find(x => proche(F(s.x1), x, s.approx)) : null;
      return { valeurs: deja ? sols.filter(x => x !== deja) : sols, tol: s.approx, deja };
    }
    const v = attenduValeur(e, s);
    return { valeurs: v ? [v] : [], tol: false };
  }

  /* ---------- jugement d'une étape ---------- */
  const illisible = message => ({ statut: "illisible", message });
  function verdict(e, statut, o) {
    const v = Object.assign({ statut, code: null, diag: null, fin: true }, o, { saisie: e.prefixe + (o.ecrit || "") });
    if (statut === "incomplet") v.message = "C'est juste. Continue jusqu'à un seul nombre.";
    // le parent lit le nom de l'erreur, puis le détail chiffré (« Racine confondue avec carré : √49 = 7, pas 2401 »)
    const CAT = MM.diag.CATALOGUE;
    if (statut === "faux" && v.precision && v.code && CAT[v.code]) v.precision = CAT[v.code].nom + " : " + v.precision;
    return v;
  }
  function juger(e, s, prev, premiere, entree) {
    if (e.id === "coefs") return jugerCoefs(e, s, entree);
    if (e.id === "nb") return jugerNb(e, s, entree);
    if (e.id === "rac") return jugerRacine(e, s, entree);
    return jugerCalcul(e, s, prev, premiere, entree);
  }

  /* a, b, c : trois cases, chacune lue comme un nombre. Une case avec x est fausse (sauf illisible), son nombre devant x est gardé. */
  function lireCase(txt) {
    const t = String(txt == null ? "" : txt).trim();
    if (!t) return { vide: true };
    const lu = MM.saisie.lireExpression(t);
    if (!lu.ok) return { illisible: lu.message };
    const p = lu.poly, d = p.degre();
    if (d > 0) return { avecX: true, deg: d, v: p.coef(d), affiche: E.ecrireCote(lu.termes) };
    return { v: p.coef(0), affiche: ecr(p.coef(0)) };
  }
  const LETTRES = ["a", "b", "c"];
  function jugerCoefs(e, s, valeurs) {
    const lus = LETTRES.map((k, i) => lireCase(valeurs && valeurs[i]));
    if (lus.some(x => x.vide)) return illisible("Remplis les trois cases : a, b et c.");
    const mal = lus.find(x => x.illisible); if (mal) return illisible(mal.illisible);
    const cases = LETTRES.map((k, i) => {
      const bon = F(s[k]), x = lus[i], o = { lettre: k, saisi: x.affiche, bon: bon.cle() };
      if (x.avecX) return Object.assign(o, { ok: false, sorte: k === "a" && x.deg === 2 && bon.abs().egal(1) ? "aun" : "x" });
      if (x.v.egal(bon)) return Object.assign(o, { ok: true });
      if (k === "a" && x.v.estNul() && bon.abs().egal(1)) return Object.assign(o, { ok: false, sorte: "aun" });
      if (x.v.abs().egal(bon.abs())) return Object.assign(o, { ok: false, sorte: "signe" });
      return Object.assign(o, { ok: false, sorte: "autre" });
    });
    if (!cases[1].ok && !cases[2].ok && !lus[1].avecX && !lus[2].avecX && lus[1].v.egal(F(s.c)) && lus[2].v.egal(F(s.b))) cases[1].sorte = cases[2].sorte = "echange";
    const ecrit = cases.map(c => c.lettre + " = " + c.saisi).join(" ; ");
    const o = { ecrit, valeurs: lus.map(x => x.v.cle()), attendu: attenduTexte(e, s) };
    if (cases.every(c => c.ok)) return verdict(e, "juste", o);
    const code = cases.some(c => c.sorte === "aun") ? "A-UN" : cases.some(c => c.sorte === "signe") ? "ABC-SIG" : null;
    const diag = { p5: true, code, detail: { p5: true, sorte: "coefs", cases } };
    return verdict(e, "faux", Object.assign(o, { code, diag, precision: cases.filter(c => !c.ok).map(c => c.lettre + " : " + c.saisi + " au lieu de " + ecr(c.bon)).join(" ; ") }));
  }

  function jugerNb(e, s, texte) {
    const lu = MM.saisie.lireNombre(texte);
    if (!lu.ok) return illisible(lu.message);
    const v = lu.valeur;
    if (!v.estEntier() || ![0, 1, 2].includes(Number(v.n))) return illisible("Tape le nombre de solutions : 2, 1 ou 0.");
    const n = Number(v.n), bon = nbDe(s.delta), ecrit = String(n);
    const o = { ecrit, valeur: String(n), ast: N.lire(ecrit).ast, attendu: String(bon) };
    if (n === bon) return verdict(e, "juste", o);
    const detail = { p5: true, sorte: "nb", delta: F(s.delta).cle(), saisi: n, bon };
    return verdict(e, "faux", Object.assign(o, { code: "SOL-NB", diag: { p5: true, code: "SOL-NB", detail },
      precision: "Δ = " + ecr(s.delta) + " : " + bon + " solution" + (bon > 1 ? "s" : "") + ", pas " + n }));
  }

  function jugerRacine(e, s, texte) {
    const lu = N.lire(texte);
    if (!lu.ok) return illisible(lu.message);
    const v = lu.valeur, d = F(s.delta), r = d.racine(), ecrit = ecrireLigne(lu.ast);
    const o = { ecrit, valeur: v.cle(), ast: lu.ast, attendu: r ? ecr(r) : "≈ " + ecr(F(Math.sqrt(d.approx()).toFixed(2))) };
    // Δ pas carré parfait (après une erreur, sans aide) : une valeur approchée au dixième près est juste
    const juste = r ? v.egal(r) : v.signe() >= 0 && v.moins(TOL).fois(v.moins(TOL)).cmp(d) <= 0 && v.plus(TOL).fois(v.plus(TOL)).cmp(d) >= 0;
    if (juste) return verdict(e, "juste", o);
    let code = null, sorte = "autre";
    if (v.egal(d.fois(d))) { code = "RAC-SQ"; sorte = "carre"; }
    else if (v.egal(d.sur(2))) sorte = "moitie";
    else if (v.egal(d)) sorte = "oubli";
    else if (r && v.egal(r.oppose())) sorte = "signe";
    else if (v.signe() > 0) { code = "CALC"; sorte = "essai"; }
    const detail = { p5: true, sorte: "rac", cas: sorte, delta: d.cle(), saisi: v.cle(), carre: v.fois(v).cle() };
    return verdict(e, "faux", Object.assign(o, { code, diag: { p5: true, code, detail }, precision: "√" + ecr(d) + (r ? " = " + ecr(r) : "") + ", pas " + ecr(v) }));
  }

  /* Δ et x : des lignes de calcul. La 1re ligne vaut la formule remplacée avec SES valeurs ; les suivantes, sa ligne d'avant. */
  function jugerCalcul(e, s, prev, premiere, texte) {
    const lu = N.lire(texte);
    if (!lu.ok) return illisible(lu.message);
    const cur = lu.ast, v = lu.valeur, ecrit = ecrireLigne(cur), fini = N.FORMES.nombre(cur);
    const o = { ecrit, valeur: v.cle(), ast: cur, fin: fini };
    if (!premiere && prev) {
      const v0 = N.valeur(prev);
      o.attendu = ecr(v0);
      if (proche(v, v0, s.approx)) return verdict(e, fini ? "juste" : "incomplet", o);
      const d = apresCarre(prev, cur) || N.diagnostiquer(prev, cur);
      return verdict(e, "faux", Object.assign(o, { code: d.code || null, diag: d, attendu: N.prochaine(prev, N.formeAtteinte(cur) || "nombre"),
        precision: precisionNombre(d, e, v0, v) }));
    }
    const acc = valeursAcceptees(e, s);
    o.attendu = acc.valeurs.length ? ecr(acc.valeurs[0]) : "";
    if (acc.valeurs.some(x => proche(v, x, acc.tol))) return verdict(e, fini ? "juste" : "incomplet", o);
    // ordre : une solution déjà trouvée, puis les codes du second degré, puis ceux du moteur des nombres (signe, priorités, calcul),
    // puis les erreurs localisées hors catalogue ; sinon, le remplacement lui-même ne tient pas
    let d = null;
    if (e.id === "x2" && acc.deja && proche(v, acc.deja, s.approx)) d = { p5: true, code: null, detail: { p5: true, sorte: "deja" } };
    const ks = d ? [] : candidats(e, s).filter(x => proche(v, x.valeur, s.approx)), k = ks.find(x => x.code);
    if (k) d = { p5: true, code: k.code, detail: k.detail };
    const n = !d && prev ? apresCarre(prev, cur) || N.diagnostiquer(prev, cur) : null;
    if (n && n.code) d = n;
    if (!d && ks.length) d = { p5: true, code: null, detail: ks[0].detail };
    if (!d && n && n.detail && n.detail.sorte !== "inconnu" && n.detail.sorte !== "compte") d = n;
    if (!d) d = { p5: true, code: null, detail: { p5: true, sorte: e.id === "delta" ? "remplace" : "remplaceX" } };
    return verdict(e, "faux", Object.assign(o, { code: d.code || null, diag: d, precision: precisionNombre(d, e, acc.valeurs[0], v) }));
  }
  /* Sur une ligne d'avant qui contient un carré : son signe perdu (DELTA-SQ) ou « fois 2 » au lieu de « au carré » (CALC). */
  function apresCarre(prev, cur) {
    const P = N.plats(prev), v0 = N.valeur(prev), v = N.valeur(cur);
    for (const p of P) {
      if (p.n.t !== "pow" || p.n.n !== 2) continue;
      const base = N.valeur(p.n.a), carre = N.valeurTerme(p), sansLui = v0.moins(carre);
      if (base.signe() < 0 && v.egal(v0.moins(carre).moins(carre))) return { p5: true, code: "DELTA-SQ", detail: { p5: true, sorte: "carre-calcul", carre: N.ecrire(p.n) } };
      for (const f of [base.fois(2), base.fois(2).oppose()]) if (v.egal(sansLui.plus(f.fois(p.s)))) return { p5: true, code: "CALC", detail: { p5: true, sorte: "carre2", carre: N.ecrire(p.n), b: base.cle() } };
    }
    return null;
  }
  /* Le détail chiffré pour le parent (le rapport garde les valeurs justes, l'élève non). */
  function precisionNombre(d, e, bon, faux) {
    const x = d && d.detail;
    if (x && !x.p5 && x.calcul && x.bon != null && x.faux != null) return x.calcul + " = " + ecr(x.bon) + ", pas " + ecr(x.faux);
    return (e.prefixe || "") + (bon != null ? ecr(bon) : "?") + " attendu, pas " + ecr(faux);
  }

  /* ---------- après une étape finie : SES valeurs deviennent l'état, le chemin peut changer ---------- */
  function apres(s, e, v) {
    const o = Object.assign({}, s);
    if (e.id === "coefs") {
      [o.a, o.b, o.c] = v.valeurs;
      const d = deltaDe(o), r = d.racine();
      Object.assign(o, { delta: d.cle(), rac: d.signe() > 0 && r ? r.cle() : null, approx: d.signe() > 0 && !r, x1: null });
    } else if (e.id === "delta") {
      const d = F(v.valeur), r = d.racine();
      Object.assign(o, { delta: d.cle(), rac: d.signe() > 0 && r ? r.cle() : null, approx: d.signe() > 0 && !r });
    } else if (e.id === "nb") o.nb = v.valeur;
    else if (e.id === "rac") o.rac = v.valeur;
    else if (e.id === "x1") o.x1 = v.valeur;
    return o;
  }

  /* ---------- déroulé sans aide (examen, série seul, jumeau) : le même code sert à l'app et aux tests ----------
     Q : { exo, modeP5, p5, etapes, k, prev, journal, acceptees, fini }. */
  function entrer(Q) { const e = Q.etapes[Q.k]; if (!e) return; const d = departEtape(e, Q.p5); Q.prev = d == null ? null : E.arbre(d); }
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
    const v = juger(e, Q.p5, Q.prev, premiereLigne(Q, e), entree);
    if (v.statut === "illisible") return v;
    Q.journal.push({ etape: e.id, saisie: v.saisie, juste: v.statut !== "faux", statut: v.statut, code: v.code || null, precision: v.statut === "faux" ? v.precision || null : null });
    Q.acceptees.push({ etape: e.id, nom: e.nom, texte: v.ecrit, statut: v.statut, code: v.code || null, attendu: v.attendu || null, diag: v.statut === "faux" ? v.diag : null, typeLigne: e.type, inter: !v.fin });
    if (!v.fin) { Q.prev = v.ast; return v; }
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
  /* Points sans aide : 1 par étape de SON chemin, si toutes ses lignes sont justes (D54 : a, b, c = 1 point). */
  function score(journal, liste) {
    const ok = id => { const l = journal.filter(j => j.etape === id); return l.length > 0 && l.every(j => j.juste); };
    return { points: liste.filter(e => ok(e.id)).length, total: liste.length };
  }

  /* ---------- table des réponses fausses (D53 : clés « étape:valeur », une collision = deux codes à la même étape) ---------- */
  function reponsesFausses(exo) {
    const t = {}, s = etatInitial(exo);
    const aj = (code, cle) => { const l = t[code] || (t[code] = []); if (!l.includes(cle)) l.push(cle); };
    for (const e of etapes(exo, "complet", s)) {
      if (e.id === "coefs") {
        for (const k of LETTRES) if (F(s[k]).signe() < 0) aj("ABC-SIG", "coefs." + k + ":" + F(s[k]).oppose().cle());
        if (F(s.a).abs().egal(1)) aj("A-UN", "coefs.a:0");
      } else if (e.id === "nb") { for (const n of [0, 1, 2]) if (n !== exo.nb) aj("SOL-NB", "nb:" + n); }
      else if (e.id === "rac") { const d = F(s.delta), r = d.racine(); if (r && !d.fois(d).egal(r)) aj("RAC-SQ", "rac:" + d.fois(d).cle()); }
      else {
        const pris = new Set();
        for (const k of candidats(e, s)) if (k.code) { aj(k.code, e.id + ":" + k.valeur.cle()); pris.add(k.valeur.cle()); }
        if (e.id === "delta") {
          const bonne = deltaDe(s), b = F(s.b), ac4 = F(s.a).fois(F(s.c)).fois(4);
          // « au carré » fait « fois 2 » (CALC) : une autre erreur qui donnerait le même Δ rendrait le diagnostic ambigu
          for (const f of [b.fois(2), b.fois(2).oppose()]) { const v = f.moins(ac4); if (!v.egal(bonne) && !pris.has(v.cle())) { aj("CALC", "delta:" + v.cle()); pris.add(v.cle()); } }
          // les erreurs du moteur des nombres sur la formule remplacée (signe, priorités), sauf celles qu'un code du second degré nomme déjà
          for (const k of N.candidats(E.arbre(departEtape(e, s)))) if (!pris.has(k.valeur.cle()) && !k.valeur.egal(bonne)) aj(k.code, "delta:" + k.valeur.cle());
        }
      }
    }
    return t;
  }

  /* ---------- le corrigé : la démarche modèle, ligne par ligne ---------- */
  function corrige(exo) {
    const s = etatInitial(exo), out = [], partie = id => !exo.partie || exo.partie.includes(id);
    const ligne = (id, nom, l, pourquoi) => out.push({ id, nom, ligne: l, pourquoi });
    if (partie("coefs")) ligne("coefs", "a, b, c", attenduTexte(etape("coefs"), s), ETAPES.coefs.pourquoi);
    if (partie("delta")) {
      const dep = departEtape(etape("delta"), s);
      ligne("delta", "Δ", "Δ = " + dep, F(s.b).signe() < 0 ? "On remplace dans b² − 4ac. b est négatif : parenthèses." : "On remplace dans b² − 4ac.");
      for (const l of N.chaine(E.arbre(dep))) ligne("delta", "Δ", "Δ = " + ecrireLigneTexte(l.ligne), l.id === "nombre" ? "On termine le calcul." : "Les carrés et les produits d'abord.");
    }
    const n = exo.nb, d = ecr(s.delta);
    if (partie("nb")) ligne("nb", "Nombre de solutions", n === 2 ? "Δ = " + d + " > 0 : deux solutions" : n === 1 ? "Δ = 0 : une seule solution" : "Δ = " + d + " < 0 : pas de solution",
      n === 2 ? "Δ positif : deux solutions." : n === 1 ? "Δ nul : une seule solution." : "Δ négatif : √Δ n'existe pas.");
    if (partie("rac") && n === 2) ligne("rac", "√Δ", "√Δ = " + ecr(s.rac), ecr(s.rac) + " × " + ecr(s.rac) + " = " + d + ".");
    const xs = n === 2 ? [["x1", "x₁"], ["x2", "x₂"]] : n === 1 ? [["x0", "x"]] : [];
    for (const [id, nom] of xs) if (partie(id)) {
      const dep = departEtape(etape(id), s), mb = F(s.b).oppose();
      ligne(id, nom, nom + " = " + ecrireLigneTexte(dep), F(s.b).signe() < 0 ? "−b = −(" + ecr(s.b) + ") = " + ecr(mb) + "." : "−b, c'est l'opposé de b : " + ecr(mb) + ".");
      for (const l of N.chaine(E.arbre(dep))) ligne(id, nom, nom + " = " + ecrireLigneTexte(l.ligne), l.id === "nombre" ? "On termine le calcul." : "Le haut d'abord, puis la division.");
    }
    if (!exo.partie || exo.partie.includes("nb")) ligne("fin", "Conclusion", reponseTexte(exo), n === 0 ? "Aucun nombre ne vérifie l'équation." : "On peut vérifier en remplaçant x dans l'équation.");
    // la dernière ligne de calcul est déjà la réponse (« x = 5 ») : pas de conclusion en double
    if (out.length >= 2 && out[out.length - 1].ligne === out[out.length - 2].ligne) out.pop();
    return out;
  }
  const ecrireLigneTexte = t => ecrireLigne(E.arbre(t));
  function reponseTexte(exo) {
    if (exo.partie && !exo.partie.includes("nb")) {
      if (exo.partie.includes("delta")) return "Δ = " + ecr(exo.delta);
      return attenduTexte(etape("coefs"), etatInitial(exo));
    }
    const s = exo.solutions.map(F);
    return exo.nb === 2 ? "x₁ = " + ecr(s[0]) + " et x₂ = " + ecr(s[1]) : exo.nb === 1 ? "x = " + ecr(s[0]) : "Pas de solution";
  }

  /* ---------- un exercice complet, à partir de a, b, c (bornes D51, collisions D53) ---------- */
  function construire(a, b, c, opts) {
    opts = opts || {};
    a = F(a); b = F(b); c = F(c);
    if (a.estNul() || b.estNul() || c.estNul()) return null;
    if (a.abs().cmp(5) > 0 || b.abs().cmp(20) > 0 || c.abs().cmp(100) > 0 || a.fois(c).fois(4).abs().cmp(400) > 0) return null;
    const k = calculer(a, b, c);
    if (k.nb === 2 && (!k.rac || k.rac.cmp(20) > 0)) return null;               // Δ carré parfait, √Δ ≤ 20
    if (!k.sols.every(x => x.estEntier())) return null;                         // solutions entières
    const enonce = E.ecrireEquation({ g: [mono(a, 2), mono(b, 1), mono(c, 0)], d: [mono(0, 0)] });
    const exo = { type: "second", consigne: opts.consigne || "Résous l'équation.", enonce, formules: true, partie: opts.partie || null,
      coefs: { a: a.cle(), b: b.cle(), c: c.cle() }, delta: k.delta.cle(), nb: k.nb, rac: k.rac ? k.rac.cle() : null, solutions: k.sols.map(x => x.cle()) };
    exo.etapes = etapes(exo, "guide", etatInitial(exo));
    exo.reponseTexte = reponseTexte(exo);
    exo.reponse = exo.partie && !exo.partie.includes("nb") ? exo.reponseTexte : exo.solutions.join(";") || "aucune";
    exo.erreurs = reponsesFausses(exo);
    if (MM.diag.collisions(exo.erreurs).length) return null;                     // diagnostic ambigu à une étape : on retire
    exo.corrige = corrige(exo);
    if (opts.diag) {
      if (k.nb !== 2) return null;
      const v = opts.diag === "max" ? (k.sols[0].cmp(k.sols[1]) > 0 ? k.sols[0] : k.sols[1]) : (k.sols[0].cmp(k.sols[1]) < 0 ? k.sols[0] : k.sols[1]);
      exo.diag = { reponse: v.cle(), texte: ecr(v) };
    }
    return exo;
  }

  /* ---------- l'explication du prof : ce qui est juste, l'endroit exact, la règle ; jamais la valeur juste (D50) ---------- */
  const NOM_CASE = { a: "a", b: "b", c: "c" };
  function expliquer(d, variante) {
    const CAT = MM.diag.CATALOGUE, x = (d && d.detail) || {}, code = (d && d.code) || null, v2 = variante === 2;
    const fin = (titre, bon, ou, regle, suite) => ({ code, titre, bon, ou, regle, suite: suite || "", reflexe: code && CAT[code] ? CAT[code].reflexe : "", variante: v2 ? 2 : 1 });
    const nom = c => (CAT[c] && CAT[c].nom) || "Erreur";
    if (x.sorte === "coefs") {
      const faux = x.cases.filter(c => !c.ok), ordre = ["aun", "signe", "x", "echange", "autre"];
      const sorte = ordre.find(o => faux.some(c => c.sorte === o)), lesquels = faux.filter(c => c.sorte === sorte).map(c => NOM_CASE[c.lettre]);
      const L = lesquels.join(" et "), autres = faux.filter(c => c.sorte !== sorte).map(c => NOM_CASE[c.lettre]);
      const bon = faux.length === 1 ? "Les deux autres cases sont justes." : faux.length === 2 ? "Une case est juste." : "Tu as bien rempli les trois cases.";
      const suite = autres.length ? "Regarde aussi la case " + autres.join(" et ") + "." : "";
      if (sorte === "aun") return fin(nom("A-UN"), bon, faux.find(c => c.sorte === "aun").saisi.includes("x") ? "Mais a est un nombre, pas x²." : "Mais a ne vaut jamais 0 : il y a bien un x².",
        v2 ? "Teste : 0 × x² vaut toujours 0. Or ton x² est bien là." : "Un x² seul cache un nombre devant lui, comme un x seul.", suite);
      if (sorte === "signe") return fin(nom("ABC-SIG"), faux.length === lesquels.length ? "Tu as bien trouvé les nombres." : bon, "Mais le signe de " + L + " n'est pas le bon.",
        v2 ? "Réécris l'équation avec des + seulement : chaque moins entre dans son nombre." : "Le signe juste devant le nombre fait partie du nombre.", suite);
      if (sorte === "x") return fin("Un x en trop", bon, "Mais " + L + " est un nombre : écris-le sans le x.",
        v2 ? "Cache le x avec ton doigt : ce qui reste devant, c'est le nombre." : "a, b et c sont les nombres devant x², devant x, et le nombre seul.", suite);
      if (sorte === "echange") return fin("b et c inversés", "Tu as bien trouvé les nombres.", "Mais tu as inversé b et c.",
        v2 ? "Range l'équation : x², puis x, puis le nombre seul." : "b est le nombre devant x. c est le nombre seul.", suite);
      return fin("Coefficient mal lu", bon, "Mais la case " + L + " ne correspond pas à l'équation.",
        v2 ? "Entoure chaque terme de l'équation, puis lis son nombre." : "a devant x², b devant x, c le nombre seul. Avec leur signe.", suite);
    }
    if (x.sorte === "nb") return fin(nom("SOL-NB"), "Tu as Δ : c'est lui qui décide.", "Mais le nombre de solutions ne suit pas le signe de Δ.",
      v2 ? "Dans la formule, il y a √Δ : peut-on la calculer ? Vaut-elle 0 ?" : "Regarde si Δ est positif, nul ou négatif.");
    if (x.sorte === "rac") {
      const v = F(x.saisi), dd = F(x.delta), teste = ecr(v) + " × " + ecr(v) + " = " + ecr(F(x.carre)) + ", pas " + ecr(dd) + ".";
      const regle = v2 ? "Teste ton nombre : fois lui-même, il doit redonner Δ." : "La racine, c'est le chemin retour du carré : quel nombre, fois lui-même, donne Δ ?";
      if (x.cas === "carre") return fin(nom("RAC-SQ"), "Tu es sur la bonne étape.", "Mais tu as calculé Δ au carré, pas sa racine.", regle);
      if (x.cas === "moitie") return fin("Racine carrée", "Tu es sur la bonne étape.", "Mais la racine carrée n'est pas la moitié.", v2 ? "Teste : " + teste : regle);
      if (x.cas === "oubli") return fin("Racine carrée", "Tu es sur la bonne étape.", "Mais tu as recopié Δ : il faut sa racine.", regle);
      if (x.cas === "signe") return fin("Racine carrée", "Ton nombre est bon, sans le signe.", "Mais une racine carrée n'est jamais négative.", "√Δ est le nombre positif qui, fois lui-même, donne Δ.");
      if (x.cas === "essai") return fin(nom("CALC"), "Tu cherches le bon nombre.", "Mais " + teste, v2 ? regle : "Essaie un nombre plus " + (F(x.carre).cmp(dd) > 0 ? "petit." : "grand."));
      return fin("Racine carrée", "Tu es sur la bonne étape.", "Mais ce nombre, fois lui-même, ne redonne pas Δ.", regle);
    }
    const b = x.b != null ? F(x.b) : null;
    if (x.sorte === "carre") return fin(nom("DELTA-SQ"), "Tu as bien remplacé a, b et c.", "Mais b est négatif : son carré s'écrit avec des parenthèses.",
      v2 ? "Sans parenthèses, le carré ne touche que " + ecr(b.abs()) + ", pas le moins." : "(" + ecr(b) + ")² = (" + ecr(b) + ") × (" + ecr(b) + ") : moins par moins donne plus.");
    if (x.sorte === "carre-calcul") return fin(nom("DELTA-SQ"), "Tu as bien remplacé.", "Mais " + x.carre + " est un carré : il n'est jamais négatif.",
      v2 ? "Un nombre fois lui-même : deux signes pareils, donc un résultat positif." : "Moins par moins donne plus.");
    if (x.sorte === "abc-delta") return fin(nom("ABC-SIG"), "Ton b² est bien posé.", "Mais dans 4ac, un signe s'est perdu en remplaçant.",
      v2 ? "Écris d'abord 4 × a × c avec les nombres, signe compris." : "Recopie a et c avec leur signe, entre parenthèses s'ils sont négatifs.");
    if (x.sorte === "carre2") return fin(nom("CALC"), "Tu as bien remplacé.", "Mais le carré, c'est un nombre fois lui-même, pas fois 2.",
      v2 ? "Au carré : deux fois le même nombre, multipliés entre eux." : (x.carre || "(" + ecr(b) + ")²") + " = " + "(" + ecr(b) + ") × (" + ecr(b) + ").");
    if (x.sorte === "moinsb") return fin(nom("DELTA-SQ"), "Tu as bien posé la formule.", "Mais −b, c'est l'opposé de b : change son signe.",
      v2 ? "Écris −b comme −(" + ecr(b) + "), puis enlève les parenthèses." : "Ici b est " + ecr(b) + " : −b a le signe contraire.");
    if (x.sorte === "haut") return fin(nom("PRIO"), "Tu as les bons nombres.", "Mais la division porte sur tout le haut, pas seulement sur √Δ.",
      v2 ? "La barre de fraction est une parenthèse : on calcule le haut d'abord." : "Mets le haut entre parenthèses : (−b ± √Δ) ÷ 2a.");
    if (x.sorte === "sans2a") return fin("La division a disparu", "Le haut de la formule est juste.", "Mais tu as oublié de diviser par 2a.",
      v2 ? "Relis la formule jusqu'au bout : il reste ÷ 2a." : "La formule finit par ÷ 2a : n'oublie pas cette étape.");
    if (x.sorte === "sans2") return fin("Le bas de la formule", "Le haut de la formule est juste.", "Mais le bas de la formule, c'est 2a : 2 fois a.",
      v2 ? "Calcule d'abord 2 × a, puis divise par ce résultat." : "Divise par 2 × a, pas par a.");
    if (x.sorte === "deltaPasRacine") return fin("Δ à la place de √Δ", "Tu as bien posé la formule.", "Mais dans la formule, c'est √Δ, pas Δ.",
      v2 ? "Δ sert à trouver √Δ. C'est √Δ qui va dans x." : "Utilise ta valeur de √Δ.");
    if (x.sorte === "deja") return fin("Même solution", "Ton calcul tient.", "Mais tu as déjà trouvé cette solution.",
      v2 ? "x₁ et x₂ diffèrent par le signe devant √Δ." : "Pour l'autre solution, change le signe devant √Δ.");
    if (x.sorte === "remplace") return fin("Le remplacement ne tient pas", "Tu es sur la bonne étape.", "Mais ta ligne ne vaut pas b² − 4ac avec tes a, b et c.",
      v2 ? "Écris la formule, puis remplace une lettre à la fois." : "Remplace chaque lettre par son nombre, sans rien changer d'autre.");
    if (x.sorte === "remplaceX") return fin("Le remplacement ne tient pas", "Tu es sur la bonne étape.", "Mais ta ligne ne suit pas la formule de x.",
      v2 ? "Écris la formule, puis remplace une lettre à la fois." : "Remplace b, √Δ et a par leurs nombres, sans rien changer d'autre.");
    return N.expliquer(d, variante);
  }
  /* Le détail chiffré d'une erreur, pour le parent. */
  function precision(d) {
    const x = d && d.detail; if (!x) return null;
    if (x.sorte === "coefs") return x.cases.filter(c => !c.ok).map(c => c.lettre + " : " + c.saisi + " au lieu de " + ecr(c.bon)).join(" ; ");
    return null;
  }

  /* ---------- le piège d'une leçon, montré sur l'exemple et rejoué dans le moteur ---------- */
  function piege(exo, code, parade) {
    const s = etatInitial(exo), CAT = MM.diag.CATALOGUE;
    const coefs = vals => LETTRES.map((k, i) => k + " = " + ecr(vals[i])).join(" ; ");
    const vals = LETTRES.map(k => s[k]);
    const essai = (id, faux, bon, montreFaux, montreBon, prev) => {
      const e = etape(id), dep = prev || departEtape(e, s), p = dep == null ? null : E.arbre(dep), v = juger(e, s, p, !prev, faux);
      if (v.statut !== "faux" || v.code !== code) return null;
      return { code, nom: CAT[code].nom, type: "second", depart: prev ? e.prefixe + ecrireLigneTexte(prev) : exo.enonce, faux: montreFaux, bon: montreBon,
        explication: expliquer(v.diag, 1), parade, verifier: { etape: id, etat: s, prev: prev || null, faux, bon } };
    };
    if (code === "ABC-SIG") {
      const k = LETTRES.find(l => F(s[l]).signe() < 0); if (!k) return null;
      const f = vals.map((v, i) => LETTRES[i] === k ? F(v).oppose().cle() : v);
      return essai("coefs", f.map(ecr), vals.map(ecr), coefs(f), coefs(vals));
    }
    if (code === "A-UN") {
      if (!F(s.a).abs().egal(1)) return null;
      const f = ["0", s.b, s.c];
      return essai("coefs", f.map(ecr), vals.map(ecr), coefs(f), coefs(vals));
    }
    if (code === "DELTA-SQ") {
      if (F(s.b).signe() < 0) {
        const bon = departEtape(etape("delta"), s), faux = bon.replace("(" + ecr(s.b) + ")²", ecr(s.b) + "²");
        return essai("delta", faux, bon, "Δ = " + faux + " = " + ecr(N.lire(faux).valeur), "Δ = " + bon + " = " + ecr(s.delta));
      }
      if (exo.nb !== 2) return null;
      const bon = departEtape(etape("x1"), s), mb = ecr(F(s.b).oppose()), faux = bon.replace("(" + mb + " ", "(" + ecr(s.b) + " ");
      return essai("x1", faux, bon, "x₁ = " + faux + " = " + ecr(N.lire(faux).valeur), "x₁ = " + bon + " = " + ecr(exo.solutions[0]));
    }
    if (code === "RAC-SQ") {
      if (exo.nb !== 2) return null;
      const d = F(s.delta), f = ecr(d.fois(d));
      const r = essai("rac", f, ecr(s.rac), "√" + ecr(d) + " = " + f, "√" + ecr(d) + " = " + ecr(s.rac));
      return r && Object.assign(r, { depart: "Δ = " + ecr(d) });
    }
    if (code === "SOL-NB") {
      const f = exo.nb === 2 ? 0 : 2, mots = n => n === 2 ? "deux solutions" : n === 1 ? "une seule solution" : "pas de solution";
      const r = essai("nb", String(f), String(exo.nb), "Δ = " + ecr(s.delta) + " : " + mots(f), "Δ = " + ecr(s.delta) + " : " + mots(exo.nb));
      return r && Object.assign(r, { depart: "Δ = " + ecr(s.delta) });
    }
    if (code === "PRIO") {
      if (exo.nb !== 2 || !F(s.a).egal(1)) return null;
      const r = ecr(s.rac), mb = ecr(F(s.b).oppose()), faux = mb + " + " + r + " ÷ 2", bon = departEtape(etape("x1"), s);
      return essai("x1", faux, bon, "x₁ = " + faux + " = " + ecr(N.lire(faux).valeur), "x₁ = " + bon + " = " + ecr(exo.solutions[0]));
    }
    if (code === "SIG-REL") {
      // le signe d'un produit perdu en calculant Δ : « (−1)² − 4 × 1 × (−12) » → « 1 − 48 »
      if (F(s.a).fois(F(s.c)).signe() >= 0) return null;
      const prev = departEtape(etape("delta"), s), b2 = F(s.b).fois(F(s.b)), ac4 = F(s.a).fois(F(s.c)).fois(4).abs();
      const faux = ecr(b2) + " " + MOINS + " " + ecr(ac4), bon = ecr(b2) + " + " + ecr(ac4);
      return essai("delta", faux, bon, "Δ = " + faux, "Δ = " + bon, prev);
    }
    return null;
  }

  MM.second = { ETAPES, etape, calculer, etatInitial, etapes, attenduValeur, attenduTexte, departEtape, candidats, valeursAcceptees, juger, apres,
    entrer, terminer, pas, nouveau, jouer, score, premiereLigne, reponsesFausses, corrige, construire, expliquer, precision, piege, ecr, ecrireLigne };
  if (typeof module !== "undefined" && module.exports) module.exports = MM;
})(typeof globalThis !== "undefined" ? globalThis : this);
