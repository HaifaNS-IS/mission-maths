/* Erreurs hors catalogue (table, addition, recopie, terme oublié) : le prof dit ce qui est juste, puis l'endroit exact (CDC section 4).
   Retour de recette du 15/11 : « 3(x − 5) → 3X-12 » n'était pas reconnu. */
const { MM, test, egal, vrai } = require("./_harnais.js");
const E = MM.expr, T = MM.etapes, D = MM.diag, Gn = MM.gen, F = MM.F, mono = E.mono;
const mots = p => (p.match(/[A-Za-zÀ-ÿ]{2,}/g) || []).length;
const phrasesCourtes = x => [x.bon, x.ou, x.regle].every(t => t && t.split(/(?<=[.!?])\s+/).every(p => mots(p) < 15) && !/undefined|NaN|null|\[object/.test(t));
const expr = (dep, saisie) => T.jugerExpression(E.lireExpression(dep).termes, saisie, "developpe");
const lig = (prev, saisie, forme) => T.jugerLigne(E.lireEquation(prev), saisie, forme || null);
const X1 = "7(x − 4) − 8(x − 7) = 69 − 5(x + 8)";

test("recette du 15/11 : 3(x − 5) → 3X-12 : erreur de table repérée ; l'élève a le calcul à refaire, le parent le détail chiffré", () => {
  const v = expr("3(x − 5)", "3X-12"), x = D.expliquer(v.diag);
  egal(v.statut, "faux"); egal(v.code, "CALC"); vrai(v.diag.localise);
  egal(x.titre, "Erreur de calcul"); egal(x.reflexe, "Un calcul à la fois, au brouillon."); egal(x.bon, "Ton 3x est bon."); egal(x.ou, "Mais 3 × (−5) ne fait pas −12 : refais le calcul."); egal(x.regle, "Le signe d'abord, puis la table de 3.");
  egal(x.resume, "3 × (−5) = −15, pas −12"); vrai(phrasesCourtes(x));
});
/* Recette du 24/11 : l'explication donne le calcul à refaire, jamais sa valeur juste ; le parent garde le détail chiffré (resume). */
test("ex. 1 du contrôle : une erreur de calcul à chaque étape est repérée là où elle naît, sans donner la bonne valeur", () => {
  const cas = [
    [X1, "7x − 28 − 8x + 54 = 69 − 5x − 40", "developpe", "Mais −8 × (−7) ne fait pas 54 : refais le calcul.", "−8 × (−7) = 56, pas 54"],
    [X1, "7x − 28 − 8x + 56 = 69 − 5x − 45", "developpe", "Mais −5 × 8 ne fait pas −45 : refais le calcul.", "−5 × 8 = −40, pas −45"],
    ["7x − 28 − 8x + 56 = 69 − 5x − 40", "−x + 26 = 29 − 5x", "reduit", "Mais −28 + 56 ne fait pas 26 : refais le calcul.", "−28 + 56 = 28, pas 26"],
    ["7x − 28 − 8x + 56 = 69 − 5x − 40", "−x + 28 = 19 − 5x", "reduit", "Mais 69 − 40 ne fait pas 19 : refais le calcul.", "69 − 40 = 29, pas 19"],
    ["−x + 28 = 29 − 5x", "4x = 2", "regroupe", "Mais 29 − 28 ne fait pas 2 : refais le calcul.", "29 − 28 = 1, pas 2"],
    ["−x + 28 = 29 − 5x", "5x = 1", "regroupe", "Mais −x + 5x ne fait pas 5x : refais le calcul.", "−x + 5x = 4x, pas 5x"],
    ["4x = 1", "x = 1/3", "solution", "Mais 1 ÷ 4 ne fait pas 1/3."],          // lot 2 (D37) : la solution n'est pas donnée dans l'explication
    ["4x = 1", "x = 0,4", "solution", "Mais 1 ÷ 4 ne fait pas 2/5."]
  ];
  for (const [p, s, f, ou, resume] of cas) { const v = lig(p, s, f), x = D.expliquer(v.diag); egal(v.statut, "faux", s); egal(v.code, "CALC", s); egal(x.ou, ou, s); vrai(phrasesCourtes(x), s); if (resume) egal(x.resume, resume, s); }
});
test("recopie, terme oublié, terme en trop, x égaré : chacun nommé, sans code (pas des erreurs de calcul)", () => {
  for (const v of [lig(X1, "7x − 28 − 8x + 56 = 68 − 5x − 40", "developpe"), expr("3(x − 5)", "3x"), expr("3(x − 5)", "3x + 1 − 15"), expr("3(x − 5)", "3x − 15x")]) egal(v.code, null, v.ecrit);
  let x = D.expliquer(lig(X1, "7x − 28 − 8x + 56 = 68 − 5x − 40", "developpe").diag); egal(x.titre, "Erreur de recopie"); egal(x.ou, "Mais 68 ne vient pas de la ligne d'avant : relis-la."); egal(x.resume, "69 attendu, pas 68");
  x = D.expliquer(expr("3(x − 5)", "3x").diag); egal(x.titre, "Un terme a disparu"); egal(x.ou, "Mais il manque le terme qui vient de 3 × (−5)."); egal(x.resume, "terme oublié : −15");
  x = D.expliquer(expr("3(x − 5)", "3x + 1 − 15").diag); egal(x.titre, "Un terme en trop"); egal(x.ou, "Mais le terme +1 n'a rien à faire là.");
  x = D.expliquer(expr("3(x − 5)", "3x − 15x").diag); egal(x.titre, "Un x s'est égaré"); egal(x.regle, "Un nombre seul n'a pas de x.");
});
test("plusieurs termes faux (recette du 23/11) : chacun est nommé avec le calcul à refaire, sans en donner le résultat", () => {
  let v = lig(X1, "7x − 30 − 8x + 50 = 69 − 5x − 40", "developpe"), x = D.expliquer(v.diag);
  egal(v.code, "CALC"); egal(x.titre, "Plusieurs erreurs de calcul"); egal(x.bon, "Le reste de ta ligne est juste.");
  egal(x.ou, "Pour −30, refais 7 × (−4) : la valeur est fausse. Pour +50, refais −8 × (−7) : la valeur est fausse.".replace("+50", "50"));
  vrai(!/28|56/.test(x.ou + x.regle), "le résultat est donné"); egal(x.resume, "7 × (−4) = −28, pas −30 ; −8 × (−7) = 56, pas 50");
  x = D.expliquer(expr("−7(x − 5)", "7x − 58").diag);                       // le cas de la recette
  egal(x.ou, "Pour 7x, refais −7 × x : regarde le signe. Pour −58, refais −7 × (−5) : signe et valeur.");
  egal(D.expliquer(expr("−7(x − 5)", "7x − 58").diag, 2).regle, "Teste avec x = 1 : la ligne d'avant vaut 28, la tienne −51.");
  x = D.expliquer(expr("3(x − 5)", "9x + 2").diag); egal(x.ou, "Pour 9x, refais 3 × x : la valeur est fausse. Pour 2, refais 3 × (−5) : signe et valeur.");
  x = D.expliquer(expr("−7(x − 5)", "3x² + 1").diag); egal(x.titre, "Plusieurs termes à revoir"); vrai(/Pour 3x², regarde le x : il en faut un\./.test(x.ou), x.ou);
  x = D.expliquer(expr("−7(x − 5)", "7x").diag); vrai(/Il manque le terme qui vient de −7 × \(−5\)\./.test(x.ou), x.ou);
  v = lig(X1, "x = 100", null); x = D.expliquer(v.diag); egal(x.titre, "Quelque chose ne va pas"); vrai(!v.diag.localise, "saut direct à une solution : rien de fiable à pointer");
  vrai(/même solution/.test(x.ou)); vrai(!/ligne attendue/.test(x.regle), "renvoie à une ligne que l'échelle ne montre pas");
});
test("le moins devant la parenthèse oublié sur tous ses termes : SIG-PAR (−7(x − 5) → 7x − 35)", () => {
  const v = expr("−7(x − 5)", "7x − 35"), x = D.expliquer(v.diag);
  egal(v.code, "SIG-PAR"); egal(x.ou, "Mais le moins devant le 7 a disparu, sur chaque terme."); vrai(!/35/.test(x.ou + x.regle));
  egal(lig(X1, "7x − 28 + 8x − 56 = 69 − 5x − 40", "developpe").code, "SIG-PAR");
});
/* L'élève imaginatif : deux termes au hasard faux à la fois, sur tous les générateurs. Jamais « je ne trouve pas ». */
test("élève imaginatif : 2 termes faux au hasard → toujours localisés (300 lignes), phrases courtes, résultat jamais donné", () => {
  const rnd = MM.outils.alea(23), bilan = { ok: 0, ko: [] };
  for (let g = 1; g <= 60; g++) for (const [id, n] of [["dev1", 2], ["dev1", 3], ["devred", 2], ["eq1par", 2], ["eq1par", 3]]) {
    const exo = Gn.creer(id, n, g), dep = Gn.depart(exo), estE = exo.type === "expression";
    const bon = estE ? T.devCote(dep) : T.developper(dep), plat = estE ? [bon] : [bon.g, bon.d];
    const toutes = plat.flatMap((ts, c) => ts.map((t, i) => ({ c, i })));
    if (toutes.length < 2) continue;
    const a = rnd.entier(0, toutes.length - 1); let b = rnd.entier(0, toutes.length - 2); if (b >= a) b++;
    const faux = plat.map(ts => ts.slice());
    for (const p of [a, b].map(k => toutes[k])) { const t = faux[p.c][p.i]; faux[p.c][p.i] = E.mono(rnd.suivant() < 0.5 ? t.c.oppose() : t.c.plus(F(rnd.choix([-3, -2, 2, 3]))), t.d); }
    const ligneF = estE ? E.ecrireCote(faux[0]) : E.ecrireEquation({ g: faux[0], d: faux[1] });
    const v = estE ? T.jugerExpression(dep, ligneF, "developpe") : T.jugerLigne(dep, ligneF, "developpe");
    if (v.statut !== "faux" || (v.code && v.code !== "CALC")) continue;          // coïncidence avec une erreur du catalogue : écartée
    const x = D.expliquer(v.diag), ctx = exo.enonce + " → " + ligneF + " : " + x.ou;
    if (!v.diag.localise || /ne trouve pas/.test(x.bon)) bilan.ko.push("non localisé : " + ctx);
    else if (!phrasesCourtes(x)) bilan.ko.push("trop long : " + ctx);
    else if ((x.ou + x.regle).replace(/\s/g, "").includes(E.ecrireTerme(plat[toutes[a].c][toutes[a].i]).replace(/\s/g, "") + "."))  bilan.ko.push("résultat donné : " + ctx);
    else bilan.ok++;
  }
  egal(bilan.ko.slice(0, 3).join(" || "), ""); vrai(bilan.ok >= 150, "trop peu de cas : " + JSON.stringify({ ok: bilan.ok }));
});
test("les codes du catalogue gardent la priorité quand l'erreur est vraiment la leur", () => {
  egal(expr("−5(x + 8)", "−5x + 40").code, "SIG-PAR"); egal(expr("7(x − 4)", "7x − 4").code, "DIST-PART"); egal(expr("7x − 28", "−21x").code, "RED-MIX");
  egal(lig("x + 5 = 9", "x = 14").code, "TRANS-SIG"); egal(lig("4x = 1", "x = 4").code, "DIV-INV"); egal(lig("−x + 28 = 29 − 5x", "x = −1/6").code, "TRANS-SIG");
  egal(lig("7x − 28 − 8x + 56 = 69 − 5x − 40", "27x = 29 − 5x").code, "RED-MIX");
  const v = lig("−x + 28 = 29 − 5x", "6x = 1", "regroupe");                 // le moins devant x oublié en regroupant : faute de signe
  egal(v.code, "SIG-REL"); egal(D.expliquer(v.diag).ou, "Mais −x + 5x ne fait pas 6x : regarde le signe.");
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
  // l'endroit exact est dans le détail du parent ; l'élève a le calcul à refaire, sans sa valeur juste (recette du 24/11)
  const m = /^devait être (.*), pas (.*)$/.exec(attendu) || /^(.*) = (.*), pas (.*)$/.exec(attendu);
  const recopie = /^devait être/.test(attendu), bon = recopie ? m[1] : m[2], faux = recopie ? m[2] : m[3];
  const resumeVoulu = recopie ? bon + " attendu, pas " + faux : attendu, ouVoulu = recopie ? "Mais " + faux + " ne vient pas" : "Mais " + m[1] + " ne fait pas " + faux;
  if (x.resume !== resumeVoulu) return "détail parent faux : " + x.resume + " / attendu « " + resumeVoulu + " »";
  if (x.ou.indexOf(ouVoulu) < 0) return "mauvais endroit : " + E.ecrireEquation(ligneFausse) + " / " + x.ou + " / attendu « " + ouVoulu + " »";
  if (new RegExp("= " + bon.replace(/[()+]/g, "\\$&") + "(?![0-9x/])").test((x.ou + " " + x.regle).replace(/Vérifie en remultipliant[^.]*\./, ""))) return "valeur juste donnée : " + x.ou + " " + x.regle;   // la remultiplication porte sur SA valeur
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
test("élève simulé, erreur de division à la dernière étape (x = 0 compris) : division citée, solution jamais donnée (D37), exacte pour le parent", () => {
  const rnd = MM.outils.alea(13), bilan = { ok: 0, ignoré: 0, ko: [], zero: 0 };
  for (let g = 1; g <= 300; g++) for (const n of [1, 2, 3]) {
    const eq0 = Gn.depart(Gn.creer("eq1par", n, g)), rr = T.reduire(T.regrouper(T.reduire(T.developper(eq0))));
    const a = rr.g[0].c, b = rr.d[0].c;
    if (a.egal(1)) continue;                                              // x déjà seul : pas de division
    const x = T.resoudre(rr).x, faux = g % 10 === 0 ? MM.Fraction.ZERO : decale(x, rnd);
    const ab = b.texte() + " ÷ " + (a.signe() < 0 ? "(" + a.texte() + ")" : a.texte());
    const r = verifierCas(rr, T.eqSolution(faux), "solution", ab + " = " + x.texte() + ", pas " + faux.texte());   // vérifie aussi : solution jamais donnée, exacte pour le parent
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
    egal(v.code, "CALC", exo.enonce); egal(x.titre, "Erreur de calcul", exo.enonce); vrai(x.resume.endsWith("= " + E.ecrireTerme(bon[1]) + ", pas " + E.ecrireTerme(faux)), exo.enonce + " / " + x.resume);
    vrai(/ ne fait pas /.test(x.ou) && !x.ou.includes("= " + E.ecrireTerme(bon[1])), "valeur juste donnée : " + x.ou); ok++;
  }
  vrai(ok >= 500, "trop peu de cas : " + ok);
});
test("CALC compte dans le top des erreurs du rapport parent, comme les autres codes", () => {
  const sea = [{ id: "s1", debut: 1000, fin: 2000, dureeActive: 60000, parent: false }];
  const ten = [{ id: "t1", sid: "s1", t: 1500, juste: false, lignes: [{ juste: false, code: "CALC", precision: "Erreur de calcul : 3 × (−5) = −15, pas −12" }, { juste: false, code: "CALC" }, { juste: false, code: "SIG-PAR" }] }];
  egal(JSON.stringify(MM.rapport.resume(sea, ten, 5000).erreurs7j), JSON.stringify([{ code: "CALC", n: 2 }, { code: "SIG-PAR", n: 1 }]));
});
