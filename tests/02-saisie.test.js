/* QA 4 — Saisie tolérante : au moins 30 écritures équivalentes acceptées et 15 fausses rejetées. Un contrôle par écriture. */
const { MM, test, egal, vrai } = require("./_harnais.js");
const S = MM.saisie, F = MM.F;

const ACCEPTEES = [
  ["solution", "0,25", "1/4"], ["solution", "0.25", "1/4"], ["solution", "1/4", "1/4"], ["solution", " 1 / 4 ", "1/4"],
  ["solution", "x = 0,25", "1/4"], ["solution", "x=1/4", "1/4"], ["solution", "X = 0.250", "1/4"], ["solution", "1/4 = x", "1/4"],
  ["solution", "2/8", "1/4"], ["solution", "x = −3", "-3"], ["solution", "x = -3", "-3"], ["solution", "x = – 3", "-3"],
  ["solution", "x = −7/2", "-3,5"], ["solution", "x = -3,5", "-7/2"], ["nombre", "49", "49"], ["nombre", "049", "49"],
  ["nombre", "7×7", "49"], ["nombre", "(−7)²", "49"], ["nombre", "169 − 120", "49"], ["nombre", "12 : 4", "3"],
  ["expression", "−5x+6", "6 − 5x"], ["expression", "6−5x", "−5x + 6"], ["expression", "6 - 5 x", "-5x+6"], ["expression", "-5X + 6", "6-5x"],
  ["expression", "−x + 28", "28 − x"], ["expression", "28-1x", "−x+28"], ["expression", "7x − 28 − 8x + 56", "−x + 28"], ["expression", "7(x−4)", "7x − 28"],
  ["expression", "7*(x-4)", "7x-28"], ["expression", "7·x − 28", "7x-28"], ["expression", "x² − 13x + 30", "30 − 13x + x^2"], ["expression", "x/2", "0,5x"],
  ["expression", "3x/4", "0.75x"], ["expression", "(x+1)(x−2)", "x² − x − 2"],
  ["point", "(4;−1)", "(4 ; −1)"], ["point", "(4,−1)", "(4 ; −1)"], ["point", "( 4 ; - 1 )", "(4;-1)"], ["point", "4;-1", "(4;-1)"],
  ["point", "A(4;−1)", "(4;-1)"], ["point", "(0,5;3)", "(1/2 ; 3)"], ["point", "(0.5,3)", "(1/2;3)"], ["point", "(0,5,1,5)", "(1/2;3/2)"],
  ["point", "(−3 ; 0)", "(-3;0)"],
  ["equation", "4x=1", "4x = 1"], ["equation", "1 = 4x", "4x = 1"], ["equation", "−x + 28 = 29 − 5x", "4x = 1"], ["equation", "8x = 2", "4x = 1"],
  ["equation", "x = 0,25", "4x = 1"], ["equation", "7(x−4)−8(x−7)=69−5(x+8)", "x = 1/4"]
];
const REJETEES = [
  ["solution", "4", "1/4"], ["solution", "0,24", "1/4"], ["solution", "−1/4", "1/4"], ["solution", "x = 2,5", "1/4"], ["solution", "1/3", "0,33"],
  ["nombre", "−49", "49"], ["nombre", "48", "49"], ["nombre", "7", "49"],
  ["expression", "−5x − 6", "6 − 5x"], ["expression", "5x + 6", "6 − 5x"], ["expression", "6 − 5", "6 − 5x"], ["expression", "−21x", "7x − 28"],
  ["expression", "7x − 4", "7(x − 4)"], ["expression", "x² + 13x + 30", "x² − 13x + 30"],
  ["point", "(−1;4)", "(4;−1)"], ["point", "(4;1)", "(4;−1)"], ["point", "(0;−3)", "(−3;0)"],
  ["equation", "4x = −1", "4x = 1"], ["equation", "x = 4", "4x = 1"], ["equation", "−6x = 1", "4x = 1"]
];
const ILLISIBLES = [
  ["equation", "4x", "egal-manquant"], ["equation", "4x = 1 = 2", "egal-multiple"], ["equation", "4x = ", "incomplet"], ["equation", "(4x = 1", "parenthese"],
  ["equation", "x2 = 4", "ordre"], ["equation", "4y = 1", "symbole"], ["solution", "x = 1/0", "division-zero"], ["nombre", "2x", "pas-un-nombre"],
  ["point", "(4 −1)", "separateur"], ["expression", "3x = 2", "egal-en-trop"], ["nombre", "1,2,3", "nombre"], ["equation", "", "vide"]
];
for (const [type, saisie, attendu] of ACCEPTEES) test("acceptée (" + type + ") : « " + saisie + " » = « " + attendu + " »", () => { const r = S.comparer(type, saisie, attendu); vrai(r.ok, "illisible : " + r.message); vrai(r.egal, "jugée différente"); });
for (const [type, saisie, attendu] of REJETEES) test("rejetée (" + type + ") : « " + saisie + " » ≠ « " + attendu + " »", () => { const r = S.comparer(type, saisie, attendu); vrai(r.ok, "illisible au lieu de fausse : " + r.message); vrai(!r.egal, "acceptée à tort"); });
for (const [type, saisie, raison] of ILLISIBLES) test("illisible (" + type + ") : « " + saisie + " » → " + raison, () => { const r = S.comparer(type, saisie, type === "point" ? "(1;1)" : type === "equation" ? "x = 1" : "1"); vrai(!r.ok, "lue alors qu'elle est mal écrite"); egal(r.raison, raison); vrai(r.message && r.message.length > 5, "pas de message d'aide"); });
test("au moins 30 écritures acceptées et 15 rejetées dans ce fichier", () => { vrai(ACCEPTEES.length >= 30 && REJETEES.length >= 15, ACCEPTEES.length + " / " + REJETEES.length); });
test("une fraction non simplifiée est acceptée mais signalée", () => {
  const v = MM.etapes.jugerLigne(MM.expr.lireEquation("4x = 1"), "x = 2/8", "solution");
  egal(v.statut, "juste"); vrai(v.aSimplifier === true);
  vrai(MM.etapes.jugerLigne(MM.expr.lireEquation("4x = 1"), "x = 1/4", "solution").aSimplifier === false);
});
