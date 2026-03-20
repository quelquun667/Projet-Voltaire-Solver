# Changelog

## [2.1.0] - 2026-03-20

### ✨ Ajouté
- **Taux d'erreur configurable** : Slider 0-50% dans le popup pour simuler des erreurs humaines et rendre l'utilisation plus réaliste.
- **Compteur de stats** : Affichage en temps réel du nombre de réponses correctes, erreurs et total dans le popup.
- **Support pages d'entraînement** : Le solver fonctionne désormais aussi sur les pages `/entrainement` (tests blancs, examens).
- **Skip automatique audio** : Détection et clic automatique sur "DÉSACTIVER" (popup fonctionnalités sonores) et "JE NE PEUX PAS ÉCOUTER" (exercices audio).
- **Validation des délais** : Seuil minimum de 1000ms, le min ne peut pas dépasser le max, avertissement visuel.

### 🔧 Modifié
- **Clic "Pas de faute"** : Le clic est désormais délégué au MAIN world (`extractor.js`) via `__pv_click` CustomEvent pour une compatibilité fiable avec React.
- **D&D : identification exercice** : Recherche élargie aux éléments `div[tabindex="0"]` en plus de `[data-testid="html"]` pour supporter les mots simples (Chou, Ami, ci, etc.).
- **D&D : détection phrases placées** : Remplacement du filtre `.r-vacyoi` par une comparaison de position Y (au-dessus/en-dessous des colonnes).
- **D&D : retour typé** : `solveDragAndDrop` retourne `'moved'`/`'done'`/`'error'` au lieu de `true`/`false`, évitant de cliquer VALIDER en boucle quand l'exercice n'est pas identifié.
- **README** : Suppression des références à l'IA Gemini, mise à jour de l'architecture et des instructions.

### 🐛 Corrigé
- **D&D boucle infinie** : Ne clique plus VALIDER quand l'exercice D&D n'est pas reconnu.
- **Bouton "Pas de faute" non cliqué** : Résolu via le mécanisme de clic MAIN world.
- **Réponses multi-mots** : Support des réponses contenant plusieurs mots (ex: "des pâtisseries") en cherchant chaque mot individuellement dans le DOM.

## [2.0.0] - 2026-03-16

### ✨ Ajouté
- **Extraction React Fiber** : Les réponses sont désormais extraites directement depuis l'état interne React de Projet Voltaire via un script MAIN world (`extractor.js`).
- **Résolution autonome** : Plus besoin d'IA ni de système d'apprentissage — les bonnes réponses sont lues dans le code source de la page.
- **Support complet Drag & Drop** : Résolution automatique de tous les types de tableaux (COD/COI, pluriels, etc.) avec détection dynamique de l'exercice actif et de ses colonnes.
- **Skip automatique** : Les écrans de règles, mémos, popups de difficulté et corrections sont passés automatiquement (CONTINUER/SUIVANT).
- **Détection URL** : Le solver et l'extracteur ne s'exécutent que sur les pages d'exercice (`/exercice`).
- **GitHub Actions** : Workflow automatique pour créer des releases avec le ZIP de l'extension à chaque tag.

### 🔧 Modifié
- **Architecture** : Nouveau script `extractor.js` en MAIN world pour accéder au React Fiber tree, communication avec `content.js` via CustomEvent et DOM.
- **Simulation de clic** : Utilisation de PointerEvents + MouseEvents pour compatibilité React Native Web (Pressable).
- **Matching de phrases** : Normalisation Unicode (apostrophes courbes, tirets insécables), suppression de ponctuation et matching flou (seuil 60%).

### 🗑️ Supprimé
- **Intégration Gemini AI** : Suppression complète de l'API Google Gemini et des appels au background service worker.
- **Système d'apprentissage** : Suppression du cache `learnedAnswers` et du fallback aléatoire.
- **Clé API** : Suppression de l'interface de saisie de clé API dans le popup.

## [1.4.3] - 2025-11-27

### ✨ Ajouté
- **Vérification Auto au Démarrage** : L'extension vérifie désormais automatiquement les mises à jour à chaque ouverture du popup.
- **Notification Visuelle** : Un badge rouge apparaît sur l'icône des paramètres si une nouvelle version est disponible.

### 🐛 Corrigé
- **Thème Sombre** : Correction du bug d'affichage (fond blanc) en forçant la hauteur de la fenêtre.
- **Bouton Valider** : Amélioration de la détection du bouton "Valider" (tolérance aux majuscules/espaces).
- **Interface** : Correction de l'affichage du badge de notification qui était invisible.

## [1.4.0] - 2025-11-27

### ✨ Ajouté
- **Support Drag & Drop (Tableau)** : Résolution automatique des exercices de type "Classer les éléments" (Tableau).
- **Interaction Click-and-Drop** : Simulation précise des clics pour déplacer les éléments (plus fiable que le glisser-déposer).
- **Mise en cache intelligente** : L'IA n'est sollicitée qu'une seule fois par niveau (combinaison unique de mots/colonnes) pour économiser le quota.
- **Validation Robuste** : Recherche active du bouton "Valider" (polling) à la fin de l'exercice pour gérer les apparitions tardives.

### 🐛 Corrigé
- **Stabilité** : Correction d'un bug où le script redémarrait avant la fin des déplacements.
- **Persistance** : Amélioration de la détection des éléments qui pouvaient être perdus après un rafraîchissement du DOM.
- **Détection "Déjà fait"** : Correction d'un faux positif où le script pensait que le nouvel exercice était déjà résolu.

## [1.2.0] - 2025-11-27

### ✨ Ajouté
- **Menu Paramètres**: Ajout d'un menu de paramètres avec bascule Mode Sombre et affichage de la version.
- **Vérificateur de mise à jour**: Implémentation d'une vérification automatique des mises à jour depuis GitHub.

## [1.1.0] - 2025-11-27

### ✨ Ajouté
- **Intégration IA**: Ajout de l'intégration Google Gemini 1.5 Flash pour la résolution automatique intelligente.
- **Délai Aléatoire**: Implémentation d'un délai min/max configurable pour simuler le comportement humain.
- **Gestion "Il n'y a pas de faute"**: Amélioration de la détection et du clic sur le bouton "Il n'y a pas de faute", y compris la gestion du texte d'instruction.
- **Configuration Clé API**: Ajout d'une interface pour saisir et sauvegarder la clé API Gemini.

### 🐛 Corrigé
- **Conflit de Bouton**: Résolution du problème où l'extension cliquait sur le texte d'instruction au lieu du bouton "Il n'y a pas de faute".
- **Événement de Clic**: Implémentation d'une simulation de clic robuste (mousedown/mouseup/click) pour une meilleure compatibilité.
- **Encodage**: Correction des problèmes d'encodage de caractères dans la popup.

### 🔧 Modifié
- **Interface Utilisateur**: Renommage de l'interrupteur "Master" pour plus de clarté.
- **Manifeste**: Mise à jour des permissions pour permettre la communication avec l'API Gemini.