import { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [{ path: '', component: () => import('pages/IndexPage.vue') }],
  },
  {
    path: '/issuer',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      {
        name: 'create-authkey',
        path: 'tokens/create/authkey',
        component: () => import('pages/issuer/CreateAuthKey.vue'),
      },
      {
        name: 'create-token',
        path: 'tokens/create',
        component: () => import('pages/issuer/TokenGenesis.vue'),
      },
      {
        name: 'create-nft-collection',
        path: 'tokens/create/nft-collection',
        component: () => import('pages/issuer/CreateNftCollection.vue'),
      },
      {
        name: 'import-auth-utxo',
        path: 'tokens/import-auth-utxo',
        component: () => import('pages/issuer/ImportAuthUtxo.vue'),
      },
      {
        name: 'mint-nft',
        path: 'tokens/mint-nft',
        component: () => import('pages/issuer/MintNft.vue'),
      },
    ],
  },
  {
    path: '/issuer/manage',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      {
        name: 'ft-reserves',
        path: 'ft-reserves',
        component: () => import('pages/issuer/manage/FtReserves.vue'),
      },
      {
        name: 'nft-reserves',
        path: 'nft-reserves',
        component: () => import('pages/issuer/manage/NftReserves.vue'),
      },
      {
        name: 'nft-collection',
        path: 'nft-collection',
        component: () => import('pages/issuer/manage/NftCollection.vue'),
      },
      {
        name: 'registries',
        path: 'registries',
        component: () => import('pages/issuer/manage/Registries.vue'),
      },
      {
        name: 'authkeys',
        path: 'authkeys',
        component: () => import('pages/issuer/manage/AuthKeys.vue'),
      },
      {
        name: 'authguards',
        path: 'authguards',
        component: () => import('pages/issuer/manage/AuthGuards.vue'),
      },
      {
        path: 'token/:identifier',
        component: () => import('pages/TokenMetadata.vue'),
      },
    ],
  },
  {
    path: '/account/balance',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      {
        name: 'my-fts',
        path: 'fungibletokens',
        component: () => import('pages/account/balances/FungibleTokens.vue'),
      },
      {
        name: 'my-nfts',
        path: 'collectibles',
        component: () => import('pages/account/balances/NonFungibleTokens.vue'),
      },
    ],
  },
  {
    path: '/account',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      {
        name: 'recent-transactions',
        path: 'recent-transactions',
        component: () => import('pages/account/TransactionLogs.vue'),
      },
    ],
  },
  // Always leave this as last one,
  // but you can also remove it
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue'),
  },
];

export default routes;
