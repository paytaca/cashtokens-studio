import { defineAsyncComponent } from 'vue';
import { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [{ path: '', component: () => import('pages/IndexPage.vue') }],
  },
  {
    path: '/ft',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      { path: 'browse', component: defineAsyncComponent(() => import('../pages/ft/Browse.vue')) },
      { path: 'view', component: () => import('pages/ft/View.vue') },
      { path: 'new', component: () => import('pages/ft/New.vue') }
    ],
  },
  {
    path: '/token',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      { path: 'browse/:tokenType?', component: defineAsyncComponent(() => import('pages/token/Browse.vue')) },
      { path: 'view', component: () => import('pages/token/View.vue') },
      { path: 'create/:tokenType?', component: () => import('pages/token/Create.vue') }
    ],
  },
  {
    path: '/nft',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      { path: 'new', component: () => import('pages/nft/New.vue') },
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
