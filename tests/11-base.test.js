/* Lot 1 bis — base.js, partie sans réseau : clé de famille, liens, rôle de l'appareil, écriture par champs, codes d'erreur.
   La partie Firestore (écritures réelles, règles) est testée contre l'émulateur : node tests/avec-emulateur.js tests/base/firestore.js */
const { MM, test, egal, vrai } = require("./_harnais.js");
const B = MM.base, O = MM.outils;
const crypto = require("crypto");
const { objetAuHasard } = require("./base/_objets.js");
const hasard = n => new Uint8Array(crypto.randomBytes(n));

test("clé de famille : 32 caractères, lettres et chiffres seulement, reconnue valide", () => {
  for (let i = 0; i < 200; i++) {
    const c = B.nouvelleCle(hasard);
    egal(c.length, 32); vrai(/^[A-Za-z0-9]{32}$/.test(c), "caractère interdit : " + c); vrai(B.cleValide(c), "clé refusée : " + c);
  }
});
test("clé de famille : 2 000 clés tirées, aucune en double", () => {
  const vues = new Set(); for (let i = 0; i < 2000; i++) vues.add(B.nouvelleCle(hasard)); egal(vues.size, 2000);
});
test("clé de famille : tirage sans biais (octets 248 à 255 écartés, chaque caractère à ±25 % de sa part)", () => {
  // source truquée : 255 et 250 doivent être sautés, 0 donne « A », 61 donne « 9 », 62 redonne « A »
  const suite = [255, 250, 0, 61, 62].concat(new Array(200).fill(1)); let k = 0;
  const truque = n => { const o = new Uint8Array(n); for (let i = 0; i < n; i++) o[i] = suite[k++ % suite.length]; return o; };
  vrai(B.nouvelleCle(truque).startsWith("A9A"), "rejet des octets hauts absent");
  const compte = {}; for (let i = 0; i < 3000; i++) for (const ch of B.nouvelleCle(hasard)) compte[ch] = (compte[ch] || 0) + 1;
  const attendu = 3000 * 32 / 62;
  egal(Object.keys(compte).length, 62, "les 62 caractères ne sortent pas tous");
  for (const [ch, n] of Object.entries(compte)) vrai(Math.abs(n - attendu) < attendu * 0.25, "caractère « " + ch + " » : " + n + " au lieu de ≈ " + Math.round(attendu));
});
test("clé valide : 32 lettres ou chiffres exactement ; tout le reste refusé", () => {
  const ok = "Ab3dEf7hIj0lMn9pQr2tUv4xYz5aBc6d";
  vrai(B.cleValide(ok));
  for (const mauvaise of [ok.slice(1), ok + "e", ok.slice(0, 31) + "-", ok.slice(0, 31) + "_", ok.slice(0, 31) + " ", "", null, undefined, 42, " " + ok])
    vrai(!B.cleValide(mauvaise), "acceptée à tort : " + JSON.stringify(mauvaise));
});

const CLE = "Ab3dEf7hIj0lMn9pQr2tUv4xYz5aBc6d";
test("lien élève et lien parent : rôle et clé relus depuis la partie # du lien", () => {
  egal(JSON.stringify(B.lireLien("#eleve=" + CLE)), JSON.stringify({ cle: CLE, role: "eleve" }));
  egal(JSON.stringify(B.lireLien("#parent=" + CLE)), JSON.stringify({ cle: CLE, role: "parent" }));
  egal(JSON.stringify(B.lireLien("eleve=" + CLE)), JSON.stringify({ cle: CLE, role: "eleve" }), "sans le #");
});
test("lien abîmé : rôle inconnu, clé tronquée ou vide → aucun appairage", () => {
  for (const h of ["", "#", "#eleve=", "#eleve=" + CLE.slice(0, 31), "#prof=" + CLE, "#ELEVE=" + CLE, "#eleve=" + CLE + "%20", "#eleve" + CLE, null, undefined])
    egal(B.lireLien(h), null, "lien accepté à tort : " + JSON.stringify(h));
});
test("lien fabriqué : adresse du site sans ancienne partie # ni paramètres, puis #eleve= ou #parent=", () => {
  egal(B.lien("https://haifans-is.github.io/mission-maths/", CLE, "eleve"), "https://haifans-is.github.io/mission-maths/#eleve=" + CLE);
  egal(B.lien("https://haifans-is.github.io/mission-maths/?x=1#parent=" + CLE, CLE, "eleve"), "https://haifans-is.github.io/mission-maths/#eleve=" + CLE);
  egal(B.lien("https://haifans-is.github.io/mission-maths/index.html#eleve=" + CLE, CLE, "parent"), "https://haifans-is.github.io/mission-maths/index.html#parent=" + CLE);
  egal(JSON.stringify(B.lireLien(B.lien("https://a.b/c/", CLE, "parent").split("#")[1])), JSON.stringify({ cle: CLE, role: "parent" }), "aller-retour");
});

/* Écriture par champs : la base doit faire exactement ce que fait fusionner() sur l'appareil (sinon l'appareil et la base divergent).
   Ici on applique les champs avec la règle de Firestore (les maps manquantes sont créées, une valeur non-map en chemin est remplacée) ;
   l'émulateur confirme cette règle dans tests/base/firestore.js. */
function appliquerChamps(cible, champs) {
  for (const [chemin, v] of champs) {
    let o = cible;
    for (let i = 0; i < chemin.length - 1; i++) { const k = chemin[i]; if (!o[k] || typeof o[k] !== "object" || Array.isArray(o[k])) o[k] = {}; o = o[k]; }
    o[chemin[chemin.length - 1]] = v && typeof v === "object" ? JSON.parse(JSON.stringify(v)) : v;
  }
  return cible;
}
test("écriture par champs = fusionner() de l'appareil, sur 2 000 paires d'objets tirées au hasard", () => {
  const alea = O.alea(20261116).suivant;
  for (let i = 0; i < 2000; i++) {
    const cible = objetAuHasard(alea, 0), source = objetAuHasard(alea, 0);
    const attendu = O.fusionner(JSON.parse(JSON.stringify(cible)), source);
    const obtenu = appliquerChamps(JSON.parse(JSON.stringify(cible)), B.aplatir(source));
    egal(JSON.stringify(obtenu), JSON.stringify(attendu), "paire " + i + " : " + JSON.stringify({ cible, source }));
  }
});
test("écriture par champs : clés à point ou espace gardées entières, tableaux et null écrits tels quels, objet vide sans effet", () => {
  egal(JSON.stringify(B.aplatir({ "x.y": 1, eleve: { reprise: { k: [1, 2] }, nom: null } })), JSON.stringify([[["x.y"], 1], [["eleve", "reprise", "k"], [1, 2]], [["eleve", "nom"], null]]));
  egal(B.aplatir({ a: {} }).length, 0); egal(B.aplatir({}).length, 0);
  egal(JSON.stringify(B.aplatir({ a: undefined, b: 2 })), JSON.stringify([[["b"], 2]]), "undefined ignoré");
});

test("codes d'erreur Firestore traduits pour la file hors ligne", () => {
  const t = c => B.traduireErreur({ code: c }).code;
  egal(t("permission-denied"), "permission_denied");
  egal(t("not-found"), "introuvable");
  egal(t("invalid-argument"), "invalid_argument");
  egal(t("resource-exhausted"), "quota_exceeded");
  for (const c of ["unavailable", "deadline-exceeded", "unauthenticated", "internal", "auth/network-request-failed", undefined]) egal(t(c), "unavailable", String(c));
  vrai(!MM.file.REFUS.includes("permission_denied"), "un refus d'accès ne doit pas faire jeter l'écriture : elle attend que le lien soit réparé");
  vrai(MM.file.REFUS.includes("invalid_argument"));
});
