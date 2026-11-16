/* QA 6 — Données : une séance faite sur le téléphone apparaît dans le rapport parent sur le PC ; hors ligne, rien n'est perdu au retour du réseau.
   Ici le réseau et la base sont simulés ; le test sur deux vrais appareils reste dans la checklist manuelle. */
const { MM, test, egal, vrai } = require("./_harnais.js");
const R = MM.rapport, O = MM.outils;

function fausseBase() {                       // même sémantique que la base de l'artefact : set remplace, update fusionne et exige le document
  const docs = {}; let enLigne = true, appels = 0;
  return {
    docs, appels: () => appels,
    reseau(v) { enLigne = v; },
    async envoyer(op) {
      appels++;
      if (!enLigne) { const e = new Error("hors ligne"); e.code = "unavailable"; throw e; }
      if (op.type === "set") docs[op.chemin] = JSON.parse(JSON.stringify(op.donnees));
      else { if (!docs[op.chemin]) { const e = new Error("absent"); e.code = "invalid_argument"; throw e; } O.fusionner(docs[op.chemin], op.donnees); }
    }
  };
}
const memoire = () => { let v = null; return { lire: () => v, ecrire: t => { v = t; } }; };

test("hors ligne : les écritures attendent dans le stockage de l'appareil, puis partent dans l'ordre au retour du réseau", async () => {
  const base = fausseBase(), stock = memoire(), f = MM.file.creerFile(stock, base.envoyer);
  base.reseau(false);
  f.ajouter({ id: "a", type: "set", chemin: "suivi/app/sessions/s1", donnees: { id: "s1", debut: 1 } });
  f.ajouter({ id: "b", type: "set", chemin: "suivi/app/tentatives/t1", donnees: { sid: "s1", juste: true } });
  const r1 = await f.vider(); vrai(!r1.ok); egal(r1.restant, 2); egal(r1.raison, "unavailable"); egal(Object.keys(base.docs).length, 0);
  vrai(JSON.parse(stock.lire()).ops.length === 2, "la file n'est pas rangée sur l'appareil");
  base.reseau(true);
  const r2 = await f.vider(); vrai(r2.ok); egal(f.taille(), 0);
  egal(Object.keys(base.docs).join(), "suivi/app/sessions/s1,suivi/app/tentatives/t1");
  egal(JSON.parse(stock.lire()).ops.length, 0);
});
test("application fermée hors ligne puis rouverte : la file est retrouvée et rien n'est perdu", async () => {
  const base = fausseBase(), stock = memoire();
  base.reseau(false);
  const f1 = MM.file.creerFile(stock, base.envoyer);
  for (let i = 1; i <= 5; i++) f1.ajouter({ id: "t" + i, type: "set", chemin: "suivi/app/tentatives/t" + i, donnees: { n: i } });
  await f1.vider();
  const f2 = MM.file.creerFile(stock, base.envoyer);                      // « réouverture »
  egal(f2.taille(), 5);
  base.reseau(true); await f2.vider();
  egal(Object.keys(base.docs).length, 5); egal(base.docs["suivi/app/tentatives/t3"].n, 3);
});
test("rejouer une écriture ne crée pas de doublon", async () => {
  const base = fausseBase(), f = MM.file.creerFile(memoire(), base.envoyer);
  const op = { id: "t1", type: "set", chemin: "suivi/app/tentatives/t1", donnees: { n: 1 } };
  f.ajouter(op); f.ajouter(op); await f.vider(); f.ajouter(op); await f.vider();
  egal(Object.keys(base.docs).length, 1);
});
test("même clé en attente : la dernière écriture remplace (une séance mise à jour 3 fois hors ligne = 1 envoi)", async () => {
  const base = fausseBase(), f = MM.file.creerFile(memoire(), base.envoyer);
  base.reseau(false);
  for (const n of [1, 2, 3]) f.ajouter({ id: "s1-" + n, cle: "seance:s1", type: "set", chemin: "suivi/app/sessions/s1", donnees: { nbQuestions: n } });
  egal(f.taille(), 1);
  base.reseau(true); await f.vider();
  egal(base.docs["suivi/app/sessions/s1"].nbQuestions, 3);
});
test("écriture refusée par la base : mise de côté après 3 essais, sans bloquer les suivantes ni disparaître", async () => {
  const base = fausseBase(), stock = memoire(), f = MM.file.creerFile(stock, base.envoyer);
  f.ajouter({ id: "u1", type: "update", chemin: "suivi/absent", donnees: { a: 1 } });
  f.ajouter({ id: "s1", type: "set", chemin: "suivi/app/sessions/s1", donnees: { id: "s1" } });
  for (let i = 0; i < 4; i++) await f.vider();
  egal(f.taille(), 0); egal(f.rejets().length, 1); egal(f.rejets()[0].id, "u1"); vrai(!!base.docs["suivi/app/sessions/s1"]);
  egal(JSON.parse(stock.lire()).rejets.length, 1);
  f.reprendreRejets(); egal(f.taille(), 1);
});
test("stockage de l'appareil indisponible : la file continue en mémoire", async () => {
  const base = fausseBase(), f = MM.file.creerFile({ lire() { throw new Error("interdit"); }, ecrire() { throw new Error("interdit"); } }, base.envoyer);
  f.ajouter({ id: "a", type: "set", chemin: "suivi/app/sessions/s1", donnees: {} });
  vrai((await f.vider()).ok); egal(Object.keys(base.docs).length, 1);
});
test("durée active : les trous de plus de 2 minutes ne comptent pas", () => {
  const m = 60000;
  egal(R.dureeActive([0, 1 * m, 2 * m, 3 * m]), 3 * m);
  egal(R.dureeActive([0, 1 * m, 4 * m, 5 * m]), 2 * m, "le trou de 3 minutes doit être exclu");
  egal(R.dureeActive([0, 2 * m]), 2 * m, "2 minutes pile comptent encore");
  egal(R.dureeActive([0, 2 * m + 1]), 0);
  const s = { debut: 0, fin: 0, dureeActive: 0 };
  for (const t of [30000, 60000, 400000, 430000]) R.pointer(s, t);
  egal(s.dureeActive, 90000); egal(s.fin, 430000);
  vrai(R.nouvelleSeanceRequise(s, 430000 + 31 * m)); vrai(!R.nouvelleSeanceRequise(s, 430000 + 29 * m)); vrai(R.nouvelleSeanceRequise(null, 0));
});
test("téléphone → PC : une séance faite hors ligne sur le téléphone ressort dans le rapport parent", async () => {
  const base = fausseBase(), m = 60000, J = 86400000, maintenant = 20 * J;
  base.docs["suivi/app"] = { schema: 1 };
  const tel = MM.file.creerFile(memoire(), base.envoyer);
  base.reseau(false);                                                    // le téléphone travaille sans réseau
  const seance = { id: "s-tel", debut: maintenant - 2 * J, fin: maintenant - 2 * J + 14 * m, dureeActive: 12 * m, palier: "T", nbQuestions: 2, parent: false };
  tel.ajouter({ id: "w1", cle: "seance:s-tel", type: "set", chemin: "suivi/app/sessions/s-tel", donnees: seance });
  tel.ajouter({ id: "w2", type: "set", chemin: "suivi/app/tentatives/t1", donnees: { id: "t1", sid: "s-tel", t: seance.debut + m, juste: false, lignes: [{ juste: true }, { juste: false, code: "SIG-PAR" }, { juste: true }] } });
  tel.ajouter({ id: "w3", type: "set", chemin: "suivi/app/tentatives/t2", donnees: { id: "t2", sid: "s-tel", t: seance.debut + 5 * m, juste: true, lignes: [{ juste: true }] } });
  tel.ajouter({ id: "w4", type: "update", chemin: "suivi/app", donnees: { eleve: { reprise: { section: "guide" } } } });
  await tel.vider(); egal(Object.keys(base.docs).length, 1, "rien ne doit partir hors ligne");
  base.reseau(true); await tel.vider();
  // côté PC : le rapport est calculé à la lecture, à partir de la base seule
  const lire = prefixe => Object.keys(base.docs).filter(k => k.startsWith(prefixe)).map(k => base.docs[k]);
  const seances = lire("suivi/app/sessions/").concat([{ id: "s-papa", debut: maintenant - J, fin: maintenant - J + 5 * m, dureeActive: 5 * m, parent: true }]);
  const r = R.resume(seances, lire("suivi/app/tentatives/"), maintenant);
  egal(r.derniere.id, "s-tel"); egal(r.minutes7j, 12); egal(r.seances7j, 1); egal(r.exercices7j, 2); egal(r.justes7j, 1);
  egal(JSON.stringify(r.erreurs7j), JSON.stringify([{ code: "SIG-PAR", n: 1 }])); egal(r.joursSansSeance, 2); egal(r.essaisParent, 1);
  egal(base.docs["suivi/app"].eleve.reprise.section, "guide"); egal(base.docs["suivi/app"].schema, 1);
  const liste = R.parSeance(seances, lire("suivi/app/tentatives/")); egal(liste[0].id, "s-papa"); egal(liste[1].tentatives.map(t => t.id).join(), "t1,t2");
});
test("rapport vide : pas de plantage, pas de chiffre inventé", () => {
  const r = R.resume([], [], 1000);
  egal(r.derniere, null); egal(r.minutes7j, 0); egal(r.joursSansSeance, null); egal(r.erreurs7j.length, 0);
  egal(R.texteDuree(45000), "45 s"); egal(R.texteDuree(125000), "2 min 05 s"); egal(R.texteDuree(15 * 60000), "15 min");
});
