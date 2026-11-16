/* QA 1 — Examen de référence (cahier des charges, section 2) : les 5 exercices, valeurs exactes, réponses exactes. */
const { MM, test, egal, vrai } = require("./_harnais.js");
const E = MM.expr, T = MM.etapes, F = MM.F, S = MM.saisie;
const droite = txt => { const p = E.lireExpression(txt).poly; return { m: p.coef(1), b: p.coef(0), p }; };
const sens = m => m.signe() > 0 ? "croissante" : m.signe() < 0 ? "décroissante" : "constante";
const point = (x, y) => "(" + F(x).texte() + " ; " + F(y).texte() + ")";

test("Ex. 1 — 7(x − 4) − 8(x − 7) = 69 − 5(x + 8) donne x = 1/4 = 0,25, étapes comprises", () => {
  const exo = MM.gen.reference.ex1();
  egal(exo.enonce, "7(x − 4) − 8(x − 7) = 69 − 5(x + 8)");
  egal(exo.reponse, "1/4");
  egal(exo.reponseTexte, "x = 1/4 = 0,25");
  egal(exo.etapes.map(e => e.attendu).join(" | "), "7x − 28 − 8x + 56 = 69 − 5x − 40 | −x + 28 = 29 − 5x | 4x = 1 | x = 1/4");
  const eq = E.lireEquation(exo.enonce), x = F("1/4");
  vrai(E.polyDeTermes(eq.g).valeur(x).egal(E.polyDeTermes(eq.d).valeur(x)), "x = 1/4 ne vérifie pas l'énoncé");
  vrai(S.comparer("solution", "x = 0,25", "1/4").egal);
});
test("Ex. 2 — x² − 13x + 30 = 0 : Δ = 49, x₁ = 10, x₂ = 3", () => {
  const eq = E.lireEquation("x² − 13x + 30 = 0"), p = E.polyDeTermes(eq.g).moins(E.polyDeTermes(eq.d));
  const a = p.coef(2), b = p.coef(1), c = p.coef(0);
  egal([a, b, c].map(v => v.cle()).join(","), "1,-13,30");
  const delta = b.fois(b).moins(F(4).fois(a).fois(c));
  egal(delta.cle(), "49"); egal(b.fois(b).cle(), "169"); egal(F(4).fois(a).fois(c).cle(), "120");
  const r = delta.racine(); egal(r.cle(), "7");
  const x1 = b.oppose().plus(r).sur(a.fois(2)), x2 = b.oppose().moins(r).sur(a.fois(2));
  egal(x1.cle(), "10"); egal(x2.cle(), "3");
  vrai(p.valeur(x1).estNul() && p.valeur(x2).estNul(), "les racines ne vérifient pas l'équation");
});
test("Ex. 3a — tableau m, b, intersection avec l'axe des ordonnées, sens de variation", () => {
  const lignes = ["−3x − 5", "4x + 9", "8", "6 − 5x"].map(t => { const d = droite(t); return [d.m.texte(), d.b.texte(), point(0, d.p.valeur(0)), sens(d.m)].join(" ; "); });
  egal(lignes[0], "−3 ; −5 ; (0 ; −5) ; décroissante");
  egal(lignes[1], "4 ; 9 ; (0 ; 9) ; croissante");
  egal(lignes[2], "0 ; 8 ; (0 ; 8) ; constante");
  egal(lignes[3], "−5 ; 6 ; (0 ; 6) ; décroissante");
  const m = F(-1), b = F(7), ecrit = E.ecrireCote([E.mono(m, 1), E.mono(b, 0)]);
  egal("y = " + ecrit + " ; " + point(0, b) + " ; " + sens(m), "y = −x + 7 ; (0 ; 7) ; décroissante");
});
test("Ex. 3b — y = 3x + 9 coupe les axes en (0 ; 9) et (−3 ; 0)", () => {
  const d = droite("3x + 9");
  egal(point(0, d.p.valeur(0)), "(0 ; 9)");
  const s = T.resoudre(E.lireEquation("3x + 9 = 0"));
  egal(point(s.x, d.p.valeur(s.x)), "(−3 ; 0)");
});
test("Ex. 4 — pente de B(4 ; 11) et A(1 ; 5) : m = 2", () => {
  const B = S.lirePoint("B(4 ; 11)"), A = S.lirePoint("A(1 ; 5)");
  egal(B.y.moins(A.y).sur(B.x.moins(A.x)).cle(), "2");
  egal(A.y.moins(B.y).sur(A.x.moins(B.x)).cle(), "2", "l'ordre des points ne change pas la pente");
});
test("Ex. 5 — AB : y = 0,5x − 3 et AC : y = 3 − x : A(4 ; −1), B(0 ; −3), C(0 ; 3), hauteur 4, aire 12", () => {
  const AB = droite("0,5x − 3"), AC = droite("3 − x");
  const B = [F(0), AB.p.valeur(0)], C = [F(0), AC.p.valeur(0)];
  const xa = T.resoudre(E.lireEquation("0,5x − 3 = 3 − x")).x, A = [xa, AB.p.valeur(xa)];
  egal(point(...A), "(4 ; −1)"); egal(point(...B), "(0 ; −3)"); egal(point(...C), "(0 ; 3)");
  vrai(AC.p.valeur(xa).egal(A[1]), "A n'est pas sur AC");
  const hauteur = A[0].abs(), base = C[1].moins(B[1]).abs();
  egal(hauteur.cle(), "4"); egal(base.cle(), "6");
  egal(base.fois(hauteur).sur(2).cle(), "12");
});
