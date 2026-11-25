/* Moteur des tests navigateur. Par défaut Chrome ; MOTEUR=webkit pour le moteur de Safari, celui de l'iPhone de l'élève (D98).
   Installer le moteur Safari une fois par machine : node /opt/npm-tools/node_modules/playwright/cli.js install webkit */
const PW = require("/opt/npm-tools/node_modules/playwright");
const MOTEUR = process.env.MOTEUR === "webkit" ? "webkit" : "chromium";
const NOM = MOTEUR === "webkit" ? "moteur Safari (WebKit)" : "Chrome";
function lancer(proxy) {
  if (MOTEUR === "webkit") return PW.webkit.launch(proxy ? { proxy } : {});
  return PW.chromium.launch(Object.assign({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox"] }, proxy ? { proxy } : {}));
}
/* Le moteur Safari signale comme erreur de page chaque requête réseau coupée (« due to access control checks »).
   Pendant les coupures voulues du test, celles de Firebase ne sont pas des erreurs de l'app : on les écarte, et seulement elles. */
const bruitReseau = msg => MOTEUR === "webkit" && /due to access control checks/.test(msg) && /(googleapis\.com|127\.0\.0\.1:(8080|9099)|localhost:(8080|9099))\//.test(msg);
/* Le moteur Safari écrit « Failed to load resource » sans l'adresse dans le texte : on regarde l'adresse de la ressource.
   Seules les polices (bloquées exprès par le test) et le réseau Firebase coupé exprès sont écartés,
   dont cleardot.gif : la sonde de connexion du SDK Firestore. */
const bruitConsole = (msg, url) => MOTEUR === "webkit" && /^Failed to load resource/.test(msg) && /fonts\.(googleapis|gstatic)\.com|(googleapis\.com|127\.0\.0\.1:(8080|9099)|localhost:(8080|9099))\/|^https:\/\/www\.google\.com\/images\/cleardot\.gif/.test(url || "");
module.exports = { MOTEUR, NOM, lancer, bruitReseau, bruitConsole };
