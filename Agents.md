# AGENTS.md — CashTokens Studio Architecture Rules

## 🎯 Project & Role Overview
Cashtokens Studio is a BCH Cashtoken creation tool built with Quasar, Vite, and TypeScript. You are an expert AI software engineer refactoring this codebase on the `chore/deps-upgrade-wizard-connect` branch. 

Your objective is to enforce a strict boundary between UI presentation layers, localized application copy, and highly portable, UI-agnostic business logic while prioritizing clean, self-documenting code over strict testing requirements.

---

## 🛠️ Key Commands & Environment

```bash
# Development & Build
yarn dev             # Start dev server (SSR mode)
yarn build           # Production build

# Code Quality
yarn lint            # Run ESLint
yarn format          # Prettier formatting
yarn test            # Run mocha tests (Run contextually; strict test-writing not required for new code)
```

### Environment Variables & Package Context
* **Environment Handling:** **Avoid** `process.env.APP_ENV`. Use `import.meta.env` or pass configuration data downstream as direct functional parameters. For client exposure, use the `VITE_` prefix.
* **Package Management:** Always use **yarn** as the package manager. Node version `>= 22.22.0` is required.
* **Dependency Context:** The codebase handles a transition phase between legacy `mainnet-js` (v2.3.0) and `mainnet-js-v3` (HD wallet + WalletConnect v2). Consolidate new tasks toward clean, modern package approaches.

---

## 📂 Structural Boundaries & File Placement

You must strictly isolate platform-agnostic application architecture, localization resources, and visual framework components:

### 1. Target Core Architecture (`src/core/`)
* **Pure Portability:** Everything under `src/core/` must be 100% independent of any UI framework (Vue, Quasar, etc.). It must run seamlessly across web apps, browser extensions, or Node.js environments.
* **No Side-Effects or Globals:** No Vue reactivity, Pinia states, or direct browser globals are allowed in this directory. Inject dependencies explicitly as runtime parameters.
* **`src/core/services/`**: All files executing external network requests, database logic, indexer communication, indexing calls, or third-party API communications **must** be contained here. 

### 2. UI Presentation Layer (`src/components/`, `src/pages/`, etc.)
* **`src/components/dialogs/`**: Contains modal windows and popup interfaces. These must remain completely "dumb" presentation components.
* **Behavior:** Dialogs receive data purely via Vue props and emit all user interactions (clicks, saves, closures) up to parent layers using clear callbacks or events. They must not query APIs or handle persistent states themselves.

### 3. 🌐 Internationalization & Text Resources
* **No Hardcoded Strings:** Do not embed user-facing text strings directly into components, files, or core services.
* **Localization Source:** All structural text resources, labels, descriptions, and dynamic UI messaging must be added directly into **`i18n/en-us/index.ts`**.
* **Key Referencing:** Always extract and reference strings from the localization keys within code tasks to ensure clean multi-language maintainability.

### 4. Legacy Context (`src/apps/`)
* `src/apps/` contains legacy code being gradually refactored into the root `src/core/` space. 
* Do not add new features to `src/apps/`. Migrate logic out to `src/core/` when editing these areas.

---

## 📐 Coding Guidelines (Libauth-Inspired Functional Paradigm)

### 1. Stateless Purity & Immutability
* **Pure Functions:** Write small, atomic functions that produce outputs based purely on direct arguments. Avoid global mutations or object side-effects.
* **Data Immutability:** Treat CashTokens structures, scripts, and blockchain payload buffers as immutable. Map or spread objects (`...`) to create updated configurations.
* **Primitive Clarity:** Explicitly declare data types. Ensure string encodings (hex, utf-8, base58) are visibly isolated, and favor explicit types for binary arrays (`Uint8Array`).

### 2. Safe Error Handling
* **Predictable Returns:** Avoid relying on opaque, deep-nested `try/catch` block statements. Prefer explicit union type responses for processing outcomes, such as:
  `{ success: true; data: T } | { success: false; error: string }`

### 3. Clean Code Over Strict Testing
* **Self-Documenting Design:** Focus fully on highly expressive variable names, clear functional pipelines, and structural legibility.
* **No Testing Overhead:** Do not generate or demand automated test suites unless explicitly asked. Prioritize compile-time type safety and intuitive code structures instead.

---

## 🚀 Active Branch Target
* **Branch:** `chore/deps-upgrade-wizard-connect`
* **Focus:** Cleaning up connection wizards, validating dependency upgrades, decoupling background protocol states into the isolated core framework, and extracting all UI text structures to the i18n dictionary.
