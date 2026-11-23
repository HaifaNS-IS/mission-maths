/* Lot 2 — Parcours d'un palier : leçon → 3 séries → examen (80 %) ; échec → mini-leçon + remédiation → nouvel examen ; diagnostic P0. */
const { MM, test, egal, vrai } = require("./_harnais.js");
const P = MM.progression, R = MM.parcours, L = MM.lecon, Gn = MM.gen;
const fs = require("fs"), path = require("path");
const ouvert = id => { const e = P.etatInitial(); e.P0.statut = "valide"; for (const k of ["P1", "P2", "P3", "P4"]) { if (k === id) break; e[k].statut = "valide"; } e[id].statut = "en_cours"; return e; };

test("contenu : 1 leçon par palier, séries non vides, examen de 10 exercices (D44), diagnostic de 12 questions dont 5 sur les signes", () => {
  const index = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "lecons", "index.json"), "utf8"));
  for (const id of ["P1", "P2", "P3", "P4"]) {
    const c = R.CONTENU[id];
    vrai(index.lecons.some(m => m.pack_id === c.lecon && m.palier === id), "leçon absente : " + id);
    for (const s of ["guide", "semi", "seul"]) vrai(c[s].length >= 3, id + " " + s);
    egal(c.examen.length, 10, id);
    for (const sp of [].concat(c.guide, c.semi, c.seul, c.examen)) egal(Gn.def(sp.gen).palier, id, id + " : " + sp.gen + " appartient à un autre palier");
  }
  const d = R.CONTENU.P0.diagnostic;
  egal(d.length, 12); egal(d.filter(q => q.notion === "P1").length, 5);
  for (const id of ["P2", "P3", "P4"]) vrai(d.filter(q => q.notion === id).length >= 2, id);
  for (const sp of d) vrai(Gn.creer(sp.gen, sp.niveau, 5).enonce);
});
test("sections : leçon, guidé, semi, seul, puis examen ; l'examen reste fermé tant que les 3 séries ne sont pas validées", () => {
  const p = R.completerPalier({ statut: "en_cours" });
  egal(R.sections("P1", p).map(s => s.id).join(), "lecon,guide,semi,seul,examen");
  const suite = [];
  for (const s of ["lecon", "guide", "semi", "seul"]) { suite.push(R.sectionSuivante("P1", p)); vrai(!R.examenOuvert(p), "examen ouvert avant " + s); p.fait[s] = true; }
  egal(suite.join(), "lecon,guide,semi,seul");
  vrai(R.examenOuvert(p)); egal(R.sectionSuivante("P1", p), "examen");
  egal(R.sectionSuivante("P1", R.completerPalier({ statut: "verrouille" })), null);
  egal(R.sectionSuivante("P0", R.completerPalier({ statut: "en_cours" })), "diagnostic");
  egal(R.sectionSuivante("P0", R.completerPalier({ statut: "valide" })), null);
});
test("examen à 80 % : palier validé, palier suivant ouvert, pas de remédiation", () => {
  const e = R.apresExamenPalier(ouvert("P1"), "P1", 16, 20, [], 1000);
  egal(e.P1.statut, "valide"); egal(e.P1.meilleurExamen, 80); egal(e.P2.statut, "en_cours"); egal(e.P1.remediation, null); egal(e.P1.examens, 1);
});
test("examen à 79 % : palier pas validé, remédiation sur les 1 ou 2 erreurs dominantes, examen refermé jusqu'à la remédiation", () => {
  const lignes = [{ juste: false, code: "SIG-REL" }, { juste: false, code: "SIG-REL" }, { juste: false, code: "SIG-REL" }, { juste: false, code: "PRIO" }, { juste: false, code: "PRIO" }, { juste: false, code: "CALC" }, { juste: true }];
  const avant = ouvert("P1"); Object.assign(avant.P1, { fait: { lecon: true, guide: true, semi: true, seul: true } });
  const e = R.apresExamenPalier(avant, "P1", 79, 100, lignes, 1000);
  egal(e.P1.statut, "en_cours"); egal(e.P2.statut, "verrouille"); egal(e.P1.remediation.codes.join(), "SIG-REL,PRIO");
  egal(R.sections("P1", e.P1).map(s => s.id).join(), "lecon,guide,semi,seul,remedLecon,remed,examen");
  vrai(!R.examenOuvert(e.P1)); egal(R.sectionSuivante("P1", e.P1), "remedLecon");
  e.P1.remediation.fait.remedLecon = true; egal(R.sectionSuivante("P1", e.P1), "remed");
  e.P1.remediation.fait.remed = true; vrai(R.examenOuvert(e.P1)); egal(R.sectionSuivante("P1", e.P1), "examen");
  const ok = R.apresExamenPalier(e, "P1", 9, 10, [], 2000); egal(ok.P1.statut, "valide"); egal(ok.P1.remediation, null); egal(ok.P1.examens, 2);
});
test("erreurs dominantes : une seule si la 2e n'apparaît qu'une fois ; aucune si aucune erreur classée", () => {
  egal(R.codesDominants([{ juste: false, code: "SIG-PAR" }, { juste: false, code: "SIG-PAR" }, { juste: false, code: "RED-MIX" }]).join(), "SIG-PAR");
  egal(R.codesDominants([{ juste: false, code: null }, { juste: true, code: null }]).join(), "");
  egal(R.codesDominants([{ juste: false, code: "DIV-INV" }, { juste: false, code: "TRANS-SIG" }, { juste: false, code: "DIV-INV" }, { juste: false, code: "TRANS-SIG" }]).join(), "TRANS-SIG,DIV-INV");
});
test("remédiation : 4 exercices du palier où le piège peut se produire ; mini-leçon calculée pour chaque code possible", () => {
  for (const [id, codes] of [["P1", ["SIG-REL", "PRIO", "CALC"]], ["P2", ["SIG-PAR", "DIST-PART", "RED-MIX", "SIG-REL", "CALC"]], ["P3", ["TRANS-SIG", "DIV-INV", "SIG-REL", "CALC"]], ["P4", ["SIG-PAR", "DIST-PART", "RED-MIX", "TRANS-SIG", "DIV-INV", "SIG-REL", "CALC"]]]) {
    for (const code of codes) {
      const sp = R.specsRemediation(id, [code]); egal(sp.length, 4, id + " " + code);
      for (const s of sp) { egal(Gn.def(s.gen).palier, id); if (code !== "CALC") vrai([1, 2, 3, 4, 5, 6, 7, 8].some(g => { const x = Gn.creer(s.gen, s.niveau, g); return x.erreurs[code] && x.erreurs[code].length; }), id + " " + code + " : " + s.gen); }
      const l = L.preparer(R.packRemediation(id, code));
      vrai(l.titre.startsWith("Mini-leçon"), l.titre); vrai(l.idee && l.fiche.texte);
      if (code === "CALC") egal(l.piege, null); else { egal(l.piege.code, code); vrai(l.piege.faux !== l.piege.bon); }
    }
  }
});
test("diagnostic : tout juste → P1 à P4 validés d'office, P5 ouvert", () => {
  const res = R.CONTENU.P0.diagnostic.map(q => ({ notion: q.notion, juste: true }));
  const { paliers: e } = R.apresDiagnostic(P.etatInitial(), res, 5);
  egal(["P0", "P1", "P2", "P3", "P4"].map(k => e[k].statut).join(), "valide,valide,valide,valide,valide"); vrai(e.P1.parDiagnostic); egal(e.P5.statut, "en_cours");
});
test("diagnostic : P1 à 4/5 → il commence à P1, même s'il réussit tout le reste (jamais P1 sauté sans 5/5)", () => {
  const res = R.CONTENU.P0.diagnostic.map((q, i) => ({ notion: q.notion, juste: i !== 0 }));
  const { paliers: e, bilan } = R.apresDiagnostic(P.etatInitial(), res, 5);
  egal(e.P0.statut, "valide"); egal(e.P1.statut, "en_cours"); egal(e.P2.statut, "verrouille"); egal(e.P4.statut, "verrouille"); egal(P.palierActuel(e), "P1");
  egal(bilan.P1.justes + "/" + bilan.P1.total, "4/5");
});
test("diagnostic : P1 5/5 et P2 1 faute → P1 validé, il commence à P2, P3 reste fermé", () => {
  const res = R.CONTENU.P0.diagnostic.map(q => ({ notion: q.notion, juste: !(q.notion === "P2" && q.gen === "red") }));
  const { paliers: e } = R.apresDiagnostic(P.etatInitial(), res, 5);
  egal(e.P1.statut, "valide"); egal(e.P2.statut, "en_cours"); egal(e.P3.statut, "verrouille"); egal(P.palierActuel(e), "P2");
});
