/* Module Leçons : chaque pack est valide, et tout ce qu'il affiche comme calcul vient du moteur. */
const fs = require("fs"), path = require("path");
const { MM, test, egal, vrai } = require("./_harnais.js");
require(path.join(__dirname, "..", "js", "lecon.js"));
const E = MM.expr, T = MM.etapes, L = MM.lecon;
const dossier = path.join(__dirname, "..", "lecons");
const index = JSON.parse(fs.readFileSync(path.join(dossier, "index.json"), "utf8"));

test("index des leçons : chaque fichier existe et porte le bon identifiant", () => {
  vrai(index.lecons.length >= 1);
  for (const m of index.lecons) { const p = JSON.parse(fs.readFileSync(path.join(__dirname, "..", m.fichier), "utf8")); egal(p.pack_id, m.pack_id); egal(p.palier, m.palier); egal(p.version, m.version); }
});
for (const m of index.lecons) {
  const pack = JSON.parse(fs.readFileSync(path.join(__dirname, "..", m.fichier), "utf8"));
  test(m.pack_id + " : pack accepté par le validateur", () => { egal(L.valider(pack).join(" ; "), ""); });
  test(m.pack_id + " : exemple résolu juste, ligne après ligne", () => {
    const l = L.preparer(pack), eq0 = E.lireEquation(l.exemple.enonce);
    vrai(l.exemple.lignes.length >= 3, "exemple trop court");
    for (const li of l.exemple.lignes) { vrai(T.equivalentes(eq0, E.lireEquation(li.ligne.split(" = ").slice(0, 2).join(" = "))), li.ligne); vrai(li.pourquoi.length > 5); }
    egal(l.exemple.lignes[l.exemple.lignes.length - 1].ligne, l.exemple.reponse);
  });
  test(m.pack_id + " : le piège montré est bien l'erreur annoncée, et la bonne ligne est juste", () => {
    const l = L.preparer(pack), avant = E.lireEquation(l.piege.depart);
    const v = T.jugerLigne(avant, l.piege.faux, null); egal(v.statut, "faux"); egal(v.code, pack.lecon.piege.code);
    egal(T.jugerLigne(avant, l.piege.bon, null).statut, "juste");
    vrai(l.piege.explication.ou.length > 10 && l.piege.explication.regle.length > 5);
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
  vrai(/une phrase/.test(casse(p => { p.lecon.idee = "Première phrase. Deuxième phrase."; })));
  vrai(/pack_id/.test(casse(p => { p.pack_id = "LECON-1"; })));
  vrai(/lecon manquant/.test(casse(p => { delete p.lecon; })));
});
