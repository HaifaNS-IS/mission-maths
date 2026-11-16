/* Mission Maths — file.js
   File d'attente hors ligne. Chaque écriture est d'abord rangée dans le stockage de l'appareil, puis envoyée.
   Au retour du réseau, la file est rejouée dans l'ordre. Les écritures sont rejouables sans doublon (identifiants fixes). */
(function (G) {
  "use strict";
  const MM = G.MM || (G.MM = {});

  const REFUS = ["invalid_argument", "transform_error"];       // la base refuse : réessayer tel quel ne sert à rien
  const ESSAIS_MAX = 3, REJETS_MAX = 30;

  /* stockage : { lire() → texte|null, ecrire(texte) } ; envoyer(op) → Promise (rejette { code }) */
  function creerFile(stockage, envoyer) {
    let ops = [], rejets = [], enVol = null, cours = null;
    try { const brut = stockage.lire(); if (brut) { const o = JSON.parse(brut); ops = Array.isArray(o.ops) ? o.ops : []; rejets = Array.isArray(o.rejets) ? o.rejets : []; } } catch (e) { ops = []; rejets = []; }
    const sauver = () => { try { stockage.ecrire(JSON.stringify({ ops, rejets })); } catch (e) { /* stockage plein ou absent : la file reste en mémoire */ } };

    /* op : { id, type: "set"|"update", chemin, donnees, cle? }. Deux écritures de même clé encore en attente : la dernière remplace. */
    function ajouter(op) {
      if (!op.id) throw new Error("écriture sans identifiant");
      const i = op.cle ? ops.findIndex(o => o.cle === op.cle && o.id !== enVol) : -1;
      if (i >= 0) ops[i] = Object.assign({}, op, { essais: 0 });
      else if (!ops.some(o => o.id === op.id)) ops.push(Object.assign({}, op, { essais: 0 }));
      sauver();
    }
    /* Envoie tout ce qui attend. Résout { ok, restant, raison }. Ne lance jamais. */
    function vider() {
      if (cours) return cours;
      cours = (async () => {
        let raison = null;
        while (ops.length) {
          const op = ops[0];
          enVol = op.id;
          try { await envoyer(op); }
          catch (e) {
            enVol = null;
            const code = (e && e.code) || "reseau";
            if (REFUS.includes(code)) {
              op.essais = (op.essais || 0) + 1;
              if (op.essais >= ESSAIS_MAX) { rejets.push(Object.assign(ops.shift(), { refus: code })); rejets = rejets.slice(-REJETS_MAX); sauver(); raison = "refus"; continue; }
            }
            sauver();
            return { ok: false, restant: ops.length, raison: code };
          }
          enVol = null;
          const k = ops.findIndex(o => o.id === op.id);
          if (k >= 0) ops.splice(k, 1);
          sauver();
        }
        return { ok: !raison, restant: 0, raison };
      })();
      const fin = () => { cours = null; };
      cours.then(fin, fin);
      return cours;
    }
    return {
      ajouter, vider,
      taille: () => ops.length,
      enAttente: () => ops.slice(),
      rejets: () => rejets.slice(),
      /* Remet les écritures refusées dans la file (après correction du partage, par exemple). */
      reprendreRejets() { for (const r of rejets) { delete r.refus; r.essais = 0; ops.push(r); } rejets = []; sauver(); }
    };
  }

  MM.file = { creerFile, REFUS };
  if (typeof module !== "undefined" && module.exports) module.exports = MM;
})(typeof globalThis !== "undefined" ? globalThis : this);
