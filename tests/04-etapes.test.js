/* Risque n° 1 — vérification ligne à ligne. Chaque ligne est jugée à partir de la ligne précédente de l'élève. */
const { MM, test, egal, vrai } = require("./_harnais.js");
const E = MM.expr, T = MM.etapes;
const EX1 = "7(x − 4) − 8(x − 7) = 69 − 5(x + 8)";
const eq0 = () => E.lireEquation(EX1);
const statuts = r => r.lignes.map(l => l.statut + (l.code ? ":" + l.code : "")).join(" | ");

test("démarche modèle de l'ex. 1 : 4 lignes justes, chacune à la forme de son étape", () => {
  const r = T.evaluerDemarche(eq0(), ["7x − 28 − 8x + 56 = 69 − 5x − 40", "−x + 28 = 29 − 5x", "4x = 1", "x = 1/4"], ["developpe", "reduit", "regroupe", "solution"]);
  egal(statuts(r), "juste | juste | juste | juste"); egal(r.nbErreurs, 0); vrai(r.fini && r.resultatJuste);
});
test("écritures libres : ordre des termes, espaces, décimales, étapes fusionnées", () => {
  const r = T.evaluerDemarche(eq0(), ["-28+7x+56-8x = -40-5x+69", "28 - x = -5x + 29", "5x - x = 29 - 28", "x=0,25"]);
  egal(statuts(r), "juste | juste | juste | juste"); vrai(r.resultatJuste);
  const direct = T.evaluerDemarche(eq0(), ["x = 1/4"]);
  egal(statuts(direct), "juste"); vrai(direct.resultatJuste);
});
test("ligne juste mais étape pas finie : « incomplet », jamais « faux »", () => {
  egal(T.jugerLigne(eq0(), EX1, "developpe").statut, "incomplet");
  egal(T.jugerLigne(eq0(), "7x − 28 − 8(x − 7) = 69 − 5x − 40", "developpe").statut, "incomplet");
  egal(T.jugerLigne(eq0(), "7x − 28 − 8x + 56 = 69 − 5x − 40", "reduit").statut, "incomplet");
  egal(T.jugerLigne(eq0(), "−x + 28 = 29 − 5x", "regroupe").statut, "incomplet");
  egal(T.jugerLigne(eq0(), "4x = 1", "solution").statut, "incomplet");
  egal(T.jugerLigne(eq0(), "−x + 5x = 29 − 28", "regroupe").statut, "juste");
  egal(T.jugerLigne(eq0(), "2×3x = 6x", "reduit").statut, "faux", "une ligne non équivalente reste fausse");
});
test("CDC : SIG-PAR injectée à la ligne 2 → signalée ligne 2, lignes 3 à 5 justes depuis sa ligne, une seule erreur comptée", () => {
  const lignes = [EX1, "7x − 28 − 8x − 56 = 69 − 5x − 40", "−x − 84 = 29 − 5x", "4x = 113", "x = 113/4"];
  const r = T.evaluerDemarche(eq0(), lignes);
  egal(statuts(r), "juste | faux:SIG-PAR | juste | juste | juste");
  egal(r.nbErreurs, 1); egal(r.premiereErreur, 1); vrai(r.fini); vrai(!r.resultatJuste, "le résultat final reste faux");
});
test("CDC : erreur à l'étape 2 (Réduis) → signalée à l'étape 2, étapes 3 et 4 justes à partir de sa ligne 2", () => {
  const r = T.evaluerDemarche(eq0(), ["7x − 28 − 8x + 56 = 69 − 5x − 40", "27x = 29 − 5x", "32x = 29", "x = 29/32"], ["developpe", "reduit", "regroupe", "solution"]);
  egal(statuts(r), "juste | faux:RED-MIX | juste | juste"); egal(r.nbErreurs, 1); egal(r.premiereErreur, 1);
});
test("deux erreurs : deux lignes signalées, chacune avec son code, pas plus", () => {
  const r = T.evaluerDemarche(eq0(), ["7x − 28 − 8x − 56 = 69 − 5x − 40", "−x − 84 = 29 − 5x", "−6x = 113", "x = −113/6"]);
  egal(statuts(r), "faux:SIG-PAR | juste | faux:TRANS-SIG | juste"); egal(r.nbErreurs, 2);
});
test("la ligne attendue est recalculée à partir de la ligne de l'élève, pas du corrigé", () => {
  const sa = E.lireEquation("−x − 84 = 29 − 5x");                       // sa ligne, déjà fausse
  const v = T.jugerLigne(sa, "−6x = 113", "regroupe");
  egal(v.statut, "faux"); egal(v.code, "TRANS-SIG"); egal(v.attendu, "4x = 113");
});
test("ligne illisible : ni juste ni fausse, avec un message", () => {
  const v = T.jugerLigne(eq0(), "7x − 28 − 8x + 56", "developpe");
  egal(v.statut, "illisible"); egal(v.raison, "egal-manquant");
});
test("corrigé pas à pas de l'ex. 1 : lignes et ordre", () => {
  egal(T.corrige(eq0()).map(l => l.ligne).join(" | "), "7x − 28 − 8x + 56 = 69 − 5x − 40 | −x + 28 = 29 − 5x | −x + 5x = 29 − 28 | 4x = 1 | x = 1/4 = 0,25");
  egal(T.etapesUtiles(E.lireEquation("3x + 5 = 20")).join(), "regroupe,solution");
  egal(T.corrige(E.lireEquation("3x + 5 = 20")).map(l => l.ligne).join(" | "), "3x = 20 − 5 | 3x = 15 | x = 5");
});
test("équations sans solution unique : pas de plantage", () => {
  egal(T.resoudre(E.lireEquation("2x + 1 = 2x + 3")).type, "aucune");
  egal(T.resoudre(E.lireEquation("2(x + 1) = 2x + 2")).type, "toutes");
  vrai(Array.isArray(T.corrige(E.lireEquation("2x + 1 = 2x + 3"))));
  egal(T.jugerLigne(E.lireEquation("2x + 1 = 2x + 3"), "0 = 2", null).statut, "juste");
});
test("expression seule : juste, incomplet, faux avec code", () => {
  const d = E.lireExpression("−3(x + 2)").termes;
  egal(T.jugerExpression(d, "−3x − 6", "developpe").statut, "juste");
  egal(T.jugerExpression(d, "-6-3x", "developpe").statut, "juste");
  egal(T.jugerExpression(d, "−3(x+2)", "developpe").statut, "incomplet");
  const v = T.jugerExpression(d, "−3x + 6", "developpe"); egal(v.statut, "faux"); egal(v.code, "SIG-PAR"); egal(v.attendu, "−3x − 6");
});
