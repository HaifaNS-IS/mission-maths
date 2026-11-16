/* Lance tous les tests : node tests/lancer.js   — sort en erreur si un seul test est rouge. */
const fs = require("fs"), path = require("path");
const h = require("./_harnais.js");
(async () => {
  for (const f of fs.readdirSync(__dirname).filter(f => f.endsWith(".test.js")).sort()) { h.fichier(f.replace(".test.js", "")); require(path.join(__dirname, f)); }
  const { par, echecs } = await h.lancer();
  let ok = 0, ko = 0;
  for (const f of Object.keys(par)) { ok += par[f].ok; ko += par[f].ko; console.log((par[f].ko ? "✗ " : "✓ ") + f.padEnd(16) + par[f].ok + "/" + (par[f].ok + par[f].ko)); }
  for (const e of echecs) console.log("  ROUGE " + e);
  console.log("\nTOTAL " + ok + "/" + (ok + ko) + (ko ? " ✗  — livraison bloquée" : " ✓"));
  process.exit(ko ? 1 : 0);
})();
