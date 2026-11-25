# Mission Maths

Outil de rattrapage en maths pour un élève de 3e / 4e : équations du 1er et du 2nd degré, repère, fonctions affines.
Leçons courtes, saisie de chaque étape du calcul, diagnostic de l'erreur commise, suivi pour le parent.

Contenu livré : test diagnostic (P0), nombres relatifs (P1), calcul littéral (P2), équations simples (P3), équations complètes (P4), second degré (P5 : a, b, c, discriminant, √Δ, x₁ et x₂, chaque étape jugée à partir des valeurs de l'élève), et la révision du contrôle du 29/11 (G1 à G6 : distance, milieu, pente et équation de droite, intersections avec les axes, exercice combiné, Pythagore ; valeur exacte ou arrondie au centième, au format des fiches de la prof ; G7 : la fiche trigo, triangles dessinés et corrigé à déplier). Lot 4a (v0.6.0) : un repère dessiné de −6 à 6 où l'on place un point au toucher (`js/repere.js`) ; repère et points (P6 : lire, placer, point sur un axe) ; fonctions affines au format du tableau du contrôle (P7 : m, b, point sur l'axe des ordonnées, sens de variation, la ligne vide, tracer depuis m et b ; `js/affine.js`) ; les leçons de P8 (axes), P10 (équation d'une droite) et P11 (milieu et distance), ouvertes même quand le palier est fermé. Une échelle d'aide à 4 marches guide l'élève sans jamais lui donner la ligne avant la 5e erreur.

- **Site** : page statique servie par GitHub Pages.
- **Données** : base Firebase Firestore. Chaque famille a une clé secrète de 32 caractères, transmise par lien (`#eleve=…` ou `#parent=…`). La clé n'est jamais dans ce dépôt.
- **Règles de la base** : `firestore.rules` (lecture et écriture seulement avec une clé de famille, connexion anonyme obligatoire, aucune liste des familles).
- Ce dépôt est public : il ne contient aucune donnée personnelle.

## Tests

```
npm install
node tests/lancer.js                                         # moteur (Node, sans réseau)
node tests/avec-emulateur.js tests/base/firestore.js         # base, contre l'émulateur Firebase
node tests/avec-emulateur.js tests/navigateur/e2e.js         # de bout en bout dans Chrome (Playwright)
node tests/navigateur/reel.js [adresse]                      # recette contre la vraie base (famille d'essai effacée à la fin)
```

Le cœur maths (`js/`) est en JavaScript pur : le même fichier tourne dans l'app et dans les tests.
