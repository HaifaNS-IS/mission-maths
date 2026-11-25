/* Lot 4a — les leçons de P6, P7, P8, P10 et P11 (priorité aux bases et aux leçons, Kevin, 25/11).
   Le pack ne contient que du texte et des renvois vers des générateurs : l'exemple, le piège et les questions sont calculés.
   Deux modèles ajoutés au moteur géométrie (D95) : la pente seule (P8) et « milieu puis distance » (P11). */
const fs = require("fs"), path = require("path");
const { MM, test, egal, vrai } = require("./_harnais.js");
const L = MM.lecon, Gn = MM.gen, F = MM.F, G = MM.geo;
const dossier = path.join(__dirname, "..", "lecons");
const lirePack = id => JSON.parse(fs.readFileSync(path.join(dossier, id + ".json"), "utf8"));
const ATTENDU = { "LECO-N06-A": ["P6", "XY-INV"], "LECO-N07-A": ["P7", "ORD-INV"], "LECO-N08-A": ["P8", "AXE-INV"], "LECO-N10-A": ["P10", "SIG-PAR"], "LECO-N11-A": ["P11", "RAC-OUB"] };

test("index des leçons : P1 à P8, P10 et P11 ; pas de leçon pour P9 au lot 4a", () => {
  const idx = JSON.parse(fs.readFileSync(path.join(dossier, "index.json"), "utf8"));
  egal(idx.lecons.map(m => m.palier).join(), "P1,P2,P3,P4,P5,P6,P7,P8,P10,P11");
  for (const [id, [palier]] of Object.entries(ATTENDU)) { const m = idx.lecons.find(x => x.pack_id === id); vrai(m, id); egal(m.palier, palier); egal(m.fichier, "lecons/" + id + ".json"); }
});
for (const [id, [palier, code]] of Object.entries(ATTENDU)) {
  test(id + " : pack accepté, piège " + code + " calculé sur l'exemple, 2 questions À toi", () => {
    const pack = lirePack(id);
    egal(L.valider(pack).join(" ; "), "");
    egal(pack.palier, palier);
    const l = L.preparer(pack);
    vrai(l.piege && l.piege.code === code, "piège");
    vrai(l.piege.depart && l.piege.faux && l.piege.bon && l.piege.faux !== l.piege.bon, "piège incomplet");
    vrai(l.piege.explication && l.piege.explication.ou && l.piege.explication.regle, "explication du piège");
    egal(l.aToi.length, 2);
    for (const q of l.aToi) Gn.creer(q.gen, q.niveau, 1);
    vrai(l.exemple.lignes.length >= 2, "exemple trop court");
    for (const li of l.exemple.lignes) vrai(li.ligne && li.pourquoi && li.pourquoi.length > 5, li.ligne);
  });
  test(id + " : aucune réponse écrite à la main dans le pack (seulement des renvois vers des générateurs)", () => {
    const t = JSON.stringify(lirePack(id).lecon);
    vrai(!/"(reponse|lignes|corrige|faux|bon)"/.test(t), "champ calculé écrit à la main");
  });
}
test("P6 et P7 : l'exemple de la leçon montre le repère dessiné ; P6 le point à lire", () => {
  const l6 = L.preparer(lirePack("LECO-N06-A")), l7 = L.preparer(lirePack("LECO-N07-A"));
  vrai(l6.exemple.figure && l6.exemple.figure.points.length === 1, "P6 : figure");
  vrai(l7.exemple.figure && l7.exemple.figure.droites.length === 1, "P7 : la droite de l'exemple");
  // P6 : le piège montre le point inversé, calculé à partir du point de l'exemple
  const p = l6.exemple.figure.points[0];
  vrai(l6.piege.bon.includes(MM.affine.ecr(p.x) + ", " + MM.affine.ecr(p.y)), "bon point");
  vrai(l6.piege.faux.includes(MM.affine.ecr(p.y) + ", " + MM.affine.ecr(p.x)), "point inversé");
});
test("P7 : l'exemple est une forme inversée y = b + mx, le piège la lit m = b", () => {
  const l = L.preparer(lirePack("LECO-N07-A"));
  vrai(/^y = [−-]?\d+ [+−] \d*x$/.test(l.exemple.enonce), "forme inversée : " + l.exemple.enonce);
  vrai(/^m = /.test(l.piege.faux) && /^m = /.test(l.piege.bon), "le piège porte sur m");
});
test("D95 : la pente seule (P8) — m = (y₂ − y₁) ÷ (x₂ − x₁), recalculée ici ; 300 tirages", () => {
  for (const n of [1, 2]) for (let s = 1; s <= 300; s++) {
    const e = Gn.creer("pseule", n, s), [P, Q] = Object.keys(e.points), p = e.points[P].map(F), q = e.points[Q].map(F);
    egal(e.etapes.map(x => x.sorte).join(), "pente");
    egal(e.reponseTexte, "m = " + G.ecr(q[1].moins(p[1]).sur(q[0].moins(p[0]))), "pseule" + n + ":" + s);
    egal(MM.diag.collisions(e.erreurs).length, 0);
  }
});
test("D95 : milieu puis distance (P11) — 4 étapes, valeurs recalculées ici ; 300 tirages", () => {
  for (const n of [1, 2]) for (let s = 1; s <= 300; s++) {
    const e = Gn.creer("mildist", n, s), [P, Q] = Object.keys(e.points).filter(k => k !== "M"), p = e.points[P].map(F), q = e.points[Q].map(F);
    egal(e.etapes.map(x => x.sorte).join(), "milieu,milieu,carres,racine");
    const xm = p[0].plus(q[0]).sur(2), ym = p[1].plus(q[1]).sur(2), d2 = q[0].moins(p[0]).fois(q[0].moins(p[0])).plus(q[1].moins(p[1]).fois(q[1].moins(p[1])));
    vrai(e.reponseTexte.startsWith("M("), e.reponseTexte);
    egal(F(e.valeurs.xM).cle(), xm.cle()); egal(F(e.valeurs.yM).cle(), ym.cle()); egal(F(e.valeurs[P + Q + "2"]).cle(), d2.cle());
    if (n === 1) vrai(d2.racine(), "niveau 1 : longueur entière");
  }
});
test("G1 à G6 inchangés : les 12 fiches de la prof donnent toujours leurs réponses (rejouées dans 18-geometrie)", () => {
  egal(Gn.creer("georef", 8, 0).reponseTexte, "A(0, 12) et B(6, 0)");
  egal(Gn.creer("georef", 6, 0).reponseTexte, "AC = 5 ; BC = 5 ; M(3, 0) ; CM = 4 ; m = 4/3 ; y = (4/3)x");
});
test("piège de la géométrie : AXE-INV montre le point de l'autre axe, SIG-PAR la ligne développée, RAC-OUB la racine oubliée", () => {
  const axes = Gn.creer("georef", 8, 0), pa = G.piege(axes, "AXE-INV", "x");
  egal(pa.bon, "(0, 12)"); egal(pa.faux, "(6, 0)");
  const dro = G.construire({ sorte: "droite", points: { A: [1, 3], B: [3, 7] } }), ps = G.piege(dro, "SIG-PAR", "x");
  egal(ps.depart, "y − 3 = 2(x − 1)"); egal(ps.bon, "y − 3 = 2x − 2"); egal(ps.faux, "y − 3 = 2x + 2");
  const md = Gn.creer("georef", 1, 0), pr = G.piege(md, "RAC-OUB", "x");
  egal(pr.depart, "AB² = 25"); egal(pr.faux, "AB = 25"); egal(pr.bon, "AB = 5");
});
