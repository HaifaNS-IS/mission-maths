/* Erreurs hors catalogue (table, addition, recopie, terme oublié) : le prof dit ce qui est juste, puis l'endroit exact (CDC section 4).
   Retour de recette du 15/11 : « 3(x − 5) → 3X-12 » n'était pas reconnu. */
const { MM, test, egal, vrai } = require("./_harnais.js");
const E = MM.expr, T = MM.etapes, D = MM.diag, Gn = MM.gen, F = MM.F, mono = E.mono;
const mots = p => (p.match(/[A-Za-zÀ-ÿ]{2,}/g) || []).length;
const phrasesCourtes = x => [x.bon, x.ou, x.regle].every(t => t && t.split(/(?<=[.!?])\s+/).every(p => mots(p) < 15) && !/undefined|NaN|null|\[object/.test(t));
const expr = (dep, saisie) => T.jugerExpression(E.lireExpression(dep).termes, saisie, "developpe");
const lig = (prev, saisie, forme) => T.jugerLigne(E.lireEquation(prev), saisie, forme || null);
const X1 = "7(x − 4) − 8(x − 7) = 69 − 5(x + 8)";

test("recette du 15/11 : 3(x − 5) → 3X-12 : erreur de table repérée, avec les bons nombres", () => {
  const v = expr("3(x − 5)", "3X-12"), x = D.expliquer(v.diag);
  egal(v.statut, "faux"); egal(v.code, "CALC"); vrai(v.diag.localise);
  egal(x.titre, "Erreur de calcul"); egal(x.reflexe, "Un calcul à la fois, au brouillon."); egal(x.bon, "Ton 3x est bon."); egal(x.ou, "Mais 3 × (−5) = −15, pas −12."); egal(x.regle, "Vérifie ta table : 3 × 5 = 15.");
  egal(x.resume, "3 × (−5) = −15, pas −12"); vrai(phrasesCourtes(x));
});
test("ex. 1 du contrôle : une erreur de calcul à chaque étape est repérée là où elle naît", () => {
  const cas = [
    [X1, "7x − 28 − 8x + 54 = 69 − 5x − 40", "developpe", "Mais −8 × (−7) = 56, pas 54."],
    [X1, "7x − 28 − 8x + 56 = 69 − 5x − 45", "developpe", "Mais −5 × 8 = −40, pas −45."],
    ["7x − 28 − 8x + 56 = 69 − 5x − 40", "−x + 26 = 29 − 5x", "reduit", "Mais −28 + 56 = 28, pas 26."],
    ["7x − 28 − 8x + 56 = 69 − 5x − 40", "−x + 28 = 19 − 5x", "reduit", "Mais 69 − 40 = 29, pas 19."],
    ["−x + 28 = 29 − 5x", "4x = 2", "regroupe", "Mais 29 − 28 = 1, pas 2."],
    ["−x + 28 = 29 − 5x", "5x = 1", "regroupe", "Mais −x + 5x = 4x, pas 5x."],
    ["4x = 1", "x = 1/3", "solution", "Mais 1 ÷ 4 = 1/4, pas 1/3."],
    ["4x = 1", "x = 0,4", "solution", "Mais 1 ÷ 4 = 1/4, pas 2/5."]
  ];
  for (const [p, s, f, ou] of cas) { const v = lig(p, s, f), x = D.expliquer(v.diag); egal(v.statut, "faux", s); egal(v.code, "CALC", s); egal(x.ou, ou, s); vrai(phrasesCourtes(x), s); }
});
test("recopie, terme oublié, terme en trop, x égaré : chacun nommé, sans code (pas des erreurs de calcul)", () => {
  for (const v of [lig(X1, "7x − 28 − 8x + 56 = 68 − 5x − 40", "developpe"), expr("3(x − 5)", "3x"), expr("3(x − 5)", "3x + 1 − 15"), expr("3(x − 5)", "3x − 15x")]) egal(v.code, null, v.ecrit);
  let x = D.expliquer(lig(X1, "7x − 28 − 8x + 56 = 68 − 5x − 40", "developpe").diag); egal(x.titre, "Erreur de recopie"); egal(x.ou, "Mais ce terme devait être 69, pas 68.");
  x = D.expliquer(expr("3(x − 5)", "3x").diag); egal(x.titre, "Un terme a disparu"); egal(x.ou, "Mais il manque le terme −15.");
  x = D.expliquer(expr("3(x − 5)", "3x + 1 − 15").diag); egal(x.titre, "Un terme en trop"); egal(x.ou, "Mais le terme +1 n'a rien à faire là.");
  x = D.expliquer(expr("3(x − 5)", "3x − 15x").diag); egal(x.titre, "Un x s'est égaré"); egal(x.regle, "Un nombre seul n'a pas de x.");
});
test("plusieurs erreurs sur un seul côté : le côté juste est nommé ; sinon message honnête, sans fausse précision", () => {
  let v = lig(X1, "7x − 30 − 8x + 50 = 69 − 5x − 40", "developpe"); egal(D.expliquer(v.diag).bon, "Ton côté droit est juste.");
  v = lig(X1, "x = 100", null); const x = D.expliquer(v.diag); egal(x.titre, "Quelque chose ne va pas"); vrai(!v.diag.localise);
  vrai(/même solution/.test(x.ou)); egal(D.expliquer(expr("3(x − 5)", "9x + 2").diag).ou, "Ta ligne n'est plus égale à l'expression de départ.");
});
test("les codes du catalogue gardent la priorité quand l'erreur est vraiment la leur", () => {
  egal(expr("−5(x + 8)", "−5x + 40").code, "SIG-PAR"); egal(expr("7(x − 4)", "7x − 4").code, "DIST-PART"); egal(expr("7x − 28", "−21x").code, "RED-MIX");
  egal(lig("x + 5 = 9", "x = 14").code, "TRANS-SIG"); egal(lig("4x = 1", "x = 4").code, "DIV-INV"); egal(lig("−x + 28 = 29 − 5x", "x = −1/6").code, "TRANS-SIG");
  egal(lig("7x − 28 − 8x + 56 = 69 − 5x − 40", "27x = 29 − 5x").code, "RED-MIX");
  const v = lig("−x + 28 = 29 − 5x", "6x = 1", "regroupe");                 // le moins devant x oublié en regroupant : faute de signe
  egal(v.code, "SIG-REL"); egal(D.expliquer(v.diag).ou, "Mais −x + 5x = 4x, pas 6x.");
});
test("pas de faux « mélange » : 3x − 15x n'est pas une fusion ; 69 recopié 68 n'est pas un mélange par coïncidence", () => {
  egal(expr("3(x − 5)", "3x − 15x").code, null);
  egal(lig(X1, "7x − 28 − 8x + 56 = 68 − 5x − 40", "developpe").code, null);
  egal(lig(X1, "7x − 28 − 8x + 56 = 69 − 5x − 40", "developpe").statut, "juste");
});

/* Élève simulé qui se trompe dans un calcul (écart de 1 à 3), une seule fois. */
const decale = (c, rnd) => c.plus(F(rnd.choix([-3, -2, -1, 1, 2, 3])));
function verifierCas(prev, ligneFausse, forme, attendu) {
  const v = T.jugerLigne(prev, E.ecrireEquation(ligneFausse), forme);
  if (v.statut !== "faux" || (v.code && v.code !== "CALC")) return "ignoré";   // coïncidence avec une erreur du catalogue ou ligne restée juste : écartée
  const x = D.expliquer(v.diag);
  const codeVoulu = /devait être/.test(attendu) ? null : "CALC";
  if (v.code !== codeVoulu) return "mauvais code (" + v.code + " au lieu de " + codeVoulu + ") : " + x.ou;
  if (!v.diag.localise) return "non localisé : " + E.ecrireEquation(prev) + " → " + E.ecrireEquation(ligneFausse);
  if (x.ou.indexOf(attendu) < 0) return "mauvais endroit : " + E.ecrireEquation(ligneFausse) + " / " + x.ou + " / attendu « " + attendu + " »";
  if (!phrasesCourtes(x)) return "explication trop longue : " + x.ou;
  return "ok";
}
test("élève simulé, erreur de table en développant : toujours repérée, produit exact cité", () => {
  const rnd = MM.outils.alea(7), bilan = { ok: 0, ignoré: 0, ko: [] };
  for (let g = 1; g <= 200; g++) for (const n of [1, 2, 3]) {
    const eq0 = Gn.depart(Gn.creer("eq1par", n, g));
    const places = []; for (const c of ["g", "d"]) eq0[c].forEach((t, i) => { if (t.inner) places.push({ c, i }); });
    const p = rnd.choix(places), t = eq0[p.c][p.i], u = t.inner.find(v => v.d === 0);
    const bon = mono(t.c.fois(u.c), 0), faux = mono(decale(bon.c, rnd), 0);
    if (faux.c.estNul()) continue;
    const l = T.developper(eq0);
    l[p.c] = eq0[p.c].flatMap((v, k) => k === p.i ? T.devTerme(v).map(w => w.d === 0 ? faux : w) : T.devTerme(v));
    const r = verifierCas(eq0, l, "developpe", E.ecrireTerme(mono(t.c, t.d)) + " × " + (u.c.signe() < 0 ? "(" + E.ecrireTerme(u) + ")" : E.ecrireTerme(u)) + " = " + E.ecrireTerme(bon) + ", pas " + E.ecrireTerme(faux));
    if (r === "ok") bilan.ok++; else if (r === "ignoré") bilan.ignoré++; else bilan.ko.push(r);
  }
  egal(bilan.ko.slice(0, 3).join(" || "), ""); vrai(bilan.ok >= 400, "trop peu de cas : " + JSON.stringify(bilan));
});
test("élève simulé, erreur d'addition en réduisant ou en regroupant : somme exacte citée, ou recopie s'il n'y avait rien à additionner", () => {
  const rnd = MM.outils.alea(11), bilan = { ok: 0, ignoré: 0, ko: [], sommes: 0 };
  for (let g = 1; g <= 200; g++) for (const n of [1, 2, 3]) {
    const eq0 = Gn.depart(Gn.creer("eq1par", n, g)), dev = T.developper(eq0), red = T.reduire(dev), reg = T.regrouper(red);
    for (const [prev, sources, juste, forme] of [[dev, dev, red, "reduit"], [red, reg, T.reduire(reg), "regroupe"]]) {
      const cote = rnd.choix(["g", "d"].filter(c => juste[c].some(t => t.d === 0)));
      if (!cote) continue;
      const i = juste[cote].findIndex(t => t.d === 0), vrai0 = juste[cote][i], faux = mono(decale(vrai0.c, rnd), 0);
      if (faux.c.estNul()) continue;
      const l = { g: juste.g.slice(), d: juste.d.slice() }; l[cote] = l[cote].slice(); l[cote][i] = faux;
      const src = sources[cote].filter(t => t.d === 0 && !t.c.estNul());
      const attendu = src.length >= 2 ? E.ecrireCote(src) + " = " + E.ecrireTerme(vrai0) + ", pas " + E.ecrireTerme(faux) : "devait être " + E.ecrireTerme(vrai0) + ", pas " + E.ecrireTerme(faux);
      const r = verifierCas(prev, l, forme, attendu);
      if (r === "ok") { bilan.ok++; if (src.length >= 2) bilan.sommes++; } else if (r === "ignoré") bilan.ignoré++; else bilan.ko.push(r);
    }
  }
  egal(bilan.ko.slice(0, 3).join(" || "), ""); vrai(bilan.ok >= 700 && bilan.sommes >= 300, "trop peu de cas : " + JSON.stringify(bilan));
});
test("élève simulé, erreur de division à la dernière étape (x = 0 compris) : division exacte citée", () => {
  const rnd = MM.outils.alea(13), bilan = { ok: 0, ignoré: 0, ko: [], zero: 0 };
  for (let g = 1; g <= 300; g++) for (const n of [1, 2, 3]) {
    const eq0 = Gn.depart(Gn.creer("eq1par", n, g)), rr = T.reduire(T.regrouper(T.reduire(T.developper(eq0))));
    const a = rr.g[0].c, b = rr.d[0].c;
    if (a.egal(1)) continue;                                              // x déjà seul : pas de division
    const x = T.resoudre(rr).x, faux = g % 10 === 0 ? MM.Fraction.ZERO : decale(x, rnd);
    const r = verifierCas(rr, T.eqSolution(faux), "solution", b.texte() + " ÷ " + (a.signe() < 0 ? "(" + a.texte() + ")" : a.texte()) + " = " + x.texte() + ", pas " + faux.texte());
    if (r === "ok") { bilan.ok++; if (faux.estNul()) bilan.zero++; } else if (r === "ignoré") bilan.ignoré++; else bilan.ko.push(r);
  }
  egal(bilan.ko.slice(0, 3).join(" || "), ""); vrai(bilan.ok >= 400 && bilan.zero >= 20, "trop peu de cas : " + JSON.stringify(bilan));
});
test("développer une expression (générateur dev1) : erreur de table sur le nombre, toujours repérée", () => {
  const rnd = MM.outils.alea(17); let ok = 0;
  for (let g = 1; g <= 300; g++) for (const n of [1, 2]) {
    const exo = Gn.creer("dev1", n, g), dep = Gn.depart(exo), bon = T.devCote(dep);
    const faux = mono(decale(bon[1].c, rnd), 0); if (faux.c.estNul()) continue;
    const v = T.jugerExpression(dep, E.ecrireCote([bon[0], faux]), "developpe");
    if (v.code && v.code !== "CALC") continue;
    const x = D.expliquer(v.diag);
    egal(v.code, "CALC", exo.enonce); egal(x.titre, "Erreur de calcul", exo.enonce); vrai(x.ou.endsWith("= " + E.ecrireTerme(bon[1]) + ", pas " + E.ecrireTerme(faux) + "."), exo.enonce + " / " + x.ou); ok++;
  }
  vrai(ok >= 500, "trop peu de cas : " + ok);
});
test("CALC compte dans le top des erreurs du rapport parent, comme les autres codes", () => {
  const sea = [{ id: "s1", debut: 1000, fin: 2000, dureeActive: 60000, parent: false }];
  const ten = [{ id: "t1", sid: "s1", t: 1500, juste: false, lignes: [{ juste: false, code: "CALC", precision: "Erreur de calcul : 3 × (−5) = −15, pas −12" }, { juste: false, code: "CALC" }, { juste: false, code: "SIG-PAR" }] }];
  egal(JSON.stringify(MM.rapport.resume(sea, ten, 5000).erreurs7j), JSON.stringify([{ code: "CALC", n: 2 }, { code: "SIG-PAR", n: 1 }]));
});
