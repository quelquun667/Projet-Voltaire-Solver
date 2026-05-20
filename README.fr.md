<div align="center">

# 🎓 Projet Voltaire Solver

**Résout automatiquement les exercices Projet Voltaire par extraction React Fiber — sans IA, sans clé API.**

[![Version](https://img.shields.io/badge/version-2.2.1-blue?style=flat-square)](https://github.com/quelquun667/Projet-Voltaire-Solver/releases/latest)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-green?style=flat-square&logo=google-chrome)](https://developer.chrome.com/docs/extensions/mv3/)
[![License](https://img.shields.io/badge/license-MIT-orange?style=flat-square)](LICENSE)

[🇬🇧 English version](README.md)

<img src="images/interface.png" alt="Interface de l'extension" width="340"/>

</div>

---

## ✨ Fonctionnalités

| Fonctionnalité | Description |
|---|---|
| 🔍 **Extraction React Fiber** | Lit les réponses directement dans l'état interne React de l'application |
| ✅ **Exercices "Cliquer sur la faute"** | Détecte et clique sur le mot erroné, ou sur "Il n'y a pas de faute" |
| 📝 **Exercices "Cliquer sur le mot"** | Identifie et clique sur le bon mot (COD, participe passé, etc.) |
| 📋 **Exercices "Cliquer / Déposer"** | Place automatiquement les phrases dans les bonnes colonnes (Tableau) |
| 📊 **Stats par session** | Compteur correct / erreurs / total, remis à zéro à chaque nouvelle session |
| ⏱️ **Délai aléatoire** | Délai min/max configurable entre chaque réponse pour simuler un comportement humain |
| 🎲 **Taux d'erreur** | Fait intentionnellement des erreurs à une fréquence configurable (0–50 %) |
| 🕵️ **Mode Inspecteur** | Cliquez sur n'importe quel élément pour voir son sélecteur (débogage) |
| 🌗 **Mode Sombre / Clair** | S'adapte à vos préférences |
| 🔔 **Vérification de mise à jour** | Notification automatique quand une nouvelle version est disponible |

---

## 🚀 Installation

1. Téléchargez la dernière **[Release](https://github.com/quelquun667/Projet-Voltaire-Solver/releases/latest)** (fichier `.zip`) et extrayez-la.
2. Ouvrez Chrome et allez sur `chrome://extensions/`.
3. Activez le **Mode développeur** (interrupteur en haut à droite).
4. Cliquez sur **Charger l'extension non empaquetée**.
5. Sélectionnez le dossier `ProjetVoltaireExtension` (celui qui contient `manifest.json`).

> **Mise à jour :** Téléchargez la nouvelle release, remplacez le dossier, puis cliquez sur **Actualiser** (↺) sur `chrome://extensions/`.

---

## ⚙️ Utilisation

1. Ouvrez le popup de l'extension (icône dans la barre Chrome).
2. Activez **Auto Solve**.
3. Ajustez le délai min/max si besoin (par défaut : 1 s – 2 s).
4. Accédez à un exercice Projet Voltaire — l'extension fait le reste.

---

## 🛠️ Fonctionnement

Projet Voltaire est une application React Native Web. L'extension injecte deux scripts :

- **`extractor.js`** s'exécute dans le monde MAIN de la page et parcourt l'arbre React Fiber pour extraire les données d'exercice (bonne réponse, type, phrase). Il expose ces données via un élément DOM caché.
- **`content.js`** s'exécute dans le monde isolé de l'extension, lit ces données, associe les mots affichés à l'exercice correspondant, puis simule des événements pointeur natifs pour cliquer la réponse.

Cette approche ne nécessite aucune API externe et fonctionne indépendamment de l'apparence visuelle de la page.

---

## ⚠️ Avertissement

Cet outil est destiné à des fins éducatives et de test uniquement.
