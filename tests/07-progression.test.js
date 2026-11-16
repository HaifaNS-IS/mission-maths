/* QA 5 — Progression : 80 % débloque le palier suivant, 79 % non ; deux échecs en révision repassent le palier en « à consolider ». */
const { MM, test, egal, vrai } = require("./_harnais.js");
const P = MM.progression;
const ouvert = () => { const e = P.etatInitial(); e.P0.statut = "valide"; e.P1.statut = "en_cours"; return e; };

test("11 lignes : P0 à P9 puis l'examen blanc ; seul P0 est ouvert au départ", () => {
  egal(P.PALIERS.map(p => p.id).join(), "P0,P1,P2,P3,P4,P5,P6,P7,P8,P9,FINAL");
  const e = P.etatInitial(); egal(e.P0.statut, "en_cours"); vrai(P.PALIERS.slice(1).every(p => e[p.id].statut === "verrouille")); egal(P.palierActuel(e), "P0");
});
test("80 % valide le palier et ouvre le suivant", () => {
  const e = P.apresExamen(ouvert(), "P1", 8, 10, 1000);
  egal(e.P1.statut, "valide"); egal(e.P1.meilleurExamen, 80); egal(e.P1.valideLe, 1000); egal(e.P2.statut, "en_cours"); egal(e.P3.statut, "verrouille"); egal(P.palierActuel(e), "P2");
});
test("79 % ne valide rien", () => {
  for (const [pts, tot] of [[79, 100], ["7.9", 10], ["31.6", 40]]) { const e = P.apresExamen(ouvert(), "P1", pts, tot, 1000); egal(e.P1.statut, "en_cours", pts + "/" + tot); egal(e.P2.statut, "verrouille"); egal(e.P1.meilleurExamen, 79); }
});
test("seuil exact, sans arrondi : 32/40 passe, 31,9/40 non, 100 % passe, 0 non", () => {
  vrai(P.reussi(32, 40)); vrai(!P.reussi("31.9", 40)); vrai(P.reussi(10, 10)); vrai(!P.reussi(0, 10)); vrai(!P.reussi(5, 0)); vrai(P.reussi("16", "20")); vrai(!P.reussi("15.99", "20"));
});
test("l'ancien état n'est pas modifié ; un palier verrouillé ne peut pas être validé", () => {
  const avant = ouvert(), copie = JSON.stringify(avant);
  P.apresExamen(avant, "P1", 10, 10, 1); egal(JSON.stringify(avant), copie);
  const e = P.apresExamen(avant, "P5", 10, 10, 1); egal(e.P5.statut, "verrouille"); egal(e.P6.statut, "verrouille");
});
test("le meilleur score est gardé ; repasser un examen raté puis réussi valide", () => {
  let e = P.apresExamen(ouvert(), "P1", 6, 10, 1); egal(e.P1.meilleurExamen, 60);
  e = P.apresExamen(e, "P1", 5, 10, 2); egal(e.P1.meilleurExamen, 60); egal(e.P1.statut, "en_cours");
  e = P.apresExamen(e, "P1", 9, 10, 3); egal(e.P1.meilleurExamen, 90); egal(e.P1.statut, "valide"); egal(e.P1.valideLe, 3);
});
test("révision : deux échecs de suite → « à consolider » ; un succès entre les deux remet le compteur à zéro", () => {
  let e = P.apresExamen(ouvert(), "P1", 9, 10, 1);
  e = P.apresRevision(e, "P1", false); egal(e.P1.statut, "valide"); egal(e.P1.echecsRevision, 1);
  e = P.apresRevision(e, "P1", true); egal(e.P1.echecsRevision, 0);
  e = P.apresRevision(e, "P1", false); egal(e.P1.statut, "valide");
  e = P.apresRevision(e, "P1", false); egal(e.P1.statut, "a_consolider");
  egal(P.apresRevision(ouvert(), "P1", false).P1.statut, "en_cours", "un palier pas encore validé ne bouge pas");
});
test("« Section suivante » : leçon, série guidée, semi-guidée, seul, examen, puis rien", () => {
  const fait = {};
  for (const s of ["lecon", "guide", "semi", "seul", "examen"]) { egal(P.sectionSuivante(fait), s); fait[s] = true; }
  egal(P.sectionSuivante(fait), null);
  egal(P.sectionSuivante({ lecon: true }, ["lecon", "guide", "semi", "seul"]), "guide");
});
