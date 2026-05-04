# Coding Guidelines: Modules Migration

## Overview

CashTokens Studio was originally written during a period when core dependencies (`mainnet-js`, `@bitauth/libauth`, `cashscript`) were **bleeding edge** - updated frequently with breaking changes and rapid development. This contributed to technical debt and the need for significant refactoring.

The codebase is undergoing a gradual migration from webpack to Vite. A key part of this migration is moving business logic from `src/apps/` to a new `src/modules/` folder. The goal is to create **UI-agnostic, functional, and unit testable** TypeScript modules.

The Quasar config was migrated from `quasar.config.cjs` (webpack) to `quasar.config.js` (Vite), removing significant webpack-specific configuration.

## Background: package.json Dependency Split

The codebase currently uses two versions of `mainnet-js`:

| Package | Version | Use Case |
|---------|---------|----------|
| `mainnet-js` | 2.3.0 | Legacy transaction builders |
| `mainnet-js-v3` | ^3.0.0 | HD wallet, WalletConnect v2 |

This split exists because:
1. To better support `@wizardconnect/core`
2. Transaction builders in `apps/` rely on the older `mainnet-js` API
3. The migration to `modules/` should consolidate to a single approach

**Note**: The new packages (`mainnet-js` v3, `@bitauth/libauth` v3, `cashscript` v0.8+) have breaking changes and significant improvements. Migration is an opportunity to adopt these.

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

### Handling the Dual Package Split

Current code in `apps/` checks `process.env.APP_ENV` to determine which wallet to use:

```typescript
// src/apps/utils/wallet.ts - BAD pattern (env-based)
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
import { Wallet, TestNetWallet } from 'mainnet-js';

export const createWalletClass = (config: WalletConfig) => {
  return config.network === 'testnet' ? TestNetWallet : Wallet;
};
```

Or support both packages via an adapter pattern:

```typescript
// src/modules/wallet/adapters.ts
import type { Wallet as WalletV2, TestNetWallet as TestNetWalletV2 } from 'mainnet-js';
import type { HDWallet, TestNetHDWallet } from 'mainnet-js-v3';

export type WalletVersion = 'v2' | 'v3';

export interface WalletAdapter {
  createWallet(seed: Uint8Array, network: Network): Promise<WalletV2 | HDWallet>;
}

export const getAdapter = (version: WalletVersion): WalletAdapter => {
  if (version === 'v3') {
    // Return mainnet-js-v3 adapter
  }
  // Return mainnet-js adapter
};
```

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