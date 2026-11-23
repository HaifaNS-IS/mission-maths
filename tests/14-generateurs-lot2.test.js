/* QA 2 (lot 2) — Générateurs P1 à P4 : 500 tirages par niveau, réponse réinjectée, bornes, codes voulus, aucune collision. */
const { MM, test, egal, vrai } = require("./_harnais.js");
const E = MM.expr, T = MM.etapes, D = MM.diag, N = MM.nombres, Gn = MM.gen, F = MM.F;
const NB = 500;
const nombresDe = txt => (txt.match(/\d+(?:[.,]\d+)?/g) || []).map(s => Number(s.replace(",", ".")));
const VOULUS = {
  rel: { 1: ["SIG-REL"], 2: ["SIG-REL"], 3: ["SIG-REL"] }, relmul: { 1: ["SIG-REL"], 2: ["SIG-REL"], 3: ["SIG-REL"] }, prio: { 1: ["PRIO"], 2: ["PRIO", "SIG-REL"], 3: ["PRIO", "SIG-REL"] },
  red: { 1: ["RED-MIX", "SIG-REL"], 2: ["RED-MIX", "SIG-REL"] }, dev1: { 3: ["DIST-PART"] }, devred: { 1: ["DIST-PART"], 2: ["SIG-PAR", "DIST-PART"], 3: ["SIG-PAR", "DIST-PART"] },
  eqs: { 1: ["TRANS-SIG"], 2: ["DIV-INV"], 3: ["TRANS-SIG", "DIV-INV"] }, eqxx: { 1: ["TRANS-SIG", "DIV-INV"], 2: ["TRANS-SIG", "DIV-INV"] }
};
for (const id of Object.keys(VOULUS)) for (const niveau of Object.keys(VOULUS[id]).map(Number)) {
  test(id + " niveau " + niveau + " : " + NB + " tirages vérifiés", () => {
    const enonces = new Set();
    for (let g = 1; g <= NB; g++) {
      const exo = Gn.creer(id, niveau, g), ctx = id + " n" + niveau + " g" + g + " : " + exo.enonce, dep = Gn.depart(exo);
      egal(JSON.stringify(Gn.creer(id, niveau, g)), JSON.stringify(exo), "tirage non reproductible : " + ctx);
      for (const v of nombresDe(exo.enonce + " " + exo.corrige.map(l => l.ligne).join(" "))) vrai(v <= 100, "nombre > 100 : " + ctx);
      egal(D.collisions(exo.erreurs).length, 0, "collision : " + ctx);
      for (const c of VOULUS[id][niveau]) vrai(exo.erreurs[c] && exo.erreurs[c].length, c + " absent : " + ctx);
      vrai(exo.etapes.length >= 1 && exo.etapes.length <= exo.corrige.length, "étapes : " + ctx);
      if (exo.type === "nombre") {
        const v = N.valeur(dep);
        egal(N.ecrire(dep), exo.enonce, "énoncé non relisible : " + ctx); egal(v.cle(), exo.reponse); vrai(v.estEntier(), ctx);
        let prev = dep;
        for (const et of exo.etapes) { const j = N.juger(prev, et.attendu, et.forme); egal(j.statut, "juste", "étape refusée : " + ctx + " ⇒ " + et.attendu); prev = j.ast; }
        egal(exo.etapes[exo.etapes.length - 1].forme, "nombre", ctx);
        for (const c of Object.keys(exo.erreurs)) for (const k of exo.erreurs[c]) { vrai(!F(k).egal(v), "réponse fausse = bonne : " + ctx); egal(N.juger(dep, F(k).texte(), null).code, c, "diagnostic de la réponse fausse " + k + " : " + ctx); }
      } else if (exo.type === "expression") {
        egal(E.ecrireCote(dep), exo.enonce, ctx);
        let prev = dep;
        for (const et of exo.etapes) { const j = T.jugerExpression(prev, et.attendu, et.forme); egal(j.statut, "juste", "étape refusée : " + ctx); prev = j.termes; }
        vrai(E.lireExpression(exo.reponse).poly.egal(E.polyDeTermes(dep)), "réponse fausse : " + ctx);
        for (const c of Object.keys(exo.erreurs)) for (const f of exo.erreurs[c]) egal(T.jugerExpression(dep, f, null).code, c, "diagnostic de " + f + " : " + ctx);
      } else {
        const x = F(exo.reponse);
        egal(E.ecrireEquation(dep), exo.enonce, ctx);
        vrai(E.polyDeTermes(dep.g).valeur(x).egal(E.polyDeTermes(dep.d).valeur(x)), "la solution ne vérifie pas l'énoncé : " + ctx);
        if (!(id === "eqxx" && niveau === 2)) vrai(x.estEntier(), "solution non entière : " + ctx);
        egal(T.evaluerDemarche(dep, exo.etapes.map(e => e.attendu), exo.etapes.map(e => e.forme)).nbErreurs, 0, "corrigé jugé faux : " + ctx);
        for (const c of Object.keys(exo.erreurs)) for (const k of exo.erreurs[c]) vrai(!F(k).egal(x), ctx);
        if (exo.verification) { egal(N.valeur(E.arbre(exo.verification.gauche)).cle(), exo.verification.valeur, ctx); egal(N.valeur(E.arbre(exo.verification.droite)).cle(), exo.verification.valeur, ctx); }
        else vrai(!x.estEntier(), "vérification absente alors que x est entier : " + ctx);
      }
      enonces.add(exo.enonce);
    }
    vrai(enonces.size >= Math.min(NB * 0.3, 150), "trop d'énoncés identiques : " + enonces.size);
  });
}
