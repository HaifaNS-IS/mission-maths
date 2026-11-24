/* Lot 3 — Générateurs du palier P5 : 500 tirages par niveau.
   Solutions réinjectées dans l'équation, Δ carré parfait, bornes (D51), aucune collision étape par étape (D53),
   chaque erreur de la table produit son code, et le corrigé rejoué sans aide fait le plein de points. */
const { MM, test, egal, vrai } = require("./_harnais.js");
const E = MM.expr, S2 = MM.second, Gn = MM.gen, F = MM.F, D = MM.diag;
const NB = 500;
const carre = v => { const r = v.racine ? v.racine() : null; return !!r && r.fois(r).egal(v); };
const VOULUS = { deg2: [1, 2, 3], abc: [1, 2], delta: [1, 2], deg2d: [1, 2] };

for (const id of Object.keys(VOULUS)) for (const niveau of VOULUS[id]) {
  test(id + " niveau " + niveau + " : " + NB + " tirages vérifiés", () => {
    const enonces = new Set(), signes = { pos: 0, zero: 0, neg: 0 };
    for (let g = 1; g <= NB; g++) {
      const exo = Gn.creer(id, niveau, g), ctx = id + " n" + niveau + " g" + g + " : " + exo.enonce;
      egal(JSON.stringify(Gn.creer(id, niveau, g)), JSON.stringify(exo), "tirage non reproductible : " + ctx);
      egal(exo.type, "second"); egal(Gn.def(id).palier, "P5");
      const a = F(exo.coefs.a), b = F(exo.coefs.b), c = F(exo.coefs.c), delta = b.fois(b).moins(a.fois(c).fois(4));
      // l'énoncé se relit et redonne a, b, c
      const eq = E.lireEquation(exo.enonce), p = E.polyDeTermes(eq.g).moins(E.polyDeTermes(eq.d));
      vrai(p.coef(2).egal(a) && p.coef(1).egal(b) && p.coef(0).egal(c), "énoncé ≠ coefficients : " + ctx);
      // D51 : bornes de l'énoncé et des lignes de calcul
      vrai(!a.estNul() && !b.estNul() && !c.estNul(), "coefficient nul : " + ctx);
      vrai(a.abs().cmp(5) <= 0 && b.abs().cmp(20) <= 0 && c.abs().cmp(100) <= 0 && a.fois(c).fois(4).abs().cmp(400) <= 0, "borne dépassée : " + ctx);
      egal(exo.delta, delta.cle(), ctx);
      if (delta.signe() > 0) { signes.pos++; vrai(carre(delta), "Δ pas carré parfait : " + ctx); vrai(delta.racine().cmp(20) <= 0, "√Δ > 20 : " + ctx); }
      else if (delta.estNul()) signes.zero++; else signes.neg++;
      if (id !== "deg2" || niveau < 3) vrai(delta.signe() > 0, "Δ ≤ 0 hors niveau 3 : " + ctx);
      if (niveau === 1) vrai(a.egal(1), "a ≠ 1 au niveau 1 : " + ctx); else if (id !== "deg2" || niveau === 2) vrai(!a.egal(1), "a = 1 au niveau 2 : " + ctx);
      // solutions réinjectées, entières
      egal(exo.solutions.length, exo.nb, ctx);
      for (const s of exo.solutions) { const x = F(s); vrai(x.estEntier(), "solution non entière : " + ctx); vrai(p.valeur(x).estNul(), "solution fausse " + s + " : " + ctx); }
      // D53 : aucune collision à une même étape ; chaque erreur de la table est bien diagnostiquée avec son code
      egal(D.collisions(exo.erreurs).length, 0, "collision : " + ctx);
      const avecNb = !exo.partie || exo.partie.includes("nb");
      vrai(!avecNb || exo.erreurs["SOL-NB"], "SOL-NB absent : " + ctx);
      if (a.abs().egal(1) && (!exo.partie || exo.partie.includes("coefs"))) vrai(exo.erreurs["A-UN"], "A-UN absent alors que a = ±1 : " + ctx);
      const etat = S2.etatInitial(exo);
      for (const code of Object.keys(exo.erreurs)) for (const cle of exo.erreurs[code]) {
        const [etp, val] = cle.split(":"), [eid, lettre] = etp.split("."), e = S2.etape(eid);
        const entree = eid === "coefs" ? ["a", "b", "c"].map(k => F(k === lettre ? val : etat[k]).texte()) : F(val).texte();
        const dep = S2.departEtape(e, etat), v = S2.juger(e, etat, dep == null ? null : E.arbre(dep), true, entree);
        egal(v.statut, "faux", cle + " : " + ctx); egal(v.code, code, cle + " : " + ctx);
      }
      // le corrigé, rejoué sans aide (valeurs finales de chaque étape), fait le plein de points
      if (id !== "deg2d") {
        const entrees = exo.etapes.map(e => e.id === "coefs" ? ["a", "b", "c"].map(k => F(etat[k]).texte()) : e.attendu);
        const q = S2.jouer(exo, "complet", entrees), s = S2.score(q.journal, q.etapes);
        vrai(q.fini, "corrigé pas fini : " + ctx); egal(s.points, s.total, "corrigé pas plein : " + ctx);
        egal(exo.corrige[exo.corrige.length - 1].ligne, exo.reponseTexte, ctx);
      } else {
        const sols = exo.solutions.map(F), att = niveau === 1 ? sols.reduce((m, x) => x.cmp(m) > 0 ? x : m) : sols.reduce((m, x) => x.cmp(m) < 0 ? x : m);
        egal(exo.diag.reponse, att.cle(), ctx); vrai(/plus (grande|petite)/.test(exo.consigne), ctx);
      }
      enonces.add(exo.enonce);
    }
    vrai(enonces.size >= 120, "trop d'énoncés identiques : " + enonces.size);
    if (id === "deg2" && niveau === 3) vrai(signes.zero >= 50 && signes.neg >= 50 && signes.pos >= 30, "niveau 3 mal mélangé : " + JSON.stringify(signes));
  });
}

test("eq2ref : l'exercice 2 exact, la graine ne change rien ; ses codes possibles sont ceux de la note (ABC-SIG, A-UN, DELTA-SQ, SOL-NB, RAC-SQ)", () => {
  egal(Gn.creer("eq2ref", 1, 0).enonce, Gn.creer("eq2ref", 1, 99).enonce);
  const exo = Gn.reference.ex2();
  for (const c of ["ABC-SIG", "A-UN", "DELTA-SQ", "SOL-NB", "RAC-SQ"]) vrai(exo.erreurs[c] && exo.erreurs[c].length, c);
  vrai(exo.erreurs["DELTA-SQ"].includes("delta:-289"), exo.erreurs["DELTA-SQ"].join());
  vrai(exo.erreurs["RAC-SQ"].includes("rac:2401"), exo.erreurs["RAC-SQ"].join());
  vrai(exo.erreurs["ABC-SIG"].includes("coefs.b:13"), exo.erreurs["ABC-SIG"].join());
});
