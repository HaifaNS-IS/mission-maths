/* Socle : fractions exactes, polynômes, hasard reproductible, empreinte du code parent. */
const { MM, test, egal, vrai } = require("./_harnais.js");
const F = MM.F, E = MM.expr, O = MM.outils;
test("fractions : opérations exactes et écriture", () => {
  egal(F("1/3").plus(F("1/6")).cle(), "1/2"); egal(F(1).sur(F(4)).decimal(), "0,25"); egal(F("-7/2").texte(), "−7/2");
  egal(F("0,1").plus(F("0,2")).cle(), "3/10", "0,1 + 0,2 doit faire exactement 0,3");
  egal(F("1/3").decimal(), null); egal(F(6).sur(F(-8)).cle(), "-3/4"); egal(F("2,50").cle(), "5/2");
  egal(F(49).racine().cle(), "7"); egal(F("9/4").racine().cle(), "3/2"); egal(F(48).racine(), null); egal(F(-4).racine(), null);
});
test("fractions : division par zéro refusée", () => { let e = null; try { F(1).sur(F(0)); } catch (x) { e = x; } vrai(e instanceof RangeError); });
test("polynômes : développement exact", () => {
  egal(E.lireExpression("(x+1)(x−2)").poly.cle(), "-2;-1;1");
  egal(E.lireExpression("7(x−4)−8(x−7)").poly.cle(), "28;-1");
  egal(E.lireExpression("(2x−3)²").poly.cle(), "9;-12;4");
});
test("écriture affichée : aller-retour sans perte", () => {
  for (const t of ["7(x − 4) − 8(x − 7) = 69 − 5(x + 8)", "−x + 28 = 29 − 5x", "4x = 1", "x = −1/4", "−(x − 3) = 2", "x² − 13x + 30 = 0"]) egal(E.ecrireEquation(E.lireEquation(t)), t);
});
test("hasard : même graine, même suite ; graines voisines, suites différentes", () => {
  const a = O.alea(123), b = O.alea(123), c = O.alea(124);
  const sa = [], sb = [], sc = [];
  for (let i = 0; i < 20; i++) { sa.push(a.entier(1, 99)); sb.push(b.entier(1, 99)); sc.push(c.entier(1, 99)); }
  egal(sa.join(), sb.join()); vrai(sa.join() !== sc.join());
});
test("SHA-256 : identique à celui de Node sur 4 textes", () => {
  const c = require("crypto");
  for (const s of ["", "abc", "mission-maths:1986", "é€ " + "x".repeat(300)]) egal(O.sha256(s), c.createHash("sha256").update(s, "utf8").digest("hex"));
});
test("fusion : les objets se fusionnent, les tableaux et les valeurs remplacent", () => {
  const o = O.fusionner({ a: { b: 1, c: [1, 2] }, d: 4 }, { a: { c: [3], e: null }, d: 5 });
  egal(JSON.stringify(o), JSON.stringify({ a: { b: 1, c: [3], e: null }, d: 5 }));
});
