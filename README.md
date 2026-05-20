# 🚀 Krono | Real-Time Attendance Portal

A secure, high-performance, cloud-synced attendance orchestration platform designed specifically for academic tracking. This ecosystem automates roster ingestion, sanitizes structural data layout, handles atomic check-in/out logging, and features instant synchronization across client environments with robust offline fallback mechanics.

---

## ✨ Advanced Features

* **🔒 Secure Authentication Hub:** Complete Google OAuth integration via Firebase Auth, restricting workspace contexts to verified user profiles.
* **📋 Intelligent Roster Ingestion:** Dynamically detects, extracts, and parses structural master lists directly from copy-paste text areas—automatically stripping away leading indexes, symbols, or numbering templates.
* **⚡ Real-Time Sync Engine:** Backed by a Firebase Realtime Database NoSQL data-pipeline. State adjustments on any local client mirror instantly globally.
* **🌗 Adaptive Hybrid Workspace:** Seamless user experience containing an isolated context setup screen for initial configuration alongside a unified settings module for administrative updates.
* **📊 Live Analytic Aggregation:** Calculates exact Present/Absent metrics and updates a visual attendance progress bar element dynamically at runtime.
* **📄 High-Fidelity Report Exporting:** Generates and downloads standard raw data **CSVs** or stylized tabular **PDFs** featuring automated, color-coded cell highlights depending on four-state tracking metrics (`PRESENT`, `ABSENT`, or variations of `INCOMPLETE`).
* **📲 Progressive Web App (PWA):** Embedded Service Worker routines providing complete system caching, standalone launcher loading, and optimized local persistence properties.

---

## 🛠️ Tech Stack

* **Frontend Engine:** HTML5, Tailwind CSS Architecture (Modern Material Tokens)
* **Backend & Authentication:** Firebase Infrastructure (Auth, Realtime Database)
* **Document Compiler:** jsPDF Scripting Core & jsPDF-AutoTable Framework Plugins
* **Design Typography:** Google Fonts (`Space Grotesk` & `Manrope`), Google Material Symbols

---

## 📁 Project Architecture

```text
├── index.html       # Single-Page UI layout layer, styling configurations, and viewports
├── script.js        # Core transactional script handling auth streams, DB sync, and DOM renders
├── manifest.json    # Application asset mappings for mobile standalone execution (PWA)
├── sw.js            # Offline network intercept file and service worker lifecycle controller
└── iict-logo.png    # Portal brand identity header and generated PDF document logo asset
