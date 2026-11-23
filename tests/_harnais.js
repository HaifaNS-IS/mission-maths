/* Harnais de test minimal (Node, sans dépendance). Chaque appel à test() compte pour un contrôle. */
const path = require("path");
["fraction", "expr", "saisie", "etapes", "diag", "outils", "nombres", "gen/algebre", "gen/nombres", "aide", "lecon", "progression", "parcours", "rapport", "file", "base"]
  .forEach(f => require(path.join(__dirname, "..", "js", f + ".js")));

const file = [];
let courant = "?";
function fichier(nom) { courant = nom; }
function test(nom, fn) { file.push({ fichier: courant, nom, fn }); }
function egal(a, b, msg) { if (a !== b) throw new Error((msg ? msg + " : " : "") + "obtenu " + JSON.stringify(a) + ", attendu " + JSON.stringify(b)); }
function vrai(v, msg) { if (!v) throw new Error(msg || "condition fausse"); }
async function lancer() {
  const par = {}, echecs = [];
  for (const t of file) {
    const p = par[t.fichier] || (par[t.fichier] = { ok: 0, ko: 0 });
    try { await t.fn(); p.ok++; } catch (e) { p.ko++; echecs.push("[" + t.fichier + "] " + t.nom + " → " + (e && e.message)); }
  }
  return { par, echecs };
}
module.exports = { MM: globalThis.MM, fichier, test, egal, vrai, lancer };
