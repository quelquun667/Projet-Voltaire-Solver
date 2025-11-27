# Changelog

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