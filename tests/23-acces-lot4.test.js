/* Lot 4a — contenu de P6 et P7, accès aux leçons (D85), paliers P10 à P13 au cahier des charges (section 3). */
const { MM, test, egal, vrai } = require("./_harnais.js");
const PA = MM.parcours, P = MM.progression, Gn = MM.gen, D = MM.diag;

test("paliers : P10 à P13 ajoutés entre P9 et l'examen final, dans l'ordre du cahier des charges", () => {
  egal(P.PALIERS.map(p => p.id).join(), "P0,P1,P2,P3,P4,P5,P6,P7,P8,P9,P10,P11,P12,P13,FINAL");
  for (const p of P.PALIERS) vrai(p.nom && p.resume, p.id);
  const o = P.etatInitial(); egal(o.P10.statut, "verrouille");
  o.P9.statut = "en_cours"; egal(P.apresExamen(o, "P9", 8, 10, 1).P10.statut, "en_cours", "P9 validé ouvre P10");
});
test("livrés : P0 à P7 avec séries et examen ; P8, P10, P11 avec la leçon seule", () => {
  egal(PA.LIVRES.join(), "P0,P1,P2,P3,P4,P5,P6,P7");
  egal(PA.LECONS_SEULES.join(), "P8,P10,P11");
  for (const id of PA.LECONS_SEULES) { vrai(PA.CONTENU[id].lecon, id); vrai(!PA.CONTENU[id].guide && !PA.CONTENU[id].examen, id + " : pas de série au lot 4a"); }
});
test("P6 : leçon, 3 séries, examen de 10 exercices (5 points à placer, 5 à lire)", () => {
  const c = PA.CONTENU.P6;
  egal(c.lecon, "LECO-N06-A");
  for (const s of ["guide", "semi", "seul"]) { vrai(c[s].length >= 4, s); for (const sp of c[s]) Gn.creer(sp.gen, sp.niveau, 1); }
  egal(c.examen.length, 10);
  egal(c.examen.filter(s => s.gen === "placer").length, 5); egal(c.examen.filter(s => s.gen === "lire").length, 5);
  vrai(c.examen.some(s => s.niveau === 3), "un point sur un axe à l'examen");
});
test("P7 : examen au format du tableau de l'ex. 3a (2 lignes y = mx + b, une constante, une forme inversée, la ligne vide)", () => {
  const c = PA.CONTENU.P7, k = c.examen.map(s => s.gen + s.niveau).join();
  egal(k, "ligne1,ligne1,ligne3,ligne2,eqmb1");
  egal(c.lecon, "LECO-N07-A");
  vrai(c.guide.some(s => s.gen === "tracer") && c.semi.some(s => s.gen === "tracer"), "tracer depuis m et b dans les séries");
});
test("D85 : leçons toujours ouvertes, même palier fermé ; P9 et P12 sans leçon", () => {
  for (const id of ["P1", "P5", "P6", "P7", "P8", "P10", "P11"]) vrai(PA.leconOuverte(id), id);
  for (const id of ["P0", "P9", "P12", "P13", "FINAL", "G1"]) vrai(!PA.leconOuverte(id), id);
});
test("D82 + D85 : séries de P1 à P7 ouvertes d'office jusqu'au 29/11 inclus, fermées le 30/11 ; jamais P8 ni au-delà", () => {
  for (const id of ["P1", "P2", "P3", "P4", "P5", "P6", "P7"]) { vrai(PA.ouvertDoffice(id, "2026-11-25"), id); vrai(PA.ouvertDoffice(id, "2026-11-29"), id); vrai(!PA.ouvertDoffice(id, "2026-11-30"), id + " le 30/11"); }
  for (const id of ["P0", "P8", "P9", "P10", "P11"]) vrai(!PA.ouvertDoffice(id, "2026-11-25"), id);
});
test("remédiation : une parade pour chaque code du lot 4, et une mini-leçon calculée avec son piège", () => {
  for (const c of ["XY-INV", "M-MX", "B-SIG", "ORD-INV", "M-ZERO"]) {
    vrai(PA.PARADES[c], "parade " + c);
    const id = c === "XY-INV" ? "P6" : "P7", pack = PA.packRemediation(id, c), l = MM.lecon.preparer(pack);
    vrai(l.piege && l.piege.code === c, "mini-leçon sans piège : " + c);
    egal(PA.specsRemediation(id, [c]).length, 4);
  }
});
test("examen P6 à 80 % : P6 validé, P7 ouvert ; à 79 % : remédiation sur XY-INV", () => {
  const o = P.etatInitial(); o.P6.statut = "en_cours";
  egal(PA.apresExamenPalier(o, "P6", 8, 10, [], 1).P7.statut, "en_cours");
  const r = PA.apresExamenPalier(o, "P6", 7, 10, [{ juste: false, code: "XY-INV" }, { juste: false, code: "XY-INV" }], 1);
  egal(r.P6.statut, "en_cours"); egal(r.P6.remediation.codes.join(), "XY-INV");
});
