/* Test de bout en bout dans Chrome, avec le vrai SDK Firebase et la base émulée (mêmes règles que le vrai projet).
   Lancer : node tests/avec-emulateur.js tests/navigateur/e2e.js
   Trois appareils : le téléphone du parent (crée l'espace famille), le téléphone de l'élève, le PC de l'élève. */
const http = require("http"), fs = require("fs"), path = require("path");
const { chromium } = require("/opt/npm-tools/node_modules/playwright");
const RACINE_APP = path.join(__dirname, "..", "..");
const SHOTS = "/home/claude/shots";
fs.mkdirSync(SHOTS, { recursive: true });
["outils", "base", "config"].forEach(f => require(path.join(RACINE_APP, "js", f + ".js")));
const MM = globalThis.MM;
const PROJET = MM.config.firebase.projectId, EMU = { auth: "127.0.0.1:9099", firestore: "127.0.0.1:8080" };
const SDK = path.join(RACINE_APP, "node_modules", "firebase");
const PRENOM = "Alex";                      // prénom fictif : aucune donnée personnelle dans le dépôt public

const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8" };
const serveur = http.createServer((req, res) => {
  const f = path.join(RACINE_APP, decodeURIComponent(req.url.split("?")[0]).replace(/\/$/, "/index.html"));
  if (!f.startsWith(RACINE_APP) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "Content-Type": TYPES[path.extname(f)] || "application/octet-stream" }); fs.createReadStream(f).pipe(res);
});

/* ---------- lecture « administrateur » de la base émulée (passe outre les règles) ---------- */
let CLE = null;
function decoder(v) {
  if ("nullValue" in v) return null; if ("booleanValue" in v) return v.booleanValue;
  if ("integerValue" in v) return Number(v.integerValue); if ("doubleValue" in v) return v.doubleValue; if ("stringValue" in v) return v.stringValue;
  if ("arrayValue" in v) return (v.arrayValue.values || []).map(decoder);
  if ("mapValue" in v) { const o = {}; for (const [k, x] of Object.entries(v.mapValue.fields || {})) o[k] = decoder(x); return o; }
  return null;
}
const URL_BASE = `http://${EMU.firestore}/v1/projects/${PROJET}/databases/(default)/documents/`;
async function lireBase(chemin) {
  const r = await fetch(URL_BASE + `familles/${CLE}/` + chemin, { headers: { Authorization: "Bearer owner" } });
  if (r.status === 404) return null;
  return decoder({ mapValue: { fields: (await r.json()).fields || {} } });
}
async function compter(coll) {
  const r = await fetch(URL_BASE + `familles/${CLE}/` + coll + "?pageSize=1000", { headers: { Authorization: "Bearer owner" } });
  const j = await r.json(); return (j.documents || []).length;
}
async function familles() {
  const r = await fetch(URL_BASE + ":listCollectionIds", { method: "POST", headers: { Authorization: "Bearer owner", "Content-Type": "application/json" }, body: "{}" });
  if (!(await r.json()).collectionIds) return 0;
  const d = await (await fetch(URL_BASE + "familles?showMissing=true&pageSize=1000", { headers: { Authorization: "Bearer owner" } })).json();
  return (d.documents || []).length;
}

const resultats = [];
let erreursPage = [];
async function verif(nom, fn) {
  try { await fn(); resultats.push(["✓", nom]); }
  catch (e) { resultats.push(["✗", nom + " → " + (e && e.message ? e.message.split("\n")[0] : e)]); }
  if (process.env.MM_DETAIL) console.log(resultats[resultats.length - 1].join(" "));
}
const vrai = (v, m) => { if (!v) throw new Error(m || "faux"); };
const egal = (a, b, m) => { if (a !== b) throw new Error((m ? m + " : " : "") + JSON.stringify(a) + " au lieu de " + JSON.stringify(b)); };
const pause = ms => new Promise(r => setTimeout(r, ms));
async function attendre(fn, ms, quoi) { const fin = Date.now() + (ms || 8000); let v; while (Date.now() < fin) { v = await fn(); if (v) return v; await pause(150); } throw new Error("délai dépassé : " + (quoi || "condition")); }

const TELEPHONE = { viewport: { width: 380, height: 800 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 };
async function appareil(navigateur, nom, opt) {
  const ctx = await navigateur.newContext(Object.assign({ locale: "fr-FR" }, opt || TELEPHONE));
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  // le SDK Firebase, servi depuis le paquet npm de même version (fichiers identiques à ceux de gstatic)
  await ctx.route(/www\.gstatic\.com\/firebasejs\/[\d.]+\/(firebase-[a-z-]+\.js)$/, (r) => {
    const f = path.join(SDK, r.request().url().split("/").pop());
    if (!fs.existsSync(f)) return r.abort();
    r.fulfill({ status: 200, contentType: "text/javascript; charset=utf-8", body: fs.readFileSync(f, "utf8") });
  });
  await ctx.addInitScript(`window.__emulateur = ${JSON.stringify(EMU)};`);
  await ctx.grantPermissions(["clipboard-read", "clipboard-write"], { origin: "http://127.0.0.1:" + serveur.address().port });
  const page = await ctx.newPage();
  page.on("pageerror", e => erreursPage.push(nom + " : " + e.message));
  page.on("console", m => { if (m.type() === "error" && !/fonts\.g|ERR_FAILED|ERR_INTERNET_DISCONNECTED|net::|Firestore|WebChannel|Could not reach/.test(m.text())) erreursPage.push(nom + " console : " + m.text()); });
  return { ctx, page };
}
const URL_APP = (hash) => "http://127.0.0.1:" + serveur.address().port + "/" + (hash || "");
const pastilleOK = page => page.waitForFunction(() => document.querySelector("#pastille") && /Synchronisé/.test(document.querySelector("#pastille").textContent), null, { timeout: 10000 });
async function ouvrir(page, hash) { await page.goto(URL_APP(hash), { waitUntil: "domcontentloaded" }); await pastilleOK(page); }

/* Tape une ligne avec le clavier maths de l'app (comme au doigt). */
async function taper(page, texte) {
  for (const ch of texte.replace(/\s/g, "")) {
    const k = ch === "-" ? "−" : ch === "." ? "," : ch;
    const b = page.locator(`#clavier button[data-k="${k}"]`);
    if (!(await b.count())) throw new Error("touche absente du clavier maths : " + ch);
    await b.tap();
  }
}
async function vider(page) { const n = (await page.inputValue("#champ")).length; for (let i = 0; i < n + 2; i++) await page.locator('#clavier button[data-k="del"]').tap(); }
async function valider(page) { await page.locator('#clavier button[data-k="ok"]').tap(); await pause(60); }
const ligne = async (page, t) => { await taper(page, t); await valider(page); };
const titreFb = page => page.evaluate(() => { const h = document.querySelector("#fb h3, #fb p"); return h ? h.textContent : ""; });
const attendus = page => page.evaluate(() => Q.etapes.slice(Q.k).map(e => e.attendu.replace(/−/g, "-")));
async function resoudreGuide(page) {
  for (let s = 0; s < 8; s++) {
    if (await page.evaluate(() => Q.fini)) return;
    const t = await page.evaluate(() => (Q.type === "equation" ? MM.expr.ecrireEquation(MM.etapes.prochaine(Q.prev, Q.etapes[Q.k].forme)) : Q.etapes[Q.k].attendu).replace(/−/g, "-"));
    await ligne(page, t);
  }
  throw new Error("exercice guidé non terminé");
}
async function boites(page) {
  return page.evaluate(() => {
    const r = s => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return { haut: b.top, bas: b.bottom }; };
    return { enonce: r(".enonce"), champ: r("#champ"), clavier: r("#clavier"), hauteur: window.innerHeight };
  });
}
const visible = (b, h) => b && b.haut >= -1 && b.bas <= h + 1;
async function pasDeDefilementHorizontal(page) {
  return page.evaluate(() => [document.documentElement, document.body, document.querySelector("#app"), document.querySelector("#lignes")].filter(Boolean).every(e => e.scrollWidth <= e.clientWidth + 1));
}
async function petitsBoutons(page) {
  return page.evaluate(() => [...document.querySelectorAll("button, summary, input")].filter(b => { const r = b.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(b).visibility !== "hidden"; })
    .filter(b => b.getBoundingClientRect().height < 43.5).map(b => (b.textContent || b.id || b.tagName).trim().slice(0, 30)));
}
const code = async (page, chiffres) => { for (const k of chiffres) await page.getByRole("button", { name: k, exact: true }).tap(); };

(async () => {
  await new Promise(r => serveur.listen(0, "127.0.0.1", r));
  const nav = await chromium.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox"] });

  /* ================= téléphone du parent : création de l'espace famille ================= */
  const parent = await appareil(nav, "parent"); const pp = parent.page;
  await pp.goto(URL_APP(), { waitUntil: "domcontentloaded" });
  await verif("appareil sans lien : écran d'appairage, barre du haut inactive, panneau parent replié", async () => {
    await pp.waitForSelector("text=Cet appareil n'est pas encore relié");
    vrai(await pp.isDisabled("#bRetour")); vrai(await pp.isDisabled("#bReprendre")); vrai(await pp.isDisabled("#bSuivant"));
    egal(await pp.$eval("details[data-k='creer']", d => d.open), false);
    vrai(await pasDeDefilementHorizontal(pp)); egal((await petitsBoutons(pp)).join(" | "), "");
  });
  await verif("création sans prénom : refusée avec un message, rien créé", async () => {
    await pp.locator("details[data-k='creer'] summary").tap();
    await pp.getByRole("button", { name: "Créer l'espace famille" }).tap();
    vrai(/Écris d'abord le prénom/.test(await pp.textContent("#app"))); egal(await pp.evaluate(() => localStorage.getItem("mm.famille")), null);
  });
  await verif("création : mauvais code parent refusé, Retour ramène à l'appairage", async () => {
    await pp.fill("#prenom", PRENOM); await pp.getByRole("button", { name: "Créer l'espace famille" }).tap();
    await code(pp, "1234"); vrai(/Code incorrect/.test(await pp.textContent("#app")));
    egal(await pp.evaluate(() => localStorage.getItem("mm.famille")), null);
    vrai(!(await pp.isDisabled("#bRetour"))); await pp.tap("#bRetour");
    await pp.waitForSelector("text=Cet appareil n'est pas encore relié");
  });
  let lienEleve = null;
  await verif("création avec le code 1986 : clé de 32 caractères, lien parent dans l'adresse, espace parent ouvert sur les liens", async () => {
    await pp.locator("details[data-k='creer'] summary").tap().catch(() => {});
    if (!(await pp.isVisible("#prenom"))) await pp.locator("details[data-k='creer'] summary").tap();
    await pp.fill("#prenom", PRENOM); await pp.getByRole("button", { name: "Créer l'espace famille" }).tap();
    await code(pp, "1986");
    await pp.waitForSelector("text=Liens et synchronisation");
    const f = await pp.evaluate(() => JSON.parse(localStorage.getItem("mm.famille")));
    vrai(MM.base.cleValide(f.cle), "clé invalide : " + f.cle); egal(f.role, "parent"); CLE = f.cle;
    egal(new URL(pp.url()).hash, "#parent=" + CLE);
    egal(await pp.$eval("details[data-k='liens']", d => d.open), true);
    lienEleve = await pp.inputValue("#lienEleve");
    egal(lienEleve, URL_APP("#eleve=" + CLE)); egal(await pp.inputValue("#lienParent"), URL_APP("#parent=" + CLE));
  });
  await verif("espace famille créé dans la base : prénom rangé dans la base, code parent par défaut, pastille Synchronisé", async () => {
    await pastilleOK(pp);
    const app = await attendre(async () => { const d = await lireBase("suivi/app"); return d && d.eleve && d.eleve.nom === PRENOM && d; }, 8000, "document avec le prénom");
    egal(app.schema, 1); egal(app.parent.pinHash, MM.outils.sha256("mission-maths:1986"));
  });
  await verif("« Copier le lien élève » : le lien est dans le presse-papiers, message de confirmation", async () => {
    await pp.getByRole("button", { name: "Copier le lien élève" }).tap();
    await attendre(async () => /Lien copié/.test(await pp.textContent("#toast")), 3000, "message « Lien copié »");
    egal(await pp.evaluate(() => navigator.clipboard.readText()), lienEleve);
  });
  await verif("espace parent à 380 px avec les liens : pas de défilement horizontal, cibles d'au moins 44 px", async () => {
    vrai(await pasDeDefilementHorizontal(pp), "défilement horizontal"); egal((await petitsBoutons(pp)).join(" | "), "");
  });
  await pp.screenshot({ path: SHOTS + "/0-liens-parent.png" });

  /* ================= téléphone de l'élève ================= */
  const eleve = await appareil(nav, "élève"); const pe = eleve.page;
  await ouvrir(pe, "#eleve=" + CLE);
  await verif("lien élève : « Salut " + PRENOM + " » (prénom lu dans la base), pastille Synchronisé, appareil élève", async () => {
    await attendre(async () => (await pe.textContent("h1")) === "Salut " + PRENOM, 5000, "prénom affiché");
    vrai(!/Appareil parent/.test(await pe.textContent("#app")));
    egal(JSON.stringify(await pe.evaluate(() => JSON.parse(localStorage.getItem("mm.famille")))), JSON.stringify({ cle: CLE, role: "eleve" }));
  });
  await verif("accueil : 11 paliers + banc d'essai + mémo repliés, seul le palier en cours ouvert", async () => {
    const etat = await pe.$$eval("#app details.panel", ds => ds.map(d => [d.dataset.k, d.open]));
    egal(etat.length, 13); egal(etat.filter(([, o]) => o).map(([k]) => k).join(), "T");
  });
  await verif("Tout déplier puis Tout replier", async () => {
    await pe.getByRole("button", { name: "Tout déplier" }).tap(); egal(await pe.$$eval("#app details.panel", ds => ds.filter(d => d.open).length), 13);
    await pe.getByRole("button", { name: "Tout replier" }).tap(); egal(await pe.$$eval("#app details.panel", ds => ds.filter(d => d.open).length), 0);
    await pe.getByRole("button", { name: "Tout déplier" }).tap();
  });
  await verif("380 px : pas de défilement horizontal, cibles d'au moins 44 px", async () => {
    vrai(await pasDeDefilementHorizontal(pe), "défilement horizontal");
    egal((await petitsBoutons(pe)).join(" | "), "");
  });
  await pe.screenshot({ path: SHOTS + "/1-accueil.png" });
  await pe.getByRole("button", { name: "Tout replier" }).tap();
  await verif("barre du haut : Retour inactif à l'accueil, Reprendre inactif sans reprise", async () => {
    vrai(await pe.isDisabled("#bRetour")); vrai(await pe.isDisabled("#bReprendre")); vrai(!(await pe.isDisabled("#bSuivant")));
  });

  /* ---------- leçon ---------- */
  await pe.tap("#bSuivant");
  await verif("Section suivante ouvre la leçon ; étapes de l'exemple repliées ; piège en rouge", async () => {
    egal(await pe.textContent("h1"), "Le moins devant une parenthèse");
    egal(await pe.$$eval("details.pas", ds => ds.filter(d => d.open).length), 0); vrai((await pe.$$("details.pas")).length >= 4);
    vrai(await pe.isVisible(".bloc.piege")); vrai(/moins touche aussi le terme/.test(await pe.textContent(".bloc.piege")));
    vrai(await pasDeDefilementHorizontal(pe), "défilement horizontal dans la leçon");
  });
  await pe.getByRole("button", { name: "Faire les 2 questions" }).tap();
  await verif("« À toi » 1 : erreur de table → « Erreur de calcul » avec le produit exact, ligne attendue pas encore montrée", async () => {
    vrai(await pe.isVisible("#clavier")); egal(await pe.getAttribute("#champ", "inputmode"), "none");
    const { faux, phrase } = await pe.evaluate(() => {
      const bon = MM.etapes.devCote(Q.depart), k = Q.depart[0].c, a = Q.depart[0].inner[1].c, f = bon[1].c.plus(MM.F(1));
      return { faux: MM.expr.ecrireCote([bon[0], MM.expr.mono(f, 0)]).replace(/−/g, "-"),
        phrase: k.texte() + " × " + (a.signe() < 0 ? "(" + a.texte() + ")" : a.texte()) + " = " + bon[1].c.texte() + ", pas " + f.texte() };
    });
    await ligne(pe, faux);
    egal(await titreFb(pe), "Erreur de calcul");
    vrai((await pe.textContent("#fb")).includes(phrase), "produit absent : " + phrase);
    vrai(!(await pe.isVisible("text=Continuer avec cette ligne")), "la ligne attendue est montrée dès le 1er essai");
    await vider(pe);
  });
  await verif("« À toi » 1 : bonne réponse tapée au clavier maths → ligne juste", async () => {
    const t = (await attendus(pe))[0]; await ligne(pe, t);
    vrai(await pe.evaluate(() => Q.fini), "exercice non terminé");
    await pe.tap("#suite");
  });
  await verif("« À toi » 2 : erreur SIG-PAR → explication ciblée SIG-PAR, puis correction acceptée", async () => {
    const faux = await pe.evaluate(() => Q.exo.erreurs["SIG-PAR"][0].replace(/−/g, "-"));
    await ligne(pe, faux);
    egal(await titreFb(pe), "Signe moins non distribué");
    await vider(pe); await ligne(pe, (await attendus(pe))[0]);
    vrai(await pe.evaluate(() => Q.fini)); await pe.tap("#suite");
    egal(await pe.textContent("h1"), "Leçon terminée");
  });

  /* ---------- série guidée : l'ex. 1 du contrôle ---------- */
  await pe.getByRole("button", { name: /Section suivante : série guidée/ }).tap();
  await verif("série guidée : premier exercice = ex. 1 du contrôle, étape Développe", async () => {
    egal((await pe.textContent(".enonce .mscroll")).replace(/\s+/g, " ").trim(), "7(x − 4) − 8(x − 7) = 69 − 5(x + 8)");
    vrai(/Développe/.test(await pe.textContent("label.etq")));
  });
  await verif("ligne fausse (moins non distribué) → signalée à Développe avec le code SIG-PAR", async () => {
    await ligne(pe, "7x-28-8x-56=69-5x-40");
    egal(await titreFb(pe), "Signe moins non distribué");
    vrai(/−8 × \(−7\) = \+56, pas −56/.test(await pe.textContent("#fb")), "règle chiffrée absente");
  });
  await verif("clavier ouvert, 380 × 800 : énoncé, champ actif et clavier visibles en même temps", async () => {
    const b = await boites(pe); vrai(visible(b.enonce, b.hauteur) && visible(b.champ, b.hauteur) && visible(b.clavier, b.hauteur), JSON.stringify(b));
  });
  await verif("correction, puis Réduis : lignes acceptées, encouragement spécifique", async () => {
    await vider(pe); await ligne(pe, "7x-28-8x+56=69-5x-40");
    vrai(/signe|moins/i.test(await titreFb(pe)), "encouragement non spécifique : " + await titreFb(pe));
    await ligne(pe, "-x+28=29-5x");
    vrai(/Regroupe/.test(await pe.textContent("label.etq")));
  });
  await pause(1500);                                   // le point de reprise part dans la base
  await pe.reload({ waitUntil: "domcontentloaded" }); await pastilleOK(pe);
  await verif("après fermeture : Reprendre ramène au même exercice, à l'étape Regroupe, lignes déjà faites affichées", async () => {
    vrai(!(await pe.isDisabled("#bReprendre"))); await pe.tap("#bReprendre");
    egal((await pe.textContent(".enonce .mscroll")).replace(/\s+/g, " ").trim(), "7(x − 4) − 8(x − 7) = 69 − 5(x + 8)");
    vrai(/Regroupe/.test(await pe.textContent("label.etq")), "pas à l'étape Regroupe");
    egal(await pe.$$eval(".ligne.fait", ls => ls.length), 2);
  });
  await verif("fin de l'ex. 1 : 4x = 1 puis x = 0,25 acceptés (écriture décimale)", async () => {
    await ligne(pe, "4x=1"); await ligne(pe, "x=0,25");
    vrai(await pe.evaluate(() => Q.fini)); await pe.tap("#suite");
  });
  await verif("exercice 2 : nombres tirés au hasard, résolu jusqu'au bilan", async () => {
    vrai(!/7\(x − 4\)/.test(await pe.textContent(".enonce")), "même énoncé qu'avant");
    await resoudreGuide(pe); await pe.tap("#suite"); egal(await pe.textContent("h1"), "Série terminée");
  });

  /* ---------- semi-guidé, petit écran ---------- */
  await pe.getByRole("button", { name: /Section suivante/ }).first().tap();
  for (const [w, h] of [[380, 600], [360, 520]]) {
    await pe.setViewportSize({ width: w, height: h }); await pause(150);
    await verif(`petit écran ${w} × ${h} : énoncé, champ et clavier visibles ensemble`, async () => {
      const b = await boites(pe); vrai(visible(b.enonce, b.hauteur) && visible(b.champ, b.hauteur) && visible(b.clavier, b.hauteur), JSON.stringify(b));
      vrai(await pasDeDefilementHorizontal(pe), "défilement horizontal");
    });
  }
  await pe.setViewportSize({ width: 380, height: 800 });
  await verif("semi-guidé : seules les étapes Réduis et Trouve x sont demandées", async () => {
    egal((await pe.evaluate(() => Q.etapes.map(e => e.id))).join(), "reduit,solution");
    await resoudreGuide(pe); await pe.tap("#suite");
  });

  /* ---------- seul, réseau coupé ---------- */
  await pause(1500);
  const avantHL = await compter("suivi/app/tentatives");
  await eleve.ctx.setOffline(true);
  await pe.getByRole("button", { name: /Section suivante/ }).first().tap();
  await verif("mode seul : erreur à la ligne 1 signalée ligne 1, lignes suivantes justes à partir de sa ligne", async () => {
    const lignes = await pe.evaluate(() => {
      const D = MM.diag, T = MM.etapes, E = MM.expr;
      const c = D.candidats(Q.depart).filter(k => k.code === "SIG-PAR" && k.stade === 0).sort((a, b) => b.n - a.n)[0];
      const l1 = c.eq, l2 = T.reduire(l1), l3 = T.reduire(T.regrouper(l2)), s = T.resoudre(l3);
      return [l1, l2, l3, T.eqSolution(s.x)].map(e => E.ecrireEquation(e).replace(/−/g, "-"));
    });
    for (const l of lignes) await ligne(pe, l);
    egal(await pe.$$eval(".ligne.fait .coche", cs => cs.map(c => c.textContent).join("")), "✗✓✓✓");
    vrai(/Une seule erreur, à la ligne 1/.test(await pe.textContent("#lignes")));
  });
  await verif("réseau coupé : rien n'est parti, la pastille le dit, le travail est rangé sur l'appareil", async () => {
    await pe.tap("#suite"); vrai(/en attente/.test(await pe.textContent("#pastille")), await pe.textContent("#pastille"));
    vrai(await pe.evaluate(k => JSON.parse(localStorage.getItem("mm." + k.slice(0, 8) + ".file")).ops.length > 0, CLE), "file vide sur l'appareil");
  });
  await eleve.ctx.setOffline(false);
  await pe.evaluate(() => window.dispatchEvent(new Event("online")));
  await verif("retour du réseau : la tentative faite hors ligne arrive dans la base, la file se vide", async () => {
    await attendre(async () => (await compter("suivi/app/tentatives")) === avantHL + 1, 15000, "tentative dans la base");
    await attendre(() => pe.evaluate(() => FILE.taille() === 0), 10000, "file vide");
    await pastilleOK(pe);
  });
  await verif("progression enregistrée dans la base de la famille : leçon, guidé, semi et seul cochés, fiche gagnée", async () => {
    const app = await attendre(async () => { const d = await lireBase("suivi/app"); return d && ["lecon", "guide", "semi", "seul"].every(s => d.paliers.T.fait[s]) && d; }, 8000, "4 étapes cochées");
    egal(app.fiches.join(), "F-SIG-PAR");
  });

  /* ---------- l'élève ne peut pas ouvrir l'espace parent sans le code ---------- */
  await pe.tap("#bRetour");
  await pe.getByRole("button", { name: "Espace parent" }).tap();
  await verif("élève : un mauvais code n'ouvre pas le rapport", async () => {
    await code(pe, "1234");
    vrai(/Code incorrect/.test(await pe.textContent("#app"))); vrai(!(await pe.isVisible("text=Séances")));
  });
  await pe.tap("#bRetour");

  /* ================= PC de l'élève : même lien, même progression ================= */
  const pc = await appareil(nav, "PC élève", { viewport: { width: 1280, height: 800 } });
  await ouvrir(pc.page, "#eleve=" + CLE);
  await verif("PC de l'élève, même lien : même prénom, les 4 étapes du banc d'essai marquées Fait", async () => {
    await attendre(async () => (await pc.page.textContent("h1")) === "Salut " + PRENOM, 5000, "prénom");
    await attendre(async () => (await pc.page.$$eval(".etape .tag.fait", t => t.length)) === 4, 5000, "4 étapes Fait");
  });

  /* ================= retour au téléphone du parent : le rapport ================= */
  await pp.tap("#bRetour");
  await verif("appareil parent : accueil marqué « Appareil parent »", async () => { vrai(/Appareil parent/.test(await pp.textContent("#app"))); });
  await pp.getByRole("button", { name: "Espace parent" }).tap();
  await code(pp, "1986");
  await pp.waitForFunction(() => /Séances/.test(document.querySelector("#app").textContent) && !/Lecture du suivi/.test(document.querySelector("#app").textContent), null, { timeout: 8000 });
  await verif("parent, autre appareil : la séance de l'élève apparaît, avec ses 6 exercices", async () => {
    await attendre(() => pp.evaluate(() => !!(RAPPORT && RAPPORT.frais && document.querySelector(".synth"))), 8000, "rapport lu depuis la base");
    const t = await pp.textContent(".synth");
    vrai(/aujourd'hui/.test(t), "dernière séance : " + JSON.stringify(t) + " " + await pp.evaluate(() => JSON.stringify({ n: RAPPORT && RAPPORT.seances.length, lu: RAPPORT && RAPPORT.lu }))); vrai(/sur \d+ sans erreur/.test(t), t);
    egal(await compter("suivi/app/tentatives"), 6, "2 « À toi » + 2 guidés + 1 semi + 1 seul");
    egal(await pp.evaluate(() => RAPPORT.tentatives.length), 6);
  });
  await verif("parent : SIG-PAR et CALC dans les erreurs des 7 jours, avec leur nom clair", async () => {
    await pp.getByRole("button", { name: "Tout déplier" }).tap();
    const top = await pp.$$eval("details[data-k='erreurs'] td", tds => tds.map(t => t.textContent).join(" | "));
    vrai(/Signe moins non distribué/.test(top) && /SIG-PAR/.test(top), "erreurs : " + JSON.stringify(top)); vrai(/Erreur de calcul/.test(top) && /CALC/.test(top), top);
  });
  await verif("parent : détail d'une séance jusqu'aux lignes saisies, la ligne fausse marquée", async () => {
    await pp.locator("details.seance summary").first().tap();
    const d = await pp.textContent("details.seance");
    vrai(/✗ Signe moins non distribué/.test(d), "ligne fausse absente du détail"); vrai(/Guidé|Seul/.test(d));
  });
  await pp.screenshot({ path: SHOTS + "/5-parent.png", fullPage: false });
  await verif("parent : date du contrôle réglée → compte à rebours chez l'élève, en direct", async () => {
    const d = new Date(Date.now() + 12 * 86400000); const iso = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
    await pp.fill("#dctl", iso); await pp.getByRole("button", { name: "Enregistrer" }).nth(1).tap();
    await attendre(async () => /dans 12 jours/.test(await pe.textContent("#app")), 8000, "compte à rebours chez l'élève");
  });
  await verif("parent : changement du prénom → affiché chez l'élève", async () => {
    await pp.fill("#nom", PRENOM + "-Test"); await pp.getByRole("button", { name: "Enregistrer" }).first().tap();
    await attendre(async () => (await pe.textContent("h1")) === "Salut " + PRENOM + "-Test", 8000, "nouveau prénom");
    await pp.fill("#nom", PRENOM); await pp.getByRole("button", { name: "Enregistrer" }).first().tap();
    await attendre(async () => (await pe.textContent("h1")) === "Salut " + PRENOM, 8000, "prénom rétabli");
  });
  await verif("parent : quitter l'espace parent le referme (code redemandé)", async () => {
    await pp.tap("#bRetour"); await pp.getByRole("button", { name: "Espace parent" }).tap();
    vrai(await pp.isVisible(".pinpad"));
  });
  await verif("essai sur l'appareil parent : la progression de l'élève ne bouge pas, l'essai va dans la zone d'essai", async () => {
    await pp.tap("#bRetour");
    const avant = await lireBase("suivi/app"), cle = d => JSON.stringify({ r: d.eleve.reprise, f: d.paliers.T.fait });
    await pp.tap("#bSuivant"); await pp.getByRole("button", { name: /Faire les 2 questions/ }).tap();
    const apres = await attendre(async () => { const d = await lireBase("suivi/app"); return d.essai && d.essai.reprise && d.essai.reprise.section === "lecon" && d; }, 8000, "reprise d'essai");
    egal(cle(apres), cle(avant));
    await pp.tap("#bRetour"); await pp.tap("#bRetour").catch(() => {});
  });

  /* ================= clé oubliée, lien abîmé, refus de la base ================= */
  await verif("clé oubliée sur le téléphone de l'élève : écran d'appairage, puis lien rouvert → rien de perdu", async () => {
    await pe.evaluate(() => localStorage.clear());
    await pe.goto(URL_APP(), { waitUntil: "domcontentloaded" }); await pe.waitForSelector("text=Cet appareil n'est pas encore relié");
    await ouvrir(pe, "#eleve=" + CLE);
    await attendre(async () => (await pe.$$eval(".etape .tag.fait", t => t.length)) === 4, 8000, "4 étapes Fait");
    egal(await pe.textContent("h1"), "Salut " + PRENOM);
  });
  await verif("lien coupé (clé de 31 caractères) : écran d'appairage, aucune famille créée dans la base", async () => {
    const autre = await appareil(nav, "lien coupé"), n = await familles();
    await autre.page.goto(URL_APP("#eleve=" + CLE.slice(0, 31)), { waitUntil: "domcontentloaded" });
    await autre.page.waitForSelector("text=Cet appareil n'est pas encore relié"); await pause(800);
    egal(await familles(), n); egal(await autre.page.evaluate(() => localStorage.getItem("mm.famille")), null);
    await autre.ctx.close();
  });
  await verif("refus de la base : l'écriture reste sur l'appareil, pastille « Accès refusé », puis elle part quand l'accès revient", async () => {
    await pe.evaluate(() => { window.__docVrai = DB.doc; DB.doc = c => Object.assign({}, window.__docVrai(c), { set: () => Promise.reject({ code: "permission_denied" }), update: () => Promise.reject({ code: "permission_denied" }) }); });
    await pe.evaluate(() => ecrireApp({ controle: { date: "2030-01-01" } }));
    await attendre(async () => /Accès refusé/.test(await pe.textContent("#pastille")), 5000, "pastille Accès refusé");
    await pe.evaluate(async () => { for (let i = 0; i < 4; i++) await vidage(); });        // plusieurs relances pendant le refus (la file en fait une toutes les 30 s)
    vrai(await pe.evaluate(() => FILE.taille() > 0 && FILE.rejets().length === 0), "écriture jetée au lieu d'attendre");
    vrai(/renvoyer ton lien/.test(await pe.textContent("#app")), "message à l'élève absent de l'accueil");
    await pe.evaluate(() => { DB.doc = window.__docVrai; return vidage(); });
    await attendre(async () => ((await lireBase("suivi/app")).controle || {}).date === "2030-01-01", 8000, "écriture partie");
    await pastilleOK(pe);
  });

  /* ---------- mode sombre ---------- */
  await pe.emulateMedia({ colorScheme: "dark" });
  await verif("mode sombre : fond et texte suivent le thème", async () => {
    const c = await pe.evaluate(() => [getComputedStyle(document.body).backgroundColor, getComputedStyle(document.body).color]);
    egal(c[0], "rgb(16, 22, 42)"); egal(c[1], "rgb(233, 237, 248)");
  });
  await pe.screenshot({ path: SHOTS + "/6-sombre.png" });

  await verif("aucune erreur JavaScript sur les appareils", async () => { egal(erreursPage.join(" | "), ""); });

  await nav.close(); serveur.close();
  const ko = resultats.filter(r => r[0] === "✗");
  for (const r of resultats) console.log(r[0] + " " + r[1]);
  console.log("\nNAVIGATEUR " + (resultats.length - ko.length) + "/" + resultats.length + (ko.length ? " ✗" : " ✓"));
  process.exit(ko.length ? 1 : 0);
})().catch(e => { for (const r of resultats) console.log(r[0] + " " + r[1]); console.error("ARRÊT", e && e.message ? e.message.split("\n").slice(0, 6).join(" / ") : e); process.exit(2); });
