# Coding Guidelines: Modules Migration

## Overview

CashTokens Studio was originally written during a period when core dependencies (`mainnet-js`, `@bitauth/libauth`, `cashscript`) were **bleeding edge** - updated frequently with breaking changes and rapid development. This contributed to technical debt and the need for significant refactoring.

The codebase is undergoing a gradual migration from webpack to Vite. A key part of this migration is moving business logic from `src/apps/` to a new `src/modules/` folder. The goal is to create **UI-agnostic, functional, and unit testable** TypeScript modules.

The Quasar config was migrated from `quasar.config.cjs` (webpack) to `quasar.config.js` (Vite), removing significant webpack-specific configuration.

## Background: package.json Dependency Split

The codebase used to carry two versions of `mainnet-js`:

| Package | Version | Use Case |
|---------|---------|----------|
| `mainnet-js` | 2.3.0 | Legacy transaction builders — **removed 2026-10-14** |
| `mainnet-js` | 3.1.7 | HD wallet, WalletConnect v2 — **the v3 line, now under its real name** |

The v2 entry, and the `@mainnet-cash/contract` package that depended on it, were removed once the last
callers went: the legacy `src/apps` classes, the WalletConnect v1 composable and the v2 watch-only
wallet. Those files are parked in `.git/exclude/archive/dead-files-2026-10-14/`, so restoring one means
re-adding `mainnet-js@2.3.0`.

`@bitauth/libauth` v2 is still a direct dependency while `src/core/transaction`, `src/core/bcmr` and
the pages move to v3.

**The libauth v2 entry and its `"@bitauth/libauth": "2.0.0-alpha.8"` resolution are load-bearing.**
`mainnet-js`'s shipped bundle imports the bare `@bitauth/libauth` name from the project root, and
pointing that name at v3 trips `[MISSING_EXPORT] OpcodesBtc` inside libauth 3.1.0-next.8's own
`build/lib/vm` files. Don't remove the pin while migrating the remaining imports to the v3 alias.

**`mainnet-js` is pinned exactly** (`3.1.7`) because `patches/mainnet-js+3.1.7.patch` is keyed to that
version — bumping the dependency means renaming the patch file *and* the `node_modules/...` paths
inside it in the same commit.

Since the package is back under the plain `mainnet-js` name, a file restored from the parked v2
archive (e.g. `src/apps/utils/wallet.ts`, which imports `'mainnet-js'`) would silently resolve to v3 —
check anything you bring back.

**Note**: The new packages (`mainnet-js` v3, `@bitauth/libauth` v3, `cashscript` v0.8+) have breaking changes and significant improvements. Migration is an opportunity to adopt these.

## WalletConnect: an additive, unpluggable connect path

The app connects through two independent stacks. WizardConnect (`src/composables/useWizardConnectWallet.ts`
+ `src/core/wallet/wizard-connect.ts`) is the base one; WalletConnect (`src/composables/useWalletConnectWallet.ts`
+ `src/core/wallet/wallet-connect/`) is the second, for the non-HD wallets that expose a single address.
`src/composables/useWalletSigner.ts` is the only file that knows both exist — it picks one and forwards
the call, without merging the two implementations.

The transaction builders are shared and untouched: they already emit a `SignTransactionRequest` whose
`transaction` field is the WalletConnect payload (`WcSignTransactionRequest`), so the same request feeds
either wallet. A WalletConnect session only differs in that its UTXOs carry no `pathName`/`addressIndex`
(which every builder already tolerates) and that it signs through `WatchWallet` over one address.

**The one wire-format difference.** WalletConnect's BCH schema validates libauth's `stringify` encoding
strictly — `Uint8Array` as `"<Uint8Array: 0x…>"`, `bigint` as `"<bigint: …n>"`, and the transaction as a
decoded object. The builders emit plain hex and decimal strings (which WizardConnect's lenient parser
accepts) and a hex transaction, so `toWalletConnectParams()` in
`src/core/wallet/wallet-connect/session.ts` re-encodes the payload at the edge. It mirrors cashscript's
`generateWcTransactionObject` plus the reference connector's `JSON.parse(stringify(options))`. Sending
the builders' raw payload gets you `Error in validation wallet connect schema` from the wallet.

To remove the feature: delete `src/core/wallet/wallet-connect/`, `src/core/wallet/get-watch-wallet-class.ts`,
`src/composables/useWalletConnectWallet.ts`, `src/composables/useWalletSigner.ts` and
`src/components/WalletConnectButton.vue`; revert the pages to `manager.value!.signTransaction(...)`; then
`yarn remove @walletconnect/sign-client @walletconnect/modal`. Nothing in WizardConnect depends on any of it.
`@walletconnect/*` is imported lazily, so its chunks are only fetched when WalletConnect is actually used.

## Migration Goals

1. **Consolidate dependencies** - Move to consistent package usage
2. **Separate concerns** - Keep transaction logic independent of wallet selection
3. **Enable testing** - Remove env-based logic (`process.env.APP_ENV`)
4. **Update core dependencies** - Use latest core dependencies such as `mainnet-js`, `@bitauth/libauth`, and `cashscript` which have breaking changes and significant improvements

## Directory Structure

```
src/
├── apps/          # Legacy code (to be gradually migrated/deprecated)
│   ├── utils/    # Utility functions
│   ├── transactions/  # Transaction builders
│   ├── bcmr/    # BCMR-related logic
│   ├── ipfs/    # IPFS operations
│   └── modules/ # Already migrated modules (reference)
│
├── modules/      # NEW: Pure business logic (target destination)
│   ├── transactions/
│   ├── wallet/
│   ├── bcmr/
│   └── ipfs/
```

## Principles for Modules

### 1. UI-Agnostic
- **No Vue imports** - Modules should not depend on any UI framework
- **No browser globals** - Avoid `window`, `document`, `navigator` directly
- Use dependency injection for side effects (fetch, console, etc.)

### 2. Functional & Pure Where Possible
- Functions should be deterministic and predictable
- Prefer pure functions with explicit inputs/outputs
- Keep side effects at the edges (at the call site, not inside modules)

### 3. TypeScript First
- Always use TypeScript with proper typing
- Export type definitions alongside functions
- Avoid `any` type - use proper interfaces

### 4. Unit Testable
- No hardcoded environment variables - pass them as parameters
- Inject external dependencies (HTTP clients, wallets, etc.)
- Write tests for all module functions (recommended)

## Migration Workflow

### Step 1: Identify the Function
Find the function in `src/apps/` that needs to be migrated.

### Step 2: Create the Module
Create a new file in `src/modules/` following these patterns:

```typescript
// src/modules/wallet/address-utils.ts

export interface WalletOptions {
  network: 'mainnet' | 'testnet';
  provider?: string;
}

export const cashAddressToTokenAddress = (
  cashAddress: string,
  options?: WalletOptions
): string => {
  // Pure transformation logic here
  // No side effects
};
```

### Step 3: Extract Dependencies
- Remove Quasar, Vue, or browser-specific imports
- Pass dependencies as parameters or use interfaces

### Step 4: Add Tests
Create tests in `src/modules/__tests__/`:

```typescript
// src/modules/__tests__/address-utils.test.ts
import { cashAddressToTokenAddress } from '../wallet/address-utils';

describe('cashAddressToTokenAddress', () => {
  it('converts mainnet address correctly', () => {
    const result = cashAddressToTokenAddress('bitcoincash:...', { network: 'mainnet' });
    expect(result).toBe('bitcoincash:...');
  });
});
```

### Step 5: Update Imports
After migration, update imports in `apps/` to use the new module:

```typescript
// Before (in apps/)
import { cashAddressToTokenAddress } from '../utils/cashAddressToTokenAddress';

// After (in apps/)
import { cashAddressToTokenAddress } from '../../modules/wallet/address-utils';
```

### Step 6: Deprecate and Remove
- Mark old code with deprecation comments
- Remove old code once all usages are migrated

```typescript
/**
 * @deprecated Use modules/wallet/address-utils instead
 */
export const cashAddressToTokenAddress = (...) => { ... }
```

## Code Patterns

### Handling Wallet Selection

Historical note: the code that picked a wallet class from `process.env.APP_ENV` lived in
`src/apps/utils/wallet.ts`, which is now parked (`.git/exclude/archive/dead-files-2026-10-14/`). It is
kept here as the pattern to avoid:

```typescript
// src/apps/utils/wallet.ts - BAD pattern (env-based) — parked
export const getWalletClass = () => {
  let WalletClass = Wallet;
  if (
    process.env.APP_ENV === 'development' ||
    process.env.APP_ENV === 'development-build'
  ) {
    WalletClass = TestNetWallet;
  }
  return WalletClass;
};
```

New modules should accept wallet/config as parameters:

```typescript
// src/modules/wallet/types.ts
export type Network = 'mainnet' | 'testnet';

export interface WalletConfig {
  network: Network;
  provider?: string;
}

// src/modules/wallet/factory.ts
import { HDWallet, TestNetHDWallet } from 'mainnet-js';

export const getWalletClass = (config: WalletConfig) => {
  const network = import.meta.env.VITE_BCH_NETWORK;
  return network === 'chipnet' || network === 'testnet' ? TestNetHDWallet : HDWallet;
};
```

The v2/v3 adapter pattern this section used to show is no longer needed: with `mainnet-js` v2 removed,
`mainnet-js` (the v3 line) is the only package, so a single factory (above) is enough.

### Environment Variables: Use Vite/Quasar Default

**Avoid** using `process.env.APP_ENV` directly. Instead, use Vite's built-in env handling:

#### Quasar/Vite Env File Naming

```
.env                    # loaded in all cases
.env.local              # loaded in all cases, ignored by git
.env.dev               # loaded for dev only
.env.prod              # loaded for prod only
.env.[dev|prod]        # loaded for dev or prod
.env.local.[dev|prod]   # loaded for dev/prod, ignored by git
.env.ssr               # loaded for SSR mode
.env.local.ssr         # loaded for SSR, ignored by git
```

#### Exposing Env Variables

In `quasar.config.js`, use `build.env` or `build.envFilter`:

```javascript
// quasar.config.js
module.exports = configure(function (/* ctx */) {
  return {
    build: {
      // Option 1: Define directly
      env: {
        API_URL: JSON.stringify('https://api.example.com'),
      },

      // Option 2: Use envFilter for .env files (preferred)
      envFilter: (env) => ({
        // Only expose variables starting with APP_
        ...Object.fromEntries(
          Object.entries(env).filter(([key]) => key.startsWith('APP_'))
        ),
      }),
    },
  };
});
```

#### Accessing Env in Code

Use `import.meta.env` (Vite standard):

```typescript
// BAD
if (process.env.APP_ENV === 'development') { ... }

// GOOD - Use imported config
import type { Network } from './types';

// For runtime detection (use sparingly)
if (import.meta.env.DEV) { ... }
if (import.meta.env.PROD) { ... }
```

**Note**: Quasar automatically provides `process.env.DEV`, `process.env.PROD`, `process.env.NODE_ENV`, etc. Use these for build-time conditionals. For runtime config, pass values as function arguments.

#### Client vs Server Env Variables

- `VITE_*` prefixed variables are exposed to client code
- Non-prefixed variables in `build.env` are server-only
- Use `build.envFilter` to control what reaches the client

```bash
# .env.dev
VITE_APP_TITLE=My App (Dev)
SERVER_API_KEY=secret-key
```

```javascript
// In code - VITE_APP_TITLE exposed, SERVER_API_KEY not
console.log(import.meta.env.VITE_APP_TITLE); // "My App (Dev)"
console.log(import.meta.env.SERVER_API_KEY); // undefined
```

## Testing

Run tests with:
```bash
npm test
# or
yarn test
```

All new modules should have corresponding tests in `src/modules/__tests__/`.

## Linting

Run lint check:
```bash
npm run lint
# or
yarn lint
```

## File Naming

- Use kebab-case for file names: `wallet-factory.ts`
- Use camelCase for function names: `createWalletClass`
- Use PascalCase for type names: `WalletConfig`
- Use index.ts for barrel exports

## Migration Priority

1. **High**: Transaction builders (`transactions/`), wallet utilities
2. **Medium**: BCMR logic, IPFS utilities
3. **Low**: Utilities and helpers

## Notes

- This is a gradual migration - not a big bang rewrite
- Old code in `apps/` remains until fully migrated
- Focus on extracting pure logic first, then add testability