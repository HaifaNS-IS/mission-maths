/* Lot express (contrôle du 29/11) — géométrie analytique et Pythagore : G1 à G6.
   Oracle : les fiches de la prof (photos du 25/11), valeurs relevées sur les photos, jamais produites par le moteur.
   Chaque étape est jugée à partir des lignes de l'élève (pas de double pénalité) ; codes RAC-OUB, HYPO, PENTE-ORD, AXE-INV. */
const { MM, test, egal, vrai } = require("./_harnais.js");
const G = MM.geo, Gn = MM.gen, F = MM.F, A = MM.aide, D = MM.diag;
const fiche = n => Gn.creer("georef", n, 0);
const jouer = (exo, lignes) => G.jouer(exo, "complet", lignes);
const statuts = Q => Q.journal.map(j => j.statut + (j.code ? ":" + j.code : "")).join(" | ");

/* Ce que l'élève taperait pour recopier le corrigé : la partie après le nom (« AB² = »), la valeur finale pour une racine. */
function lignesDuCorrige(exo) {
  const pre = {}; for (const e of exo.etapes) pre[e.id] = e.prefixe || "";
  return exo.corrige.filter(l => l.id !== "fin").map(l => {
    let t = pre[l.id] && l.ligne.startsWith(pre[l.id]) ? l.ligne.slice(pre[l.id].length) : l.ligne;
    const e = exo.etapes.find(x => x.id === l.id);
    if (e.sorte === "racine") t = t.includes("≈") ? t.split("≈").pop().trim() : t.split("=").pop().trim();
    return t;
  });
}

test("catalogue : RAC-OUB et HYPO ajoutés le 25/11 (D70), PENTE-ORD et AXE-INV détectés", () => {
  for (const c of ["RAC-OUB", "HYPO", "PENTE-ORD", "AXE-INV"]) vrai(D.CATALOGUE[c] && D.CATALOGUE[c].actif, c);
  egal(D.CATALOGUE["RAC-OUB"].ajout, "2026-11-25"); egal(D.CATALOGUE.HYPO.ajout, "2026-11-25");
});

test("fiches de la prof : chaque réponse calculée est celle de la fiche", () => {
  const attendus = [
    "AB = 5", "CD = 10", "EF = √41 ≈ 6,40",                                         // fiche 1 : distances
    "AB = √20 ≈ 4,47 ; m = 0,5 ; y = 0,5x + 0,5",                                    // partie B, ex. 1
    "M(1, 2) ; CD = 10 ; CM = 5 ; m = −4/3 ; y = (−4/3)x + 10/3",                    // partie B, ex. 2
    "AC = 5 ; BC = 5 ; M(3, 0) ; CM = 4 ; m = 4/3 ; y = (4/3)x",                     // partie C : triangle isocèle
    "AB = √10 ≈ 3,16", "A(0, 12) et B(6, 0)", "M(3, 6)", "CA = √45 ≈ 6,71",          // tableau de la classe
    "AC = 10", "DF = 13"];                                                            // Pythagore
  attendus.forEach((t, i) => egal(fiche(i + 1).reponseTexte, t, "fiche " + (i + 1)));
  vrai(fiche(6).corrige.some(l => l.ligne === "AC = BC = 5 : le triangle ABC est isocèle en C."), "isocèle non conclu");
});

test("fiches de la prof : la démarche du corrigé, recopiée ligne à ligne, est juste partout (score plein)", () => {
  for (let n = 1; n <= 12; n++) {
    const exo = fiche(n), Q = jouer(exo, lignesDuCorrige(exo));
    vrai(Q.fini, "fiche " + n + " pas finie : " + statuts(Q) + " " + Q.illisibles.join(" / "));
    vrai(Q.journal.every(j => j.juste), "fiche " + n + " : " + statuts(Q));
    const sc = G.score(Q.journal, Q.etapes); egal(sc.points, sc.total, "fiche " + n);
  }
});

test("corrigé : un carré de négatif garde ses parenthèses, même en tête de ligne", () => {
  const l = fiche(6).corrige.map(x => x.ligne);
  vrai(l.includes("BC² = (−3)² + 4²") && l.includes("BC² = 9 + 16"), l.join(" | "));
  vrai(!l.some(x => /= −\d+²/.test(x)), "« −3² » écrit : " + l.join(" | "));
});

test("distance : valeur exacte, entier, ou arrondi au centième (consigne de la prof)", () => {
  const exo = fiche(3);                                                              // E(−3, −1), F(2, 3) : √41
  for (const r of ["√41", "√(41)", "6,4", "6,40"]) egal(statuts(jouer(exo, ["41", r])), "juste | juste", r);
  egal(statuts(jouer(exo, ["41", "41"])), "juste | faux:RAC-OUB");
  for (const r of ["6,41", "6,403", "6,3", "√40"]) vrai(jouer(exo, ["41", r]).journal[1].statut === "faux", r);
  const q = jouer(fiche(1), ["25", "√25", "5"]);                                     // √25 se termine : 5
  egal(statuts(q), "juste | incomplet | juste"); vrai(q.fini);
});

test("pas de double pénalité : la racine, le milieu et la droite suivent SES valeurs", () => {
  vrai(/^faux(:CALC)? \| juste$/.test(statuts(jouer(fiche(1), ["24", "√24"]))), "AB juste à partir de 24");   // AB² faux, AB juste à partir de 24
  const s = fiche(5);                                                                // C(−2, 6), D(4, −2) ; il trouve M(2, 2) au lieu de M(1, 2)
  const Q = jouer(s, ["2", "2", "100", "10", "(2 + 2)² + (2 − 6)²", "32", "√32"]);
  egal(statuts(Q), "faux | juste | juste | juste | incomplet | juste | juste", "CM à partir de son M");
  const d = fiche(4);                                                                // pente fausse (2 au lieu de 0,5) : l'équation suit sa pente
  egal(statuts(jouer(d, ["20", "√20", "2", "y − 1 = 2(x − 1)", "y = 2x − 1"])), "juste | juste | faux | incomplet | juste");
});

test("codes : HYPO, PENTE-ORD, AXE-INV, SIG-REL (carré d'un négatif)", () => {
  egal(statuts(jouer(fiche(11), ["8² − 6²"])), "faux:HYPO");
  const leg = G.construire({ sorte: "pythagore", hyp: false, a: 10, b: 6 });          // côté de l'angle droit : 10² − 6²
  egal(statuts(jouer(leg, ["10² + 6²"])), "faux:HYPO");
  egal(statuts(jouer(fiche(4), ["20", "√20", "(1 − 3) ÷ (5 − 1)"])), "juste | juste | faux:PENTE-ORD");
  egal(statuts(jouer(fiche(8), ["6"])), "faux:AXE-INV");                             // x = 0 → il donne l'abscisse
  egal(statuts(jouer(fiche(8), ["12", "x = 12"])), "juste | faux:AXE-INV");
  egal(statuts(jouer(fiche(2), ["6² + (−8)²", "36 − 64"])), "incomplet | faux:SIG-REL");
});

test("erreurs sans code, localisées : ÷ 2 oublié, carré oublié, pente à l'envers, signe du point", () => {
  const sorte = (exo, lignes) => { const Q = jouer(exo, lignes), a = Q.acceptees[Q.acceptees.length - 1]; return a.diag && a.diag.detail.sorte; };
  egal(sorte(fiche(5), ["2"]), "sansDeux");
  egal(sorte(fiche(1), ["7"]), "sansCarre");
  egal(sorte(fiche(4), ["20", "√20", "2"]), "inverse");
  egal(sorte(fiche(4), ["20", "√20", "0,5", "y + 1 = 0,5(x + 1)"]), "signePoint");
});

test("la droite : lue par ses coefficients, forme finale y = mx + b", () => {
  const l = t => G.lireDroite(t);
  vrai(l("y = 0,5x+0,5").finale && !l("y-1=0,5(x-1)").finale && !l("2y = x + 1").finale);
  vrai(l("y = x²").pasDroite, "x² accepté comme droite");
  vrai(l("y = 2x + c").erreur, "lettre inconnue acceptée");
  vrai(l("y = 2x = 3").erreur, "deux signes =");
  const s = fiche(5);                                                                // pente −4/3 : fraction exacte ou arrondi au centième
  egal(statuts(jouer(s, ["1", "2", "100", "10", "25", "5", "−4/3", "y − 6 = −4/3(x + 2)", "y = −4/3x + 10/3"])).split(" | ").slice(-3).join(" | "), "juste | incomplet | juste");
  egal(statuts(jouer(s, ["1", "2", "100", "10", "25", "5", "−1,33", "y = −1,33x + 3,34"])).split(" | ").slice(-2).join(" | "), "juste | juste");
  egal(statuts(jouer(fiche(4), ["20", "√20", "2/4"])), "juste | juste | incomplet");   // 2/4 se simplifie
});

test("explications : jamais la valeur juste (D50), routées par MM.aide", () => {
  const cas = [[fiche(1), ["25", "25"]], [fiche(1), ["7"]], [fiche(5), ["2"]], [fiche(4), ["20", "√20", "(1 − 3) ÷ (5 − 1)"]], [fiche(8), ["6"]], [fiche(11), ["8² − 6²"]],
    [fiche(4), ["20", "√20", "0,5", "y + 1 = 0,5(x + 1)"]], [fiche(3), ["41", "6,41"]]];
  for (const [exo, lignes] of cas) {
    const Q = jouer(exo, lignes), a = Q.acceptees[Q.acceptees.length - 1];
    for (const va of [1, 2]) {
      const x = A.expliquer(a.typeLigne, a.diag, va), txt = [x.titre, x.bon, x.ou, x.regle, x.suite].join(" ");
      vrai(x.titre && x.ou && x.regle, "explication vide : " + lignes.join(" / "));
      const bon = String(a.attendu || "").replace(/^.*= /, "");
      vrai(!bon || !new RegExp("(^|[^0-9,])" + bon.replace(/[()+.√]/g, "\\$&") + "([^0-9,]|$)").test(txt), "valeur juste « " + bon + " » dans : " + txt);
    }
  }
});

test("générateurs G1 à G6 : 200 graines par niveau, exercices construits sans ambiguïté (D53)", () => {
  const NIV = { dist: [1, 2], mil: [1, 2], pente: [1, 2], axes: [1, 2], comb: [1, 2], pyth: [1, 2, 3] };
  for (const [id, nivs] of Object.entries(NIV)) for (const n of nivs) for (let g = 1; g <= 200; g++) {
    const exo = Gn.creer(id, n, g);
    egal(exo.type, "geo"); egal(D.collisions(exo.erreurs).length, 0, id + n + "/" + g);
    const Q = jouer(exo, lignesDuCorrige(exo));
    vrai(Q.fini && Q.journal.every(j => j.juste), id + " n" + n + " graine " + g + " : " + statuts(Q) + " " + Q.illisibles.join(" / "));
  }
});

test("générateurs : ce que chaque niveau promet", () => {
  for (let g = 1; g <= 60; g++) {
    vrai(F(Gn.creer("dist", 1, g).valeurs[Object.keys(Gn.creer("dist", 1, g).valeurs)[0]]).racine(), "dist 1 : longueur entière");
    vrai(!F(Gn.creer("dist", 2, g).valeurs[Object.keys(Gn.creer("dist", 2, g).valeurs)[0]]).racine(), "dist 2 : longueur non entière");
    vrai(/,5/.test(Gn.creer("mil", 2, g).reponseTexte), "mil 2 : un milieu en ,5");
    const p1 = Gn.creer("pente", 1, g), m1 = Object.entries(p1.valeurs).find(([k]) => k[0] === "m")[1];
    vrai(F(m1).estEntier(), "pente 1 : pente entière");
    const p2 = Gn.creer("pente", 2, g), m2 = Object.entries(p2.valeurs).find(([k]) => k[0] === "m")[1];
    vrai(!F(m2).estEntier(), "pente 2 : pente non entière");
    vrai(Gn.creer("comb", 1, g).corrige.some(l => /isocèle/.test(l.ligne)), "comb 1 : isocèle conclu");
    vrai(!F(Gn.creer("pyth", 3, g).valeurs.p2).racine(), "pyth 3 : au centième");
  }
});

/* ---------- relecture du 25/11 : ce qu'un élève tape vraiment ---------- */
test("relecture : le nom recopié devant la ligne est accepté (AB² =, AB =, d =, xM =, m =, y =)", () => {
  egal(statuts(jouer(fiche(1), ["AB² = (5 − 1)² + (5 − 2)²", "AB² = 25", "AB = 5"])), "incomplet | juste | juste");
  egal(statuts(jouer(fiche(1), ["d² = 25", "d = √25", "d = 5"])), "juste | incomplet | juste");
  egal(statuts(jouer(fiche(9), ["xM = 3", "yM = 6"])), "juste | juste");
  egal(statuts(jouer(fiche(4), ["20", "√20", "m = 0,5"])), "juste | juste | juste");
  egal(statuts(jouer(fiche(8), ["y = 12"])), "juste");
  vrai(/seulement des nombres/.test(jouer(fiche(9), ["M(3;6)"]).illisibles[0] || ""), "point tapé à la place de xM");
});
test("relecture : « √41 ≈ 6,40 » et « √25 = 5 », chaque morceau jugé", () => {
  egal(statuts(jouer(fiche(3), ["41", "√41 ≈ 6,40"])), "juste | juste");
  egal(statuts(jouer(fiche(3), ["41", "√41 ≈ 6,41"])), "juste | faux");
  egal(statuts(jouer(fiche(1), ["25", "√25 = 5"])), "juste | juste");
  egal(statuts(jouer(fiche(1), ["25", "√24 = 5"])), "juste | faux");
});
test("relecture : erreurs typiques reconnues (moins d'un négatif, ordre de la soustraction, arrondi de pente, développement de la droite)", () => {
  const sorte = (exo, lignes) => { const Q = jouer(exo, lignes), a = Q.acceptees[Q.acceptees.length - 1]; return (a.code || "") + "/" + (a.diag && a.diag.detail.sorte); };
  egal(sorte(fiche(2), ["(4 − 2)² + (−4 − 4)²"]), "/moinsMoins");                       // 4 − (−2) écrit 4 − 2
  egal(sorte(G.construire({ sorte: "pythagore", hyp: false, a: 10, b: 6 }), ["6² − 10²"]), "/ordreHyp");
  egal(sorte(fiche(6), ["25", "5", "25", "5", "3", "0", "16", "4", "1,3"]), "/arrondiM");
  egal(sorte(fiche(4), ["20", "√20", "0,5", "y − 1 = 0,5(x − 1)", "y − 1 = 0,5x − 1"]), "DIST-PART/distPart");
  egal(sorte(fiche(4), ["20", "√20", "0,5", "y − 1 = 0,5(x − 1)", "y − 1 = 0,5x + 0,5"]), "SIG-PAR/sigPar");
  egal(sorte(fiche(4), ["20", "√20", "0,5", "y − 1 = 0,5x − 0,5", "y = 0,5x − 1,5"]), "TRANS-SIG/transSig");
  vrai(/remplace m, x₁ et y₁/.test(jouer(fiche(4), ["20", "√20", "0,5", "y − y1 = m(x − x1)"]).illisibles[0] || ""), "formule littérale");
});
test("relecture : Pythagore, l'angle droit est dans l'énoncé (la consigne est cachée quand le clavier est ouvert)", () => {
  egal(fiche(11).enonce, "Triangle ABC rectangle en B : AB = 6 ; BC = 8");
  egal(fiche(12).enonce, "Triangle DEF rectangle en E : DE = 5 ; EF = 12");
  for (let g = 1; g <= 30; g++) for (const n of [1, 2, 3]) vrai(/^Triangle [A-Z]{3} rectangle en [A-Z] : /.test(Gn.creer("pyth", n, g).enonce), "pyth " + n + "/" + g);
});
test("relecture : une valeur décimale tapée s'écrit en décimal dans l'explication (1,3 et non 13/10)", () => {
  const d = MM.nombres.diagnostiquer(MM.expr.arbre("(7 + 0) ÷ 2"), MM.expr.arbre("3,4"));
  const x = MM.nombres.expliquer(d, 1), txt = [x.titre, x.bon, x.ou, x.regle].join(" ");
  vrai(!/17\/5/.test(txt), txt);
});
test("reprise : un état sans la table v (la base ne garde pas une table vide) se juge comme l'état initial", () => {
  const exo = fiche(1), e = G.etapes(exo, "guide")[1], s = { points: exo.points };
  egal(G.juger(e, s, null, true, "5", exo).statut, "juste");
  egal(G.apres(s, G.etapes(exo, "guide")[0], { valeur: "25" }).v.AB2, "25");
});
