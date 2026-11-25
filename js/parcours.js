/* Mission Maths — parcours.js
   Le contenu des paliers P0 à P5 (leçon, séries, examen, diagnostic) et les règles de passage du lot 2 :
     leçon → série guidée → semi-guidée → seule → examen (ouvert quand les 3 séries sont validées)
     examen raté → 1 ou 2 erreurs dominantes → mini-leçon ciblée → série de remédiation (4 exercices) → nouvel examen
     diagnostic P0 → paliers validés d'office, seulement à la suite (P1 exige 5/5).
   Fonctions pures : elles reçoivent l'état des paliers et en rendent un nouveau. */
(function (G) {
  "use strict";
  const MM = G.MM || (G.MM = {});
  if (typeof require === "function") { if (!MM.progression) require("./progression.js"); if (!MM.gen) require("./gen/algebre.js"); if (!MM.second) require("./gen/second.js"); if (!MM.affine || !MM.gen.def("lire")) require("./gen/affine.js"); }
  const P = MM.progression;
  const s = (gen, niveau) => ({ gen, niveau });
  const serie = (...l) => l.map(([g, n]) => s(g, n));

  const CONTENU = {
    P0: { diagnostic: [
      Object.assign(s("rel", 2), { notion: "P1" }), Object.assign(s("rel", 3), { notion: "P1" }), Object.assign(s("relmul", 1), { notion: "P1" }),
      Object.assign(s("relmul", 2), { notion: "P1" }), Object.assign(s("prio", 2), { notion: "P1" }),
      Object.assign(s("dev1", 2), { notion: "P2" }), Object.assign(s("red", 2), { notion: "P2" }), Object.assign(s("devred", 2), { notion: "P2" }),
      Object.assign(s("eqs", 1), { notion: "P3" }), Object.assign(s("eqs", 3), { notion: "P3" }),
      Object.assign(s("eqxx", 1), { notion: "P4" }), Object.assign(s("eq1par", 2), { notion: "P4" }),
      Object.assign(s("deg2d", 1), { notion: "P5" }), Object.assign(s("deg2d", 2), { notion: "P5" })] },
    P1: { lecon: "LECO-N01-A",
      guide: serie(["rel", 1], ["rel", 2], ["relmul", 1], ["prio", 1], ["rel", 3], ["prio", 2]),
      semi: serie(["rel", 2], ["relmul", 2], ["prio", 2], ["rel", 3], ["relmul", 3], ["prio", 3]),
      seul: serie(["rel", 3], ["relmul", 2], ["prio", 2], ["prio", 3], ["relmul", 3], ["rel", 2]),
      examen: serie(["rel", 1], ["rel", 2], ["rel", 3], ["relmul", 1], ["relmul", 2], ["relmul", 3], ["prio", 1], ["prio", 2], ["prio", 3], ["rel", 3]) },
    P2: { lecon: "LECO-N02-A",
      guide: serie(["red", 1], ["dev1", 1], ["dev1", 2], ["devred", 1]),
      semi: serie(["red", 2], ["dev1", 2], ["devred", 2], ["devred", 2]),
      seul: serie(["red", 2], ["dev1", 3], ["devred", 2], ["devred", 3]),
      examen: serie(["red", 1], ["red", 2], ["dev1", 1], ["dev1", 2], ["dev1", 3], ["devred", 1], ["devred", 2], ["devred", 2], ["devred", 3], ["red", 2]) },
    P3: { lecon: "LECO-N03-A",
      guide: serie(["eqs", 1], ["eqs", 2], ["eqs", 3], ["eqs", 3]),
      semi: serie(["eqs", 1], ["eqs", 2], ["eqs", 3], ["eqs", 3]),
      seul: serie(["eqs", 2], ["eqs", 3], ["eqs", 3], ["eqs", 3]),
      examen: serie(["eqs", 1], ["eqs", 1], ["eqs", 1], ["eqs", 2], ["eqs", 2], ["eqs", 2], ["eqs", 3], ["eqs", 3], ["eqs", 3], ["eqs", 3]) },
    P4: { lecon: "LECO-N04-A",
      guide: serie(["eqxx", 1], ["eq1par", 1], ["eq1par", 2]),
      semi: serie(["eqxx", 2], ["eq1par", 2], ["eq1par", 3]),
      seul: serie(["eqxx", 1], ["eq1par", 2], ["eq1par", 3]),
      examen: serie(["eqxx", 1], ["eqxx", 2], ["eq1par", 1], ["eq1par", 2], ["eq1par", 2], ["eq1par", 2], ["eq1par", 3], ["eq1par", 3], ["eq1par", 3], ["eqxx", 1]) },
    /* Lot 3 : séries d'environ 5 minutes ; examen de 5 équations (D55), au format de l'ex. 2 du contrôle, avec un a ≠ 1 et un Δ ≤ 0 possible. */
    P5: { lecon: "LECO-N05-A",
      guide: serie(["abc", 1], ["delta", 1], ["deg2", 1]),
      semi: serie(["deg2", 1], ["deg2", 2], ["deg2", 3]),
      seul: serie(["deg2", 1], ["deg2", 3], ["deg2", 2]),
      examen: serie(["deg2", 1], ["deg2", 1], ["deg2", 2], ["deg2", 3], ["deg2", 1]) },
    /* Lot 4a : P6 et P7 complets ; examen P6 = 5 points à placer, 5 à lire (CDC) ; examen P7 = le tableau de l'ex. 3a
       (2 lignes y = mx + b, une constante, une forme inversée, la ligne vide). */
    P6: { lecon: "LECO-N06-A",
      guide: serie(["lire", 1], ["placer", 1], ["lire", 2], ["placer", 2], ["lire", 3], ["placer", 3]),
      semi: serie(["lire", 2], ["placer", 2], ["lire", 3], ["placer", 3]),
      seul: serie(["lire", 2], ["placer", 2], ["lire", 3], ["placer", 3], ["lire", 2], ["placer", 2]),
      examen: serie(["placer", 1], ["placer", 2], ["placer", 2], ["placer", 3], ["placer", 3], ["lire", 1], ["lire", 2], ["lire", 2], ["lire", 3], ["lire", 3]) },
    P7: { lecon: "LECO-N07-A",
      guide: serie(["ligne", 1], ["ligne", 2], ["ligne", 3], ["tracer", 1], ["eqmb", 1]),
      semi: serie(["ligne", 1], ["ligne", 4], ["tracer", 2], ["eqmb", 1]),
      seul: serie(["ligne", 2], ["ligne", 3], ["ligne", 4], ["eqmb", 1]),
      examen: serie(["ligne", 1], ["ligne", 1], ["ligne", 3], ["ligne", 2], ["eqmb", 1]) },
    /* Lot 4a (D83) : la leçon seule ; séries et examens au lot 4b (reprise de G1 à G5). */
    P8: { lecon: "LECO-N08-A" },
    P10: { lecon: "LECO-N10-A" },
    P11: { lecon: "LECO-N11-A" }
  };
  /* Lot express (contrôle du 29/11, D69) : une révision G1 à G6 hors paliers, ouverte d'office, sans leçon ni examen.
     Chaque fiche : la méthode (formule + exercice de la prof corrigé), une série avec aide, une série sans aide (corrigé à la fin). */
  const REVISION = [
    { id: "G1", nom: "Distance entre deux points", fiche: 3, guide: serie(["dist", 1], ["dist", 2], ["dist", 2]), seul: serie(["dist", 1], ["dist", 2], ["dist", 2]) },
    { id: "G2", nom: "Milieu d'un segment", fiche: 9, guide: serie(["mil", 1], ["mil", 2], ["mil", 2]), seul: serie(["mil", 1], ["mil", 2], ["mil", 2]) },
    { id: "G3", nom: "Pente et équation d'une droite", fiche: 4, guide: serie(["pente", 1], ["pente", 2], ["pente", 2]), seul: serie(["pente", 1], ["pente", 2], ["pente", 2]) },
    { id: "G4", nom: "Intersections avec les axes", fiche: 8, guide: serie(["axes", 1], ["axes", 1], ["axes", 2]), seul: serie(["axes", 1], ["axes", 2], ["axes", 2]) },
    { id: "G5", nom: "Exercice combiné", fiche: 6, guide: serie(["comb", 1], ["comb", 2]), seul: serie(["comb", 1], ["comb", 2]) },
    { id: "G6", nom: "Pythagore", fiche: 11, guide: serie(["pyth", 1], ["pyth", 2], ["pyth", 3]), seul: serie(["pyth", 1], ["pyth", 2], ["pyth", 3]) },
    /* Ajout demandé par Kevin le 25/11 : la fiche trigo dans l'app (js/trigo.js), à lire et à faire sur papier, corrigé à déplier. */
    { id: "G7", nom: "Trigonométrie : sin, cos, tan", trigo: true }
  ];
  for (const g of REVISION) if (!g.trigo) CONTENU[g.id] = { guide: g.guide, seul: g.seul };
  const LIVRES = ["P0", "P1", "P2", "P3", "P4", "P5", "P6", "P7"];
  const LECONS_SEULES = ["P8", "P10", "P11"];
  /* D85 (Kevin, 25/11) : une leçon s'ouvre toujours, même palier fermé (lire ne valide rien). */
  const leconOuverte = id => !!(CONTENU[id] && CONTENU[id].lecon);
  /* D81-D82-D85 : séries de P1 à P7 ouvertes d'office jusqu'au contrôle du 29/11 inclus ; ensuite, la progression normale. */
  const OUVERT_JUSQUA = { P1: "2026-11-29", P2: "2026-11-29", P3: "2026-11-29", P4: "2026-11-29", P5: "2026-11-29", P6: "2026-11-29", P7: "2026-11-29" };
  const ouvertDoffice = (id, jour) => !!OUVERT_JUSQUA[id] && String(jour) <= OUVERT_JUSQUA[id];
  const SECTIONS = ["lecon", "guide", "semi", "seul", "examen"];
  const NOMS = { diagnostic: "Test diagnostic", lecon: "Leçon", guide: "Série guidée", semi: "Série semi-guidée", seul: "Série seul", examen: "Examen de palier",
    remedLecon: "Mini-leçon ciblée", remed: "Série de remédiation" };
  const PARADES = {
    "SIG-PAR": "Avant d'écrire, dis-toi : le moins se colle à chaque terme.",
    "DIST-PART": "Trace une flèche du nombre vers chaque terme de la parenthèse.",
    "RED-MIX": "Souligne les x d'une couleur, les nombres d'une autre.",
    "TRANS-SIG": "Pour faire partir un terme, fais l'opération inverse des deux côtés.",
    "DIV-INV": "Dernière ligne : on divise par le nombre collé au x.",
    "SIG-REL": "Entoure chaque signe avant de calculer.",
    "PRIO": "Repère les × et les ÷ : ils passent en premier.",
    "ABC-SIG": "Avant de remplir, entoure chaque nombre avec le signe juste devant.",
    "A-UN": "Devant un x² seul, écris le 1 caché au crayon.",
    "DELTA-SQ": "b négatif : des parenthèses avant le carré, et −b change de signe.",
    "SOL-NB": "Avant la suite, dis à voix haute le signe de Δ.",
    "RAC-SQ": "Racine : cherche le nombre qui, fois lui-même, redonne Δ.",
    "XY-INV": "Pose le doigt sur l'axe horizontal d'abord : c'est x.",
    "M-MX": "Entoure le nombre collé au x, puis écris-le sans le x.",
    "B-SIG": "Entoure le nombre seul avec le signe juste devant.",
    "ORD-INV": "Avant de lire m, réécris l'équation : le terme en x d'abord.",
    "M-ZERO": "Pas de x dans l'équation : la droite est plate.",
    "CALC": "Pose chaque calcul au brouillon, un à la fois."
  };

  /* ---------- état d'un palier (champs ajoutés au lot 2) ---------- */
  function completerPalier(p) {
    const o = Object.assign({ statut: "verrouille", meilleurExamen: null, valideLe: null, echecsRevision: 0, fait: {}, examens: 0, remediation: null, parDiagnostic: false }, p);
    if (!o.fait || typeof o.fait !== "object") o.fait = {};
    return o;
  }
  const examenOuvert = p => !!(p.fait.guide && p.fait.semi && p.fait.seul) && (!p.remediation || !!(p.remediation.fait && p.remediation.fait.remed));
  /* Les sections d'un palier, dans l'ordre, avec ce qui est fait et ce qui est ouvert. */
  function sections(id, p) {
    p = completerPalier(p);
    if (id === "P0") return [{ id: "diagnostic", fait: p.statut === "valide", ouvert: p.statut !== "valide" }];
    const out = SECTIONS.filter(x => x !== "examen").map(x => ({ id: x, fait: !!p.fait[x], ouvert: true }));
    if (p.remediation) for (const x of ["remedLecon", "remed"]) out.push({ id: x, fait: !!(p.remediation.fait && p.remediation.fait[x]), ouvert: true, codes: p.remediation.codes });
    out.push({ id: "examen", fait: p.statut === "valide", ouvert: examenOuvert(p) });
    return out;
  }
  /* « Section suivante » dans un palier : le premier contenu pas fait et ouvert. null si le palier est validé. */
  function sectionSuivante(id, p) {
    p = completerPalier(p);
    if (p.statut === "valide" || p.statut === "verrouille") return null;
    const l = sections(id, p);
    const r = l.find(x => !x.fait && x.ouvert && x.id !== "examen");
    if (r) return r.id;
    return examenOuvert(p) ? "examen" : null;
  }

  /* ---------- examen ---------- */
  /* Les 1 ou 2 erreurs qui reviennent le plus (codes du catalogue). */
  function codesDominants(lignes) {
    const n = {};
    for (const l of lignes) if (l && l.juste === false && l.code) n[l.code] = (n[l.code] || 0) + 1;
    const ordre = (MM.diag && MM.diag.PRIORITE) || [];
    const tri = Object.keys(n).sort((a, b) => n[b] - n[a] || ordre.indexOf(a) - ordre.indexOf(b) || (a < b ? -1 : 1));
    return tri.slice(0, tri.length >= 2 && n[tri[1]] >= 2 ? 2 : 1);
  }
  /* Résultat d'un examen de palier : validation (80 %) ou remédiation. */
  function apresExamenPalier(paliers, id, points, total, lignes, maintenant) {
    let o = P.apresExamen(paliers, id, points, total, maintenant);
    o[id] = completerPalier(o[id]);
    o[id].examens = (o[id].examens || 0) + 1;
    if (o[id].statut === "valide") o[id].remediation = null;
    else o[id].remediation = { codes: codesDominants(lignes), fait: {} };
    return o;
  }

  /* ---------- diagnostic P0 ---------- */
  /* resultats : [{ notion: "P1", juste: true }, …]. Un palier n'est validé que si tous ses précédents le sont. */
  function apresDiagnostic(paliers, resultats, maintenant) {
    const o = JSON.parse(JSON.stringify(paliers));
    o.P0 = completerPalier(o.P0); o.P0.statut = "valide"; o.P0.valideLe = o.P0.valideLe || maintenant;
    const bilan = {};
    for (const r of resultats) { const b = bilan[r.notion] || (bilan[r.notion] = { justes: 0, total: 0 }); b.total++; if (r.juste) b.justes++; }
    let suite = true;
    for (const id of ["P1", "P2", "P3", "P4", "P5"]) {
      o[id] = completerPalier(o[id]);
      if (o[id].statut === "valide") continue;
      const b = bilan[id], acquis = suite && b && b.total > 0 && b.justes === b.total;
      if (acquis) Object.assign(o[id], { statut: "valide", valideLe: maintenant, parDiagnostic: true });
      else { if (o[id].statut === "verrouille") o[id].statut = "en_cours"; suite = false; break; }
    }
    if (suite) { const p6 = o.P6 = completerPalier(o.P6); if (p6.statut === "verrouille") p6.statut = "en_cours"; }
    return { paliers: o, bilan };
  }

  /* ---------- remédiation : les exercices du palier où ce piège peut se produire ---------- */
  /* Le piège se produit sur au moins la moitié des 8 premiers tirages (lot 3 : au niveau 3 de P5, √Δ n'existe pas toujours). */
  function peutProduire(spec, code) {
    if (!code) return true;
    let n = 0;
    for (let g = 1; g <= 8; g++) { try { const e = MM.gen.creer(spec.gen, spec.niveau, g); if (e.erreurs[code] && e.erreurs[code].length) n++; } catch (x) { /* graine sans tirage */ } }
    return n >= 4;
  }
  function specsRemediation(id, codes) {
    const c = CONTENU[id], vus = new Set(), base = [];
    for (const sp of c.examen.concat(c.guide)) { const k = sp.gen + sp.niveau; if (!vus.has(k)) { vus.add(k); base.push(sp); } }
    let ok = base.filter(sp => (codes || []).some(code => code !== "CALC" && peutProduire(sp, code)));
    if (!ok.length) ok = c.guide.slice();
    const out = [];
    for (let i = 0; out.length < 4; i++) out.push(s(ok[i % ok.length].gen, ok[i % ok.length].niveau));
    return out;
  }
  /* La mini-leçon ciblée, au format d'un pack de leçon (tout le reste est calculé par lecon.preparer). */
  function packRemediation(id, code) {
    const cat = MM.diag.CATALOGUE[code] || null;
    const specs = specsRemediation(id, [code]);
    const avecPiege = !!(cat && code !== "CALC");
    const pack = ex => ({ pack_id: "LECO-R00-A", palier: id, lecon: {
      id: "remed-" + (code || "aucun"), titre: cat ? "Mini-leçon : " + cat.nom.toLowerCase() : "Mini-leçon : reprendre pas à pas",
      duree_min: 3, idee: cat ? cat.reflexe : "Une étape à la fois, en vérifiant chaque ligne.",
      exemple: ex, piege: avecPiege ? { code, parade: PARADES[code] } : null, a_toi: [],
      fiche: { id: "F-" + (code || "PAS"), texte: cat ? cat.reflexe : "Une étape à la fois, en vérifiant chaque ligne." } } });
    let exemple = null;
    for (const sp of specs) {
      for (let g = 1; g <= 40 && !exemple; g++) {
        const ex = { gen: sp.gen, niveau: sp.niveau, graine: g };
        try { MM.lecon.preparer(pack(ex)); exemple = ex; } catch (x) { /* piège absent sur cette graine */ }
      }
      if (exemple) break;
    }
    if (exemple) return pack(exemple);
    const sans = pack({ gen: specs[0].gen, niveau: specs[0].niveau, graine: 1 });       // code impossible ici : mini-leçon sans piège
    sans.lecon.piege = null;
    return sans;
  }

  MM.parcours = { CONTENU, REVISION, LIVRES, LECONS_SEULES, OUVERT_JUSQUA, leconOuverte, ouvertDoffice, SECTIONS, NOMS, PARADES, completerPalier, sections, sectionSuivante, examenOuvert, codesDominants,
    apresExamenPalier, apresDiagnostic, specsRemediation, packRemediation };
  if (typeof module !== "undefined" && module.exports) module.exports = MM;
})(typeof globalThis !== "undefined" ? globalThis : this);
