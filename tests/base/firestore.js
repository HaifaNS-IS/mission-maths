/* Lot 1 bis — base.js contre Firestore (émulateur local, mêmes règles que le vrai projet : firestore.rules).
   Lancer : node tests/avec-emulateur.js tests/base/firestore.js */
const path = require("path");
const RACINE = path.join(__dirname, "..", "..");
["outils", "base", "config"].forEach(f => require(path.join(RACINE, "js", f + ".js")));
const { objetAuHasard } = require("./_objets.js");
const MM = globalThis.MM, B = MM.base, O = MM.outils;
const fb = { app: require("firebase/app"), auth: require("firebase/auth"), firestore: require("firebase/firestore") };
fb.firestore.setLogLevel("silent");
const EMU = { auth: "127.0.0.1:9099", firestore: "127.0.0.1:8080" };
const PROJET = MM.config.firebase.projectId;

const resultats = [];
async function test(nom, fn) {
  try { await fn(); resultats.push(["✓", nom]); }
  catch (e) { resultats.push(["✗", nom + " → " + (e && (e.message || e.code) || JSON.stringify(e))]); }
}
const egal = (a, b, m) => { if (a !== b) throw new Error((m ? m + " : " : "") + "obtenu " + JSON.stringify(a) + ", attendu " + JSON.stringify(b)); };
const vrai = (v, m) => { if (!v) throw new Error(m || "condition fausse"); };
const pause = ms => new Promise(r => setTimeout(r, ms));
const hasard = n => new Uint8Array(require("crypto").randomBytes(n));
/* JSON aux clés triées : Firestore range les clés des maps, l'appareil non. */
const canon = v => JSON.stringify(v, (k, x) => x && typeof x === "object" && !Array.isArray(x) ? Object.keys(x).sort().reduce((o, c) => (o[c] = x[c], o), {}) : x);
async function rejet(p) { try { await p; } catch (e) { return e; } throw new Error("aucune erreur alors qu'un refus était attendu"); }

/* Lecture « administrateur » de l'émulateur (passe outre les règles) : sert à vérifier ce qui est vraiment écrit. */
async function lireAdmin(chemin) {
  const r = await fetch(`http://${EMU.firestore}/v1/projects/${PROJET}/databases/(default)/documents/${chemin}`, { headers: { Authorization: "Bearer owner" } });
  if (r.status === 404) return null;
  return decoder({ mapValue: { fields: (await r.json()).fields || {} } });
}
function decoder(v) {
  if ("nullValue" in v) return null;
  if ("booleanValue" in v) return v.booleanValue;
  if ("integerValue" in v) return Number(v.integerValue);
  if ("doubleValue" in v) return v.doubleValue;
  if ("stringValue" in v) return v.stringValue;
  if ("arrayValue" in v) return (v.arrayValue.values || []).map(decoder);
  if ("mapValue" in v) { const o = {}; for (const [k, x] of Object.entries(v.mapValue.fields || {})) o[k] = decoder(x); return o; }
  throw new Error("type inconnu " + JSON.stringify(v));
}

(async () => {
  const CLE = B.nouvelleCle(hasard);
  const base = B.creer(fb, { config: MM.config.firebase, cle: CLE, emulateur: EMU });

  await test("première écriture juste après l'ouverture : elle attend la connexion anonyme, aucun refus", async () => {
    await base.doc("suivi/app").set({ schema: 1, eleve: { nom: "Alex" } });
    egal(canon(await lireAdmin(`familles/${CLE}/suivi/app`)), canon({ schema: 1, eleve: { nom: "Alex" } }));
  });
  await test("relecture : get() donne exists et data()", async () => {
    const s = await base.doc("suivi/app").get(); vrai(s.exists === true); egal(s.data().eleve.nom, "Alex");
    const v = await base.doc("suivi/app/sessions/absente").get(); vrai(v.exists === false); egal(v.data(), undefined);
  });
  await test("update = fusionner() de l'appareil : 150 paires tirées au hasard, résultat identique dans Firestore", async () => {
    const alea = O.alea(161126).suivant;
    for (let i = 0; i < 150; i++) {
      const cible = objetAuHasard(alea, 0), source = objetAuHasard(alea, 0), d = base.doc("essais/f" + i);
      await d.set(cible); await d.update(source);
      const attendu = O.fusionner(JSON.parse(JSON.stringify(cible)), source);
      egal(canon(await lireAdmin(`familles/${CLE}/essais/f${i}`)), canon(attendu), "paire " + i + " " + JSON.stringify({ cible, source }));
    }
  });
  await test("update d'un point de reprise sur une valeur null (cas réel : eleve.reprise vaut null au départ)", async () => {
    const d = base.doc("suivi/app");
    await d.update({ eleve: { reprise: null } });
    await d.update({ eleve: { reprise: { palier: "T", section: "guide", exos: [{ gen: "eq1par", graine: 5 }], k: 2 } } });
    const lu = await lireAdmin(`familles/${CLE}/suivi/app`);
    egal(canon(lu.eleve), canon({ nom: "Alex", reprise: { palier: "T", section: "guide", exos: [{ gen: "eq1par", graine: 5 }], k: 2 } }));
  });
  await test("update d'un document absent → code « introuvable » (l'app recrée alors le document complet)", async () => {
    egal((await rejet(base.doc("suivi/absent").update({ a: 1 }))).code, "introuvable");
  });
  await test("écoute : document absent, puis présent après écriture, métadonnées fromCache et hasPendingWrites lues", async () => {
    const vus = [];
    const stop = base.doc("suivi/ecoute").onSnapshot(s => vus.push({ ex: s.exists, d: s.exists ? s.data() : null, cache: s.metadata.fromCache, att: s.metadata.hasPendingWrites }), e => vus.push({ err: e.code }));
    for (let i = 0; i < 40 && !vus.some(v => v.cache === false); i++) await pause(100);
    vrai(vus.some(v => v.ex === false && v.cache === false), "pas d'instantané serveur « absent » : " + JSON.stringify(vus));
    await base.doc("suivi/ecoute").set({ n: 1 });
    for (let i = 0; i < 40 && !vus.some(v => v.ex && !v.att && !v.cache); i++) await pause(100);
    stop();
    vrai(vus.some(v => v.ex && v.d.n === 1 && v.att === false && v.cache === false), "pas d'instantané confirmé : " + JSON.stringify(vus));
    vrai(typeof vus[0].cache === "boolean" && typeof vus[0].att === "boolean");
  });
  await test("collection triée et limitée (rapport parent) : 30 tentatives, les 10 plus récentes dans l'ordre", async () => {
    const ts = []; for (let i = 0; i < 30; i++) ts.push(1000 + ((i * 7919) % 97));
    for (let i = 0; i < 30; i++) await base.doc("suivi/app/tentatives/t" + i).set({ id: "t" + i, t: ts[i] });
    const r = await base.collection("suivi/app/tentatives").orderBy("t", "desc").limit(10).get();
    egal(r.docs.length, 10); egal(r.size, 10); vrai(r.empty === false);
    egal(r.docs.map(d => d.data().t).join(), ts.slice().sort((a, b) => b - a).slice(0, 10).join());
    vrai(typeof r.docs[0].id === "string");
  });
  await test("deux envois identiques en même temps : une seule écriture en vol (pas d'empilement hors ligne)", async () => {
    const d = base.doc("suivi/app/sessions/s1"), p1 = d.set({ id: "s1", debut: 1 }), p2 = d.set({ id: "s1", debut: 1 });
    vrai(p1 === p2, "deux écritures lancées"); await p1;
    const p3 = d.set({ id: "s1", debut: 1 }); vrai(p3 !== p1, "l'écriture terminée est réutilisée à tort"); await p3;
  });
  await test("chemin mal formé (nombre impair de morceaux) → invalid_argument, jamais d'exception non rattrapée", async () => {
    egal((await rejet(Promise.resolve().then(() => base.doc("suivi/app/sessions").set({ a: 1 })))).code, "invalid_argument");
  });

  /* ---------- règles de la base (mêmes que le vrai projet) ---------- */
  await test("règles : sans connexion anonyme, écriture refusée (permission_denied)", async () => {
    const app = fb.app.initializeApp(MM.config.firebase, "sans-connexion");
    const db = fb.firestore.getFirestore(app); fb.firestore.connectFirestoreEmulator(db, "127.0.0.1", 8080);
    const e = await rejet(fb.firestore.setDoc(fb.firestore.doc(db, `familles/${CLE}/suivi/pirate`), { a: 1 }));
    egal(B.traduireErreur(e).code, "permission_denied");
    egal(await lireAdmin(`familles/${CLE}/suivi/pirate`), null);
  });
  await test("règles : clé de 31 caractères refusée en écriture et en lecture", async () => {
    const courte = B.creer(fb, { config: MM.config.firebase, cle: CLE.slice(0, 31), emulateur: EMU });
    egal((await rejet(courte.doc("suivi/app").set({ a: 1 }))).code, "permission_denied");
    egal((await rejet(courte.doc("suivi/app").get())).code, "permission_denied");
  });
  await test("règles : personne ne peut lister les familles", async () => {
    const app = fb.app.initializeApp(MM.config.firebase, "lister");
    const auth = fb.auth.getAuth(app); fb.auth.connectAuthEmulator(auth, "http://" + EMU.auth, { disableWarnings: true });
    const db = fb.firestore.getFirestore(app); fb.firestore.connectFirestoreEmulator(db, "127.0.0.1", 8080);
    await fb.auth.signInAnonymously(auth);
    egal(B.traduireErreur(await rejet(fb.firestore.getDocs(fb.firestore.collection(db, "familles")))).code, "permission_denied");
    egal(B.traduireErreur(await rejet(fb.firestore.setDoc(fb.firestore.doc(db, "autre/x"), { a: 1 }))).code, "permission_denied", "écriture hors de familles/");
    egal(B.traduireErreur(await rejet(fb.firestore.setDoc(fb.firestore.doc(db, `familles/${CLE}`), { a: 1 }))).code, "permission_denied", "document racine de la famille");
  });
  await test("écoute refusée (clé trop courte) → rappel d'erreur permission_denied, pas de plantage", async () => {
    const courte = B.creer(fb, { config: MM.config.firebase, cle: CLE.slice(0, 20), emulateur: EMU });
    let err = null; courte.doc("suivi/app").onSnapshot(() => {}, e => { err = e; });
    for (let i = 0; i < 50 && !err; i++) await pause(100);
    vrai(err, "aucune erreur reçue"); egal(err.code, "permission_denied");
  });
  await test("limite acceptée (D28) : un autre appareil qui connaît la clé lit et écrit la même famille", async () => {
    const autre = B.creer(fb, { config: MM.config.firebase, cle: CLE, emulateur: EMU });
    egal((await autre.doc("suivi/app").get()).data().eleve.nom, "Alex");
  });

  for (const r of resultats) console.log(r[0] + " " + r[1]);
  const ko = resultats.filter(r => r[0] === "✗").length;
  console.log("\nFIRESTORE (émulateur) " + (resultats.length - ko) + "/" + resultats.length + (ko ? " ✗" : " ✓"));
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error("ARRÊT", e); process.exit(2); });
