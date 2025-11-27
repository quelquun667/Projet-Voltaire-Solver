# Changelog

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