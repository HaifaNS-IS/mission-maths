/* Lance un script de test avec l'émulateur Firebase (Auth + Firestore, règles de firestore.rules), puis l'arrête.
   node tests/avec-emulateur.js tests/base/firestore.js      (il faut d'abord : npm install) */
const { spawnSync } = require("child_process"), path = require("path");
const RACINE = path.join(__dirname, "..");
const script = process.argv[2];
if (!script) { console.error("usage : node tests/avec-emulateur.js <script>"); process.exit(2); }
const projet = require(path.join(RACINE, "js", "config.js")).config.firebase.projectId;
const r = spawnSync(path.join(RACINE, "node_modules", ".bin", "firebase"),
  ["emulators:exec", "--only", "auth,firestore", "--project", projet, "node " + JSON.stringify(path.resolve(script))],
  { cwd: RACINE, stdio: ["ignore", "pipe", "pipe"], encoding: "utf8", env: Object.assign({}, process.env, { FIREBASE_CLI_EXPERIMENTS: "" }) });
const sortie = (r.stdout || "") + (r.stderr || "");
// on ne garde que les lignes de résultat du script (l'émulateur et le SDK parlent beaucoup)
const utiles = sortie.split("\n").filter(l => /^(✓|✗|  ROUGE)|^(FIRESTORE|NAVIGATEUR|TOTAL|ARRÊT|RÈGLES)/.test(l));
console.log(utiles.length ? utiles.join("\n") : sortie);
process.exit(r.status === 0 ? 0 : 1);
