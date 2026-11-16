/* Mission Maths — base.js
   La base Firestore derrière la même petite interface que la base de l'artefact Claude du lot 1 :
     doc(chemin) → { get, set, update, onSnapshot }   ·   collection(chemin).orderBy(champ, sens).limit(n).get()
   Tout est rangé sous familles/<clé>/ . La clé de famille (32 caractères) n'est jamais dans le code : elle arrive par le lien.
   La file hors ligne reste celle de file.js : Firestore garde seulement un cache en mémoire. */
(function (G) {
  "use strict";
  const MM = G.MM || (G.MM = {});

  /* ---------- clé de famille et liens (sans réseau) ---------- */
  const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const LONGUEUR = 32, ROLES = ["eleve", "parent"];
  /* hasard(n) → n octets aléatoires (crypto). Les octets 248 à 255 sont écartés : 248 = 4 × 62, donc aucun caractère n'est favorisé. */
  function nouvelleCle(hasard) {
    let cle = "";
    while (cle.length < LONGUEUR) for (const o of hasard(48)) { if (o < 248 && cle.length < LONGUEUR) cle += ALPHABET[o % 62]; }
    return cle;
  }
  const cleValide = c => typeof c === "string" && /^[A-Za-z0-9]{32}$/.test(c);
  /* « #eleve=<clé> » ou « #parent=<clé> » → { cle, role } ; tout autre texte → null. */
  function lireLien(hash) {
    if (typeof hash !== "string") return null;
    const m = /^#?(eleve|parent)=([^&]*)$/.exec(hash);
    return m && cleValide(m[2]) ? { cle: m[2], role: m[1] } : null;
  }
  function lien(adresse, cle, role) {
    if (!ROLES.includes(role)) throw new Error("rôle inconnu : " + role);
    return String(adresse).split("#")[0].split("?")[0] + "#" + role + "=" + cle;
  }

  /* ---------- écriture par champs : même résultat que fusionner() de l'appareil ---------- */
  const estObjet = v => v && typeof v === "object" && !Array.isArray(v);
  /* { eleve: { reprise: r } } → [[["eleve","reprise", …], valeur], …]. Un objet est descendu champ par champ ;
     un tableau, null, un nombre ou un texte est écrit tel quel. Un objet vide n'écrit rien (comme fusionner sur un objet existant). */
  function aplatir(source, prefixe, sortie) {
    prefixe = prefixe || []; sortie = sortie || [];
    for (const k of Object.keys(source)) {
      const v = source[k];
      if (v === undefined) continue;
      if (estObjet(v)) aplatir(v, prefixe.concat([k]), sortie);
      else sortie.push([prefixe.concat([k]), v]);
    }
    return sortie;
  }

  /* ---------- codes d'erreur : ceux que la file (file.js) et l'app comprennent ---------- */
  const CODES = { "permission-denied": "permission_denied", "not-found": "introuvable", "invalid-argument": "invalid_argument", "resource-exhausted": "quota_exceeded" };
  function traduireErreur(e) {
    const brut = e && e.code;
    return { code: CODES[brut] || (brut === "invalid_argument" ? "invalid_argument" : "unavailable"), detail: brut || (e && e.message) || String(e) };
  }

  /* ---------- la base ---------- */
  let compteur = 0;
  /* fb = { app, auth, firestore } : les modules Firebase (CDN dans le navigateur, paquet npm dans les tests).
     options = { config, cle, emulateur?: { auth: "hôte:port", firestore: "hôte:port" } } */
  function creer(fb, options) {
    const A = fb.app, U = fb.auth, F = fb.firestore;
    const app = A.initializeApp(options.config, "mm-" + (++compteur));
    const db = F.initializeFirestore(app, { ignoreUndefinedProperties: true, localCache: F.memoryLocalCache() });
    const auth = U.getAuth(app);
    if (options.emulateur) {
      U.connectAuthEmulator(auth, "http://" + options.emulateur.auth, { disableWarnings: true });
      const [h, p] = options.emulateur.firestore.split(":"); F.connectFirestoreEmulator(db, h, Number(p));
    }
    const prefixe = "familles/" + options.cle + "/";

    /* Connexion anonyme, invisible pour l'élève. Réutilisée d'une visite à l'autre ; retentée si le réseau manquait. */
    let connexion = null;
    function connecte() {
      if (auth.currentUser) return Promise.resolve(auth.currentUser);
      if (!connexion) {
        connexion = (async () => {
          if (auth.authStateReady) await auth.authStateReady();
          return auth.currentUser || (await U.signInAnonymously(auth)).user;
        })();
        connexion.catch(() => { connexion = null; });
      }
      return connexion.catch(e => { throw traduireErreur(e); });
    }
    const refDoc = chemin => { try { return F.doc(db, prefixe + chemin); } catch (e) { throw { code: "invalid_argument", detail: e && e.message }; } };
    const instantane = s => ({ id: s.id, exists: s.exists(), data: () => s.exists() ? s.data() : undefined,
      metadata: { fromCache: !!s.metadata.fromCache, hasPendingWrites: !!s.metadata.hasPendingWrites } });

    /* Deux envois identiques pendant qu'un est en vol (réseau coupé, file rejouée) : on réutilise le premier, on n'empile pas. */
    const enVol = new Map();
    function ecrire(type, chemin, donnees) {
      const k = type + "|" + chemin + "|" + JSON.stringify(donnees);
      if (enVol.has(k)) return enVol.get(k);
      const p = (async () => {
        const ref = refDoc(chemin);
        await connecte();
        try {
          if (type === "set") await F.setDoc(ref, donnees);
          else {
            const champs = aplatir(donnees); if (!champs.length) return;
            const args = []; for (const [c, v] of champs) args.push(new F.FieldPath(...c), v);
            await F.updateDoc(ref, ...args);
          }
        } catch (e) { throw traduireErreur(e); }
      })();
      enVol.set(k, p);
      const fin = () => { enVol.delete(k); }; p.then(fin, fin);
      return p;
    }

    function doc(chemin) {
      return {
        id: chemin.split("/").pop(), path: chemin,
        async get() {
          const ref = refDoc(chemin); await connecte();
          try { return instantane(await F.getDocFromServer(ref)); } catch (e) { throw traduireErreur(e); }
        },
        set: d => ecrire("set", chemin, d),
        update: d => ecrire("update", chemin, d),
        /* Écoute en direct. Tant que la connexion anonyme échoue (pas de réseau), on réessaie sans signaler d'erreur. */
        onSnapshot(suite, erreur) {
          let stop = null, fini = false;
          (async function attendre() {
            while (!fini) {
              try { await connecte(); break; } catch (e) { await new Promise(r => setTimeout(r, 5000)); }
            }
            if (fini) return;
            try {
              stop = F.onSnapshot(refDoc(chemin), { includeMetadataChanges: true }, s => suite(instantane(s)), e => { if (erreur) erreur(traduireErreur(e)); });
            } catch (e) { if (erreur) erreur(traduireErreur(e)); }
          })();
          return () => { fini = true; if (stop) stop(); };
        }
      };
    }
    function collection(chemin, tri, max) {
      return {
        path: chemin,
        orderBy: (champ, sens) => collection(chemin, { champ, sens: sens || "asc" }, max),
        limit: n => collection(chemin, tri, n),
        async get() {
          await connecte();
          try {
            const morceaux = [F.collection(db, prefixe + chemin)];
            if (tri) morceaux.push(F.orderBy(tri.champ, tri.sens));
            if (max) morceaux.push(F.limit(max));
            const s = await F.getDocsFromServer(F.query(...morceaux));      // jamais une copie partielle du cache : le rapport garde alors sa dernière lecture
            return { docs: s.docs.map(instantane), size: s.size, empty: s.empty };
          } catch (e) { throw traduireErreur(e); }
        }
      };
    }
    return { doc, collection, connecte };
  }

  MM.base = { nouvelleCle, cleValide, lireLien, lien, aplatir, traduireErreur, creer, ROLES };
  if (typeof module !== "undefined" && module.exports) module.exports = MM;
})(typeof globalThis !== "undefined" ? globalThis : this);
