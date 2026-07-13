import { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      { path: '', component: () => import('pages/IndexPage.vue') },
      { path: '/loading', component: () => import('pages/SplashScreen.vue') },
      {
        path: '/registry',
        component: () => import('layouts/RegistryLayout.vue'),
        children: [
          {
            name: 'view-identity-snapshot',
            path: 'identity-snapshot/view',
            component: () => import('pages/registry/ViewIdentitySnapshot.vue'),
          },
          {
            name: 'edit-identity-snapshot',
            path: 'identity-snapshot/edit',
            component: () => import('pages/registry/EditIdentitySnapshot.vue'),
          },
          {
            name: 'view-identity-snapshot-nfts',
            path: 'identity-snapshot/nfts/view',
            component: () => import('pages/registry/ViewNftCategory.vue'),
          },
          {
            name: 'edit-identity-snapshot-nfts',
            path: 'identity-snapshot/nfts/edit',
            component: () => import('pages/registry/EditNftCategory.vue'),
          },
          {
            name: 'add-nft',
            path: 'identity-snapshot/nfts/add',
            component: () => import('pages/registry/AddNft.vue'),
          },
          {
            name: 'view-nft',
            path: 'identity-snapshot/nfts/:type/view',
            component: () => import('pages/registry/ViewNft.vue'),
          },
          {
            name: 'edit-nft',
            path: 'identity-snapshot/nfts/:type/edit',
            component: () => import('pages/registry/EditNft.vue'),
          },
          {
            name: 'view-registry',
            path: 'view',
            component: () => import('pages/registry/ViewRegistry.vue'),
          },
          {
            name: 'view-authhead',
            path: 'authhead/view',
            component: () => import('pages/registry/ViewAuthhead.vue'),
          },
        ]
      }
    ],

  },
  // {
  //   path: '/issuer',
  //   component: () => import('layouts/MainLayout.vue'),
  //   children: [
  //     {
  //       name: 'create-authkey',
  //       path: 'tokens/create/authkey',
  //       component: () => import('pages/issuer/CreateAuthKey.vue'),
  //     },
  //     // {
  //     //   name: 'create-token',
  //     //   path: 'tokens/create',
  //     //   component: () => import('pages/issuer/TokenGenesis.vue'),
  //     // },
  //     {
  //       name: 'import-auth-utxo',
  //       path: 'tokens/import-auth-utxo',
  //       component: () => import('pages/issuer/ImportAuthUtxo.vue'),
  //     },
  //     {
  //       name: 'mint-nft',
  //       path: 'tokens/mint-nft',
  //       component: () => import('pages/issuer/MintNft.vue'),
  //     },
  //   ],
  // },
  // {
  //   path: '/issuer/manage',
  //   component: () => import('layouts/MainLayout.vue'),
  //   children: [
  //     {
  //       name: 'ft-reserves',
  //       path: 'ft-reserves',
  //       component: () => import('pages/issuer/manage/FtReserves.vue'),
  //     },
  //     {
  //       name: 'nft-reserves',
  //       path: 'nft-reserves',
  //       component: () => import('pages/issuer/manage/NftReserves.vue'),
  //     },
  //     {
  //       name: 'registries',
  //       path: 'registries',
  //       component: () => import('pages/issuer/manage/Registries.vue'),
  //     },
  //     {
  //       name: 'authkeys',
  //       path: 'authkeys',
  //       component: () => import('pages/issuer/manage/AuthKeys.vue'),
  //     },
  //     {
  //       name: 'authguards',
  //       path: 'authguards',
  //       component: () => import('pages/issuer/manage/AuthGuards.vue'),
  //     },
  //     {
  //       path: 'token/:identifier',
  //       component: () => import('pages/TokenMetadata.vue'),
  //     },
  //   ],
  // },
  // {
  //   path: '/account/balance',
  //   component: () => import('layouts/MainLayout.vue'),
  //   children: [
  //     {
  //       name: 'my-fts',
  //       path: 'fungibletokens',
  //       component: () => import('pages/account/balances/FungibleTokens.vue'),
  //     },
  //     {
  //       name: 'my-nfts',
  //       path: 'collectibles',
  //       component: () => import('pages/account/balances/NonFungibleTokens.vue'),
  //     },
  //   ],
  // },
  // {
  //   path: '/account',
  //   component: () => import('layouts/MainLayout.vue'),
  //   children: [
  //     {
  //       name: 'recent-transactions',
  //       path: 'recent-transactions',
  //       component: () => import('pages/account/TransactionLogs.vue'),
  //     },
  //   ],
  // },
  {
    path: '/issuer',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      {
        name: 'fungible-reserves',
        path: 'fungible-reserves',
        component: () => import('pages/issuer/manage/FungibleReservesPage.vue'),
      },
      {
        name: 'nft-collection-detail',
        path: 'nft-collections/:category',
        component: () => import('pages/NftCollectionPage.vue'),
      },
      {
        name: 'nft-collection-mint',
        path: 'nft-collections/:category/mint',
        component: () => import('pages/MintNftPage.vue'),
      },
      {
        name: 'nft-detail',
        path: 'nft-collections/:category/nft',
        component: () => import('pages/issuer/manage/NftPage.vue'),
      },
      
      {
        name: 'nft-collections',
        path: 'nft-collections',
        component: () => import('pages/issuer/manage/NftCollectionsPage.vue'),
      },
      
    ]
  },
  {
    path: '/authguard',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      {
        name: 'create-authkey',
        path: 'authkeys/create',
        component: () => import('pages/authguard/CreateAuthkeyPage.vue'),
      },
      {
        name: 'authkeys',
        path: 'authkeys',
        component: () => import('pages/authguard/AuthkeysPage.vue'),
      },
      {
        name: 'authguard-detail',
        path: ':authkeyCategory',
        component: () => import('pages/authguard/AuthguardPage.vue'),
      },
    ]
  },
  
  {
    path: '/token',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      {
        name: 'create-token',
        path: 'create',
        component: () => import('pages/token/CreateTokenPage.vue'),
      },
      {
        name: 'registry',
        path: 'registry',
        component: () => import('pages/token/RegistryPage.vue'),
      },
      {
        name: 'nfts',
        path: ':category/nfts',
        component: () => import('pages/NftCategoryPage.vue'),
      },
      {
        name: 'metadata-registry',
        path: 'metadata-registry',
        component: () => import('pages/MetadataRegistryPage.vue'),
      },
    ]
  },
  // {
  //   path: '/registry/:registryIdentity',
  //   component: () => import('layouts/MainLayout.vue'),
  //   children: [
  //     {
  //       name: 'view-identity-snapshot',
  //       path: '/identity-snapshot/view',
  //       component: () => import('pages/registry/ViewIdentitySnapshot.vue'),
  //     },
  //     {
  //       name: 'edit-identity-snapshot',
  //       path: '/identity-snapshot/edit',
  //       component: () => import('pages/registry/EditIdentitySnapshot.vue'),
  //     },
  //     {
  //       name: 'view-identity-snapshot-nfts',
  //       path: '/identity-snapshot/nfts/view',
  //       component: () => import('pages/registry/ViewNftCategory.vue'),
  //     },
  //     {
  //       name: 'edit-identity-snapshot-nfts',
  //       path: '/identity-snapshot/nfts/edit',
  //       component: () => import('pages/registry/EditNftCategory.vue'),
  //     },
  //     {
  //       name: 'view-nft',
  //       path: '/identity-snapshot/nfts/:type/view',
  //       component: () => import('pages/registry/ViewNft.vue'),
  //     },
  //     {
  //       name: 'edit-nft',
  //       path: '/identity-snapshot/nfts/:type/edit',
  //       component: () => import('pages/registry/EditNft.vue'),
  //     }
  //   ]
  // },
  {
    path: '/authhead',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      {
        name: 'authhead-mint-nft',
        path: ':category/mint',
        component: () => import('pages/MintNftPage.vue'),
      },
      {
        name: 'authhead-nft-collection', 
        path: ':category/nft-collection',
        component: () => import('pages/NftCollectionPage.vue'),
      }
    ]
  },
  {
    path: '/dashboard',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      {
        name: 'dashboard',
        path: '',
        component: () => import('pages/DashboardPage.vue'),
      },
    ]
  },
  {
    path: '/wizard-connect',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      {
        name: 'requests',
        path: 'requests',
        component: () => import('pages/wizard-connect/RequestsPage.vue'),
      },
    ]
  },
  // {
  //   path: '/authguard',
  //   component: () => import('layouts/MainLayout.vue'),
  //   children: [
  //     {
  //       name: 'create-authkey',
  //       path: 'authkey/create',
  //       component: () => import('pages/authguard/CreateAuthKeyPage.vue'),
  //     },
  //   ]
  // },
  // Always leave this as last one,
  // but you can also remove it
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue'),
  },
];

export default routes;
