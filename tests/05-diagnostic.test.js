/* QA 3 — Diagnostic : pour chaque code d'erreur, la réponse erronée injectée fait sortir le bon code et la bonne explication ; aucune collision. */
const { MM, test, egal, vrai } = require("./_harnais.js");
const E = MM.expr, T = MM.etapes, D = MM.diag, Gn = MM.gen;
const CODES_CDC = ["SIG-PAR", "SIG-REL", "DIST-PART", "RED-MIX", "TRANS-SIG", "DIV-INV", "ABC-SIG", "DELTA-SQ", "RAC-SQ", "M-MX", "B-SIG", "ORD-INV", "M-ZERO", "XY-INV", "AXE-INV", "PENTE-ORD", "AIRE-2"];
const ACTIFS = ["SIG-PAR", "SIG-REL", "DIST-PART", "RED-MIX", "TRANS-SIG", "DIV-INV"];
const mots = phrase => (phrase.match(/[A-Za-zÀ-ÿ]{2,}/g) || []).length;
const phrases = txt => txt.split(/(?<=[.!?])\s+/).filter(Boolean);
function explicationValable(x, code) {
  egal(x.code, code);
  for (const champ of ["bon", "ou", "regle"]) { vrai(x[champ] && x[champ].length > 8, "explication vide : " + champ); for (const p of phrases(x[champ])) vrai(mots(p) < 15, "phrase de 15 mots ou plus : " + p); }
  vrai(!/undefined|NaN|null|\[object/.test(x.bon + x.ou + x.regle + (x.suite || "")), "explication mal formée : " + x.ou + " " + x.regle);
  egal(x.reflexe, D.CATALOGUE[code].reflexe);
}

test("catalogue : les 17 codes du cahier des charges + CALC (validé le 15/11) + PRIO (validé le 23/11), chacun avec nom, exemple et réflexe", () => {
  const AJOUTS = ["CALC", "PRIO"];
  egal(Object.keys(D.CATALOGUE).sort().join(), CODES_CDC.concat(AJOUTS).sort().join());
  for (const c of CODES_CDC.concat(AJOUTS)) { const k = D.CATALOGUE[c]; vrai(k.nom && k.exemple && k.reflexe, c); vrai(mots(k.reflexe) < 15, c); vrai(k.actif || k.lot >= 3, c + " : ni actif ni planifié"); }
  egal(Object.keys(D.CATALOGUE).filter(c => D.CATALOGUE[c].actif).sort().join(), ACTIFS.concat(AJOUTS).sort().join());
});
test("le moteur reproduit les exemples du catalogue (SIG-PAR, DIST-PART, RED-MIX)", () => {
  const ex = (depart, saisie, forme) => T.jugerExpression(E.lireExpression(depart).termes, saisie, forme);
  let v = ex("−5(x + 8)", "−5x + 40", "developpe"); egal(v.code, "SIG-PAR"); explicationValable(D.expliquer(v.diag), "SIG-PAR");
  v = ex("7(x − 4)", "7x − 4", "developpe"); egal(v.code, "DIST-PART"); explicationValable(D.expliquer(v.diag), "DIST-PART");
  v = ex("7x − 28", "−21x", "reduit"); egal(v.code, "RED-MIX"); explicationValable(D.expliquer(v.diag), "RED-MIX");
});
test("le moteur reproduit les exemples du catalogue (TRANS-SIG, DIV-INV) et les deux formes de SIG-REL", () => {
  const li = (prev, saisie) => T.jugerLigne(E.lireEquation(prev), saisie, null);
  let v = li("x + 5 = 9", "x = 14"); egal(v.code, "TRANS-SIG"); explicationValable(D.expliquer(v.diag), "TRANS-SIG");
  v = li("4x = 1", "x = 4"); egal(v.code, "DIV-INV"); explicationValable(D.expliquer(v.diag), "DIV-INV");
  v = li("7x − 8x = 5", "x = 5"); egal(v.code, "SIG-REL"); explicationValable(D.expliquer(v.diag), "SIG-REL");
  v = li("−4x = 8", "x = 2"); egal(v.code, "SIG-REL"); explicationValable(D.expliquer(v.diag), "SIG-REL");
});
test("explication ciblée : les nombres cités sont ceux de l'erreur commise", () => {
  const v = T.jugerLigne(E.lireEquation("7(x − 4) − 8(x − 7) = 69 − 5(x + 8)"), "7x − 28 − 8x − 56 = 69 − 5x + 40", "developpe");
  const x = D.expliquer(v.diag);
  egal(x.ou, "Mais dans −8(x − 7), le moins touche aussi le terme −7.");
  egal(x.regle, "−8 × (−7) = +56, pas −56.");
  egal(x.suite, "Même piège dans −5(x + 8).");
});
test("erreur inconnue : explication générale, pas de code inventé", () => {
  const v = T.jugerLigne(E.lireEquation("7(x − 4) − 8(x − 7) = 69 − 5(x + 8)"), "x = 100", null);
  egal(v.statut, "faux"); egal(v.code, null); egal(D.expliquer(v.diag).code, null); egal(v.attendu, "7x − 28 − 8x + 56 = 69 − 5x − 40");
});
test("priorité : sur une parenthèse, une faute de signe est SIG-PAR ; sur une ligne déjà développée, c'est SIG-REL", () => {
  egal(T.jugerLigne(E.lireEquation("3 − 2(x − 5) = 1"), "3 − 2x − 10 = 1", null).code, "SIG-PAR");
  egal(T.jugerLigne(E.lireEquation("3 − 2x + 10 = 1"), "−2x − 7 = 1", null).code, "SIG-REL");
  egal(T.jugerLigne(E.lireEquation("−(x − 3) = 2"), "−x − 3 = 2", null).code, "SIG-PAR");
});

/* Élève simulé : il commet toujours la même erreur, une fois, puis calcule juste à partir de sa ligne. */
function eleveSimule(eq0, code) {
  const lignes = [], ec = E.ecrireEquation;
  let cur = eq0, faute = -1;
  const etapes = [
    { stade: 0, juste: e => T.developper(e) },
    { stade: 1, juste: e => T.reduire(e) },
    { stade: 2, juste: e => T.reduire(T.regrouper(e)) },
    { stade: 3, juste: e => { const s = T.resoudre(e); return s.type === "une" ? T.eqSolution(s.x) : null; } }
  ];
  for (const et of etapes) {
    let suivante = null;
    if (faute < 0) {
      const c = D.candidats(cur).filter(k => k.code === code && k.stade === et.stade).sort((a, b) => b.n - a.n)[0];
      if (c) { suivante = et.stade === 2 ? T.reduire(c.eq) : c.eq; faute = lignes.length; }
    }
    if (!suivante) suivante = et.juste(cur);
    if (!suivante) return null;
    if (T.resoudre(suivante).type !== "une") return null;                 // sa ligne n'a plus de solution unique : cas écarté
    if (ec(suivante) !== ec(cur)) lignes.push(ec(suivante)); else if (faute === lignes.length) faute = -1;
    cur = suivante;
  }
  return faute < 0 ? null : { lignes, faute };
}
for (const code of ACTIFS) {
  test("élève simulé qui commet toujours " + code + " : code et explication à chaque fois, aucune double pénalité", () => {
    let joues = 0;
    for (let graine = 1; graine <= 300; graine++) {
      for (const niveau of [1, 2, 3]) {
        const exo = Gn.creer("eq1par", niveau, graine), eq0 = Gn.depart(exo), sim = eleveSimule(eq0, code);
        if (!sim) continue;
        const r = T.evaluerDemarche(eq0, sim.lignes);
        const ctx = exo.enonce + " → " + sim.lignes.join(" → ");
        r.lignes.forEach((l, i) => {
          if (i === sim.faute) { egal(l.statut, "faux", ctx); egal(l.code, code, "mauvais code ligne " + (i + 1) + " : " + ctx); explicationValable(D.expliquer(l.diag), code); }
          else egal(l.statut, "juste", "double pénalité ligne " + (i + 1) + " : " + ctx);
        });
        egal(r.nbErreurs, 1, ctx); egal(r.premiereErreur, sim.faute, ctx); vrai(!r.resultatJuste, "résultat jugé juste malgré l'erreur : " + ctx);
        joues++;
      }
    }
    vrai(joues >= 150, "trop peu de cas joués pour " + code + " : " + joues);
  });
}
test("réponse finale seule : chaque réponse fausse de la table renvoie son code, sans ambiguïté", () => {
  let n = 0;
  for (let graine = 1; graine <= 200; graine++) for (const niveau of [1, 2, 3]) {
    const exo = Gn.creer("eq1par", niveau, graine);
    egal(D.collisions(exo.erreurs).length, 0, exo.enonce);
    for (const code of Object.keys(exo.erreurs)) for (const v of exo.erreurs[code]) {
      vrai(v !== exo.reponse, "une réponse « fausse » égale à la bonne : " + exo.enonce);
      const d = D.diagnostiquerReponse(exo.erreurs, v); egal(d.code, code, exo.enonce + " / " + v); vrai(!d.ambigu, exo.enonce); n++;
    }
    egal(D.diagnostiquerReponse(exo.erreurs, exo.reponse), null, "la bonne réponse ne doit déclencher aucun code");
  }
  vrai(n > 3000, "table trop pauvre : " + n);
});
test("examen de référence, ex. 1 : chaque code actif a au moins une réponse fausse calculée", () => {
  const exo = Gn.reference.ex1();
  for (const code of ACTIFS) vrai(exo.erreurs[code] && exo.erreurs[code].length, code + " absent de la table");
  egal(exo.erreurs["DIV-INV"].join(), "4"); vrai(exo.erreurs["SIG-PAR"].includes("193/4"));
});
