/* Mission Maths — lecon.js
   Module Leçons : un pack JSON par palier (format des packs de Mission Logique + champ « lecon »).
   Le pack ne contient que du texte et des renvois vers des générateurs : l'exemple, le piège et les questions sont calculés. */
(function (G) {
  "use strict";
  const MM = G.MM || (G.MM = {});
  if (typeof require === "function" && !MM.gen) require("./gen/algebre.js");
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

  /* Calcule tout ce que la leçon affiche. */
  function preparer(pack) {
    const l = pack.lecon;
    const exo = MM.gen.creer(l.exemple.gen, l.exemple.niveau, l.exemple.graine);
    if (exo.type !== "equation") throw new Error("exemple : une équation est attendue");
    const eq0 = MM.gen.depart(exo);
    // le piège, montré sur l'exemple lui-même : la première ligne où cette erreur peut se produire
    let avant = eq0, piege = null;
    for (const etape of [null, T.developper, T.reduire, e => T.reduire(T.regrouper(e))]) {
      if (etape) avant = etape(avant);
      const c = D.candidats(avant).filter(k => k.code === l.piege.code).sort((a, b) => a.stade - b.stade || a.n - b.n)[0];
      if (c) {
        const faux = c.stade === 2 ? T.reduire(c.eq) : c.eq, forme = T.ORDRE[c.stade];
        piege = { code: c.code, nom: D.CATALOGUE[c.code].nom, depart: E.ecrireEquation(avant), faux: E.ecrireEquation(faux),
          bon: E.ecrireEquation(T.prochaine(avant, forme)), explication: D.expliquer({ code: c.code, detail: c.detail }), parade: l.piege.parade };
        break;
      }
    }
    if (!piege) throw new Error("piège : l'erreur " + l.piege.code + " ne peut pas se produire sur l'exemple");
    return {
      id: l.id, pack: pack.pack_id, palier: pack.palier, titre: l.titre, duree: l.duree_min || 4, idee: l.idee,
      exemple: { consigne: exo.consigne, enonce: exo.enonce, lignes: exo.corrige, reponse: exo.reponseTexte },
      piege, aToi: l.a_toi.map(q => ({ gen: q.gen, niveau: q.niveau })), fiche: { id: l.fiche.id, texte: l.fiche.texte }
    };
  }

  MM.lecon = { valider, preparer };
  if (typeof module !== "undefined" && module.exports) module.exports = MM;
})(typeof globalThis !== "undefined" ? globalThis : this);
