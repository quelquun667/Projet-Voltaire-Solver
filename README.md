# 🎓 Projet Voltaire Assistant (AI Powered)

### Version : 1.4.3

**Cet outil est destiné à des fins éducatives et de test.**

Une extension Chrome intelligente pour vous aider dans vos exercices Projet Voltaire, propulsée par l'IA Gemini de Google.

## Activer l'Auto Solve IA

Cochez l'option 2 et 3 dans l'extension pour activer l'auto solve IA.

## ✨ Fonctionnalités

*   **🤖 Auto-Solve IA** : Utilise Google Gemini 1.5 Flash pour analyser la phrase et trouver la faute (ou l'absence de faute) automatiquement.
*   **🧠 Mode Apprentissage** : Mémorise les corrections pour répondre instantanément la prochaine fois sans rappeler l'IA.
*   **⏱️ Délai Aléatoire** : Configurez un délai minimum et maximum (ex: 2s - 4s) entre chaque réponse pour simuler un comportement humain et éviter les blocages.
*   **✅ Gestion "Il n'y a pas de faute"** : Détecte et clique intelligemment sur le bouton "Il n'y a pas de faute" quand l'IA le suggère.
*   **🕵️ Mode Inspecteur** : Pour le débogage, permet d'inspecter les éléments de la page.
*   **🌗 Mode Clair/Sombre** : Interface utilisateur adaptable selon vos préférences.
*   **🔄 Vérification de mise à jour** : Vous avertit automatiquement si une nouvelle version est disponible sur GitHub.

## 🚀 Installation

1.  **Téléchargez** ce projet (Code > Download ZIP) et extrayez-le, ou clonez le dépôt.
2.  Ouvrez Google Chrome et allez sur `chrome://extensions/`.
3.  Activez le **Mode développeur** (en haut à droite).
4.  Cliquez sur **Charger l'extension non empaquetée** (Load unpacked).
5.  Sélectionnez le dossier `ProjetVolataireExtension` (celui qui contient le fichier `manifest.json`).

## 🔑 Comment obtenir une Clé API Gemini (Gratuit)

Pour que l'IA fonctionne, vous avez besoin d'une clé API Google Gemini. C'est gratuit et rapide.

1.  Rendez-vous sur **[Google AI Studio](https://aistudio.google.com/app/apikey)**.
2.  Connectez-vous avec votre compte Google.
3.  Cliquez sur le bouton **"Create API key"**.
4.  Copiez la clé générée (elle commence par `AIza...`).
5.  Ouvrez l'extension Projet Voltaire (cliquez sur l'icône dans Chrome).
6.  Collez la clé dans le champ **"Clé API Gemini"**.
7.  Activez l'option **"Utiliser l'IA (Gemini)"**.

## ⚙️ Configuration Recommandée

Pour éviter de dépasser les limites de l'API gratuite (15 requêtes/minute) :

*   **Délai Min** : `3000` ms (3 secondes)
*   **Délai Max** : `5000` ms (5 secondes)

## 🛠️ Développement

*   `manifest.json` : Configuration de l'extension.
*   `content.js` : Script principal qui interagit avec la page (détection, clic).
*   `background.js` : Gestion des appels API vers Gemini.
*   `popup.html` / `popup.js` : Interface utilisateur de l'extension.

## 🔄 Mise à jour

Pour mettre à jour l'extension vers la dernière version :

1.  Supprimez le dossier de l'ancienne version.
2.  Téléchargez et extrayez la nouvelle version.
3.  Dans `chrome://extensions/`, cliquez sur le bouton "Actualiser" (flèche qui tourne) sur la carte de l'extension, ou rechargez-la si nécessaire.

---
*Note : Cet outil est destiné à des fins éducatives et de test.*
