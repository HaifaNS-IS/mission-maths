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
/* ---------- lot 2 : ce que l'élève tape, calculé par le moteur de l'app (rien n'est écrit à la main) ---------- */
const BONNE = () => {
  const et = Q.etapes[Q.k], type = et.type || Q.exo.type;
  const t = type === "equation" ? MM.expr.ecrireEquation(MM.etapes.prochaine(Q.prev, et.forme)) : type === "expression" ? MM.expr.ecrireCote(MM.etapes.attenduExpr(Q.prev, et.forme)) : MM.nombres.prochaine(Q.prev, et.forme);
  return t.replace(/−/g, "-").replace(/÷/g, "/");
};
/* Une ligne fausse pour l'étape en cours : une erreur du catalogue si elle existe, sinon la bonne ligne décalée de 1. */
const MAUVAISE = (code) => {
  const et = Q.etapes[Q.k], type = et.type || Q.exo.type, D = MM.diag, T = MM.etapes, E = MM.expr, N = MM.nombres;
  let f = null;
  if (type === "equation") { const st = T.ORDRE.indexOf(et.forme); const c = D.candidats(Q.prev).filter(k => (k.stade === st || (et.forme === "regroupe" && k.stade === 2)) && (!code || k.code === code))[0]; if (c) f = E.ecrireEquation(c.stade === 2 ? T.reduire(c.eq) : c.eq); }
  else if (type === "expression") { const c = D.candidatsExpression(Q.prev).filter(k => k.stade === (et.forme === "developpe" ? 0 : 1) && (!code || k.code === code))[0]; if (c) f = E.ecrireCote(et.forme === "reduit" ? T.redCote(c.termes) : c.termes); }
  else if (et.forme === "nombre") { const c = N.candidats(Q.prev).filter(k => !code || k.code === code)[0]; if (c) f = c.valeur.texte(); }
  if (!f) {
    const b = type === "equation" ? E.ecrireEquation(T.prochaine(Q.prev, et.forme)) : type === "expression" ? E.ecrireCote(T.attenduExpr(Q.prev, et.forme)) : N.prochaine(Q.prev, et.forme);
    f = type === "nombre" && et.forme === "nombre" ? N.valeur(E.arbre(b)).plus(1).texte() : b + " + 1";
  }
  return f.replace(/−/g, "-").replace(/÷/g, "/");
};
const REPONSE_DIAG = (juste) => {
  const ex = Q.exo; let t;
  if (ex.type === "equation") t = "x=" + MM.F(ex.reponse).plus(juste ? 0 : 1).texte();
  else if (ex.type === "second") t = "x=" + MM.F(ex.diag.reponse).plus(juste ? 0 : 1).texte();
  else if (ex.type === "expression") t = ex.reponse + (juste ? "" : "+1");
  else t = MM.F(ex.reponse).plus(juste ? 0 : 1).texte();
  return t.replace(/−/g, "-");
};
/* Écrit une ligne d'un coup dans le champ (clavier physique), puis valide avec la touche OK du clavier maths. */
async function ecrire(page, t) { await page.fill("#champ", t); await valider(page); }
/* P5 : les trois cases a, b, c (valeurs lues dans l'état du moteur). */
const COEFS = () => ["a", "b", "c"].map(k => MM.F(Q.p5[k]).texte().replace(/−/g, "-"));
async function cases(page, vals) { const c = page.locator("input.trou"); for (let i = 0; i < vals.length; i++) await c.nth(i).fill(vals[i]); await valider(page); }
async function etapeJuste(page) {
  if (await page.evaluate(() => !!(Q.trous && Q.trous.coefs))) return cases(page, await page.evaluate(COEFS));
  await ecrire(page, await page.evaluate(BONNE));
}
async function etapeFausse(page, code) { await ecrire(page, await page.evaluate(MAUVAISE, code || null)); }
/* Résout l'exercice en cours, quel que soit le mode, en ne faisant que des lignes justes. */
async function resoudre(page) {
  for (let s = 0; s < 12; s++) {
    // une mini-pause (toutes les 8 questions) ou une fin de bloc peut s'intercaler : on la passe (lot 3 : le diagnostic a 2 questions de plus)
    if (await page.evaluate(() => vue === "pause")) { await page.locator("#app .btn").first().tap(); continue; }
    if (await page.evaluate(() => Q.fini)) return;
    const mode = await page.evaluate(() => Q.mode);
    if (mode === "seul") await ecrire(page, await page.evaluate(() => { const ex = Q.exo; return (ex.type === "equation" ? "x=" + MM.F(ex.reponse).texte() : ex.type === "expression" ? ex.reponse : ex.reponseTexte).replace(/−/g, "-"); }));
    else if (mode === "diag") await ecrire(page, await page.evaluate(REPONSE_DIAG, true));
    else await etapeJuste(page);
  }
  throw new Error("exercice non terminé : " + await page.evaluate(() => JSON.stringify({ mode: Q.mode, k: Q.k, fb: Q.fb })));
}
/* Joue toute une série : chaque exercice résolu juste, jusqu'au bilan (les pauses de bloc éventuelles sont passées). */
async function serie(page) {
  for (let i = 0; i < 30; i++) {
    if (!(await page.evaluate(() => vue === "exo" && !!Q))) {
      if (await page.evaluate(() => vue === "pause")) { await page.locator("#app .btn").first().tap(); continue; }
      return;
    }
    await resoudre(page); await page.tap("#suite"); await pause(40);
  }
}
async function tagsFait(page, palier) { return page.$$eval(`details[data-k='${palier}'] .etape .tag.fait`, t => t.length); }
async function ouvrirPalier(page, id) { if (!(await page.$eval(`details[data-k='${id}']`, d => d.open))) await page.locator(`details[data-k='${id}'] > summary`).tap(); }
async function suite(page) { await page.tap("#suite"); for (let i = 0; i < 3 && await page.evaluate(() => vue === "pause"); i++) await page.locator("#app .btn").first().tap(); }
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
  await verif("accueil : révision du 29/11 (7 fiches), 11 paliers + mémo repliés, seul le palier en cours (P0) ouvert", async () => {
    const etat = await pe.$$eval("#app details.panel", ds => ds.map(d => [d.dataset.k, d.open]));
    egal(etat.length, 20); egal(etat.slice(0, 8).map(([k]) => k).join(), "rev,G1,G2,G3,G4,G5,G6,G7"); egal(etat.filter(([, o]) => o).map(([k]) => k).join(), "P0");
  });
  await verif("Tout déplier puis Tout replier", async () => {
    await pe.getByRole("button", { name: "Tout déplier" }).tap(); egal(await pe.$$eval("#app details.panel", ds => ds.filter(d => d.open).length), 20);
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

  /* ================= P0 : test diagnostic ================= */
  await pe.tap("#bSuivant");
  await verif("Section suivante ouvre le diagnostic : 14 questions sans aide (2 sur P5), une seule réponse demandée", async () => {
    egal(await pe.evaluate(() => [X.section, X.exos.length, Q.mode].join()), "diagnostic,14,diag");
    vrai(!(await pe.isVisible("text=Un indice"))); vrai(/Ta réponse/.test(await pe.textContent("label.etq")));
    vrai(await pe.isVisible("#clavier")); egal(await pe.getAttribute("#champ", "inputmode"), "none");
  });
  await verif("diagnostic : réponses au clavier maths, aucune correction montrée, mini-pause proposée après 8 questions", async () => {
    let miniPause = false;
    for (let i = 0; i < 14; i++) {
      const juste = i !== 6;                                                 // une faute en P2 (réduire)
      if (i >= 12) vrai(/plus (grande|petite) solution/.test(await pe.textContent(".enonce")), "question P5 : " + await pe.textContent(".enonce"));
      const t = await pe.evaluate(REPONSE_DIAG, juste);
      if (i === 0) { await taper(pe, t); await valider(pe); } else await ecrire(pe, t);
      vrai(/Réponse enregistrée/.test(await pe.textContent("#lignes")), "question " + (i + 1) + " : pas enregistrée");
      vrai(!(await pe.isVisible(".fb.faux")) && !(await pe.isVisible("text=Démarche modèle")), "correction montrée pendant le diagnostic");
      await pe.tap("#suite");
      if (await pe.evaluate(() => vue === "pause")) { egal(await pe.textContent("h1"), "Mini-pause"); egal(i, 7); miniPause = true; await pe.getByRole("button", { name: "Je reprends" }).tap(); }
    }
    vrai(miniPause, "pas de mini-pause après 8 questions");
    egal(await pe.textContent("h1"), "Test diagnostic terminé");
    const t = await pe.textContent("#app");
    vrai(/Tu commences au palier P2/.test(t), t); vrai(/P1 : 5\/5/.test(t) && /P2 : 2\/3/.test(t), t);
  });
  await verif("diagnostic dans la base : P0 et P1 validés (P1 par le diagnostic), il commence à P2, P3 reste fermé", async () => {
    const app = await attendre(async () => { const d = await lireBase("suivi/app"); return d && d.paliers.P1.statut === "valide" && d; }, 8000, "P1 validé");
    egal(["P0", "P1", "P2", "P3"].map(k => app.paliers[k].statut).join(), "valide,valide,en_cours,verrouille"); vrai(app.paliers.P1.parDiagnostic); egal(app.eleve.palierActuel, "P2");
  });

  /* ================= P2 : leçon, échelle d'aide complète, jumeau ================= */
  await verif("une seule nouvelle notion par séance : si une autre leçon a été ouverte, Section suivante refuse", async () => {
    await pe.evaluate(() => { SEANCE.leconNouvelle = "P1"; });
    await pe.tap("#bSuivant");
    await attendre(async () => /Une seule nouvelle notion/.test(await pe.textContent("#toast")), 3000, "message");
    vrai(await pe.evaluate(() => vue !== "lecon"), "leçon ouverte quand même");
    await pe.evaluate(() => { SEANCE.leconNouvelle = null; });
  });
  await pe.tap("#bSuivant");
  await verif("leçon P2 : idée, exemple replié, piège SIG-PAR en rouge, pas de défilement horizontal", async () => {
    egal(await pe.textContent("h1"), "Développer, puis réduire");
    egal(await pe.$$eval("details.pas", ds => ds.filter(d => d.open).length), 0); vrai((await pe.$$("details.pas")).length >= 2);
    vrai(await pe.isVisible(".bloc.piege")); vrai(/moins touche aussi le terme/.test(await pe.textContent(".bloc.piege")));
    vrai(await pasDeDefilementHorizontal(pe), "défilement horizontal dans la leçon");
  });
  await pe.screenshot({ path: SHOTS + "/2-lecon.png" });
  await pe.getByRole("button", { name: "Faire les 2 questions" }).tap();
  let fauxSP = null, bonneLigne = null;
  await verif("échelle, erreur 1 : explication ciblée SIG-PAR, ligne attendue jamais montrée", async () => {
    egal(await pe.evaluate(() => Q.exo.gen), "dev1");
    fauxSP = await pe.evaluate(MAUVAISE, "SIG-PAR"); bonneLigne = await pe.evaluate(BONNE);
    await taper(pe, fauxSP); await valider(pe);
    egal(await titreFb(pe), "Signe moins non distribué");
    vrai(!/Autre façon/.test(await pe.textContent("#fb"))); vrai(!(await pe.isVisible("text=La ligne attendue")));
  });
  await verif("échelle, erreur 2 (la même) : formulée autrement, avec un test chiffré", async () => {
    await vider(pe); await ecrire(pe, fauxSP);
    const t = await pe.textContent("#fb"); vrai(/Autre façon de voir/.test(t), t); vrai(/Teste avec x = /.test(t), t);
  });
  await verif("échelle, erreur 3 : sa ligne réaffichée, le terme fautif entouré, sans la réponse", async () => {
    await ecrire(pe, fauxSP);
    vrai((await pe.$$("#fb mark.pointe")).length >= 1, "aucun terme entouré"); egal(await titreFb(pe), "Regarde où ça coince");
    vrai(!(await pe.textContent("#fb")).replace(/\s/g, "").includes(bonneLigne.replace(/-/g, "−").replace(/\s/g, "")), "la bonne ligne est dans l'indice");
  });
  await verif("échelle, erreur 4 : ligne à trous ; à 380 × 600, énoncé, cases et clavier visibles ensemble", async () => {
    await ecrire(pe, fauxSP);
    vrai((await pe.$$("input.trou")).length >= 1, "pas de case"); egal(await pe.evaluate(() => Q.trous.jetons.some(j => "attendu" in j || "saisi" in j)), false, "la réponse est gardée dans la page");
    await pe.setViewportSize({ width: 380, height: 600 }); await pause(150);
    const b = await pe.evaluate(() => { const r = s => { const e = document.querySelector(s); const x = e.getBoundingClientRect(); return { haut: x.top, bas: x.bottom }; }; return { enonce: r(".enonce"), champ: r("#trous"), clavier: r("#clavier"), hauteur: window.innerHeight }; });
    vrai(visible(b.enonce, b.hauteur) && visible(b.champ, b.hauteur) && visible(b.clavier, b.hauteur), JSON.stringify(b));
    await pe.setViewportSize({ width: 380, height: 800 });
  });
  await pe.screenshot({ path: SHOTS + "/3-trous.png" });
  await verif("échelle, erreur 5 (cases mal remplies) : la ligne est montrée, à recopier lui-même, plus d'indice", async () => {
    const valeurs = await pe.evaluate((f) => { const et = Q.etapes[Q.k]; return MM.aide.aTrous("expression", Q.prev, MM.expr.lireExpression(f).termes, et.forme).jetons.filter(j => j.trou != null).map(j => j.saisi.replace(/−/g, "-")); }, fauxSP);
    for (let i = 0; i < valeurs.length; i++) { await pe.tap(`input.trou[data-i="${i}"]`); await taper(pe, valeurs[i]); }
    await valider(pe);
    vrai(await pe.isVisible(".fb.recopie"), "ligne pas montrée"); egal(await titreFb(pe), "Voici la ligne");
    vrai(await pe.isVisible("#champ")); vrai(!(await pe.isVisible("text=Un indice")));
  });
  await verif("il recopie la ligne : acceptée « recopiée » (niveau 4), un exercice jumeau est ajouté à la suite", async () => {
    await vider(pe); await ecrire(pe, bonneLigne);
    vrai(await pe.evaluate(() => Q.fini)); vrai(/jumeau/.test(await pe.textContent("#lignes")));
    egal(await pe.evaluate(() => Q.journal.filter(l => l.juste).map(l => l.niveau).join()), "4");
    egal(await pe.evaluate(() => X.exos.length + ":" + !!X.exos[1].jumeau), "3:true");
  });
  await pe.tap("#suite");
  await verif("exercice jumeau : mêmes structure, autres nombres, sans indice ni correction pendant, démarche modèle à la fin", async () => {
    vrai(/Exercice jumeau/.test(await pe.textContent(".xtete")));
    egal(await pe.evaluate(() => Q.mode + ":" + Q.exo.gen), "controle:dev1");
    vrai(!(await pe.isVisible("text=Un indice")));
    await etapeFausse(pe);
    vrai(await pe.evaluate(() => Q.fini)); vrai(/Jumeau : 0 étape/.test(await pe.textContent("#lignes")));
    vrai(await pe.isVisible("text=Démarche modèle à recopier")); vrai(await pe.isVisible(".ligne.fait.ko"));
  });
  await pe.tap("#suite");
  await verif("« À toi » 2 juste → Leçon terminée, fiche au mémo", async () => {
    await resoudre(pe); await suite(pe); egal(await pe.textContent("h1"), "Leçon terminée");
  });
  await verif("base : ligne recopiée au niveau 4, jumeau enregistré à part, leçon P2 cochée, fiche F-SIG-PAR gagnée", async () => {
    const app = await attendre(async () => { const d = await lireBase("suivi/app"); return d && d.paliers.P2.fait.lecon && d; }, 8000, "leçon cochée");
    egal(app.fiches.join(), "F-SIG-PAR");
    const ts = await attendre(async () => { const r = await fetch(URL_BASE + `familles/${CLE}/suivi/app/tentatives?pageSize=1000`, { headers: { Authorization: "Bearer owner" } }); const j = await r.json(); const l = (j.documents || []).map(d => decoder({ mapValue: { fields: d.fields } })); return l.length >= 15 && l; }, 8000, "tentatives");
    vrai(ts.some(t => t.aideMax === 4 && t.lignes.some(l => l.niveau === 4) && t.lignes.filter(l => l.marche).map(l => l.marche).join() === "1,1,2,3,4"), "ligne recopiée absente");
    vrai(ts.some(t => t.jumeau && t.mode === "controle" && t.points === 0), "jumeau absent");
  });

  /* ================= P2 : série guidée, fin de bloc, reprise après fermeture ================= */
  await pe.getByRole("button", { name: /Section suivante : série guidée/ }).tap();
  await verif("série guidée : la barre du bloc est visible ; fin de bloc (5 min) → écran de pause entre deux exercices", async () => {
    vrai(await pe.isVisible(".bloc-barre"));
    await resoudre(pe);
    await pe.evaluate(() => { SEANCE.dureeActive = BLOC + 1000; });
    await pe.tap("#suite");
    egal(await pe.textContent("h1"), "Bloc 1 terminé"); await pe.getByRole("button", { name: "Continuer" }).tap();
    egal(await pe.evaluate(() => vue + ":" + X.i), "exo:1");
  });
  await verif("guidé : 2 exercices de plus, jusqu'à « développer puis réduire »", async () => {
    for (let i = 0; i < 2; i++) { await resoudre(pe); await suite(pe); }
    egal(await pe.evaluate(() => Q.exo.gen + ":" + Q.etapes.map(e => e.id).join()), "devred:developpe,reduit");
    await etapeJuste(pe); vrai(/Réduis/.test(await pe.textContent("label.etq")));
  });
  await pause(1500);                                   // le point de reprise part dans la base
  await pe.reload({ waitUntil: "domcontentloaded" }); await pastilleOK(pe);
  await verif("après fermeture : Reprendre ramène au même exercice, à l'étape Réduis, la ligne déjà faite affichée", async () => {
    vrai(!(await pe.isDisabled("#bReprendre"))); await pe.tap("#bReprendre");
    egal(await pe.evaluate(() => Q.exo.gen + ":" + X.i), "devred:3"); vrai(/Réduis/.test(await pe.textContent("label.etq")), "pas à l'étape Réduis");
    egal(await pe.$$eval(".ligne.fait", ls => ls.length), 1);
    await resoudre(pe); await suite(pe); egal(await pe.textContent("h1"), "Série terminée");
  });

  /* ================= semi-guidé, petit écran ================= */
  await pe.getByRole("button", { name: /Section suivante/ }).first().tap();
  for (const [w, h] of [[380, 600], [360, 520]]) {
    await pe.setViewportSize({ width: w, height: h }); await pause(150);
    await verif(`petit écran ${w} × ${h} : énoncé, champ et clavier visibles ensemble`, async () => {
      const b = await boites(pe); vrai(visible(b.enonce, b.hauteur) && visible(b.champ, b.hauteur) && visible(b.clavier, b.hauteur), JSON.stringify(b));
      vrai(await pasDeDefilementHorizontal(pe), "défilement horizontal");
    });
  }
  await pe.setViewportSize({ width: 380, height: 800 });
  await verif("semi-guidé : seule la dernière étape est demandée ; série jouée jusqu'au bilan", async () => {
    egal(await pe.evaluate(() => Q.etapes.length), 1);
    await serie(pe); egal(await pe.textContent("h1"), "Série terminée");
  });

  /* ================= seul, réseau coupé ================= */
  await pause(1500);
  const avantHL = await compter("suivi/app/tentatives");
  await eleve.ctx.setOffline(true);
  await pe.getByRole("button", { name: /Section suivante/ }).first().tap();
  await verif("mode seul : une ligne fausse → signalée ✗ avec son explication et la ligne attendue, à la fin seulement", async () => {
    egal(await pe.evaluate(() => Q.mode), "seul");
    const f = await pe.evaluate(() => { const ex = Q.exo, c = MM.diag.candidatsExpression(Q.depart).find(k => k.code === "SIG-REL"); return MM.expr.ecrireCote(MM.etapes.redCote(c.termes)).replace(/−/g, "-"); });
    await ecrire(pe, f);
    egal(await pe.$$eval(".ligne.fait .coche", cs => cs.map(c => c.textContent).join("")), "✗");
    vrai(/Une seule erreur, à la ligne 1/.test(await pe.textContent("#lignes"))); vrai(await pe.isVisible("text=La ligne attendue"));
  });
  await verif("réseau coupé : rien n'est parti, la pastille le dit, le travail est rangé sur l'appareil", async () => {
    await suite(pe); const pt = await pe.evaluate(() => pastille()); vrai(/en attente/.test(pt), pt);
    vrai(await pe.evaluate(k => JSON.parse(localStorage.getItem("mm." + k.slice(0, 8) + ".file")).ops.length > 0, CLE), "file vide sur l'appareil");
  });
  await eleve.ctx.setOffline(false);
  await pe.evaluate(() => window.dispatchEvent(new Event("online")));
  await verif("retour du réseau : la tentative faite hors ligne arrive dans la base, la file se vide", async () => {
    await attendre(async () => (await compter("suivi/app/tentatives")) === avantHL + 1, 15000, "tentative dans la base");
    await attendre(() => pe.evaluate(() => FILE.taille() === 0), 10000, "file vide");
    await attendre(async () => /Synchronisé/.test(await pe.evaluate(() => pastille())), 10000, "pastille Synchronisé");
  });
  await verif("série seule finie : leçon, guidé, semi et seul cochés dans la base ; l'examen s'ouvre", async () => {
    await serie(pe); egal(await pe.textContent("h1"), "Série terminée");
    const app = await attendre(async () => { const d = await lireBase("suivi/app"); return d && ["lecon", "guide", "semi", "seul"].every(s => d.paliers.P2.fait[s]) && d; }, 8000, "4 étapes cochées");
    vrai(!app.paliers.P2.remediation);
  });

  /* ================= examen de P2 : raté, remédiation, réussi ================= */
  await pe.getByRole("button", { name: /Section suivante : examen/ }).tap();
  await verif("examen : 10 exercices, étapes nommées, aucune correction pendant ; 3 étapes fausses (signe moins)", async () => {
    egal(await pe.evaluate(() => X.exos.length + ":" + Q.mode), "10:controle");
    for (let i = 0; i < 5; i++) {
      const faux = i === 3 || i === 4;
      for (let s = 0; s < 4 && !(await pe.evaluate(() => Q.fini)); s++) { if (faux && s === 0) await etapeFausse(pe, "SIG-PAR"); else await etapeJuste(pe); vrai(!(await pe.isVisible(".fb.faux")), "correction montrée pendant l'examen"); }
      vrai(/Exercice enregistré/.test(await pe.textContent("#lignes"))); await pe.tap("#suite");
      if (await pe.evaluate(() => vue === "pause")) await pe.locator("#app .btn").first().tap();
    }
  });
  await pause(1500);
  await pe.reload({ waitUntil: "domcontentloaded" }); await pastilleOK(pe);
  await verif("examen interrompu puis repris (D44) : Reprendre ramène au 6e exercice, les 5 premiers gardés", async () => {
    await pe.tap("#bReprendre");
    egal(await pe.evaluate(() => X.section + ":" + X.i + ":" + X.resultats.length), "examen:5:5");
    for (let i = 5; i < 10; i++) {
      for (let s = 0; s < 4 && !(await pe.evaluate(() => Q.fini)); s++) { if (i === 6 && s === 0) await etapeFausse(pe, "SIG-PAR"); else await etapeJuste(pe); }
      await pe.tap("#suite");
      if (await pe.evaluate(() => vue === "pause")) await pe.locator("#app .btn").first().tap();
    }
  });
  await verif("examen sous 80 % : palier pas validé, erreur dominante nommée, remédiation annoncée", async () => {
    const h = await pe.textContent("h1"); vrai(/^Examen : \d+ %$/.test(h), h);
    const t = await pe.textContent("#app"); vrai(/il faut 80 %/.test(t) && /signe moins non distribué/.test(t), t);
    const app = await attendre(async () => { const d = await lireBase("suivi/app"); return d && d.paliers.P2.examens === 1 && d; }, 8000, "examen enregistré");
    egal(app.paliers.P2.statut, "en_cours"); vrai(app.paliers.P2.remediation.codes.includes("SIG-PAR")); vrai(app.paliers.P2.meilleurExamen < 80);
  });
  await pe.getByRole("button", { name: "Accueil" }).tap();
  await verif("accueil : mini-leçon et série de remédiation ajoutées, examen refermé", async () => {
    const t = await pe.textContent("details[data-k='P2']");
    vrai(/Mini-leçon ciblée/.test(t) && /Série de remédiation/.test(t) && /Fermé : fais d'abord la remédiation/.test(t), t);
  });
  await pe.tap("#bSuivant");
  await verif("mini-leçon ciblée sur le signe moins, avec son piège ; puis 4 exercices de remédiation", async () => {
    vrai(/^Mini-leçon : signe moins/.test(await pe.textContent("h1")), await pe.textContent("h1")); vrai(await pe.isVisible(".bloc.piege"));
    await pe.getByRole("button", { name: "Commencer la série" }).tap();
    egal(await pe.evaluate(() => X.section + ":" + X.exos.length + ":" + Q.mode), "remed:4:guide");
  });
  await verif("fin de séance (3 blocs) : « Séance terminée », Encore un bloc → la série continue", async () => {
    await resoudre(pe);
    await pe.evaluate(() => { SEANCE.dureeActive = 3 * BLOC + 1000; SEANCE.blocsVus = 2; });
    await pe.tap("#suite");
    egal(await pe.textContent("h1"), "Séance terminée"); vrai(await pe.isVisible("text=J'arrête là"));
    await pe.getByRole("button", { name: "Encore un bloc" }).tap();
    egal(await pe.evaluate(() => vue + ":" + X.i + ":" + SEANCE.objectif), "exo:1:4");
    await serie(pe); egal(await pe.textContent("h1"), "Série terminée");
  });
  await verif("nouvel examen, sans faute : palier P2 validé, P3 ouvert, remédiation effacée", async () => {
    await pe.getByRole("button", { name: /Section suivante : examen/ }).tap();
    await serie(pe);
    egal(await pe.textContent("h1"), "Palier P2 validé !");
    const app = await attendre(async () => { const d = await lireBase("suivi/app"); return d && d.paliers.P2.statut === "valide" && d; }, 8000, "P2 validé");
    egal(app.paliers.P3.statut, "en_cours"); egal(app.paliers.P2.remediation, null); egal(app.paliers.P2.examens, 2); egal(app.paliers.P2.meilleurExamen, 100);
  });
  await pe.screenshot({ path: SHOTS + "/4-examen.png" });

  /* ---------- l'élève ne peut pas ouvrir l'espace parent sans le code ---------- */
  await pe.getByRole("button", { name: "Accueil" }).tap();
  await pe.getByRole("button", { name: "Espace parent" }).tap();
  await verif("élève : un mauvais code n'ouvre pas le rapport", async () => {
    await code(pe, "1234");
    vrai(/Code incorrect/.test(await pe.textContent("#app"))); vrai(!(await pe.isVisible("text=Séances")));
  });
  await pe.tap("#bRetour");

  /* ================= PC de l'élève : même lien, même progression ================= */
  const pc = await appareil(nav, "PC élève", { viewport: { width: 1280, height: 800 } });
  await ouvrir(pc.page, "#eleve=" + CLE);
  await verif("PC de l'élève, même lien : même prénom, P1 et P2 validés, P3 en cours et ouvert", async () => {
    await attendre(async () => (await pc.page.textContent("h1")) === "Salut " + PRENOM, 5000, "prénom");
    await attendre(async () => /Validé/.test(await pc.page.textContent("details[data-k='P2'] summary")) && /Validé/.test(await pc.page.textContent("details[data-k='P1'] summary")), 5000, "P1 et P2 validés");
    egal(await pc.page.$eval("details[data-k='P3']", d => d.open), true);
  });

  /* ================= retour au téléphone du parent : le rapport ================= */
  await pp.tap("#bRetour");
  await verif("appareil parent : accueil marqué « Appareil parent », P0 à P5 ouverts pour l'essai", async () => {
    vrai(/Appareil parent/.test(await pp.textContent("#app")));
    vrai(!/S'ouvre quand le palier/.test(await pp.textContent("details[data-k='P4']")));
    vrai(!/S'ouvre quand le palier/.test(await pp.textContent("details[data-k='P5']")) && !/Bientôt/.test(await pp.textContent("details[data-k='P5'] summary")));
  });
  await pp.getByRole("button", { name: "Espace parent" }).tap();
  await code(pp, "1986");
  await pp.waitForFunction(() => /Séances/.test(document.querySelector("#app").textContent) && !/Lecture du suivi/.test(document.querySelector("#app").textContent), null, { timeout: 8000 });
  await verif("parent, autre appareil : la séance de l'élève apparaît, avec tous ses exercices", async () => {
    await attendre(() => pp.evaluate(() => !!(RAPPORT && RAPPORT.frais && document.querySelector(".synth"))), 8000, "rapport lu depuis la base");
    const t = await pp.textContent(".synth");
    vrai(/aujourd'hui/.test(t), t); vrai(/P3 · Équations simples/.test(t), "palier actuel : " + t);
    const n = await compter("suivi/app/tentatives"); vrai(n >= 45, "trop peu de tentatives : " + n);
    egal(await pp.evaluate(() => RAPPORT.tentatives.length), n);
  });
  await verif("parent : SIG-PAR en tête des erreurs, nom en clair", async () => {
    await pp.getByRole("button", { name: "Tout déplier" }).tap();
    const top = await pp.$$eval("details[data-k='erreurs'] td", tds => tds.map(t => t.textContent).join(" | "));
    vrai(/Signe moins non distribué/.test(top) && /SIG-PAR/.test(top), "erreurs : " + JSON.stringify(top));
  });
  await verif("parent : paliers — P1 validé par le diagnostic, P2 validé en 2 examens", async () => {
    const t = await pp.textContent("details[data-k='paliers']");
    vrai(/Validé \(par le diagnostic\)/.test(t), t); vrai(/2 examens/.test(t) && /100 %/.test(t), t);
  });
  await verif("parent (D39) : détail des lignes avec le niveau d'aide en clair, « recopiée » en orange, jumeau et examen nommés", async () => {
    await pp.locator("details.seance summary").first().tap();
    const d = await pp.textContent("details.seance");
    vrai(/✗ Signe moins non distribué/.test(d), "ligne fausse absente"); vrai(/juste seul/.test(d)); vrai(/Jumeau/.test(d) && /Examen de palier/.test(d), "jumeau ou examen non nommés");
    const o = await pp.$$eval("details.seance li.orange", ls => ls.map(l => [l.textContent, getComputedStyle(l).color]));
    vrai(o.length >= 1 && /recopiée/.test(o[0][0]), "ligne recopiée absente"); vrai(o[0][1] !== "rgb(0, 0, 0)", "pas en orange");
    vrai(!/ligne donnée/.test(d), "ancien libellé « ligne donnée »");
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
  await verif("essai sur l'appareil parent : P4 guidé avec l'étape « Vérifie » ; la progression de l'élève ne bouge pas", async () => {
    await pp.tap("#bRetour");
    const avant = await lireBase("suivi/app"), cle = d => JSON.stringify({ r: d.eleve.reprise, p: d.paliers });
    await ouvrirPalier(pp, "P4"); await pp.locator("details[data-k='P4'] .etape", { hasText: "Série guidée" }).tap();
    egal(await pp.evaluate(() => Q.etapes.slice(-2).map(e => e.nom).join()), "Vérifie à gauche,Vérifie à droite");
    for (let s = 0; s < 8 && !(await pp.evaluate(() => /^verifie/.test(Q.etapes[Q.k].id))); s++) await etapeJuste(pp);
    vrai(/Avec x = /.test(await pp.textContent("label.etq")), "consigne : " + await pp.textContent("label.etq"));
    await etapeFausse(pp); vrai(await pp.isVisible(".fb.faux"), "erreur de vérification non signalée : " + await pp.evaluate(() => JSON.stringify(Q.fb)));
    await etapeJuste(pp); await etapeJuste(pp);
    vrai(await pp.evaluate(() => Q.fini), "pas fini : " + await pp.evaluate(() => JSON.stringify({ k: Q.k, fb: Q.fb, et: Q.etapes.map(e => e.id) })));
    vrai(/deux côtés sont égaux|deux côtés valent/.test(await pp.textContent("#lignes")), await pp.textContent("#lignes"));
    const apres = await attendre(async () => { const d = await lireBase("suivi/app"); return d.essai && d.essai.reprise && d.essai.reprise.section === "guide" && d; }, 8000, "reprise d'essai");
    egal(cle(apres), cle(avant));
    await pp.tap("#bRetour").catch(() => {});
  });

  /* ================= lot 3 : P5 (second degré), dans la zone d'essai du parent ================= */
  await verif("P5 : une famille créée avant le lot 3 voit P5 ouvert dans sa zone d'essai ; la progression de l'élève ne change pas", async () => {
    egal(await pp.evaluate(() => completer({ essai: { paliers: { P5: { statut: "verrouille" } } } }).essai.paliers.P5.statut), "en_cours");
    egal(await pp.evaluate(() => completer({ paliers: { P5: { statut: "verrouille" } } }).paliers.P5.statut), "verrouille");
  });
  await verif("P5 guidé, a, b, c : trois cases au clavier maths, formules sous l'énoncé, a = 0 expliqué (A-UN) sans donner la réponse", async () => {
    await pp.tap("#bRetour").catch(() => {});
    await ouvrirPalier(pp, "P5"); await pp.locator("details[data-k='P5'] .etape", { hasText: "Série guidée" }).tap();
    egal(await pp.evaluate(() => Q.exo.gen + ":" + Q.etapes.map(e => e.id).join()), "abc:coefs");
    egal(await pp.locator("input.trou").count(), 3);
    vrai(/Δ = b² − 4ac/.test(await pp.textContent(".enonce")), "formules absentes"); vrai(await pp.isVisible("#clavier"));
    await pp.locator("input.trou").nth(0).tap(); await taper(pp, "0");
    egal(await pp.inputValue("input.trou >> nth=0"), "0");
    const bc = await pp.evaluate(COEFS);
    await pp.locator("input.trou").nth(1).fill(bc[1]); await pp.locator("input.trou").nth(2).fill(bc[2]); await valider(pp);
    egal(await titreFb(pp), "Nombre caché devant x², lu comme 0");
    await pp.screenshot({ path: SHOTS + "/7-p5-abc.png" });
    vrai(!/=\s*1(?!\d)/.test(await pp.textContent("#fb")), "la réponse est donnée : " + await pp.textContent("#fb"));
    vrai(await pasDeDefilementHorizontal(pp)); egal((await petitsBoutons(pp)).join(" | "), "");
    await etapeJuste(pp); vrai(await pp.evaluate(() => Q.fini), "a, b, c pas acceptés");
  });
  await verif("P5 guidé, Δ : −b² sans parenthèses → DELTA-SQ ; puis Δ en 3 lignes au clavier maths (², ×, parenthèses) ; énoncé et champ visibles", async () => {
    await suite(pp);
    egal(await pp.evaluate(() => Q.exo.gen + ":" + Q.etapes.map(e => e.id).join()), "delta:delta");
    const dep = await pp.evaluate(() => MM.second.departEtape(Q.etapes[Q.k], Q.p5).replace(/−/g, "-"));
    vrai(/^\(-\d+\)²/.test(dep), "le niveau 1 du calcul de Δ a un b négatif : " + dep);
    await ecrire(pp, dep.replace(/^\((-\d+)\)²/, "$1²")); egal(await titreFb(pp), "(−b)² ou −b mal calculé");
    await pp.screenshot({ path: SHOTS + "/7-p5-delta-faux.png" });
    await vider(pp); await taper(pp, dep); await valider(pp);
    vrai(/en cours/.test(await pp.textContent("#lignes")), "le remplacement n'est pas gardé comme ligne en cours");
    const b = await boites(pp); vrai(visible(b.enonce, b.hauteur) && visible(b.champ, b.hauteur) && b.champ.bas <= b.clavier.haut + 1, "énoncé ou champ caché : " + JSON.stringify(b));
    await ecrire(pp, await pp.evaluate(() => MM.nombres.prochaine(Q.prev, "produit").replace(/−/g, "-")));
    await etapeJuste(pp);
    vrai(await pp.evaluate(() => Q.fini), "Δ pas accepté");
    egal(await pp.evaluate(() => Q.journal.filter(l => l.juste).length), 3);
  });
  await pp.screenshot({ path: SHOTS + "/7-p5-delta.png" });
  await verif("P5 guidé, équation entière : « Reprendre » au milieu du calcul de Δ ramène à sa ligne, puis √Δ, x₁, x₂", async () => {
    await suite(pp);
    egal(await pp.evaluate(() => Q.etapes.map(e => e.id).join()), "coefs,delta,nb,rac,x1,x2");
    await etapeJuste(pp);
    await ecrire(pp, await pp.evaluate(() => MM.second.departEtape(Q.etapes[Q.k], Q.p5).replace(/−/g, "-")));
    const avant = await pp.evaluate(() => [Q.etapes[Q.k].id, Q.acceptees.length, MM.nombres.ecrire(Q.prev)].join(" | "));
    await pause(300);
    await pp.reload({ waitUntil: "domcontentloaded" }); await pastilleOK(pp);
    vrai(!(await pp.isDisabled("#bReprendre"))); await pp.tap("#bReprendre");
    egal(await pp.evaluate(() => [Q.etapes[Q.k].id, Q.acceptees.length, MM.nombres.ecrire(Q.prev)].join(" | ")), avant);
    vrai(/en cours/.test(await pp.textContent("#lignes")));
    for (let s = 0; s < 10 && !(await pp.evaluate(() => Q.fini)); s++) await etapeJuste(pp);
    vrai(await pp.evaluate(() => Q.fini), "équation pas finie");
    egal(await pp.evaluate(() => Q.acceptees.filter(a => !a.inter).map(a => a.etape).join()), "coefs,delta,nb,rac,x1,x2");
    await suite(pp); egal(await pp.textContent("h1"), "Série terminée");
  });
  await verif("P5, série seul (D56) : étapes sans aide ; Δ faux (−13²) puis juste à partir de sa ligne → 0 solution ; corrigé à la fin, 2 étapes sur 3", async () => {
    await pp.getByRole("button", { name: "Accueil" }).tap();
    await ouvrirPalier(pp, "P5"); await pp.locator("details[data-k='P5'] .etape", { hasText: "Série seul" }).tap();
    await pp.evaluate(() => { X.exos[0] = { gen: "eq2ref", niveau: 1, graine: 0 }; ouvrirExo(null); });      // l'exercice 2 du contrôle, valeurs exactes
    egal(await pp.evaluate(() => [Q.mode, Q.exo.enonce].join()), "controle,x² − 13x + 30 = 0");
    vrai(!(await pp.isVisible("text=Un indice")));
    await etapeJuste(pp);
    for (const l of ["-13²-4×1×30", "-169-120", "-289", "0"]) { await taper(pp, l); await valider(pp); vrai(!(await pp.isVisible(".fb.faux")) || await pp.evaluate(() => Q.fini), "correction montrée avant la fin"); }
    vrai(await pp.evaluate(() => Q.fini), "l'exercice doit s'arrêter : son Δ est négatif");
    const t = await pp.textContent("#lignes");
    vrai(/2 étapes justes sur 3/.test(t), t); vrai(/\(−b\)² ou −b mal calculé/.test(t), "erreur non expliquée"); vrai(/Démarche modèle/.test(t), "corrigé absent");
    egal(await pp.evaluate(() => Q.tentative.points + "/" + Q.tentative.total + " " + Q.tentative.codeErreur), "2/3 DELTA-SQ");
    await pp.screenshot({ path: SHOTS + "/8-p5-seul.png", fullPage: true });
    await pp.tap("#bRetour").catch(() => {});
  });
  /* ================= lot express : révision du 29/11 (G1 à G6), exercices des fiches de la prof ================= */
  const fiche = async (page, sec, n) => { await page.evaluate(([s, k]) => { lancer("G1", s); X.exos[0] = { gen: "georef", niveau: k, graine: 0 }; ouvrirExo(null); }, [sec, n]); };
  await verif("révision 29/11 : panneau G1 à G6 ouvert d'office, la méthode montre la formule et l'exercice de la fiche corrigé", async () => {
    await pp.tap("#bRetour").catch(() => {});
    await ouvrirPalier(pp, "rev"); await ouvrirPalier(pp, "G1");
    egal(await pp.locator("details[data-k='rev'] details.panel").count(), 7);
    await pp.locator("details[data-k='G1'] .etape", { hasText: "La méthode" }).tap();
    const t = await pp.textContent("#app");
    vrai(/√\(\(x₂ − x₁\)² \+ \(y₂ − y₁\)²\)/.test(t) && /E\(−3, −1\)/.test(t) && /√41 ≈ 6,40/.test(t), t.slice(0, 400));
    await pp.screenshot({ path: SHOTS + "/9-g1-methode.png", fullPage: true });
    vrai(await pasDeDefilementHorizontal(pp));
  });
  await verif("G1 avec aide : E(−3, −1), F(2, 3) au clavier maths (parenthèses, ², √) ; « EF = 41 » → racine oubliée, sans donner la valeur", async () => {
    await fiche(pp, "guide", 3);
    egal(await pp.evaluate(() => Q.etapes.map(e => e.id).join()), "EF2,EF");
    vrai(await pp.evaluate(() => { const b = document.querySelector('#clavier button[data-k="x"]'), f = document.querySelector('#clavier button[data-k="×"]'); return b.classList.contains("lettre") && getComputedStyle(b).fontStyle === "italic" && getComputedStyle(f).fontStyle !== "italic"; }), "x et × se ressemblent");
    egal(await pp.textContent(".saisie .pre"), "EF² =");
    await ligne(pp, "(2-(-3))²+(3-(-1))²"); vrai(/en cours/.test(await pp.textContent("#lignes")));
    await ligne(pp, "41");
    await ligne(pp, "41"); egal(await titreFb(pp), "Racine oubliée");
    vrai(!/6,4|√41/.test(await pp.textContent("#fb")), "valeur juste donnée : " + await pp.textContent("#fb"));
    await vider(pp); await ligne(pp, "√41");
    vrai(await pp.evaluate(() => Q.fini), "√41 pas accepté");
    const b = await boites(pp); vrai(visible(b.enonce, b.hauteur), JSON.stringify(b));
  });
  await verif("G1 avec aide : « Reprendre » au milieu de AB² ramène à sa ligne ; le nom recopié (AB =) est accepté", async () => {
    await suite(pp).catch(() => {});
    await fiche(pp, "guide", 1);
    await ligne(pp, "(5-1)²+(5-2)²");
    const avant = await pp.evaluate(() => [Q.etapes[Q.k].id, Q.acceptees.length, MM.nombres.ecrire(Q.prev)].join(" | "));
    await pause(300);
    await pp.reload({ waitUntil: "domcontentloaded" }); await pastilleOK(pp);
    await pp.tap("#bReprendre");
    egal(await pp.evaluate(() => [Q.etapes[Q.k].id, Q.acceptees.length, MM.nombres.ecrire(Q.prev)].join(" | ")), avant);
    await ligne(pp, "25"); await pp.fill("#champ", "AB = 5"); await valider(pp);
    vrai(await pp.evaluate(() => Q.fini), "AB = 5 refusé");
  });
  await verif("G3 avec aide (partie B, ex. 1) : pente puis droite tapée avec la touche y ; 5 erreurs sur la droite → ligne à recopier (D74)", async () => {
    await suite(pp).catch(() => {});
    await fiche(pp, "guide", 4);
    for (const l of ["(5-1)²+(3-1)²", "20", "√20", "(3-1)/(5-1)", "0,5"]) await ligne(pp, l);
    egal(await pp.evaluate(() => Q.etapes[Q.k].id), "eqAB");
    await ligne(pp, "y-1=0,5(x-1)"); vrai(/en cours/.test(await pp.textContent("#lignes")));
    await pp.screenshot({ path: SHOTS + "/9-g3-droite.png" });
    for (let i = 0; i < 4; i++) { await vider(pp); await ligne(pp, "y=0,5x+2"); vrai(await pp.isVisible(".fb.faux"), "erreur " + (i + 1) + " sans explication"); }
    vrai(/Indice/.test(await pp.textContent("#fb")), "marche 3 sans indice");
    await vider(pp); await ligne(pp, "y=0,5x+2");
    egal(await pp.evaluate(() => Q.recopie), "y = 0,5x + 0,5");
    await vider(pp); await ligne(pp, "y=0,5x+0,5");
    vrai(await pp.evaluate(() => Q.fini && Q.jumeau), "droite recopiée sans jumeau");
  });
  await verif("G5 sans aide (triangle isocèle de la prof) : aucune correction en route, AC = 25 marqué à la fin avec le corrigé", async () => {
    await fiche(pp, "seul", 6);
    egal(await pp.evaluate(() => Q.mode + " " + Q.etapes.length), "controle 10");
    for (const l of ["(3-0)²+(4-0)²", "25", "25"]) { await ligne(pp, l); vrai(!(await pp.isVisible(".fb.faux")), "correction montrée en route"); }
    for (const l of ["25", "5", "3", "0", "16", "4", "4/3", "y=4/3x"]) await ligne(pp, l);
    vrai(await pp.evaluate(() => Q.fini), "exercice pas fini");
    const t = await pp.textContent("#lignes");
    vrai(/9 étapes justes sur 10/.test(t), t.slice(0, 300)); vrai(/Racine oubliée/.test(t)); vrai(/Démarche modèle/.test(t) && /isocèle en C/.test(t));
    egal(await pp.evaluate(() => Q.tentative.codeErreur + " " + Q.tentative.palier), "RAC-OUB G1");
    await pp.screenshot({ path: SHOTS + "/9-g5-seul.png", fullPage: true });
    await pp.tap("#bRetour").catch(() => {});
  });
  await verif("G7 trigo : méthode dessinée, 7 exercices avec figure, corrigé caché même après « Tout déplier », puis montré à la demande", async () => {
    await pp.evaluate(() => aller("accueil"));
    await ouvrirPalier(pp, "rev"); await ouvrirPalier(pp, "G7");
    await pp.locator("details[data-k='G7'] .etape", { hasText: "La fiche corrigée" }).tap();
    egal(await pp.textContent("h1"), "Trigonométrie");
    egal(await pp.locator("svg.fig").count(), 8);
    egal(await pp.locator("details.pas").count(), 7);
    await pp.getByRole("button", { name: "Tout déplier" }).tap();
    vrai(!(await pp.isVisible("#corr1")), "corrigé visible sans le demander");
    vrai(!/6,88/.test(await pp.evaluate(() => [...document.querySelectorAll("#app details.pas")].map(d => d.innerText).join(" "))), "réponse visible avant le corrigé");
    await pp.locator("details[data-k='t1'] button", { hasText: "Voir le corrigé" }).tap();
    vrai(await pp.isVisible("#corr1")); vrai(/BC = 12 × sin 35° ≈ 6,88/.test(await pp.textContent("#corr1")), await pp.textContent("#corr1"));
    vrai(/sin 30 : elle doit afficher 0,5/.test(await pp.textContent("#app")), "test de la calculatrice absent");
    vrai(await pasDeDefilementHorizontal(pp)); egal((await petitsBoutons(pp)).join(" | "), "");
    await pp.screenshot({ path: SHOTS + "/9-g7-trigo.png", fullPage: true });
    await pp.tap("#bRetour"); egal(await pp.evaluate(() => vue), "accueil");
  });
  await verif("D81-D82 : P1 à P5 ouverts d'office chez l'élève jusqu'au 29/11 inclus, même verrouillé ; P6 reste fermé", async () => {
    const avant = await pe.evaluate(() => new Date().toISOString().slice(0, 10) <= "2026-11-29");
    for (const k of ["P1", "P2", "P3", "P4", "P5"]) egal(await pe.evaluate(id => ouvertDoffice(id), k), avant, k);
    egal(await pe.evaluate(() => ouvertDoffice("P6")), false);
    await pe.evaluate(() => { const o = clone(prog()); o.P5 = PA.completerPalier(Object.assign({}, o.P5, { statut: "verrouille" })); ecrirePaliers(o); aller("accueil"); });
    await ouvrirPalier(pe, "P5");
    const t = await pe.textContent("details[data-k='P5']");
    if (avant) { vrai(/Ouvert pour le contrôle du 29\/11/.test(t) && !/Fermé/i.test(await pe.textContent("details[data-k='P5'] > summary")), t); egal(await pe.locator("details[data-k='P5'] .etape").count() > 0, true);
      await pe.locator("details[data-k='P5'] .etape", { hasText: "Série guidée" }).tap(); egal(await pe.evaluate(() => vue + " " + X.palier), "exo P5"); await pe.tap("#bRetour"); }
    else vrai(/S'ouvre quand le palier/.test(t), t);
  });
  /* ================= clé oubliée, lien abîmé, refus de la base ================= */
  await verif("clé oubliée sur le téléphone de l'élève : écran d'appairage, puis lien rouvert → rien de perdu", async () => {
    await pe.evaluate(() => localStorage.clear());
    await pe.goto(URL_APP(), { waitUntil: "domcontentloaded" }); await pe.waitForSelector("text=Cet appareil n'est pas encore relié");
    await ouvrir(pe, "#eleve=" + CLE);
    await attendre(async () => /Validé/.test(await pe.textContent("details[data-k='P2'] summary")), 8000, "P2 validé");
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
})().catch(e => { for (const r of resultats) console.log(r[0] + " " + r[1]); if (erreursPage.length) console.log("ARRÊT erreurs de page : " + erreursPage.join(" | ")); console.error("ARRÊT", e && e.message ? e.message.split("\n").slice(0, 6).join(" / ") : e); process.exit(2); });
