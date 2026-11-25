/* Lot express — G7, la fiche trigo dans l'app : chaque résultat est calculé par js/trigo.js (en degrés), jamais écrit à la main.
   Oracle : les valeurs de la fiche imprimable, calculées à part par un script Python (math.sin, math.acos…, en degrés), arrondies au centième. */
const { MM, test, egal, vrai } = require("./_harnais.js");
const TR = MM.trigo;

test("G7 : les 7 résultats sont ceux de la fiche imprimable", () => {
  egal(TR.fiche().map(r => r.resultat).join(" | "),
    "Â ≈ 53,13° | BC ≈ 6,88 | BC ≈ 6,71 | AC ≈ 8,12 | Â ≈ 37,87° | AC ≈ 8,52 | DF = 13 ; D̂ ≈ 67,38° ; F̂ = 22,62°");
});
test("G7 : la bonne fonction et le bon sens (multiplier quand le côté cherché est en haut, diviser quand il est en bas)", () => {
  const f = TR.fiche();
  egal(f.slice(0, 6).map(r => r.fonction).join(), "cos,sin,tan,cos,tan,sin");
  egal([f[1].sens, f[2].sens, f[3].sens, f[5].sens].join(), "multiplier,multiplier,diviser,diviser");
  vrai(f[3].lignes.includes("AC = 5 ÷ cos 52° ≈ 8,12"), f[3].lignes.join(" | "));
  vrai(f[0].lignes.includes("Â = cos⁻¹(0,6) ≈ 53,13°"), f[0].lignes.join(" | "));
});
test("G7 : côtés repérés depuis l'angle étudié (adjacent, opposé, hypoténuse)", () => {
  egal(JSON.stringify(TR.cotesDe(["A", "B", "C"])), JSON.stringify({ adj: "AB", opp: "BC", hyp: "AC" }));
  egal(JSON.stringify(TR.cotesDe(["D", "E", "F"])), JSON.stringify({ adj: "DE", opp: "EF", hyp: "DF" }));
  egal(TR.fonction("opp", "hyp").f, "sin"); egal(TR.fonction("hyp", "adj").f, "cos"); egal(TR.fonction("adj", "opp").f, "tan");
});
test("G7 : exercice combiné — Pythagore, tangente, sinus (même angle), angle restant", () => {
  const r = TR.fiche()[6], l = r.parties.flatMap(p => p.lignes);
  vrai(l.includes("DF² = 5² + 12² = 25 + 144 = 169") && l.includes("DF = √169 = 13"), l.join(" | "));
  vrai(l.some(x => /^D̂ = sin⁻¹\(12 ÷ 13\) ≈ 67,38°/.test(x)), "le sinus ne redonne pas le même angle");
  egal(Math.round(r.valeurs.ang * 1e6), Math.round(r.valeurs.ang2 * 1e6));
});
test("G7 : la calculatrice en degrés (sin 30 = 0,5) ; en radians, sin 35 ≈ −0,43", () => {
  egal(TR.testCalculatrice(), "0,5"); egal(TR.radians(35), "−0,43");
});
test("G7 : chaque figure donne les données et un « ? » sur ce qu'on cherche, jamais la réponse", () => {
  for (const r of TR.fiche()) {
    const fig = r.figure, vals = Object.values(fig.cotes).concat([fig.angle]);
    vrai(vals.includes("?"), r.enonce);
    const rep = r.resultat.match(/[≈=] ([\d,]+)/)[1];
    vrai(!vals.includes(rep), "réponse dans la figure : " + rep);
  }
});
