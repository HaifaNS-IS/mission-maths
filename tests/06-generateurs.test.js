/* QA 2 — Générateurs : 500 tirages par générateur et par niveau ; chaque réponse vérifiée en la réinjectant dans l'énoncé ; contraintes respectées. */
const { MM, test, egal, vrai } = require("./_harnais.js");
const E = MM.expr, T = MM.etapes, D = MM.diag, Gn = MM.gen, F = MM.F;
const N = 500;
const nombresDe = txt => (txt.match(/\d+(?:[.,]\d+)?/g) || []).map(s => Number(s.replace(",", ".")));
const CAS = [["dev1", 1], ["dev1", 2], ["eq1par", 1], ["eq1par", 2], ["eq1par", 3]];

for (const [id, niveau] of CAS) {
  test(id + " niveau " + niveau + " : " + N + " tirages, réponse réinjectée, bornes, codes, pas de collision", () => {
    const enonces = new Set();
    for (let graine = 1; graine <= N; graine++) {
      const exo = Gn.creer(id, niveau, graine), ctx = id + " n" + niveau + " g" + graine + " : " + exo.enonce;
      egal(JSON.stringify(Gn.creer(id, niveau, graine)), JSON.stringify(exo), "tirage non reproductible : " + ctx);
      egal(exo.id, id + "-n" + niveau + "-" + graine); egal(exo.gen, id); egal(exo.niveau, niveau); egal(exo.graine, graine);
      for (const champ of ["type", "consigne", "enonce", "reponse", "reponseTexte"]) vrai(typeof exo[champ] === "string" && exo[champ], champ + " manquant : " + ctx);
      vrai(exo.etapes.length >= 1 && exo.corrige.length >= 1, "étapes ou corrigé vides : " + ctx);
      egal(JSON.stringify(JSON.parse(JSON.stringify(exo))), JSON.stringify(exo), "exercice non enregistrable : " + ctx);
      for (const v of nombresDe(exo.enonce + " " + exo.corrige.map(l => l.ligne).join(" "))) vrai(v <= 100, "nombre > 100 (" + v + ") : " + ctx);
      egal(D.collisions(exo.erreurs).length, 0, "collision entre codes : " + ctx);
      if (exo.type === "equation") {
        const eq0 = Gn.depart(exo), x = F(exo.reponse);
        egal(E.ecrireEquation(eq0), exo.enonce, "énoncé non relisible : " + ctx);
        vrai(E.polyDeTermes(eq0.g).valeur(x).egal(E.polyDeTermes(eq0.d).valeur(x)), "la solution ne vérifie pas l'énoncé : " + ctx);
        vrai(!x.estNul() && x.abs().cmp(niveau === 3 ? 10 : 9) <= 0, "solution hors bornes : " + ctx);
        if (niveau < 3) vrai(x.estEntier(), "solution non entière à un niveau facile : " + ctx);
        else vrai([1n, 2n, 4n, 5n].includes(x.d), "dénominateur non prévu : " + ctx);
        for (const et of exo.etapes) { const l = E.lireEquation(et.attendu); vrai(T.equivalentes(eq0, l), "étape non équivalente : " + ctx); vrai(T.FORMES[et.forme](l), "étape pas à sa forme : " + ctx); }
        for (const l of exo.corrige) vrai(T.equivalentes(eq0, E.lireEquation(l.ligne.split(" = ").slice(0, 2).join(" = "))), "ligne du corrigé non équivalente : " + ctx);
        const der = exo.corrige[exo.corrige.length - 1]; egal(der.ligne, exo.reponseTexte, ctx);
        const voulus = { 1: ["DIST-PART", "TRANS-SIG"], 2: ["SIG-PAR", "DIST-PART", "TRANS-SIG"], 3: ["SIG-PAR", "DIST-PART", "TRANS-SIG", "DIV-INV"] }[niveau];
        for (const c of voulus) vrai(exo.erreurs[c] && exo.erreurs[c].length, c + " sans réponse fausse : " + ctx);
        for (const c of Object.keys(exo.erreurs)) for (const v of exo.erreurs[c]) { const xf = F(v); vrai(!xf.egal(x), "réponse fausse égale à la bonne : " + ctx); }
        egal(T.evaluerDemarche(eq0, exo.etapes.map(e => e.attendu), exo.etapes.map(e => e.forme)).nbErreurs, 0, "le corrigé est jugé faux : " + ctx);
      } else {
        const dep = Gn.depart(exo), bon = E.lireExpression(exo.reponse);
        egal(E.ecrireCote(dep), exo.enonce, ctx);
        vrai(E.polyDeTermes(dep).egal(bon.poly), "développement faux : " + ctx);
        for (const v of [2, -3, 7]) vrai(E.polyDeTermes(dep).valeur(v).egal(bon.poly.valeur(v)), "valeurs différentes en x = " + v + " : " + ctx);
        vrai(bon.termes.every(t => !t.inner), "réponse avec parenthèses : " + ctx);
        const voulus = niveau === 1 ? ["DIST-PART"] : ["SIG-PAR", "DIST-PART"];
        for (const c of voulus) { vrai(exo.erreurs[c], c + " absent : " + ctx); for (const f of exo.erreurs[c]) { const v = T.jugerExpression(dep, f, "developpe"); egal(v.statut, "faux", ctx); egal(v.code, c, ctx); } }
        egal(T.jugerExpression(dep, exo.reponse, "developpe").statut, "juste", ctx);
      }
      enonces.add(exo.enonce);
    }
    vrai(enonces.size >= (id === "dev1" ? 100 : 400), "trop d'énoncés identiques : " + enonces.size + " distincts sur " + N);
  });
}
test("refaire un exercice ne redonne pas les mêmes nombres (graines tirées au hasard)", () => {
  const vus = new Set();
  for (let i = 0; i < 50; i++) vus.add(Gn.creer("eq1par", 3, MM.outils.nouvelleGraine()).enonce);
  vrai(vus.size >= 49, vus.size + " énoncés distincts sur 50");
});
test("générateur ou niveau inconnu : erreur claire", () => {
  for (const f of [() => Gn.creer("inconnu", 1, 1), () => Gn.creer("eq1par", 9, 1)]) { let e = null; try { f(); } catch (x) { e = x; } vrai(e && /inconnu/.test(e.message)); }
});
