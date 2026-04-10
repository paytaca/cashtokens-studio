# CashTokens Studio

A web application for creating and managing Bitcoin Cash CashTokens (FTs and NFTs).

## Features

- Create and manage Fungible Tokens (FTs)
- Create and manage NFT collections
- AuthChain identity management
- BCMR (Bitcoin Cash Metadata Registry) support
- WalletConnect integration
- IPFS metadata storage (NFT.storage, Pinata)

## Prerequisites

- Node.js >= 12.22.1
- npm >= 6.13.4 or yarn >= 1.21.1

## Installation

```bash
yarn
# or
npm install
```

## Environment Setup

1. Copy the example environment file:

```bash
cp .env.example .env.dev
```

2. Configure your environment variables in `.env.dev`:
   - `WALLET_CONNECT_PROJECT_ID` - Get from [WalletConnect Cloud](https://cloud.walletconnect.com/)
   - `PINATA_API_KEY` and `PINATA_API_SECRET` - Get from [Pinata](https://app.pinata.cloud/keys)
   - `NFT_STORAGE_API_KEY_*` - Get from [NFT.storage](https://nft.storage/manage-api-keys)

## Development

```bash
quasar dev
```

## Development with Production Environment

To run locally with production environment variables:

```bash
yarn run prodlocal
```

## Production Build

```bash
quasar build
```

## Linting

```bash
yarn lint
```

## Formatting

```bash
yarn format
```

## License

See [LICENSE](LICENSE) file for details.

## Contact

For questions or commercial licensing inquiries, contact info@paytaca.com
