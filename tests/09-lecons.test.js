/* Module Leçons : chaque pack est valide, et tout ce qu'il affiche comme calcul vient du moteur. */
const fs = require("fs"), path = require("path");
const { MM, test, egal, vrai } = require("./_harnais.js");
require(path.join(__dirname, "..", "js", "lecon.js"));
const E = MM.expr, T = MM.etapes, L = MM.lecon;
const dossier = path.join(__dirname, "..", "lecons");
const index = JSON.parse(fs.readFileSync(path.join(dossier, "index.json"), "utf8"));

test("index des leçons : une leçon par palier P1 à P5, chaque fichier existe et porte le bon identifiant", () => {
  egal(index.lecons.map(m => m.palier).join(), "P1,P2,P3,P4,P5");
  for (const m of index.lecons) { const p = JSON.parse(fs.readFileSync(path.join(__dirname, "..", m.fichier), "utf8")); egal(p.pack_id, m.pack_id); egal(p.palier, m.palier); egal(p.version, m.version); }
});
for (const m of index.lecons) {
  const pack = JSON.parse(fs.readFileSync(path.join(__dirname, "..", m.fichier), "utf8"));
  test(m.pack_id + " : pack accepté par le validateur", () => { egal(L.valider(pack).join(" ; "), ""); });
  test(m.pack_id + " : exemple résolu juste, ligne après ligne", () => {
    const l = L.preparer(pack), N = MM.nombres;
    vrai(l.exemple.lignes.length >= (l.exemple.type === "second" ? 6 : l.exemple.type === "equation" ? 3 : 2), "exemple trop court");
    if (l.exemple.type === "second") {     // second degré : les lignes viennent du moteur P5 (rejouées sans aide dans 17-generateurs-p5)
      for (const li of l.exemple.lignes) vrai(li.ligne && li.pourquoi.length > 5, li.ligne);
      return egal(l.exemple.lignes[l.exemple.lignes.length - 1].ligne, l.exemple.reponse);
    }
    const egalDepart = {
      equation: li => T.equivalentes(E.lireEquation(l.exemple.enonce), E.lireEquation(li.split(" = ").slice(0, 2).join(" = "))),
      expression: li => E.lireExpression(li).poly.egal(E.lireExpression(l.exemple.enonce).poly),
      nombre: li => N.valeur(E.arbre(li)).egal(N.valeur(E.arbre(l.exemple.enonce)))
    }[l.exemple.type];
    for (const li of l.exemple.lignes) { vrai(egalDepart(li.ligne), li.ligne); vrai(li.pourquoi.length > 5); }
    egal(l.exemple.lignes[l.exemple.lignes.length - 1].ligne, l.exemple.reponse);
  });
  test(m.pack_id + " : le piège montré est bien l'erreur annoncée, et la bonne ligne est juste", () => {
    const l = L.preparer(pack), N = MM.nombres, p = l.piege;
    if (p.type === "second") {             // le piège rejoué dans le moteur P5, à l'étape où il se commet
      const S2 = MM.second, e = S2.etape(p.verifier.etape), etat = p.verifier.etat, dep = S2.departEtape(e, etat), prev = dep == null ? null : E.arbre(dep);
      const v = S2.juger(e, etat, prev, true, p.verifier.faux); egal(v.statut, "faux"); egal(v.code, pack.lecon.piege.code);
      vrai(["juste", "incomplet"].includes(S2.juger(e, etat, prev, true, p.verifier.bon).statut), "bonne ligne refusée");
      return vrai(p.explication.ou.length > 10 && p.explication.regle.length > 5);
    }
    const juge = { equation: (t) => T.jugerLigne(E.lireEquation(p.depart), t, null), expression: (t) => T.jugerExpression(E.lireExpression(p.depart).termes, t, null), nombre: (t) => N.juger(E.arbre(p.depart), t, null) }[p.type];
    const v = juge(p.faux); egal(v.statut, "faux"); egal(v.code, pack.lecon.piege.code);
    egal(juge(p.bon).statut, "juste");
    vrai(p.explication.ou.length > 10 && p.explication.regle.length > 5);
  });
  test(m.pack_id + " : les 2 questions « À toi » se génèrent, avec des nombres différents à chaque fois", () => {
    const l = L.preparer(pack); egal(l.aToi.length, 2);
    for (const q of l.aToi) { const a = MM.gen.creer(q.gen, q.niveau, 11), b = MM.gen.creer(q.gen, q.niveau, 12); vrai(a.enonce && b.enonce && a.enonce !== b.enonce); }
  });
}
test("validateur : un pack défectueux est refusé avec la raison", () => {
  const bon = JSON.parse(fs.readFileSync(path.join(__dirname, "..", index.lecons[0].fichier), "utf8"));
  const casse = (f) => { const p = JSON.parse(JSON.stringify(bon)); f(p); return L.valider(p).join(" ; "); };
  vrai(/générateur inconnu/.test(casse(p => { p.lecon.exemple.gen = "nexistepas"; })));
  vrai(/2 questions/.test(casse(p => { p.lecon.a_toi.pop(); })));
  vrai(/piege\.code/.test(casse(p => { p.lecon.piege.code = "AIRE-2"; })));
  vrai(/palier/.test(casse(p => { delete p.palier; })));
  vrai(/une phrase/.test(casse(p => { p.lecon.idee = "Première phrase. Deuxième phrase."; })));
  vrai(/pack_id/.test(casse(p => { p.pack_id = "LECON-1"; })));
  vrai(/lecon manquant/.test(casse(p => { delete p.lecon; })));
});
