# 🎓 Projet Voltaire Solver

### Version : 2.1.1

**Cet outil est destiné à des fins éducatives et de test.**

Une extension Chrome qui résout automatiquement les exercices Projet Voltaire en extrayant les réponses directement depuis le code source de la page (React Fiber).

## ✨ Fonctionnalités

*   **🔍 Extraction React Fiber** : Trouve les réponses directement dans l'état interne de l'application, sans IA ni API externe.
*   **✅ Exercices "Cliquer sur la faute"** : Détecte et clique automatiquement sur le mot erroné, ou sur "Il n'y a pas de faute".
*   **📝 Exercices "Cliquer sur le mot"** : Identifie et clique sur le bon mot (COD, participe passé, etc.).
*   **📋 Exercices "Cliquer / Déposer"** : Place automatiquement les phrases dans les bonnes colonnes (tableaux).
*   **⏱️ Délai Aléatoire** : Délai configurable entre chaque réponse pour simuler un comportement humain.
*   **🕵️ Mode Inspecteur** : Pour le débogage, permet d'inspecter les éléments de la page.
*   **🌗 Mode Clair/Sombre** : Interface utilisateur adaptable.
*   **🔄 Vérification de mise à jour** : Avertissement automatique si une nouvelle version est disponible.

## 🚀 Installation

1.  Téléchargez la dernière [**Release**](https://github.com/quelquun667/Projet-Voltaire-Solver/releases/latest) (fichier `.zip`) et extrayez-la.
2.  Ouvrez Google Chrome et allez sur `chrome://extensions/`.
3.  Activez le **Mode développeur** (en haut à droite).
4.  Cliquez sur **Charger l'extension non empaquetée** (Load unpacked).
5.  Sélectionnez le dossier `ProjetVoltaireExtension` (celui qui contient le fichier `manifest.json`).

## ⚙️ Utilisation

1.  Ouvrez l'extension (icône dans Chrome).
2.  Activez **Auto Solve**.
3.  Configurez le délai min/max si souhaité (par défaut 1s - 2s).
4.  Allez sur un exercice Projet Voltaire — l'extension résout automatiquement.

## 🛠️ Architecture

*   `content.js` : Script principal — détection d'exercice, matching, clic automatique.
*   `extractor.js` : Script MAIN world — traverse le React Fiber pour extraire les données d'exercice.
*   `background.js` : Service worker minimal.
*   `popup.html` / `popup.js` : Interface utilisateur de l'extension.

## 🔄 Mise à jour

Téléchargez la dernière release, remplacez le dossier, et cliquez "Actualiser" sur `chrome://extensions/`.

---
*Note : Cet outil est destiné à des fins éducatives et de test.*
