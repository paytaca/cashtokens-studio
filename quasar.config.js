/* eslint-env node */

/*
 * This file runs in a Node context (it's NOT transpiled by Babel), so use only
 * the ES6 features that are supported by your Node version. https://node.green/
 */

// Configuration for your app
// https://v2.quasar.dev/quasar-cli-vite/quasar-config-js

const { NodeGlobalsPolyfillPlugin } = require('@esbuild-plugins/node-globals-polyfill')
const { configure } = require('quasar/wrappers');
const path = require('path');
const EMPTY_PATH = require.resolve(
  'rollup-plugin-node-polyfills/polyfills/empty.js',
)

if (process.env.NODE_ENV==='development' || process.env.NODE_ENV==='development-build') {
  require('dotenv').config({path: '.env.dev'})
}

if (process.env.NODE_ENV==='production') {
  require('dotenv').config({path: '.env.prod'})
}

module.exports = configure(function (/* ctx */) {
  return {
    eslint: {
      // fix: true,
      // include: [],
      // exclude: [],
      // rawOptions: {},
      warnings: true,
      errors: true
    },

    // https://v2.quasar.dev/quasar-cli-vite/prefetch-feature
    // preFetch: true,

    // app boot file (/src/boot)
    // --> boot files are part of "main.js"
    // https://v2.quasar.dev/quasar-cli-vite/boot-files
    boot: [
      'i18n',
      'axios',
      'buffer'
    ],

    // https://v2.quasar.dev/quasar-cli-vite/quasar-config-js#css
    css: [
      'app.scss'
    ],

    // https://github.com/quasarframework/quasar/tree/dev/extras
    extras: [
      // 'ionicons-v4',
      // 'mdi-v5',
      // 'fontawesome-v6',
      // 'eva-icons',
      // 'themify',
      // 'line-awesome',
      // 'roboto-font-latin-ext', // this or either 'roboto-font', NEVER both!

      'roboto-font', // optional, you are not bound to it
      'material-icons', // optional, you are not bound to it
    ],

    // Full list of options: https://v2.quasar.dev/quasar-cli-vite/quasar-config-js#build
    build: {
      target: {
        // browser: [ 'es2019', 'edge88', 'firefox78', 'chrome87', 'safari13.1' ],
        browser: [ 'esnext' ],
        node: 'node16'
      },
      extendWebpack (cfg, { isServer, isClient }) {
        cfg.resolve.alias = {
          ...cfg.resolve.alias, // This adds the existing alias

          // Add your own alias like this
          res: path.resolve(__dirname, './src/res'),
          utils: path.resolve(__dirname, './src/utils') 
        }
      },

      vueRouterMode: 'hash', // available values: 'hash', 'history'
      // vueRouterBase,
      // vueDevtools,
      // vueOptionsAPI: false,

      // rebuildCache: true, // rebuilds Vite/linter/etc cache on startup

      // publicPath: '/',
      // analyze: true,
      env: {
        APP_ENV: process.env.APP_ENV
      },
      // rawDefine: {}
      // ignorePublicFolder: true,
      // minify: false,
      // polyfillModulePreload: true,
      // distDir

      extendViteConf (viteConf) {
        const inject = require('@rollup/plugin-inject')
        viteConf.build = {
          target: 'esnext',
          rollupOptions: {
            plugins: [inject({ Buffer: ['buffer', 'Buffer'] })]
          }
        }
        // viteConf.resolve.alias = stdLibBrowser
        viteConf.optimizeDeps = {
          // ...viteConf.optimizeDeps,
          esbuildOptions: {
            define: {global: 'globalThis'},
            target: 'esnext',
            plugins: [
              NodeGlobalsPolyfillPlugin({
                  process: true,
                  buffer: true,
              }),
            ]
          },
          include: ['buffer', 'process']

        }
        
        viteConf.resolve.alias.pg = EMPTY_PATH
        viteConf.resolve.alias['pg-format'] = EMPTY_PATH
        viteConf.resolve.alias['pg-native'] = EMPTY_PATH
        viteConf.resolve.alias.stream = require.resolve('stream-browserify')
        viteConf.resolve.alias.crypto = require.resolve('crypto-browserify')
        viteConf.resolve.alias.bufferutil = EMPTY_PATH
        viteConf.resolve.alias.child_process = EMPTY_PATH
        viteConf.resolve.alias.utils = path.resolve('./src/utils')
      },
      // viteVuePluginOptions: {},

      vitePlugins: [
        ['@intlify/vite-plugin-vue-i18n', {
          // if you want to use Vue I18n Legacy API, you need to set `compositionOnly: false`
          // compositionOnly: false,

          // if you want to use named tokens in your Vue I18n messages, such as 'Hello {name}',
          // you need to set `runtimeOnly: false`
          // runtimeOnly: false,

          // you need to set i18n resource including paths !
          include: path.resolve(__dirname, './src/i18n/**')
        }]
      ]
    },

    // Full list of options: https://v2.quasar.dev/quasar-cli-vite/quasar-config-js#devServer
    devServer: {
      // https: true
      open: true // opens browser window automatically
    },

    // https://v2.quasar.dev/quasar-cli-vite/quasar-config-js#framework
    framework: {
      config: {
        dark: 'auto'
      },

      // iconSet: 'material-icons', // Quasar icon set
      // lang: 'en-US', // Quasar language pack

      // For special cases outside of where the auto-import strategy can have an impact
      // (like functional components as one of the examples),
      // you can manually specify Quasar components/directives to be available everywhere:
      //
      // components: [],
      // directives: [],

      // Quasar plugins
      plugins: []
    },

    // animations: 'all', // --- includes all animations
    // https://v2.quasar.dev/options/animations
    animations: [],

    // https://v2.quasar.dev/quasar-cli-vite/quasar-config-js#sourcefiles
    // sourceFiles: {
    //   rootComponent: 'src/App.vue',
    //   router: 'src/router/index',
    //   store: 'src/store/index',
    //   registerServiceWorker: 'src-pwa/register-service-worker',
    //   serviceWorker: 'src-pwa/custom-service-worker',
    //   pwaManifestFile: 'src-pwa/manifest.json',
    //   electronMain: 'src-electron/electron-main',
    //   electronPreload: 'src-electron/electron-preload'
    // },

    // https://v2.quasar.dev/quasar-cli-vite/developing-ssr/configuring-ssr
    ssr: {
      ssrPwaHtmlFilename: 'offline.html', // do NOT use index.html as name!
                                          // will mess up SSR

      extendSSRWebserverConf (esbuildConf) {},
      extendPackageJson (json) {},

      pwa: false,
      /**
       * Manually serialize the store state and provide it yourself
       * as window.__INITIAL_STATE__ to the client-side (through a <script> tag)
       * (Requires @quasar/app-vite v1.0.0-beta.14+)
       */
      manualStoreSerialization: false,

      /**
       * Manually inject the store state into ssrContext.state
       * (Requires @quasar/app-vite v1.0.0-beta.14+)
       */
      manualStoreSsrContextInjection: false,

      /**
       * Manually handle the store hydration instead of letting Quasar CLI do it.
       * For Pinia: store.state.value = window.__INITIAL_STATE__
       * For Vuex: store.replaceState(window.__INITIAL_STATE__)
       */
      manualStoreHydration: false,

      /**
       * Manually call $q.onSSRHydrated() instead of letting Quasar CLI do it.
       * This announces that client-side code should takeover.
       */
      manualPostHydrationTrigger: false,

      // manualStoreHydration: true,
      // manualPostHydrationTrigger: true,

      prodPort: 3000, // The default port that the production server should use
                      // (gets superseded if process.env.PORT is specified at runtime)

      middlewares: [
        'render' // keep this as last one
      ]
    },

    // https://v2.quasar.dev/quasar-cli-vite/developing-pwa/configuring-pwa
    pwa: {
      workboxMode: 'generateSW', // or 'injectManifest'
      injectPwaMetaTags: true,
      swFilename: 'sw.js',
      manifestFilename: 'manifest.json',
      useCredentialsForManifestTag: false,
      // useFilenameHashes: true,
      // extendGenerateSWOptions (cfg) {}
      // extendInjectManifestOptions (cfg) {},
      // extendManifestJson (json) {}
      // extendPWACustomSWConf (esbuildConf) {}
    },

    // Full list of options: https://v2.quasar.dev/quasar-cli-vite/developing-cordova-apps/configuring-cordova
    cordova: {
      // noIosLegacyBuildFlag: true, // uncomment only if you know what you are doing
    },

    // Full list of options: https://v2.quasar.dev/quasar-cli-vite/developing-capacitor-apps/configuring-capacitor
    capacitor: {
      hideSplashscreen: true
    },

    // Full list of options: https://v2.quasar.dev/quasar-cli-vite/developing-electron-apps/configuring-electron
    electron: {
      // extendElectronMainConf (esbuildConf)
      // extendElectronPreloadConf (esbuildConf)

      inspectPort: 5858,

      bundler: 'packager', // 'packager' or 'builder'

      packager: {
        // https://github.com/electron-userland/electron-packager/blob/master/docs/api.md#options

        // OS X / Mac App Store
        // appBundleId: '',
        // appCategoryType: '',
        // osxSign: '',
        // protocol: 'myapp://path',

        // Windows only
        // win32metadata: { ... }
      },

      builder: {
        // https://www.electron.build/configuration/configuration

        appId: 'cashtokens-studio'
      }
    },

    // Full list of options: https://v2.quasar.dev/quasar-cli-vite/developing-browser-extensions/configuring-bex
    bex: {
      contentScripts: [
        'my-content-script'
      ],

      // extendBexScriptsConf (esbuildConf) {}
      // extendBexManifestJson (json) {}
    }
  }
});
