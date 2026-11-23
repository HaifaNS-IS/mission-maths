/* Lot 2 — Nombres relatifs (P1, étape « Vérifie » de P4) : valeur exacte, forme écrite, erreurs SIG-REL, PRIO, CALC. */
const { MM, test, egal, vrai } = require("./_harnais.js");
const E = MM.expr, N = MM.nombres, F = MM.F;
const A = t => E.arbre(t);
const mots = p => (p.match(/[A-Za-zÀ-ÿ]{2,}/g) || []).length;
const phrasesCourtes = t => String(t).split(/(?<=[.!?])\s+/).every(p => mots(p) < 15);

test("valeur exacte et écriture : parenthèses autour des négatifs, signes typographiques", () => {
  const cas = { "−7 − (−3)": "−4", "4 + (−9) − (−2)": "−3", "−5 × (−8)": "40", "−56 ÷ 8": "−7", "−2 × 3 × (−4)": "24", "69 − 5 × 8": "29", "−3 + 4 × (−2)": "−11", "12 − 2 × (5 − 8)": "18" };
  for (const [t, v] of Object.entries(cas)) { egal(N.valeur(A(t)).texte(), v, t); egal(N.ecrire(A(t)), t, "relecture de " + t); }
  egal(N.ecrire(A("4+-3")), "4 + (−3)");
  egal(N.lire("2x + 1").ok, false); egal(N.lire("5 ÷ 0").raison, "division-zero");
});
test("formes : parenthèses enlevées, multiplications faites, un seul nombre", () => {
  vrai(!N.FORMES.sanspar(A("−7 − (−3)"))); vrai(N.FORMES.sanspar(A("−7 + 3"))); vrai(!N.FORMES.sanspar(A("−7 + −3")));
  vrai(!N.FORMES.produit(A("−3 + 4 × (−2)"))); vrai(N.FORMES.produit(A("−3 − 8")));
  vrai(!N.FORMES.parenthese(A("12 − 2 × (5 − 8)"))); vrai(N.FORMES.parenthese(A("12 − 2 × (−3)")));
  vrai(N.FORMES.nombre(A("−11"))); vrai(!N.FORMES.nombre(A("−(−11)"))); vrai(!N.FORMES.nombre(A("3 − 1")));
});
test("corrigé pas à pas calculé : une étape par opération, la dernière est toujours « Calcule »", () => {
  const ch = t => N.chaine(A(t)).map(l => l.id + ":" + l.ligne).join(" | ");
  egal(ch("−7 − (−3)"), "sanspar:−7 + 3 | nombre:−4");
  egal(ch("−5 × (−8)"), "nombre:40");
  egal(ch("−3 + 4 × (−2)"), "produit:−3 − 8 | nombre:−11");
  egal(ch("12 − 2 × (5 − 8)"), "parenthese:12 − 2 × (−3) | produit:12 + 6 | nombre:18");
  egal(ch("69 − 5 × 8"), "produit:69 − 40 | nombre:29");
  egal(ch("−5 − 4"), "nombre:−9");
});
test("jugement : juste, incomplet (forme pas atteinte), illisible, faux avec le bon code", () => {
  const p = A("−7 − (−3)");
  egal(N.juger(p, "−7 + 3", "sanspar").statut, "juste");
  egal(N.juger(p, "-7-(-3)", "sanspar").statut, "incomplet");
  egal(N.juger(p, "−7 + 3", "nombre").statut, "incomplet");
  egal(N.juger(p, "−4", "nombre").statut, "juste");
  egal(N.juger(p, "−7 +", "nombre").statut, "illisible");
  for (const [t, code] of [["−7 − 3", "SIG-REL"], ["−10", "SIG-REL"], ["4", "SIG-REL"], ["10", "SIG-REL"]]) egal(N.juger(p, t, null).code, code, t);
  const q = A("−3 + 4 × (−2)");
  for (const [t, code] of [["−3 + 8", "SIG-REL"], ["1 × (−2)", "PRIO"], ["−2", "PRIO"], ["−3 − 6", "CALC"], ["−12", "CALC"], ["40", "CALC"]]) egal(N.juger(q, t, null).code, code, t);
  const fin = N.expliquer(N.juger(q, "40", "nombre").diag, 1);
  vrai(!/−11/.test(fin.ou + fin.regle), "l'explication donne le résultat final : " + fin.ou);
  egal(N.juger(q, "−3 − 6", "produit").attendu, "−3 − 8");
});
test("PRIO : la réponse « de gauche à droite » est calculée, jamais égale à la bonne", () => {
  egal(N.gaucheADroite(A("69 − 5 × 8")).cle(), "512");
  egal(N.gaucheADroite(A("−3 + 4 × (−2)")).cle(), "-2");
  egal(N.gaucheADroite(A("12 − 2 × (5 − 8)")).cle(), "-30");
  egal(JSON.stringify(N.reponsesFausses(A("−3 + 4 × (−2)")).PRIO), '["-2"]');
  egal(N.reponsesFausses(A("−7 − (−3)")).PRIO, undefined, "pas de PRIO sans multiplication");
});
test("explications : ce qui est juste, l'endroit exact, la règle ; la 2e formulation est différente ; phrases courtes", () => {
  const cas = [["−7 − (−3)", "−7 − 3"], ["−7 − (−3)", "4"], ["−3 + 4 × (−2)", "−3 + 8"], ["−3 + 4 × (−2)", "−2"], ["−3 + 4 × (−2)", "−3 − 6"], ["12 − 2 × (5 − 8)", "12 − 2 × 3"], ["−7 + 3", "1"]];
  for (const [p, t] of cas) {
    const v = N.juger(A(p), t, null), x1 = N.expliquer(v.diag, 1), x2 = N.expliquer(v.diag, 2);
    vrai(x1.titre && x1.bon && x1.ou && x1.regle, p + " → " + t);
    vrai(x1.regle !== x2.regle, "2e formulation identique : " + p + " → " + t);
    for (const x of [x1, x2]) for (const f of [x.bon, x.ou, x.regle]) vrai(phrasesCourtes(f), "phrase trop longue : " + f);
  }
  vrai(/deux signes collés/.test(N.expliquer(N.juger(A("−7 − (−3)"), "−7 − 3", null).diag, 1).ou));
  vrai(/4 × \(−2\) = −8, pas −6/.test(N.expliquer(N.juger(A("−3 + 4 × (−2)"), "−3 − 6", null).diag, 1).ou));
});
test("démarche libre (mode seul) : une erreur à la ligne 1, la suite jugée à partir de sa ligne", () => {
  const r = N.evaluerDemarche(A("−3 + 4 × (−2)"), ["−3 + 8", "5"]);
  egal(r.lignes.map(l => l.statut + (l.code ? ":" + l.code : "")).join(" | "), "faux:SIG-REL | juste"); egal(r.nbErreurs, 1); vrai(r.fini && !r.resultatJuste);
  vrai(N.evaluerDemarche(A("−3 + 4 × (−2)"), ["−3 − 8", "−11"]).resultatJuste);
});
test("« Vérifie » : x remplacé par sa valeur dans chaque côté, écrit comme sur une copie", () => {
  const eq = E.lireEquation("7(x − 4) − 8(x − 7) = 69 − 5(x + 8)"), x = F(5);
  egal(N.ecrire(N.substituer(eq.g, x)), "7 × (5 − 4) − 8 × (5 − 7)"); egal(N.valeur(N.substituer(eq.g, x)).cle(), "23");
  egal(N.ecrire(N.substituer(E.lireEquation("−x + 5 = 3x − 2").g, F(-2))), "−(−2) + 5");
  egal(N.ecrire(N.substituer(E.lireEquation("−2x = 5").g, F(3))), "−2 × 3");
  const ex = MM.gen.creer("eq1par", 2, 3);
  if (ex.verification) egal(N.valeur(A(ex.verification.gauche)).cle(), N.valeur(A(ex.verification.droite)).cle(), "les deux côtés doivent être égaux");
});
