/* Objets tirés au hasard (avec graine) pour comparer l'écriture par champs de base.js à fusionner(). Jamais d'objet vide. */
function objetAuHasard(alea, prof) {
  const o = {}, n = 1 + Math.floor(alea() * 4);
  for (let i = 0; i < n; i++) {
    const k = ["a", "b", "c", "eleve", "reprise", "F-SIG-PAR", "x.y", "é t"][Math.floor(alea() * 8)], r = alea();
    o[k] = r < 0.15 ? null : r < 0.3 ? Math.floor(alea() * 100) : r < 0.42 ? "t" + Math.floor(alea() * 9) : r < 0.52 ? [1, { z: 2 }] : r < 0.6 ? true : prof < 3 ? objetAuHasard(alea, prof + 1) : 7;
  }
  return o;
}
module.exports = { objetAuHasard };
