/* Mission Maths — lecon.js
   Module Leçons : un pack JSON par palier (format des packs de Mission Logique + champ « lecon »).
   Le pack ne contient que du texte et des renvois vers des générateurs : l'exemple, le piège et les questions sont calculés. */
(function (G) {
  "use strict";
  const MM = G.MM || (G.MM = {});
  if (typeof require === "function") { if (!MM.gen) require("./gen/algebre.js"); if (!MM.nombres) require("./nombres.js"); }
  const E = MM.expr, T = MM.etapes, D = MM.diag;

  const mots = p => (p.match(/[A-Za-zÀ-ÿ]{2,}/g) || []).length;
  const phrases = t => String(t).split(/(?<=[.!?])\s+/).filter(Boolean);
  const court = t => phrases(t).every(p => mots(p) < 15);

  /* Renvoie la liste des défauts d'un pack (vide = pack accepté). */
  function valider(pack) {
    const e = [], l = pack && pack.lecon;
    if (!pack || typeof pack !== "object") return ["pack illisible"];
    if (!/^LECO-N\d{2}-[A-Z]$/.test(pack.pack_id || "")) e.push("pack_id au format LECO-N01-A attendu");
    for (const f of ["palier", "version", "source", "verifie_le", "statut"]) if (!pack[f]) e.push("champ " + f + " manquant");
    if (!l) return e.concat("champ lecon manquant");
    for (const f of ["id", "titre", "idee"]) if (!l[f]) e.push("lecon." + f + " manquant");
    if (l.idee && (phrases(l.idee).length !== 1 || !court(l.idee))) e.push("l'idée tient en une phrase de moins de 15 mots");
    const gen = (r, ou) => {
      if (!r || !MM.gen.def(r.gen)) { e.push(ou + " : générateur inconnu"); return false; }
      if (!MM.gen.def(r.gen).niveaux.includes(r.niveau)) { e.push(ou + " : niveau inconnu"); return false; }
      return true;
    };
    if (gen(l.exemple, "exemple") && !(l.exemple.graine > 0)) e.push("exemple : graine fixe attendue");
    if (!l.piege || !D.CATALOGUE[l.piege.code] || !D.CATALOGUE[l.piege.code].actif) e.push("piege.code inconnu ou pas encore détecté");
    if (l.piege && (!l.piege.parade || !court(l.piege.parade))) e.push("piege.parade manquante ou trop longue");
    if (!Array.isArray(l.a_toi) || l.a_toi.length !== 2) e.push("a_toi : exactement 2 questions");
    else l.a_toi.forEach((q, i) => gen(q, "a_toi " + (i + 1)));
    if (!l.fiche || !l.fiche.id || !l.fiche.texte || phrases(l.fiche.texte).length !== 1 || !court(l.fiche.texte)) e.push("fiche réflexe : une ligne de moins de 15 mots");
    if (!e.length) { try { preparer(pack); } catch (x) { e.push(x.message); } }
    return e;
  }

  /* Le piège, montré sur l'exemple lui-même : la première ligne où cette erreur peut se produire. */
  function piegeEquation(eq0, code, parade) {
    // la ligne de départ du piège : celle juste avant l'étape où l'erreur se commet (développer, réduire, regrouper, diviser)
    const ch = T.chaine(eq0), avants = [eq0, ch.dev, ch.red, ch.regRed];
    const c = D.candidats(eq0).filter(k => k.code === code).sort((a, b) => a.stade - b.stade || a.n - b.n)[0];
    if (!c) return null;
    const avant = avants[c.stade], forme = T.ORDRE[c.stade];
    const k = D.candidats(avant).filter(x => x.code === code && x.stade === c.stade).sort((a, b) => a.n - b.n)[0] || c;
    const faux = k.stade === 2 ? T.reduire(k.eq) : k.eq;
    return { code, nom: D.CATALOGUE[code].nom, type: "equation", depart: E.ecrireEquation(avant), faux: E.ecrireEquation(faux),
      bon: E.ecrireEquation(T.prochaine(avant, forme)), explication: D.expliquer({ code, detail: k.detail }), parade };
  }
  function piegeExpression(termes, code, parade) {
    for (const avant of [termes, T.devCote(termes)]) {
      const c = D.candidatsExpression(avant).filter(k => k.code === code).sort((a, b) => a.stade - b.stade || a.n - b.n)[0];
      if (c) return { code, nom: D.CATALOGUE[code].nom, type: "expression", depart: E.ecrireCote(avant), faux: E.ecrireCote(c.termes),
        bon: E.ecrireCote(T.attenduExpr(avant, c.stade === 0 ? "developpe" : "reduit")), explication: D.expliquer({ code, detail: c.detail }), parade };
    }
    return null;
  }
  function piegeNombre(n0, code, parade) {
    const N = MM.nombres, ordre = ["double", "produit", "prio", "parenthese", "terme", "resultat"];
    const c = N.candidats(n0).filter(k => k.code === code).sort((a, b) => ordre.indexOf(a.detail.sorte) - ordre.indexOf(b.detail.sorte))[0];
    if (!c) return null;
    let faux = c.valeur.texte(), bon = N.valeur(n0).texte();
    // un signe collé mal lu : on montre la ligne sans parenthèses, avec ce signe faux
    if (c.detail.index != null && N.chaine(n0).length >= 2) {
      const vals = N.plats(N.sansParentheses(n0)).map(N.valeurTerme);
      faux = N.ecrireListe(vals.map((v, i) => i === c.detail.index ? v.oppose() : v)); bon = N.ecrireListe(vals);
    }
    // priorités : la ligne fausse est le calcul fait de gauche à droite, « (91 − 9) × 5 »
    if (c.detail.sorte === "prio" && (n0.t === "add" || n0.t === "sub") && (n0.b.t === "mul" || n0.b.t === "div")) {
      faux = "(" + N.ecrire(N.op(n0.t, n0.a, n0.b.a)) + ")" + (n0.b.t === "mul" ? " × " : " ÷ ") + N.ecrire(n0.b.b, false);
      bon = N.prochaine(n0, "produit");
    }
    return { code, nom: D.CATALOGUE[code].nom, type: "nombre", depart: N.ecrire(n0), faux, bon, explication: N.expliquer({ code, detail: c.detail }), parade };
  }
  /* Calcule tout ce que la leçon affiche. Une mini-leçon de remédiation peut ne pas avoir de piège (erreur de calcul). */
  function preparer(pack) {
    const l = pack.lecon;
    const exo = MM.gen.creer(l.exemple.gen, l.exemple.niveau, l.exemple.graine);
    const depart = MM.gen.depart(exo);
    let piege = null;
    if (l.piege && l.piege.code) {
      const f = exo.type === "equation" ? piegeEquation : exo.type === "expression" ? piegeExpression : piegeNombre;
      piege = f(depart, l.piege.code, l.piege.parade);
      if (!piege) throw new Error("piège : l'erreur " + l.piege.code + " ne peut pas se produire sur l'exemple");
    }
    return {
      id: l.id, pack: pack.pack_id, palier: pack.palier, titre: l.titre, duree: l.duree_min || 4, idee: l.idee,
      exemple: { consigne: exo.consigne, type: exo.type, enonce: exo.enonce, lignes: exo.corrige, reponse: exo.reponseTexte },
      piege, aToi: (l.a_toi || []).map(q => ({ gen: q.gen, niveau: q.niveau })), fiche: { id: l.fiche.id, texte: l.fiche.texte }
    };
  }

  MM.lecon = { valider, preparer };
  if (typeof module !== "undefined" && module.exports) module.exports = MM;
})(typeof globalThis !== "undefined" ? globalThis : this);
