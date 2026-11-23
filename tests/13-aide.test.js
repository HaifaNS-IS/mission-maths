/* Lot 2 — Échelle d'aide (D37 à D40) : marches, niveaux, ligne pointée, ligne à trous, 2e formulation, D38. */
const { MM, test, egal, vrai } = require("./_harnais.js");
const E = MM.expr, T = MM.etapes, D = MM.diag, N = MM.nombres, A = MM.aide, Gn = MM.gen;
const EX1 = "7(x − 4) − 8(x − 7) = 69 − 5(x + 8)";

test("marches : erreurs 1 et 2 → explication, 3 → indice, 4 → ligne à trous, 5 et plus → ligne montrée", () => {
  egal([0, 1, 2, 3, 4, 5, 6].map(A.marche).join(), "0,1,1,2,3,4,4");
});
test("niveau d'aide d'une ligne acceptée (D39), bouton indice compris", () => {
  egal([0, 1, 2, 3, 4, 5].map(n => A.niveau(n, false)).join(), "0,1,1,2,3,4");
  egal(A.niveau(0, true), 2); egal(A.niveau(1, true), 2); egal(A.niveau(4, true), 3);
  egal(A.NIVEAUX.join(" | "), "juste seul | juste après explication | juste après indice | complétée (ligne à trous) | recopiée");
});
test("D38 : série à refaire si plus de la moitié des lignes sont complétées ou recopiées", () => {
  vrai(!A.serieAFaire([0, 0, 3, 4])); vrai(A.serieAFaire([3, 4, 4, 0])); vrai(!A.serieAFaire([0, 1, 2, 2, 3])); vrai(A.serieAFaire([3, 3, 4])); vrai(!A.serieAFaire([]));
});
test("2e explication : formulée autrement si la même erreur revient ; un nouveau type a sa 1re explication", () => {
  egal(A.variante(2, "SIG-PAR", "SIG-PAR"), 2); egal(A.variante(2, "TRANS-SIG", "SIG-PAR"), 1); egal(A.variante(1, "SIG-PAR", null), 1);
  const v = T.jugerLigne(E.lireEquation(EX1), "7x − 28 − 8x − 56 = 69 − 5x − 40", "developpe");
  const x1 = A.expliquer("equation", v.diag, 1), x2 = A.expliquer("equation", v.diag, 2);
  egal(x1.titre, "Signe moins non distribué"); vrai(x1.regle !== x2.regle); vrai(/Teste avec x = 1 : −8\(x − 7\) vaut 48, ta version vaut −64/.test(x2.regle), x2.regle);
});
test("ex. 1, ligne Développe avec SIG-PAR : le terme fautif est pointé, sans la réponse", () => {
  const prev = E.lireEquation(EX1), v = T.jugerLigne(prev, "7x − 28 − 8x − 56 = 69 − 5x − 40", "developpe");
  const p = A.pointer("equation", prev, v.eq, "developpe", v.code);
  egal(p.nbFautes, 1);
  egal(p.segments.map(c => c.map(s => s.faux ? "[" + s.texte.trim() + "]" : s.texte).join("")).join(" = "), "7x − 28 − 8x[− 56] = 69 − 5x − 40");
  vrai(/signe/.test(p.message)); vrai(!/56/.test(p.message), "le message donne la réponse");
});
test("ex. 1 : ligne à trous = sa ligne, le morceau faux remplacé par une case ; bien remplie, elle est juste", () => {
  const prev = E.lireEquation(EX1), v = T.jugerLigne(prev, "7x − 28 − 8x − 56 = 69 − 5x − 40", "developpe");
  const t = A.aTrous("equation", prev, v.eq, "developpe");
  egal(t.nbTrous, 1); egal(t.jetons.filter(j => j.trou != null)[0].sorte, "signe");
  egal(t.jetons.map(j => j.fixe != null ? j.fixe : "☐").join(""), "7x − 28 − 8x☐ 56 = 69 − 5x − 40");
  egal(T.jugerLigne(prev, A.assembler(t.jetons, ["+"]).texte, "developpe").statut, "juste");
  egal(T.jugerLigne(prev, A.assembler(t.jetons, ["−"]).texte, "developpe").statut, "faux");
  vrai(A.assembler(t.jetons, [""]).incomplet, "case vide non signalée");
  egal(t.modele, "7x − 28 − 8x + 56 = 69 − 5x − 40");
});
test("x mis à droite par l'élève : le modèle suit son sens d'écriture", () => {
  const prev = E.lireEquation("−x + 28 = 29 − 5x"), v = T.jugerLigne(prev, "−1 = −6x", "regroupe");
  egal(A.aTrous("equation", prev, v.eq, "regroupe").modele, "−1 = −4x");
});
/* Tous les générateurs : pour chaque erreur du catalogue faite à la 1re étape, la ligne à trous remplie avec les bonnes
   valeurs est juste, et remplie avec ce qu'il avait écrit redonne sa ligne fausse. */
const CAS = [["rel", [2, 3]], ["relmul", [1, 2]], ["prio", [1, 2, 3]], ["dev1", [1, 2, 3]], ["red", [1, 2]], ["devred", [1, 2, 3]], ["eqs", [1, 2, 3]], ["eqxx", [1, 2]], ["eq1par", [1, 2, 3]]];
for (const [id, niveaux] of CAS) test(id + " : pointer et ligne à trous sur 40 tirages × chaque erreur type de la 1re étape", () => {
  let vus = 0;
  for (const niveau of niveaux) for (let g = 1; g <= 40; g++) {
    const exo = Gn.creer(id, niveau, g), dep = Gn.depart(exo), et = exo.etapes[0], type = exo.type;
    let fausses = [];
    if (type === "equation") fausses = D.candidats(dep).filter(c => c.stade === T.ORDRE.indexOf(et.forme) || (et.forme === "regroupe" && c.stade === 2)).map(c => E.ecrireEquation(c.stade === 2 ? T.reduire(c.eq) : c.eq));
    else if (type === "expression") fausses = D.candidatsExpression(dep).filter(c => c.stade === (et.forme === "developpe" ? 0 : 1)).map(c => E.ecrireCote(et.forme === "reduit" ? T.redCote(c.termes) : c.termes));
    else fausses = N.candidats(dep).map(c => c.valeur.texte());
    for (const f of fausses.slice(0, 4)) {
      const juge = type === "equation" ? T.jugerLigne(dep, f, et.forme) : type === "expression" ? T.jugerExpression(dep, f, et.forme) : N.juger(dep, f, et.forme);
      if (juge.statut !== "faux") continue;
      const cur = type === "equation" ? juge.eq : type === "expression" ? juge.termes : juge.ast, ctx = id + " n" + niveau + " g" + g + " : " + exo.enonce + " → " + f;
      const p = A.pointer(type, dep, cur, et.forme, juge.code);
      vrai(p.nbFautes >= 1, "aucun terme pointé : " + ctx);
      const t = A.aTrous(type, dep, cur, et.forme), trous = t.jetons.filter(j => j.trou != null);
      vrai(t.nbTrous >= 1 && trous.length === t.nbTrous, "pas de case : " + ctx);
      const rejuge = txt => type === "equation" ? T.jugerLigne(dep, txt, et.forme) : type === "expression" ? T.jugerExpression(dep, txt, et.forme) : N.juger(dep, txt, et.forme);
      const bon = A.assembler(t.jetons, trous.map(j => j.attendu));
      egal(rejuge(bon.texte).statut, "juste", "cases bien remplies mais ligne refusée : " + ctx + " ⇒ " + bon.texte);
      egal(rejuge(A.assembler(t.jetons, trous.map(j => j.saisi)).texte).statut, "faux", "ses valeurs ne redonnent pas sa ligne : " + ctx);
      egal(rejuge(t.modele).statut, "juste", "ligne modèle (marche 4) refusée : " + ctx + " ⇒ " + t.modele);
      vus++;
    }
  }
  vrai(vus >= 20, "trop peu de cas testés : " + vus);
});
/* D37 : « la ligne n'est jamais donnée avant la 5e erreur ». Quand la ligne attendue est le résultat final (x = …, un seul nombre),
   l'explication de la marche 1 ne la contient pas, ni dans sa 1re ni dans sa 2e formulation. */
test("D37 : l'explication de la marche 1 ne donne jamais le résultat final attendu (équations et calculs, 1re et 2e formulation)", () => {
  let vus = 0;
  const contient = (x, cible) => [x.titre, x.bon, x.ou, x.regle, x.suite].join(" ").replace(/\s/g, "").includes(cible.replace(/\s/g, ""));
  for (const [id, niveaux] of [["eqs", [1, 2, 3]], ["eqxx", [1, 2]], ["eq1par", [1, 2, 3]], ["rel", [1, 2, 3]], ["relmul", [1, 2, 3]], ["prio", [1, 2, 3]]]) for (const niveau of niveaux) for (let g = 1; g <= 30; g++) {
    const exo = Gn.creer(id, niveau, g), dep = Gn.depart(exo);
    if (exo.type === "equation") {
      const ch = T.chaine(dep), avant = ch.regRed, x = T.resoudre(avant).x;
      if (avant.g[0] && avant.g[0].c.egal(1)) continue;
      for (const c of D.candidats(avant).filter(k => k.stade === 3)) {
        const v = T.jugerLigne(avant, E.ecrireEquation(c.eq), "solution"); if (v.statut !== "faux") continue;
        for (const va of [1, 2]) { const xp = A.expliquer("equation", v.diag, va); vrai(!contient(xp, "x = " + x.texte() + ".") && !contient(xp, "x = " + x.texte() + ","), id + " g" + g + " : « " + xp.ou + " " + xp.regle + " »"); }
        vus++;
      }
    } else {
      const fin = E.arbre(exo.etapes[exo.etapes.length - 2] ? exo.etapes[exo.etapes.length - 2].attendu : exo.enonce), bon = N.valeur(fin);
      for (const c of N.candidats(fin)) {
        const v = N.juger(fin, c.valeur.texte(), "nombre"); if (v.statut !== "faux") continue;
        for (const va of [1, 2]) { const xp = A.expliquer("nombre", v.diag, va); vrai(!new RegExp("= " + bon.texte().replace("−", "−?") + "(\\D|$)").test([xp.ou, xp.regle].join(" ")), id + " g" + g + " : « " + xp.ou + " " + xp.regle + " »"); }
        vus++;
      }
    }
  }
  vrai(vus >= 300, "trop peu de cas : " + vus);
});
