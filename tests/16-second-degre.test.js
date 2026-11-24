/* Lot 3 — Second degré (P5) : a, b, c → Δ → nombre de solutions → √Δ → x₁ et x₂.
   Chaque étape est jugée à partir des lignes de l'élève (pas de double pénalité), avec 5 codes : ABC-SIG, A-UN, DELTA-SQ, SOL-NB, RAC-SQ.
   Valeurs attendues : celles du cahier des charges (section 2) ou calculées par le moteur, jamais recopiées d'ailleurs. */
const { MM, test, egal, vrai } = require("./_harnais.js");
const E = MM.expr, N = MM.nombres, S2 = MM.second, Gn = MM.gen, F = MM.F, A = MM.aide, D = MM.diag;
const REF = () => Gn.reference.ex2();
const ids = q => q.etapes.map(e => e.id).join(",");
const et = id => S2.etape(id);
/* Une étape jouée en guidé : chaque ligne jugée à partir de la précédente de l'élève. */
function ligneParLigne(q, id, lignes) {
  const e = et(id), etat = q.p5 || S2.etatInitial(q.exo || q);
  let prev = S2.departEtape(e, etat) == null ? null : E.arbre(S2.departEtape(e, etat));
  return lignes.map((l, i) => { const v = S2.juger(e, etat, prev, i === 0, l); if (v.ast) prev = v.ast; return v; });
}

test("catalogue : les 3 codes du lot 3 sont détectés, SOL-NB et A-UN ajoutés le 24/11 (D57)", () => {
  for (const c of ["ABC-SIG", "DELTA-SQ", "RAC-SQ", "SOL-NB", "A-UN"]) vrai(D.CATALOGUE[c] && D.CATALOGUE[c].actif, c);
  egal(D.CATALOGUE["SOL-NB"].ajout, "2026-11-24"); egal(D.CATALOGUE["A-UN"].ajout, "2026-11-24");
  for (const c of ["SOL-NB", "A-UN"]) vrai(D.CATALOGUE[c].nom && D.CATALOGUE[c].exemple && D.CATALOGUE[c].reflexe, c);
});

test("Ex. 2 de référence : énoncé, étapes et corrigé calculés (a = 1, b = −13, c = 30 ; Δ = 49 ; √Δ = 7 ; x = 10 et 3)", () => {
  const exo = REF();
  egal(exo.enonce, "x² − 13x + 30 = 0"); egal(exo.type, "second");
  egal(ids(exo), "coefs,delta,nb,rac,x1,x2");
  egal(exo.etapes.map(e => e.attendu).join(" | "), "a = 1 ; b = −13 ; c = 30 | 49 | 2 | 7 | 10 | 3");
  egal(exo.reponseTexte, "x₁ = 10 et x₂ = 3");
  const lignes = exo.corrige.map(l => l.ligne);
  for (const l of ["a = 1 ; b = −13 ; c = 30", "Δ = (−13)² − 4 × 1 × 30", "Δ = 169 − 120", "Δ = 49", "√Δ = 7", "x₁ = (13 + 7) ÷ 2", "x₁ = 10", "x₂ = (13 − 7) ÷ 2", "x₂ = 3"]) vrai(lignes.includes(l), "ligne absente du corrigé : " + l + " (" + lignes.join(" | ") + ")");
  for (const s of exo.solutions) { const x = F(s); vrai(x.fois(x).moins(x.fois(13)).plus(30).estNul(), "solution fausse : " + s); }
});

test("Ex. 2 rejoué ligne par ligne en guidé : chaque ligne juste est acceptée, le calcul de Δ se fait en 3 lignes", () => {
  const exo = REF(), etat = S2.etatInitial(exo);
  egal(S2.juger(et("coefs"), etat, null, true, ["1", "−13", "30"]).statut, "juste");
  egal(ligneParLigne(exo, "delta", ["(−13)² − 4 × 1 × 30", "169 − 120", "49"]).map(v => v.statut).join(), "incomplet,incomplet,juste");
  egal(S2.juger(et("nb"), etat, null, true, "2").statut, "juste");
  egal(S2.juger(et("rac"), etat, null, true, "7").statut, "juste");
  egal(ligneParLigne(exo, "x1", ["(13 + 7) / 2", "20 / 2", "10"]).map(v => v.statut).join(), "incomplet,incomplet,juste");
  egal(ligneParLigne(exo, "x2", ["(13 − 7) / 2", "3"]).map(v => v.statut).join(), "incomplet,juste");
  // le remplacement peut s'écrire avec −(−13) ou 13² : même valeur, accepté
  egal(ligneParLigne(exo, "delta", ["13² − 4 × 1 × 30"])[0].statut, "incomplet");
  egal(ligneParLigne(exo, "x1", ["(−(−13) + 7) / (2 × 1)"])[0].statut, "incomplet");
});

test("Ex. 2 en examen (sans aide) : tout juste → 6 points sur 6", () => {
  const q = S2.jouer(REF(), "complet", [["1", "−13", "30"], "(−13)² − 4 × 1 × 30", "169 − 120", "49", "2", "7", "(13 + 7) / 2", "10", "(13 − 7) / 2", "3"]);
  vrai(q.fini, "exercice pas fini"); egal(q.journal.filter(l => !l.juste).length, 0);
  const s = S2.score(q.journal, q.etapes); egal(s.points + "/" + s.total, "6/6");
});

test("pas de double pénalité : c lu −30 (ABC-SIG), puis tout juste à partir de là (Δ = 289, x = 15 et −2) → une seule erreur", () => {
  const q = S2.jouer(REF(), "complet", [["1", "−13", "−30"], "(−13)² − 4 × 1 × (−30)", "169 + 120", "289", "2", "17", "(13 + 17) / 2", "15", "(13 − 17) / 2", "−2"]);
  vrai(q.fini);
  const faux = q.journal.filter(l => !l.juste);
  egal(faux.length, 1); egal(faux[0].etape, "coefs"); egal(faux[0].code, "ABC-SIG");
  const s = S2.score(q.journal, q.etapes); egal(s.points + "/" + s.total, "5/6");
});

test("DELTA-SQ à l'étape Δ : −13² au lieu de (−13)² ; la suite part de SON Δ = −289 (0 solution, exercice fini sans pénalité de plus)", () => {
  egal(N.lire("−13²").valeur.cle(), "-169"); egal(N.lire("(−13)²").valeur.cle(), "169");
  egal(N.ecrire(N.lire("−13²").ast), "−13²", "la ligne s'affiche comme il l'a tapée");
  const q = S2.jouer(REF(), "complet", [["1", "−13", "30"], "−13² − 4 × 1 × 30", "−169 − 120", "−289", "0"]);
  vrai(q.fini, "l'exercice doit s'arrêter : son Δ est négatif");
  egal(ids(q), "coefs,delta,nb");
  const faux = q.journal.filter(l => !l.juste); egal(faux.length, 1); egal(faux[0].code, "DELTA-SQ");
  const s = S2.score(q.journal, q.etapes); egal(s.points + "/" + s.total, "2/3");
});

test("DELTA-SQ à l'étape x : −(−13) écrit −13 → x = −3 ; à la ligne suivante, (−13)² calculé −169 → DELTA-SQ aussi", () => {
  const v = ligneParLigne(REF(), "x1", ["(−13 + 7) / 2"])[0]; egal(v.statut, "faux"); egal(v.code, "DELTA-SQ");
  egal(ligneParLigne(REF(), "x1", ["−3"])[0].code, "DELTA-SQ");
  const w = ligneParLigne(REF(), "delta", ["(−13)² − 4 × 1 × 30", "−169 − 120"]); egal(w[1].statut, "faux"); egal(w[1].code, "DELTA-SQ");
});

test("ABC-SIG : signe perdu sur b ou sur c, à l'étape a, b, c ; signe de c perdu en remplaçant dans Δ", () => {
  const exo = REF(), etat = S2.etatInitial(exo);
  for (const v of [["1", "13", "30"], ["1", "−13", "−30"]]) { const r = S2.juger(et("coefs"), etat, null, true, v); egal(r.statut, "faux"); egal(r.code, "ABC-SIG"); }
  // sur une équation où c est négatif : Δ remplacé avec c positif
  const g = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(k => Gn.creer("deg2", 1, k)).find(x => F(x.coefs.c).signe() < 0);
  vrai(g, "aucune équation de niveau 1 avec c négatif");
  const s = S2.etatInitial(g), bb = F(s.b), cc = F(s.c).abs();
  const t = (bb.signe() < 0 ? "(" + bb.texte() + ")" : bb.texte()) + "² − 4 × 1 × " + cc.texte();
  const r = ligneParLigne(g, "delta", [t])[0]; egal(r.statut, "faux"); egal(r.code, "ABC-SIG", t);
});

test("A-UN : a = 1 caché lu 0, ou écrit x² ; une case avec x est comptée fausse ; une case vide n'est pas lue", () => {
  const exo = REF(), etat = S2.etatInitial(exo);
  for (const v of [["0", "−13", "30"], ["x²", "−13", "30"]]) { const r = S2.juger(et("coefs"), etat, null, true, v); egal(r.statut, "faux", v.join()); egal(r.code, "A-UN", v.join()); }
  const x = S2.juger(et("coefs"), etat, null, true, ["1", "−13x", "30"]); egal(x.statut, "faux"); egal(x.code, null);
  vrai(/sans le x/.test(S2.expliquer(x.diag, 1).ou), S2.expliquer(x.diag, 1).ou);
  const ech = S2.juger(et("coefs"), etat, null, true, ["1", "30", "−13"]); egal(ech.statut, "faux"); vrai(/invers/.test(S2.expliquer(ech.diag, 1).ou));
  egal(S2.juger(et("coefs"), etat, null, true, ["1", "", "30"]).statut, "illisible");
  // a = −1 caché (−x²) lu 1 : c'est le signe
  const m = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20].map(k => Gn.creer("deg2", 2, k)).find(q => q.coefs.a === "-1");
  vrai(m, "aucun a = −1 au niveau 2"); vrai(/^−x²/.test(m.enonce), m.enonce);
  const em = S2.etatInitial(m);
  egal(S2.juger(et("coefs"), em, null, true, ["1", F(em.b).texte(), F(em.c).texte()]).code, "ABC-SIG");
  egal(S2.juger(et("coefs"), em, null, true, ["0", F(em.b).texte(), F(em.c).texte()]).code, "A-UN");
});

test("SOL-NB : le nombre de solutions suit le signe de SON Δ ; une réponse hors de 0, 1, 2 n'est pas lue", () => {
  const etat = S2.etatInitial(REF());
  egal(S2.juger(et("nb"), etat, null, true, "2").statut, "juste");
  for (const r of ["0", "1"]) { const v = S2.juger(et("nb"), etat, null, true, r); egal(v.statut, "faux"); egal(v.code, "SOL-NB"); }
  egal(S2.juger(et("nb"), etat, null, true, "3").statut, "illisible");
  egal(S2.juger(et("nb"), Object.assign({}, etat, { delta: "0" }), null, true, "1").statut, "juste");
  egal(S2.juger(et("nb"), Object.assign({}, etat, { delta: "-23" }), null, true, "0").statut, "juste");
  egal(S2.juger(et("nb"), Object.assign({}, etat, { delta: "-23" }), null, true, "2").code, "SOL-NB");
});

test("RAC-SQ et √Δ : 49² pris pour √49 ; la moitié, Δ recopié, une racine négative : faux, chacun expliqué", () => {
  const etat = S2.etatInitial(REF());
  egal(S2.juger(et("rac"), etat, null, true, "7").statut, "juste");
  const r = S2.juger(et("rac"), etat, null, true, "2401"); egal(r.code, "RAC-SQ");
  for (const [s, mot] of [["24,5", "moitié"], ["49", "racine"], ["−7", "négative"], ["8", "8 × 8"]]) {
    const v = S2.juger(et("rac"), etat, null, true, s); egal(v.statut, "faux", s);
    const x = S2.expliquer(v.diag, 1); vrai(x.ou.includes(mot) || x.regle.includes(mot), s + " : " + x.ou + " " + x.regle);
  }
  egal(S2.juger(et("rac"), etat, null, true, "8").code, "CALC");
});

test("x₁ et x₂ dans n'importe quel ordre ; 10 = 10,0 ; 20/2 est juste mais pas fini ; la même solution deux fois est refusée", () => {
  const exo = REF(), etat = S2.etatInitial(exo);
  egal(ligneParLigne(exo, "x1", ["3"])[0].statut, "juste");
  egal(S2.juger(et("x2"), Object.assign({}, etat, { x1: "3" }), E.arbre(S2.departEtape(et("x2"), Object.assign({}, etat, { x1: "3" }))), true, "10").statut, "juste");
  egal(ligneParLigne(exo, "x1", ["10,0"])[0].statut, "juste");
  egal(ligneParLigne(exo, "x1", ["20/2"])[0].statut, "incomplet");
  const deux = Object.assign({}, etat, { x1: "10" }), v = S2.juger(et("x2"), deux, E.arbre(S2.departEtape(et("x2"), deux)), true, "10");
  egal(v.statut, "faux"); vrai(/déjà/.test(S2.expliquer(v.diag, 1).ou));
});

test("x : division seulement sur √Δ (PRIO), division oubliée, Δ au lieu de √Δ : localisés et expliqués", () => {
  const exo = REF();
  const p = ligneParLigne(exo, "x1", ["13 + 7 / 2"])[0]; egal(p.statut, "faux"); egal(p.code, "PRIO");
  vrai(/tout le haut/.test(S2.expliquer(p.diag, 1).ou), S2.expliquer(p.diag, 1).ou);
  const o = ligneParLigne(exo, "x1", ["13 + 7"])[0]; egal(o.statut, "faux"); vrai(/2a/.test(S2.expliquer(o.diag, 1).ou));
  const d = ligneParLigne(exo, "x1", ["(13 + 49) / 2"])[0]; egal(d.statut, "faux"); vrai(/√Δ/.test(S2.expliquer(d.diag, 1).ou));
});

test("chemin : Δ = 0 → une seule solution (étape x) ; Δ < 0 → l'exercice s'arrête ; semi-guidé : Δ, nombre, x₁, x₂", () => {
  const n3 = []; for (let g = 1; g <= 60; g++) n3.push(Gn.creer("deg2", 3, g));
  const zero = n3.find(q => q.delta === "0"), neg = n3.find(q => F(q.delta).signe() < 0);
  vrai(zero && neg, "niveau 3 : il faut des Δ = 0 et des Δ < 0");
  egal(ids(zero), "coefs,delta,nb,x0"); egal(zero.nb, 1); egal(zero.solutions.length, 1); vrai(F(zero.etapes[3].attendu).egal(F(zero.solutions[0])), zero.etapes[3].attendu);
  egal(ids(neg), "coefs,delta,nb"); egal(neg.nb, 0); egal(neg.reponseTexte, "Pas de solution");
  egal(S2.etapes(REF(), "semi", S2.etatInitial(REF())).map(e => e.id).join(), "delta,nb,x1,x2");
  egal(S2.etapes(REF(), "complet", S2.etatInitial(REF())).map(e => e.id).join(), "coefs,delta,nb,rac,x1,x2");
});

test("Δ de l'élève pas carré parfait (après une erreur, sans aide) : √Δ approché accepté, x jugé à partir de sa valeur", () => {
  // c lu 31 au lieu de 30 : Δ = 169 − 124 = 45, pas un carré
  // il arrondit encore x au dixième (9,85 → 9,9 ; 3,15 → 3,2) : accepté, c'est juste à partir de sa ligne
  const q = S2.jouer(REF(), "complet", [["1", "−13", "31"], "45", "2", "6,7", "(13 + 6,7) / 2", "9,9", "(13 − 6,7) / 2", "3,2"]);
  vrai(q.fini);
  const faux = q.journal.filter(l => !l.juste); egal(faux.length, 1, faux.map(f => f.etape + " " + f.saisie).join(" | ")); egal(faux[0].etape, "coefs");
  const r = S2.jouer(REF(), "complet", [["1", "−13", "31"], "45", "2", "9"]);
  egal(r.journal.filter(l => !l.juste).length, 2, "√45 ≈ 9 doit être faux");
});

test("explications : phrases de moins de 15 mots, jamais la valeur juste de l'étape (D50), 1re et 2e formulation", () => {
  const esc = t => t.replace(/[()+.*?[\]\\/]/g, "\\$&");
  const donne = (texte, v) => new RegExp("(=|donne|vaut|fait|c'est|égal)\\s*\\+?\\s*" + esc(v) + "(?![0-9,/])").test(texte);
  const mots = p => (p.match(/[A-Za-zÀ-ÿ']{2,}/g) || []).length;
  let vus = 0; const ko = [];
  for (const [id, niveaux] of [["deg2", [1, 2, 3]], ["abc", [1, 2]], ["delta", [1, 2]]]) for (const niveau of niveaux) for (let g = 1; g <= 25; g++) {
    const exo = Gn.creer(id, niveau, g), etat = S2.etatInitial(exo);
    for (const cle of [].concat(...Object.values(exo.erreurs))) {
      const [etp, val] = cle.split(":"), [eid, lettre] = etp.split(".");
      const e = et(eid), bon = e.id === "coefs" ? F(etat[lettre]).texte() : F(S2.attenduValeur(e, etat)).texte();
      let entree = F(val).texte();
      if (e.id === "coefs") entree = ["a", "b", "c"].map(k => k === lettre ? F(val).texte() : F(etat[k]).texte());
      const prev = S2.departEtape(e, etat) == null ? null : E.arbre(S2.departEtape(e, etat));
      const v = S2.juger(e, etat, prev, true, entree);
      if (v.statut !== "faux") { ko.push(exo.enonce + " " + cle + " : pas faux"); continue; }
      for (const va of [1, 2]) {
        const x = A.expliquer("nombre", v.diag, va), tx = [x.bon, x.ou, x.regle, x.suite].join(" ");
        if (e.id !== "nb" && donne(tx, bon)) ko.push(exo.enonce + " " + cle + " donne " + bon + " : « " + tx + " »");
        for (const ph of tx.split(/(?<=[.!?])\s+/).filter(Boolean)) if (mots(ph) >= 15) ko.push("phrase trop longue : " + ph);
      }
      vus++;
    }
  }
  egal(ko.slice(0, 4).join(" || "), ""); vrai(vus >= 300, "trop peu de cas : " + vus);
});

test("aide : l'échelle D37 à D40 s'applique aux lignes de calcul de Δ (ligne pointée, ligne à trous, ligne montrée)", () => {
  const exo = REF(), etat = S2.etatInitial(exo), e = et("delta"), prev = E.arbre(S2.departEtape(e, etat));
  const v = S2.juger(e, etat, prev, true, "−13² − 4 × 1 × 30");
  const p = A.pointer("nombre", prev, v.ast, null, v.code); egal(p.nbFautes, 1); vrai(!/169|49/.test(p.message), p.message);
  const t = A.aTrous("nombre", prev, v.ast, null); egal(t.nbTrous, 1);
  egal(A.fautes("nombre", prev, v.ast, "nombre").ecritModele, "49");
  egal(A.expliquer("nombre", v.diag, 1).titre, D.CATALOGUE["DELTA-SQ"].nom);
});

test("parent : la précision garde le détail chiffré ; chaque ligne du journal dit l'étape (Δ = …, √Δ = …)", () => {
  const q = S2.jouer(REF(), "complet", [["1", "−13", "30"], "49", "2", "2401", "(13 + 2401) / 2"]);
  const rac = q.journal.find(l => l.etape === "rac"); egal(rac.code, "RAC-SQ"); egal(rac.saisie, "√Δ = 2401");
  vrai(/7/.test(rac.precision) && /2401/.test(rac.precision), rac.precision);
  egal(q.journal.find(l => l.etape === "delta").saisie, "Δ = 49");
  egal(q.journal.find(l => l.etape === "coefs").saisie, "a = 1 ; b = −13 ; c = 30");
});

test("construire (D51) : refuse un Δ pas carré parfait, |4ac| > 400, un coefficient nul, des solutions non entières", () => {
  egal(S2.construire(1, -13, 31), null, "Δ = 45");
  egal(S2.construire(5, 2, 30), null, "4ac = 600");
  egal(S2.construire(1, 0, -9), null, "b = 0");
  egal(S2.construire(2, -5, 2), null, "x = 2 et 1/2");
  vrai(S2.construire(1, -13, 30), "l'exercice 2 du contrôle doit passer");
});
