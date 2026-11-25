/* Lot 4a — P6 (repère et points) et P7 (fonctions affines) : moteur js/affine.js, générateurs js/gen/affine.js.
   Oracle : l'ex. 3a du contrôle (cahier des charges, section 2), recopié ici tel qu'il est écrit dans le cahier des charges.
   Règle centrale, comme P5 et G : chaque étape est jugée à partir des valeurs DE L'ÉLÈVE (pas de double pénalité). */
const { MM, test, egal, vrai } = require("./_harnais.js");
const AF = MM.affine, Gn = MM.gen, F = MM.F, D = MM.diag, A = MM.aide;
const statuts = Q => Q.journal.map(j => j.statut + (j.code ? ":" + j.code : "")).join(" | ");
const jouer = (exo, mode, l) => AF.jouer(exo, mode, l);
const ref = n => Gn.creer("affref", n, 0);
const MOINS = "−";
const txt = x => [x.titre, x.bon, x.ou, x.regle, x.suite].join(" ");
const contientNombre = (t, v) => new RegExp("(^|[^0-9,])" + v.replace("-", MOINS).replace(/[()]/g, "\\$&") + "($|[^0-9,])").test(t);

/* ---------- l'ex. 3a du contrôle ---------- */
const TABLE = [
  { enonce: "y = −3x − 5", lignes: ["−3", "−5", "(0, −5)", "décroissante"], rep: "m = −3 ; b = −5 ; (0, −5) ; décroissante" },
  { enonce: "y = 4x + 9", lignes: ["4", "9", "(0, 9)", "croissante"], rep: "m = 4 ; b = 9 ; (0, 9) ; croissante" },
  { enonce: "y = 8", lignes: ["0", "8", "(0, 8)", "constante"], rep: "m = 0 ; b = 8 ; (0, 8) ; constante" },
  { enonce: "y = 6 − 5x", lignes: ["−5", "6", "(0, 6)", "décroissante"], rep: "m = −5 ; b = 6 ; (0, 6) ; décroissante" },
  { enonce: "m = −1 et b = 7", lignes: ["y = −x + 7", "(0, 7)", "décroissante"], rep: "y = −x + 7 ; (0, 7) ; décroissante" }
];
test("ex. 3a de référence : énoncés et réponses calculées identiques au cahier des charges", () => {
  TABLE.forEach((r, i) => { const e = ref(i + 1); egal(e.enonce, r.enonce, "ligne " + (i + 1)); egal(e.reponseTexte, r.rep, "ligne " + (i + 1)); });
});
test("ex. 3a de référence : sans aide, les réponses du cahier des charges donnent le score plein (5 lignes)", () => {
  TABLE.forEach((r, i) => {
    const e = ref(i + 1), Q = jouer(e, "complet", r.lignes);
    vrai(Q.fini, "ligne " + (i + 1) + " pas finie : " + statuts(Q));
    const s = AF.score(Q.journal, Q.etapes); egal(s.points + "/" + s.total, r.lignes.length + "/" + r.lignes.length, "ligne " + (i + 1));
  });
});
test("ex. 3a, guidé : la forme inversée y = 6 − 5x commence par la réécrire y = −5x + 6", () => {
  const e = ref(4), et = AF.etapes(e, "guide");
  egal(et.map(x => x.id).join(), "eq0,m,b,oy,var");
  egal(AF.etapes(e, "semi").map(x => x.id).join(), "m,b,oy,var");
  const Q = jouer(e, "guide", ["y = −5x + 6", "−5", "6", "(0, 6)", "décroissante"]);
  egal(statuts(Q), "juste | juste | juste | juste | juste");
  egal(AF.etapes(ref(1), "guide").map(x => x.id).join(), "m,b,oy,var", "pas de réécriture si la forme est déjà y = mx + b");
});
test("ex. 3a : le corrigé recopié donne le score plein, et il réécrit d'abord la forme inversée", () => {
  for (let n = 1; n <= 5; n++) {
    const e = ref(n), lignes = e.corrige.filter(l => l.saisie != null).map(l => l.saisie);
    const Q = jouer(e, "complet", lignes.filter((_, i) => !(n === 4 && i === 0)));
    egal(AF.score(Q.journal, Q.etapes).points, Q.etapes.length, "ligne " + n);
  }
  egal(ref(4).corrige[0].ligne, "y = −5x + 6");
});

/* ---------- les codes du catalogue (lot 4) ---------- */
test("catalogue : M-MX, B-SIG, ORD-INV, M-ZERO, XY-INV sont détectés (actifs)", () => {
  for (const c of ["M-MX", "B-SIG", "ORD-INV", "M-ZERO", "XY-INV"]) vrai(D.CATALOGUE[c].actif, c);
});
test("M-MX : « m = −3x » au lieu de −3", () => {
  const Q = jouer(ref(1), "complet", ["−3x", "−5", "(0, −5)", "décroissante"]);
  egal(statuts(Q), "faux:M-MX | juste | juste | juste");
});
test("B-SIG : b = 5 pour y = −3x − 5 ; puis (0, 5) est juste à partir de SON b (pas de double pénalité)", () => {
  const Q = jouer(ref(1), "complet", ["−3", "5", "(0, 5)", "décroissante"]);
  egal(statuts(Q), "juste | faux:B-SIG | juste | juste");
  egal(AF.score(Q.journal, Q.etapes).points, 3);
});
test("ORD-INV : y = 6 − 5x lu m = 6 et b = −5", () => {
  const Q = jouer(ref(4), "complet", ["6", "−5", "(0, −5)", "croissante"]);
  egal(statuts(Q), "faux:ORD-INV | faux:ORD-INV | juste | juste");
});
test("M-ZERO : y = 8 lu m = 8", () => {
  const Q = jouer(ref(3), "complet", ["8", "8", "(0, 8)", "constante"]);
  egal(statuts(Q), "faux:M-ZERO | juste | juste | juste");
});
test("XY-INV : (−5, 0) au lieu de (0, −5) ; et pour y = −x + 7, (7, 0) reste XY-INV et pas AXE-INV (D93)", () => {
  egal(statuts(jouer(ref(1), "complet", ["−3", "−5", "(−5, 0)", "décroissante"])), "juste | juste | faux:XY-INV | juste");
  egal(statuts(jouer(ref(5), "complet", ["y = −x + 7", "(7, 0)", "décroissante"])), "juste | faux:XY-INV | juste");
  egal(D.collisions(ref(5).erreurs).length, 0);
});
test("sens de variation jugé à partir de SON m : m = −4 (signe perdu) puis « décroissante » est juste", () => {
  const Q = jouer(ref(2), "complet", ["−4", "9", "(0, 9)", "décroissante"]);
  egal(statuts(Q), "faux | juste | juste | juste");
});
test("sens de variation lu sur le signe de b : erreur localisée, sans code", () => {
  const Q = jouer(ref(4), "complet", ["−5", "6", "(0, 6)", "croissante"]);
  egal(statuts(Q), "juste | juste | juste | faux");
  egal(Q.acceptees[3].diag.detail.sorte, "varB");
});
test("ligne vide : m et b échangés, b sans son signe, et une équation qui n'est pas finie", () => {
  egal(statuts(jouer(ref(5), "complet", ["y = 7x − 1", "(0, 7)", "décroissante"])), "faux | juste | juste");
  egal(jouer(ref(5), "complet", ["y = 7x − 1"]).acceptees[0].diag.detail.sorte, "echangeMB");
  const e = Gn.creer("eqmb", 1, 3), mb = e.modeleMB;
  if (F(mb.b).signe() < 0) egal(jouer(e, "complet", ["y = " + (F(mb.m).egal(1) ? "" : F(mb.m).egal(-1) ? MOINS : AF.ecr(mb.m)) + "x + " + AF.ecr(F(mb.b).abs())]).journal[0].code, "B-SIG");
  const Q = AF.nouveau(ref(5), "complet"), v = AF.pas(Q, "y − 7 = −x");
  egal(v.statut, "illisible", "une équation pas réduite n'est pas une erreur : on demande la forme y = mx + b");
});
test("explications : chaque code a la sienne, jamais avec la valeur juste (D50)", () => {
  const cas = [[ref(1), ["−3x"], "−3"], [ref(1), ["−3", "5"], "−5"], [ref(4), ["6"], "−5"], [ref(3), ["8"], "0"], [ref(1), ["−3", "−5", "(−5, 0)"], "(0, −5)"]];
  for (const [e, l, juste] of cas) {
    const Q = jouer(e, "complet", l), a = Q.acceptees[Q.acceptees.length - 1];
    vrai(a.statut === "faux" && a.code, "pas de code : " + l.join(" / "));
    for (const va of [1, 2]) {
      const x = A.expliquer(a.typeLigne, a.diag, va);
      vrai(x.titre && x.bon && x.ou && x.regle, a.code + " explication incomplète");
      vrai(!contientNombre(txt(x), juste), a.code + " donne la valeur juste : " + txt(x));
    }
  }
  const v = jouer(ref(4), "complet", ["−5", "6", "(0, 6)", "croissante"]).acceptees[3];
  vrai(!/décroissante/.test(txt(A.expliquer(v.typeLigne, v.diag, 1))), "le mot juste est donné");
});

/* ---------- P6 : lire et placer ---------- */
const lire = (x, y) => AF.construire({ sorte: "lire", nom: "A", point: [x, y] });
const placer = (x, y) => AF.construire({ sorte: "placer", nom: "B", point: [x, y] });
test("P6, lire guidé : abscisse, ordonnée, puis le point écrit ; le point est jugé à partir de SES x et y", () => {
  const e = lire(4, -1);
  egal(AF.etapes(e, "guide").map(x => x.id).join(), "x,y,pt");
  egal(AF.etapes(e, "semi").map(x => x.id).join(), "pt");
  egal(statuts(jouer(e, "guide", ["4", "−1", "A(4, −1)"])), "juste | juste | juste");
  const Q = jouer(e, "guide", ["4", "1", "A(4, 1)"]);
  egal(statuts(Q), "juste | faux | juste"); egal(Q.acceptees[1].diag.detail.sorte, "signeY");
  egal(statuts(jouer(e, "guide", ["−1"])), "faux:XY-INV", "l'ordonnée donnée pour l'abscisse");
  egal(e.reponseTexte, "A(4, −1)");
  vrai(e.figure && e.figure.points.length === 1 && e.figure.points[0].x === 4 && e.figure.points[0].y === -1, "le point est dessiné");
});
test("P6, lire sans aide : XY-INV, signe de x, les deux signes", () => {
  const e = lire(4, -1);
  egal(statuts(jouer(e, "complet", ["(−1, 4)"])), "faux:XY-INV");
  egal(jouer(e, "complet", ["(−4, −1)"]).acceptees[0].diag.detail.sorte, "signeX");
  egal(jouer(e, "complet", ["(−4, 1)"]).acceptees[0].diag.detail.sorte, "deuxSignes");
  egal(statuts(jouer(e, "complet", ["(4 ; −1)"])), "juste");
});
test("P6, placer : le toucher donne « (x ; y) », jugé comme un point écrit", () => {
  const e = placer(-3, 2);
  egal(AF.etapes(e, "guide").map(x => x.id + ":" + x.type).join(), "pl:placer");
  egal(statuts(jouer(e, "guide", ["(−3 ; 2)"])), "juste");
  egal(statuts(jouer(e, "guide", ["(2 ; −3)"])), "faux:XY-INV");
  egal(jouer(e, "guide", ["(3 ; 2)"]).acceptees[0].diag.detail.sorte, "signeX");
  vrai(!e.figure || !e.figure.points.length, "le point à placer n'est pas dessiné d'avance");
  egal(e.enonce, "B(−3, 2)");
});
test("saisie d'un point : 14 écritures acceptées, 9 rejetées sans compter d'erreur (D88)", () => {
  const ok = ["(4, −1)", "(4,-1)", "(4 ; −1)", "(4;-1)", "A(4, −1)", "A(4 ; −1)", "4 ; −1", "4, −1", " ( 4 , - 1 ) ", "(+4 ; −1)", "(4,0 ; −1)", "(8/2 ; −1)", "A (4;−1)", "a(4, −1)"];
  for (const t of ok) { const p = AF.lirePoint(t); vrai(p.ok, "refusé : " + t + " → " + p.message); vrai(p.x.egal(4) && p.y.egal(-1), "mal lu : " + t); }
  const ko = ["", "4", "(4)", "(4 ; −1 ; 2)", "(4, −1, 5)", "x = 4", "(a ; b)", "4 −1", "((4 ; −1)"];
  for (const t of ko) { const p = AF.lirePoint(t); vrai(!p.ok && p.message, "accepté : " + t); }
  const Q = AF.nouveau(lire(4, -1), "complet");
  egal(AF.pas(Q, "(4, −1, 5)").statut, "illisible"); egal(Q.journal.length, 0, "une saisie illisible n'est pas comptée");
});
test("variation : croissante, décroissante, constante, avec ou sans accent ni majuscule ; autre chose est illisible", () => {
  const Q = () => { const q = AF.nouveau(ref(1), "complet"); ["−3", "−5", "(0, −5)"].forEach(t => AF.pas(q, t)); return q; };
  egal(AF.pas(Q(), "Décroissante").statut, "juste"); egal(AF.pas(Q(), "decroissante").statut, "juste");
  egal(AF.pas(Q(), "croissante").statut, "faux"); egal(AF.pas(Q(), "monte").statut, "illisible");
});

/* ---------- P7 : tracer depuis m et b ---------- */
test("tracer : (0, b), puis n'importe quel autre point de la droite ; le 2e point est jugé à partir de SON 1er (D94)", () => {
  const e = AF.construire({ sorte: "tracer", m: 2, b: 3 });
  egal(AF.etapes(e, "guide").map(x => x.id + ":" + x.type).join(), "t1:placer,t2:placer");
  egal(statuts(jouer(e, "guide", ["(0 ; 3)", "(1 ; 5)"])), "juste | juste");
  egal(statuts(jouer(e, "guide", ["(0 ; 3)", "(−2 ; −1)"])), "juste | juste");
  egal(statuts(jouer(e, "guide", ["(3 ; 0)", "(4 ; 2)"])), "faux:XY-INV | juste");
  egal(jouer(e, "guide", ["(0 ; 3)", "(1 ; 1)"]).acceptees[1].diag.detail.sorte, "penteSigne");
  egal(jouer(e, "guide", ["(0 ; 3)", "(2 ; 4)"]).acceptees[1].diag.detail.sorte, "penteInverse");
  const Q = AF.nouveau(e, "guide"); AF.pas(Q, "(0 ; 3)");
  egal(AF.pas(Q, "(0 ; 3)").statut, "illisible", "le même point deux fois : on demande un autre point");
  vrai(e.droite && e.droite.m === 2 && e.droite.b === 3, "la droite est connue de la page pour la dessiner à la fin");
});

/* ---------- générateurs ---------- */
const GENS = { lire: [1, 2, 3], placer: [1, 2, 3], ligne: [1, 2, 3, 4], eqmb: [1], tracer: [1, 2] };
const valsPoint = e => e.modelePt;
test("générateurs : 500 tirages par niveau, bornes du repère, aucune collision, ce que promet chaque niveau", () => {
  for (const [g, nivs] of Object.entries(GENS)) for (const n of nivs) {
    const vus = new Set();
    for (let s = 1; s <= 500; s++) {
      const e = Gn.creer(g, n, s), k = g + n + ":" + s;
      vus.add(e.enonce + JSON.stringify(e.modelePt || ""));       // « lire » : l'énoncé ne donne pas les coordonnées, le point dessiné change
      egal(D.collisions(e.erreurs).length, 0, "collision " + k);
      if (g === "lire" || g === "placer") {
        const [x, y] = valsPoint(e);
        vrai(Math.abs(x) <= 6 && Math.abs(y) <= 6, "hors du repère " + k);
        if (n === 1) vrai(x > 0 && y > 0, "niveau 1 : en haut à droite " + k);
        if (n === 2) vrai(x !== 0 && y !== 0 && (x < 0 || y < 0), "niveau 2 : un négatif, aucun zéro " + k);
        if (n === 3) vrai((x === 0) !== (y === 0), "niveau 3 : sur un axe, pas l'origine " + k);
        if (x && y) vrai(Math.abs(x) !== Math.abs(y), "|x| = |y| " + k);
      }
      if (g === "ligne") {
        const { m, b, forme } = e.modeleMB, fm = F(m), fb = F(b);
        vrai(fm.abs().cmp(9) <= 0 && fb.abs().cmp(12) <= 0, "bornes " + k);
        if (n === 1) vrai(forme === "mxb" && !fm.estNul() && !fm.abs().egal(1) && !fb.estNul(), k);
        if (n === 2) vrai(forme === "bmx" && !fm.estNul() && !fb.estNul(), k);
        if (n === 3) vrai(forme === "cst" && fm.estNul() && !fb.estNul(), k);
        if (n === 4) vrai(forme === "mx" || forme === "un", k);
        // réinjection : l'énoncé, lu par un autre moteur (la droite du lot express), passe par (0, b) avec la pente m
        const d = MM.geo.lireDroite(e.enonce);
        vrai(!d.erreur && d.A.fois(0).plus(d.B.fois(fb)).plus(d.C).estNul(), "(0, b) hors de la droite " + k);
        vrai(d.A.sur(d.B).oppose().egal(fm), "pente lue ≠ m " + k);
      }
      if (g === "tracer") {
        const { m, b } = e.droite;
        vrai(Number.isInteger(m) && m !== 0 && Math.abs(b) <= 4 && Math.abs(b + m) <= 6, "bornes " + k);
        vrai(n === 1 ? m > 0 : m < 0, "niveau " + n + " : signe de m " + k);
      }
    }
    vrai(vus.size >= (g === "eqmb" || g === "tracer" || n === 3 ? 20 : 30), g + n + " : trop peu d'énoncés différents (" + vus.size + ")");
  }
});
test("générateurs : le corrigé recopié, sans aide, donne le score plein (50 graines par niveau)", () => {
  for (const [g, nivs] of Object.entries(GENS)) for (const n of nivs) for (let s = 1; s <= 50; s++) {
    const e = Gn.creer(g, n, s), Q = jouer(e, "complet", e.corrige.filter(l => l.saisie != null && !l.guideSeul).map(l => l.saisie));
    egal(AF.score(Q.journal, Q.etapes).points + "/" + Q.etapes.length, Q.etapes.length + "/" + Q.etapes.length, g + n + ":" + s + " " + statuts(Q));
  }
});
test("même graine, même exercice ; graine différente, autres nombres", () => {
  egal(Gn.creer("ligne", 2, 7).enonce, Gn.creer("ligne", 2, 7).enonce);
  vrai(new Set([1, 2, 3, 4, 5].map(s => Gn.creer("placer", 2, s).enonce)).size >= 4);
  vrai(new Set([1, 2, 3, 4, 5].map(s => Gn.creer("lire", 2, s).modelePt.join())).size >= 4);
});
test("chaque code du lot 4 se produit sur au moins un générateur de P6 ou P7 (table des réponses fausses)", () => {
  const vu = new Set();
  for (const [g, nivs] of Object.entries(GENS)) for (const n of nivs) for (let s = 1; s <= 20; s++) Object.keys(Gn.creer(g, n, s).erreurs).forEach(c => vu.add(c));
  for (const c of ["M-MX", "B-SIG", "ORD-INV", "M-ZERO", "XY-INV"]) vrai(vu.has(c), c);
});
