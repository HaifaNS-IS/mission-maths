/* v0.6.1 — Écran blanc sur iPhone (26/11) : une feuille de style externe bloque l'affichage ET le démarrage du code
   tant qu'elle n'a pas répondu. Aucune ressource externe ne doit pouvoir empêcher la page de s'afficher. */
const fs = require("fs"), path = require("path");
const { test, egal, vrai } = require("./_harnais.js");
const HTML = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
const tete = HTML.slice(0, HTML.indexOf("</head>"));
const horsNoscript = tete.replace(/<noscript>[\s\S]*?<\/noscript>/g, "");

test("aucune feuille de style externe bloquante dans l'en-tête (hors <noscript>)", () => {
  const liens = horsNoscript.match(/<link\b[^>]*rel="stylesheet"[^>]*>/g) || [];
  for (const l of liens) {
    if (!/href="https?:\/\//.test(l)) continue;
    vrai(/media="print"/.test(l) && /onload="this\.media='all'"/.test(l), "feuille externe bloquante : " + l);
  }
});
test("aucun script externe bloquant dans la page (Firebase est chargé à la demande)", () => {
  const scripts = HTML.match(/<script\b[^>]*src="https?:\/\/[^"]*"[^>]*>/g) || [];
  egal(scripts.length, 0, scripts.join(" "));
});
test("pas d'@import externe dans les styles intégrés", () => {
  vrai(!/@import\s+(url\()?["']?https?:/.test(HTML), "@import externe trouvé");
});
test("la barre du haut et le texte « Chargement… » sont écrits dans la page, sans attendre le code", () => {
  vrai(/<header id="barre">/.test(HTML) && /Chargement…/.test(HTML));
});
test("les fichiers du site portent tous la version de l'app (?v=…), égale à celle de package.json", () => {
  const v = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "package.json"), "utf8")).version;
  egal((HTML.match(/const APP_VERSION = "([^"]+)"/) || [])[1], v, "APP_VERSION");
  const versions = new Set((HTML.match(/\?v=[0-9.]+/g) || []).map(s => s.slice(3)));
  egal([...versions].join(), v, "versions des scripts");
});
test("diag.html (diagnostic réseau) : aucune ressource externe, elle s'affiche dès que github.io répond", () => {
  const D = fs.readFileSync(path.join(__dirname, "..", "diag.html"), "utf8");
  egal((D.match(/<link\b[^>]*rel="stylesheet"[^>]*>/g) || []).length, 0, "feuille de style liée");
  egal((D.match(/<script\b[^>]*\bsrc=/g) || []).length, 0, "script externe");
  vrai(!/@import/.test(D), "@import");
  vrai(/Cette page s'affiche : github\.io répond/.test(D.slice(0, D.indexOf("<script>"))), "verdict github.io écrit dans la page, sans attendre le code");
});
