import { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [{ path: '', component: () => import('pages/IndexPage.vue') }],
  },
  {
    path: '/ft/browse',
    component: () => import('layouts/MainLayout.vue'),
    children: [{ path: '', component: () => import('pages/ft/Browse.vue') }],
  },
  {
    path: '/ft/view',
    component: () => import('layouts/MainLayout.vue'),
    children: [{ path: '', component: () => import('pages/ft/View.vue') }],
  },
  {
    path: '/ft/create',
    component: () => import('layouts/MainLayout.vue'),
    children: [{ path: '', component: () => import('pages/ft/Create.vue') }],
  },
  {
    path: '/ft/new',
    component: () => import('layouts/MainLayout.vue'),
    children: [{ path: '', component: () => import('pages/ft/New.vue') }],
  },
  {
    path: '/nft/create',
    component: () => import('layouts/MainLayout.vue'),
    children: [{ path: '', component: () => import('pages/nft/Create.vue') }],
  },
  // Always leave this as last one,
  // but you can also remove it
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue'),
  },
];

export default routes;
