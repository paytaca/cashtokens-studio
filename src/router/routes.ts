import { defineAsyncComponent } from 'vue';
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
      { name: 'create', path: 'create/:tokenType', component: () => import('pages/issuer/CreateToken.vue') },
    ],
  },
  {
    path: '/issuer/manage',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      { name: 'authchains', path: 'authchains', component: () => import('pages/issuer/manage/AuthChains.vue') },
      { name: 'authkeys', path: 'authkeys', component: () => import('pages/issuer/manage/AuthKeys.vue') },
      { name: 'ft-reserves', path: 'ft-reserves', component: () => import('pages/issuer/manage/FtReserves.vue') },
      { name: 'nft-reserves', path: 'nft-reserves', component: () => import('pages/issuer/manage/NftReserves.vue') }
    ],
  },
  {
    path: '/account/balance',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      { path: 'fungibletokens', component: () => import('pages/account/balance/FungibleTokens.vue') },
      { path: 'collectibles', component: () => import('pages/account/balance/Collectibles.vue')},
    ],
  },
  // Always leave this as last one,
  // but you can also remove it
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue'),
  }

];

export default routes;
