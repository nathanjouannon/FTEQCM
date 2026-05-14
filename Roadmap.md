## Étape 1 — Setup du projet
- [x] Créer le repo GitHub
- [x] Initialiser le projet Next.js avec TypeScript
- [x] Installer les dépendances utiles (Tailwind CSS pour le style)
- [x] Configurer `netlify.toml`
- [x] Premier déploiement Netlify "vide" pour valider la config

---

## Étape 2 — Préparation des données
- [x] Définir la structure TypeScript des questions
- [x] Créer le fichier `questions.json` avec les questions et les 4 réponses (1 correcte, 3 fausses)

> ⚠️ C'est l'étape la plus longue. On va travailler ensemble pour générer les questions/réponses par blocs thématiques.

---

## Étape 3 — Fondations du code
- [x] Créer les types TypeScript (`Question`, `Score`, `QCMSession`...)
- [x] Créer le hook `useLocalStorage.ts`
- [x] Créer le hook `useQCM.ts` (sélection aléatoire, navigation, calcul du score)

---

## Étape 4 — Développement des pages
- [x] **Page d'accueil** : bouton démarrer, choix du mode (réponse immédiate ou fin de QCM), lien vers la progression
- [x] **Page QCM** : affichage question par question, barre de progression, feedback immédiat si mode choisi
- [x] **Page Résultats** : score final, correction détaillée, bouton nouveau QCM
- [ ] **Page Progression** : courbe/graphique des scores dans le temps

---

## Étape 5 — Polish & Tests
- [ ] Vérifier la responsivité (mobile first)
- [ ] Tester les cas limites (LocalStorage vide, premier QCM...)
- [ ] Vérifier que le build Next.js est 100% statique (`next export`)

---

## Étape 6 — Mise en ligne
- [ ] Push sur GitHub
- [ ] Connecter le repo à Netlify
- [ ] Vérifier le déploiement en production