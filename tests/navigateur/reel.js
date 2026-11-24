/* Recette automatique contre la VRAIE base Firebase (pas l'émulateur) : node tests/navigateur/reel.js [adresse du site]
   Sans adresse : le dépôt est servi en local. Avec : https://haifans-is.github.io/mission-maths/
   Crée une famille d'essai, joue une leçon sur un « téléphone élève », vérifie le rapport sur un « téléphone parent »,
   coupe le réseau, oublie la clé, puis efface toutes les données de la famille d'essai. */
const http = require("http"), fs = require("fs"), path = require("path");
const { chromium } = require("/opt/npm-tools/node_modules/playwright");
const RACINE_APP = path.join(__dirname, "..", "..");
["outils", "base", "config"].forEach(f => require(path.join(RACINE_APP, "js", f + ".js")));
const MM = globalThis.MM, CFG = MM.config.firebase;
const PRENOM = "Essai";
const SHOTS = "/home/claude/shots"; fs.mkdirSync(SHOTS, { recursive: true });

let ADRESSE = process.argv[2] || null, serveur = null;
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8" };

/* ---------- accès REST à la vraie base, avec une connexion anonyme (mêmes règles que l'app) ---------- */
let JETON = null, CLE = null;
const DOCS = `https://firestore.googleapis.com/v1/projects/${CFG.projectId}/databases/(default)/documents/`;
async function jeton() {
  if (JETON) return JETON;
  const r = await (await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${CFG.apiKey}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: '{"returnSecureToken":true}' })).json();
  if (!r.idToken) throw new Error("connexion anonyme impossible : " + JSON.stringify(r));
  return (JETON = r.idToken);
}
function decoder(v) {
  if ("nullValue" in v) return null; if ("booleanValue" in v) return v.booleanValue;
  if ("integerValue" in v) return Number(v.integerValue); if ("doubleValue" in v) return v.doubleValue; if ("stringValue" in v) return v.stringValue;
  if ("arrayValue" in v) return (v.arrayValue.values || []).map(decoder);
  if ("mapValue" in v) { const o = {}; for (const [k, x] of Object.entries(v.mapValue.fields || {})) o[k] = decoder(x); return o; }
  return null;
}
async function lire(chemin) {
  const r = await fetch(DOCS + `familles/${CLE}/` + chemin, { headers: { Authorization: "Bearer " + await jeton() } });
  if (r.status === 404) return null; const j = await r.json(); if (j.error) throw new Error(j.error.message);
  return decoder({ mapValue: { fields: j.fields || {} } });
}
async function lister(coll) {
  const r = await (await fetch(DOCS + `familles/${CLE}/` + coll + "?pageSize=300", { headers: { Authorization: "Bearer " + await jeton() } })).json();
  if (r.error) throw new Error(r.error.message); return r.documents || [];
}
async function effacerFamille() {
  let n = 0;
  for (const c of ["suivi/app/sessions", "suivi/app/tentatives"]) for (const d of await lister(c)) { await fetch("https://firestore.googleapis.com/v1/" + d.name, { method: "DELETE", headers: { Authorization: "Bearer " + await jeton() } }); n++; }
  await fetch(DOCS + `familles/${CLE}/suivi/app`, { method: "DELETE", headers: { Authorization: "Bearer " + await jeton() } }); n++;
  return n;
}

const resultats = [], erreursPage = [];
async function verif(nom, fn) {
  try { await fn(); resultats.push(["✓", nom]); } catch (e) { resultats.push(["✗", nom + " → " + (e && e.message ? e.message.split("\n")[0] : e)]); }
  console.log(resultats[resultats.length - 1].join(" "));
}
const vrai = (v, m) => { if (!v) throw new Error(m || "faux"); };
const egal = (a, b, m) => { if (a !== b) throw new Error((m ? m + " : " : "") + JSON.stringify(a) + " au lieu de " + JSON.stringify(b)); };
const pause = ms => new Promise(r => setTimeout(r, ms));
async function attendre(fn, ms, quoi) { const fin = Date.now() + (ms || 10000); while (Date.now() < fin) { const v = await fn().catch(() => null); if (v) return v; await pause(250); } throw new Error("délai dépassé : " + (quoi || "condition")); }
const pastilleOK = (page, ms) => page.waitForFunction(() => document.querySelector("#pastille") && /Synchronisé/.test(document.querySelector("#pastille").textContent), null, { timeout: ms || 20000 });

const TELEPHONE = { viewport: { width: 380, height: 800 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, locale: "fr-FR" };
async function appareil(nav, nom) {
  const ctx = await nav.newContext(TELEPHONE);
  const page = await ctx.newPage();
  page.on("pageerror", e => erreursPage.push(nom + " : " + e.message));
  return { ctx, page };
}
async function taper(page, texte) {
  for (const ch of texte.replace(/\s/g, "")) { const k = ch === "-" ? "−" : ch === "." ? "," : ch; await page.locator(`#clavier button[data-k="${k}"]`).tap(); }
  await page.locator('#clavier button[data-k="ok"]').tap(); await pause(60);
}
/* Résout l'exercice en cours avec des lignes justes, calculées par le moteur de l'app (diagnostic : faux si on le demande). */
async function resoudre(page, faux) {
  for (let s = 0; s < 10; s++) {
    if (await page.evaluate(() => Q.fini)) return;
    await taper(page, await page.evaluate((faux) => {
      const ex = Q.exo, F = MM.F;
      if (Q.mode === "diag" || Q.mode === "seul") { const d = faux ? 1 : 0; return (ex.type === "equation" ? "x=" + F(ex.reponse).plus(d).texte() : ex.type === "second" ? "x=" + F(ex.diag.reponse).plus(d).texte() : ex.type === "expression" ? ex.reponse + (d ? "+1" : "") : F(ex.reponse).plus(d).texte()).replace(/−/g, "-"); }
      const et = Q.etapes[Q.k], type = et.type || ex.type;
      return (type === "equation" ? MM.expr.ecrireEquation(MM.etapes.prochaine(Q.prev, et.forme)) : type === "expression" ? MM.expr.ecrireCote(MM.etapes.attenduExpr(Q.prev, et.forme)) : MM.nombres.prochaine(Q.prev, et.forme)).replace(/−/g, "-");
    }, !!faux));
  }
  throw new Error("exercice non terminé");
}
async function suite(page) { await page.tap("#suite"); for (let i = 0; i < 3 && await page.evaluate(() => vue === "pause"); i++) await page.locator("#app .btn").first().tap(); }
const code = async (page, c) => { for (const k of c) await page.getByRole("button", { name: k, exact: true }).tap(); };

(async () => {
  if (!ADRESSE) {
    serveur = http.createServer((req, res) => {
      const f = path.join(RACINE_APP, decodeURIComponent(req.url.split("?")[0]).replace(/\/$/, "/index.html"));
      if (!f.startsWith(RACINE_APP) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
      res.writeHead(200, { "Content-Type": TYPES[path.extname(f)] || "application/octet-stream" }); fs.createReadStream(f).pipe(res);
    });
    await new Promise(r => serveur.listen(0, "127.0.0.1", r));
    ADRESSE = "http://127.0.0.1:" + serveur.address().port + "/";
  }
  console.log("Site testé : " + ADRESSE + " · base : " + CFG.projectId + " (vraie base)");
  const proxy = process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY, bypass: "127.0.0.1,localhost" } : undefined;
  const nav = await chromium.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox"], proxy });

  /* ---------- parent : création de la famille d'essai ---------- */
  const P = await appareil(nav, "parent"), pp = P.page;
  let lienEleve = null, t0;
  await verif("parent : page chargée, écran d'appairage", async () => {
    await pp.goto(ADRESSE, { waitUntil: "domcontentloaded" }); await pp.waitForSelector("text=Cet appareil n'est pas encore relié", { timeout: 20000 });
  });
  await verif("parent : espace famille créé (code 1986), synchronisé avec la vraie base", async () => {
    await pp.locator("details[data-k='creer'] summary").tap(); await pp.fill("#prenom", PRENOM);
    await pp.getByRole("button", { name: "Créer l'espace famille" }).tap(); await code(pp, "1986");
    await pp.waitForSelector("text=Liens et synchronisation");
    CLE = (await pp.evaluate(() => JSON.parse(localStorage.getItem("mm.famille")))).cle; vrai(MM.base.cleValide(CLE));
    lienEleve = await pp.inputValue("#lienEleve"); egal(lienEleve, ADRESSE.split("#")[0] + "#eleve=" + CLE);
    await pastilleOK(pp);
    await attendre(async () => { const d = await lire("suivi/app"); return d && d.eleve.nom === PRENOM; }, 15000, "prénom dans la vraie base");
  });

  /* ---------- élève : lien ouvert sur un autre appareil ---------- */
  const E = await appareil(nav, "élève"), pe = E.page;
  await verif("élève : lien ouvert → « Salut " + PRENOM + " » et Synchronisé (temps mesuré)", async () => {
    t0 = Date.now(); await pe.goto(lienEleve, { waitUntil: "domcontentloaded" }); await pastilleOK(pe);
    await attendre(async () => (await pe.textContent("h1")) === "Salut " + PRENOM, 10000, "prénom");
    console.log("   (lien ouvert → synchronisé en " + ((Date.now() - t0) / 1000).toFixed(1) + " s)");
  });
  await verif("élève : diagnostic (une faute sur les signes → il commence à P1), placement écrit dans la vraie base", async () => {
    await pe.tap("#bSuivant");
    for (let i = 0; i < 14; i++) { await resoudre(pe, i === 0); await suite(pe); }          // lot 3 : 14 questions, dont 2 sur P5
    egal(await pe.textContent("h1"), "Test diagnostic terminé");
    await attendre(async () => { const d = await lire("suivi/app"); return d && d.paliers.P0.statut === "valide" && d.paliers.P1.statut === "en_cours"; }, 15000, "placement");
    await attendre(async () => (await lister("suivi/app/tentatives")).length === 14, 15000, "14 tentatives");
  });
  await verif("élève : leçon P1 + 2 questions « À toi » faites, les tentatives arrivent dans la vraie base", async () => {
    await pe.tap("#bSuivant"); egal(await pe.textContent("h1"), "Les signes des nombres relatifs");
    await pe.getByRole("button", { name: "Faire les 2 questions" }).tap();
    await resoudre(pe); await suite(pe); await resoudre(pe); await suite(pe);
    egal(await pe.textContent("h1"), "Leçon terminée");
    await attendre(async () => (await lister("suivi/app/tentatives")).length === 16, 15000, "16 tentatives");
    await attendre(async () => { const d = await lire("suivi/app"); return d.paliers.P1.fait.lecon === true; }, 10000, "leçon cochée");
    egal((await lire("suivi/app")).essai.reprise, null, "la zone d'essai du parent a bougé");
  });
  await verif("parent, autre appareil : le rapport montre la séance d'aujourd'hui et ses 16 exercices", async () => {
    await pp.tap("#bRetour"); await pp.getByRole("button", { name: "Espace parent" }).tap(); await code(pp, "1986");
    await attendre(() => pp.evaluate(() => !!(RAPPORT && RAPPORT.frais && RAPPORT.tentatives.length === 16)), 15000, "rapport frais");
    vrai(/aujourd'hui/.test(await pp.textContent(".synth")), await pp.textContent(".synth"));
  });
  await pp.screenshot({ path: SHOTS + "/reel-parent.png" });
  await verif("réseau coupé chez l'élève : un exercice fait hors ligne arrive dans la vraie base au retour du réseau", async () => {
    await pe.getByRole("button", { name: /Section suivante : série guidée/ }).tap();
    await E.ctx.setOffline(true);
    await resoudre(pe); await pe.tap("#suite");
    egal((await lister("suivi/app/tentatives")).length, 16, "parti malgré la coupure");
    await E.ctx.setOffline(false); await pe.evaluate(() => window.dispatchEvent(new Event("online")));
    await attendre(async () => (await lister("suivi/app/tentatives")).length === 17, 30000, "17e tentative");
    await attendre(() => pe.evaluate(() => FILE.taille() === 0), 15000, "file vide");
  });
  await verif("clé oubliée sur le téléphone de l'élève, lien rouvert : rien de perdu", async () => {
    await pe.evaluate(() => localStorage.clear());
    await pe.goto(ADRESSE.split("#")[0], { waitUntil: "domcontentloaded" }); await pe.waitForSelector("text=Cet appareil n'est pas encore relié");
    await pe.goto(lienEleve, { waitUntil: "domcontentloaded" }); await pastilleOK(pe);
    await attendre(async () => (await pe.$$eval(".etape .tag.fait", t => t.length)) >= 1, 10000, "leçon marquée Fait");
    vrai(!(await pe.isDisabled("#bReprendre")), "Reprendre inactif : point de reprise perdu");
  });
  await verif("aucune erreur JavaScript", async () => { egal(erreursPage.join(" | "), ""); });

  await nav.close(); if (serveur) serveur.close();
  if (CLE) console.log("Nettoyage : " + await effacerFamille() + " documents de la famille d'essai effacés.");
  const ko = resultats.filter(r => r[0] === "✗").length;
  console.log("\nRÉEL " + (resultats.length - ko) + "/" + resultats.length + (ko ? " ✗" : " ✓"));
  process.exit(ko ? 1 : 0);
})().catch(async e => { console.error("ARRÊT", e && e.message ? e.message.split("\n").slice(0, 5).join(" / ") : e); if (CLE) await effacerFamille().catch(() => {}); process.exit(2); });
