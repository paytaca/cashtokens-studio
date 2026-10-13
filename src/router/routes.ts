import { RouteRecordRaw } from 'vue-router';

const registryRoutesProps = (route: any) => ({
  authkey: route.query.authkey,
  authhead: route.query.authhead,
  authbase: route.query.authbase,
  registryIdentity: route.query.registryIdentity,
});

const registryNftsRoutesProps = (route: any) => ({
  authkey: route.query.authkey,
  authhead: route.query.authhead,
  authbase: route.query.authbase,
  registryIdentity: route.query.registryIdentity,
  targetNftsStatusFilter: route.query.nftsStatusFilter,
  timestamp: route.query.timestamp,
  contentHash: route.query.contentHash,
  category: route.query.category,
});

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      { path: '', component: () => import('pages/IndexPage.vue') },
      {
        path: '/registry',
        component: () => import('layouts/RegistryLayout.vue'),
        children: [
          {
            name: 'view-registry',
            path: 'view',
            component: () => import('pages/registry/ViewRegistry.vue'),
            props: registryNftsRoutesProps,
          },
          {
            name: 'edit-registry',
            path: 'edit',
            component: () => import('pages/registry/EditRegistry.vue'),
            props: registryRoutesProps,
          },
          {
            name: 'view-identity-snapshot',
            path: 'identity-snapshot/view',
            component: () => import('pages/registry/ViewIdentitySnapshot.vue'),
            props: registryRoutesProps,
          },
          {
            name: 'edit-identity-snapshot',
            path: 'identity-snapshot/edit',
            component: () => import('pages/registry/EditIdentitySnapshot.vue'),
            props: registryRoutesProps,
          },
          {
            name: 'view-identity-snapshot-nfts',
            path: 'identity-snapshot/nfts/view',
            component: () => import('pages/registry/ViewNftCategory.vue'),
            props: registryNftsRoutesProps,
          },
          {
            name: 'edit-identity-snapshot-nfts',
            path: 'identity-snapshot/nfts/edit',
            component: () => import('pages/registry/EditNftCategory.vue'),
            props: registryNftsRoutesProps,
          },
          {
            name: 'add-nft',
            path: 'identity-snapshot/nfts/add',
            component: () => import('pages/registry/AddNft.vue'),
            props: (route) => ({
              lastKnownType: route.query.lastKnownType,
              collectionType: route.query.collectionType,
              tokenSymbol: route.query.tokenSymbol,
            }),
          },
          {
            name: 'view-nft',
            path: 'identity-snapshot/nfts/:type/view',
            component: () => import('pages/registry/ViewNft.vue'),
            props: registryNftsRoutesProps,
          },
          {
            name: 'edit-nft',
            path: 'identity-snapshot/nfts/:type/edit',
            component: () => import('pages/registry/EditNft.vue'),
            props: registryNftsRoutesProps,
          },
          
          {
            name: 'view-authhead',
            path: 'authhead/view',
            component: () => import('pages/registry/ViewAuthhead.vue'),
            props: registryRoutesProps,
          },
        ],
      },
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
  //       name: 'authkeys',
  //       path: 'authkeys',
  //       component: () => import('pages/issuer/manage/AuthKeys.vue'),
  //     },
  //     {
  //       name: 'authguards',
  //       path: 'authguards',
  //       component: () => import('pages/issuer/manage/AuthGuards.vue'),
  //     },
  //   ],
  // },
  {
    path: '/issuer',
    component: () => import('layouts/MainLayout.vue'),
    children: [
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
    ],
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
        name: 'authguards',
        path: 'authguards',
        component: () => import('pages/AuthguardsPage.vue'),
      },
      {
        name: 'view-authguard',
        path: ':authkeyCategory',
        component: () => import('pages/authguard/AuthguardPage.vue'),
      },
    ],
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
        name: 'nfts',
        path: ':category/nfts',
        component: () => import('pages/NftCategoryPage.vue'),
      },
      {
        name: 'nft-detail',
        path: ':category/nft',
        component: () => import('pages/issuer/manage/NftPage.vue'),
      },
      {
        name: 'nft-collection-mint',
        path: ':category/mint',
        component: () => import('pages/MintNftPage.vue'),
      },
    ],
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
      },
    ],
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
      {
        name: 'managed-tokens',
        path: 'managed-tokens',
        component: () => import('pages/ManagedTokensPage.vue'),
      },
      {
        name: 'collected-tokens',
        path: 'collected-tokens',
        component: () => import('pages/CollectedTokensPage.vue'),
      },
      {
        name: 'activities',
        path: 'activities',
        component: () => import('pages/ActivitiesPage.vue'),
      },
    ],
  },
  {
    path: '/wizard-connect',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      {
        name: 'wizard-connect',
        path: '',
        component: () => import('pages/wizard-connect/ConnectPage.vue'),
      },
      {
        name: 'wizard-connect-requests',
        path: 'requests',
        component: () => import('pages/wizard-connect/RequestsPage.vue'),
      }
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
