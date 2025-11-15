# Pâte Graphique

Pâte Graphique est un navigateur web moderne basé sur Electron + React et pensé pour la personnalisation totale. Il combine des fonctions avancées (VPN, bloqueur de pubs, sessions, mods, thèmes, vue scindée, gestionnaire de mots de passe…) avec une interface en verre dépoli violet/bleu inspirée de l'univers gaming.

## Sommaire

1. [Architecture du projet](#architecture-du-projet)
2. [Prérequis](#prérequis)
3. [Installation & commandes](#installation--commandes)
4. [Génération des exécutables](#génération-des-exécutables)
5. [Fonctionnalités clés](#fonctionnalités-clés)
6. [Personnalisation](#personnalisation)
7. [VPN & proxy](#vpn--proxy)
8. [Thèmes & mods](#thèmes--mods)
9. [Scripts utilisateurs](#scripts-utilisateurs)
10. [Gestion du fichier `config.json`](#gestion-du-fichier-configjson)
11. [Structure détaillée](#structure-détaillée)

## Architecture du projet

```
Pâte Graphique/
├─ assets/
│  └─ icons/                # Placez vos icônes (ICO/ICNS/PNG) pour le packaging
├─ config/
│  ├─ config.json           # Configuration principale (modifiez-moi)
│  └─ config.schema.json    # Schéma JSON (documentation des clés)
├─ data/
│  ├─ notes.json            # Notes de la sidebar (persistantes)
│  ├─ passwords.json        # Coffre chiffré (AES-256-CTR + master password via Keytar)
│  └─ sessions.json         # Sessions sauvegardées
├─ dist/                    # Sortie compilée (générée)
├─ mods/                    # Mods UI (chaque dossier = un mod)
├─ themes/
│  └─ pate-graphique/       # Thème néon par défaut (CSS + méta)
├─ user-scripts/            # Scripts JS injectés dans les vues (optionnel)
├─ src/
│  ├─ main/                 # Processus principal Electron (TS)
│  ├─ preload/              # Pont sécurisé exposant l'API `window.pg`
│  └─ renderer/             # Interface React + Vite (TSX)
├─ electron-builder.yml     # Configuration packaging (Win/Mac/Linux)
├─ package.json             # Dépendances & scripts
├─ tsconfig*.json           # Configs TypeScript
└─ vite.config.ts           # Build Vite multi-pages (UI + page de nouvel onglet)
```

## Prérequis

- **Node.js 18+** (recommandé 20 LTS)
- **npm 9+**
- **Outils de build natifs** (requis pour `keytar` & `@cliqz/adblocker-electron`)
  - Windows : `npm install --global --production windows-build-tools` (PowerShell admin) + Visual Studio Build Tools 2019+
  - macOS : Xcode Command Line Tools (`xcode-select --install`)
  - Linux : `build-essential`, `libsecret-1-dev`, `python3`

## Installation & commandes

```bash
npm install          # installe toutes les dépendances
npm run dev          # lance main/preload en mode watch + Vite (http://localhost:5173)
npm start            # démarre Electron après compilation initiale (utilisé par npm run dev)
npm run build        # compile main/preload + build Vite en production
npm run dist         # build complet + empaquetage Windows x64 (Pâte Graphique.exe)
npm run lint         # lint du code (ESLint)
npm run format       # formatage Prettier
```

### Cycle de développement recommandé

1. `npm install`
2. `npm run dev` (ouvre Vite + compile main/preload en mode watch)
3. Dans un deuxième terminal : `npm start`
4. Développez l'UI React, le main process se recharge automatiquement

## Génération des exécutables

| Plateforme | Commande | Détails |
|------------|----------|---------|
| **Windows** | `npm run dist` | Produit `dist/win-unpacked/Pâte Graphique.exe` + installeur NSIS. Nécessite les outils natifs cités plus haut. |
| **macOS**   | `npm run build && electron-builder --mac` | Génère une app `.app` signable. Ajoutez une icône `assets/icons/pate-graphique.icns`. |
| **Linux**   | `npm run build && electron-builder --linux` | Produit un AppImage. Remplacez/complétez l'icône `assets/icons/`. |

> ⚠️ Ajoutez vos propres icônes (`pate-graphique.ico` / `.icns` / `.png`) avant le packaging.

## Fonctionnalités clés

- **Onglets avancés** : illimités, duplication, détachement en fenêtre, groupes, rechargement, vue scindée (2 onglets côte-à-côte).
- **Gestionnaire de téléchargements** : suivi en temps réel (`Ctrl+J`).
- **Gestionnaire de mots de passe** : chiffrement AES-256-CTR + master password stocké via Keytar (OS secure vault).
- **VPN / Proxy SOCKS5** : sélection de serveur, activation/désactivation dynamique.
- **Bloqueur de pubs & trackers** : `@cliqz/adblocker-electron` + listes EasyList/EasyPrivacy/Fanboy.
- **Mode Gaming / Focus** : limite CPU/RAM (throttling, mute) et animations.
- **Page nouvel onglet personnalisable** : widgets (clock, stats CPU/RAM, RSS) configurables dans `config.json`.
- **Sidebar modulable** : historique/notes/sessions/settings/VPN.
- **Notes persistantes** : sidebar avec sauvegarde dans `data/notes.json`.
- **Sessions** : sauvegarde/restauration en un clic.
- **Extensions Chromium** : glissez vos `.crx` dans `%APPDATA%/Pâte Graphique/extensions` (créé au premier lancement).
- **Mods & thèmes** : structure dédiée pour surcharger l'UI via HTML/CSS/JS.
- **Scripts utilisateurs** : injection globale (Tampermonkey-like) via `/user-scripts`.

## Personnalisation

### Fichier `config/config.json`

Chaque clé est documentée dans `config.schema.json`. Modifiez ce JSON puis relancez le navigateur (ou laissez le watcher recharger) pour appliquer :

```json
{
  "general": {
    "home": "https://www.startpage.com",
    "searchEngine": "https://duckduckgo.com/?q=%s",
    "hardwareAcceleration": true,
    "maxChromiumProcesses": 8,
    "restoreLastSession": true,
    "enableExtensions": true
  },
  "vpn": {
    "enabled": false,
    "defaultServer": "paris",
    "servers": [{ "id": "paris", "name": "Paris", "socks5": "socks5://fr1.example.com:1080" }]
  },
  "newTab": {
    "widgets": ["clock", "rss", "system-stats"],
    "rssFeeds": ["https://www.france24.com/fr/rss"]
  }
}
```

### UI via CSS & JS

- Les thèmes sont chargés depuis `themes/<id>/theme.css`. Le thème actif est `config.themes.active`.
- Ajoutez vos scripts globaux dans `/user-scripts`. Ils sont injectés si `config.themes.allowCustomJs = true`.
- Toute modification de `config.json` déclenche `configManager` → rethématisation automatique.

## VPN & proxy

1. Ajoutez vos serveurs dans `config.vpn.servers` (format `socks5://user:pass@host:port`).
2. Activez/désactivez le VPN dans la sidebar (bouclier).
3. Choisissez le serveur par défaut dans les réglages.
4. L'appel `window.pg.vpn.apply(serverId)` est exposé côté renderer (utilisé par l'UI).

## Thèmes & mods

- **Thèmes** : dossier `themes/<id>/` contenant `theme.css` + `theme.json`. Sélection via `config.themes.active`.
- **Mods** : déposez un dossier dans `/mods` avec `index.html`, `style.css`, `script.js`. Ils sont injectés côté renderer (`window.pg.mods.list()` pour liste).
- **Page de nouvel onglet** : fichier `src/renderer/src/newtab.tsx`. Ajoutez vos propres widgets ou modifiez la grille.

## Scripts utilisateurs

- Placez un `.js` dans `/user-scripts`.
- Activez `config.themes.allowCustomJs = true`.
- Ils s'exécutent dans chaque `BrowserView` (onglet) après le chargement.

## Gestion du fichier `config.json`

- **Activer/désactiver une fonctionnalité** : changez la valeur booléenne correspondante (`privacy.adblock`, `general.enableExtensions`, `vpn.enabled`, `themes.allowCustomCss`, etc.).
- **Limiter les ressources** : modifiez `limits.cpu` / `limits.ram` (affichage + gouvernance du mode Gaming/Focus).
- **Nouvel onglet** : ajoutez/retirez des widgets et flux RSS.

## Structure détaillée

### Processus principal (`src/main`)

- `main.ts` : création de la fenêtre, initialisation VPN, extensions, téléchargements.
- `tabs.ts` : gestion des onglets/BrowserViews (splits, drag, duplication, détachement).
- `config.ts` : lecture/merge `config.json` + watcher.
- `ipc.ts` : pont IPC (config, VPN, téléchargements, sessions, notes, mots de passe, onglets).
- `passwords.ts` : chiffrement AES + stockage via Keytar.
- `downloads.ts`, `sessions.ts`, `notes.ts`, `vpn.ts`, `extensions.ts`, `mods.ts` : services dédiés.

### Preload (`src/preload/index.ts`)

Expose une API sécurisée `window.pg` pour toutes les fonctionnalités (config, VPN, downloads, tabs, focus mode, notes, sessions, mods, système…).

### Renderer (`src/renderer`)

- `App.tsx` : UI principale (sidebar, tabstrip, barre d'adresse, stats, panneaux télécharge/notes/sessions/settings/split view).
- `newtab.tsx` : page nouvel onglet React (widgets configurables).
- `theme/global.css` + `themes/pate-graphique/theme.css` : style néon verre dépoli.

---

### Conseils supplémentaires

- **Extensions** : copiez vos `.crx` dans `AppData/Roaming/Pâte Graphique/extensions` (Win) ou `~/Library/Application Support/Pâte Graphique/extensions` (macOS) puis redémarrez.
- **Master password** : première sauvegarde de mot de passe → invite dans l'UI. Stocké via Keytar (sécurisé par l'OS).
- **Vue scindée** : choisissez deux onglets dans le panneau « Historique » pour les afficher côte-à-côte instantanément.
- **Modes Focus/Gaming** : icônes 🎯 / 🎮 dans la sidebar gauche.

Bon surf avec Pâte Graphique !
