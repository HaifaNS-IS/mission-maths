/* Mission Maths — rapport.js
   Les chiffres du rapport parent, calculés à la lecture à partir des séances et des tentatives. Fonctions pures. */
(function (G) {
  "use strict";
  const MM = G.MM || (G.MM = {});

  const MINUTE = 60000, JOUR = 86400000;
  const INACTIVITE = 2 * MINUTE;            // au-delà de 2 minutes sans activité, le temps ne compte plus
  const COUPURE = 30 * MINUTE;              // au-delà de 30 minutes, c'est une nouvelle séance

  /* Durée active : somme des écarts entre deux activités, sans les trous de plus de 2 minutes. */
  function dureeActive(instants, seuil) {
    const s = seuil || INACTIVITE, t = instants.slice().sort((a, b) => a - b);
    let total = 0;
    for (let i = 1; i < t.length; i++) { const d = t[i] - t[i - 1]; if (d <= s) total += d; }
    return total;
  }
  /* Version au fil de l'eau : on ajoute un instant à une séance en cours. */
  function pointer(seance, instant, seuil) {
    const d = instant - seance.fin;
    if (d > 0 && d <= (seuil || INACTIVITE)) seance.dureeActive += d;
    if (instant > seance.fin) seance.fin = instant;
    return seance;
  }
  const nouvelleSeanceRequise = (seance, instant) => !seance || instant - seance.fin > COUPURE;

  const minutes = ms => Math.round(ms / MINUTE);
  function texteDuree(ms) {
    const m = Math.floor(ms / MINUTE), s = Math.round((ms % MINUTE) / 1000);
    if (m === 0) return s + " s";
    return m + " min" + (s && m < 10 ? " " + String(s).padStart(2, "0") + " s" : "");
  }
  const debutJour = t => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };

  /* Résumé du haut du rapport. Les séances faites depuis le compte du parent (essais) sont comptées à part. */
  function resume(seances, tentatives, maintenant) {
    const eleve = seances.filter(s => !s.parent), ids = new Set(eleve.map(s => s.id));
    const tent = tentatives.filter(t => ids.has(t.sid));
    const depuis = maintenant - 7 * JOUR;
    const sem = eleve.filter(s => s.fin >= depuis);
    const derniere = eleve.slice().sort((a, b) => b.fin - a.fin)[0] || null;
    const compte = {};
    for (const t of tent) if (t.t >= depuis) for (const l of t.lignes || []) if (l.juste === false && l.code) compte[l.code] = (compte[l.code] || 0) + 1;
    const erreurs = Object.keys(compte).map(code => ({ code, n: compte[code] })).sort((a, b) => b.n - a.n || (a.code < b.code ? -1 : 1));
    const tSem = tent.filter(t => t.t >= depuis);
    return {
      derniere,
      joursSansSeance: derniere ? Math.floor((debutJour(maintenant) - debutJour(derniere.fin)) / JOUR) : null,
      minutes7j: minutes(sem.reduce((a, s) => a + (s.dureeActive || 0), 0)),
      seances7j: sem.length,
      exercices7j: tSem.length,
      justes7j: tSem.filter(t => t.juste).length,
      erreurs7j: erreurs,
      essaisParent: seances.length - eleve.length
    };
  }
  /* Séances de la plus récente à la plus ancienne, chacune avec ses tentatives dans l'ordre. */
  function parSeance(seances, tentatives) {
    const m = new Map();
    for (const t of tentatives) { if (!m.has(t.sid)) m.set(t.sid, []); m.get(t.sid).push(t); }
    return seances.slice().sort((a, b) => b.debut - a.debut).map(s => Object.assign({}, s, { tentatives: (m.get(s.id) || []).sort((a, b) => a.t - b.t) }));
  }

  MM.rapport = { INACTIVITE, COUPURE, dureeActive, pointer, nouvelleSeanceRequise, minutes, texteDuree, resume, parSeance };
  if (typeof module !== "undefined" && module.exports) module.exports = MM;
})(typeof globalThis !== "undefined" ? globalThis : this);
