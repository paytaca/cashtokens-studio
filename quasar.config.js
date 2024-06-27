/* eslint-env node */

/*
 * This file runs in a Node context (it's NOT transpiled by Babel), so use only
 * the ES6 features that are supported by your Node version. https://node.green/
 */

// Configuration for your app
// https://v2.quasar.dev/quasar-cli-webpack/quasar-config-js

/* eslint-disable @typescript-eslint/no-var-requires */

const { configure } = require('quasar/wrappers');

if (
  process.env.NODE_ENV == 'development' ||
  process.env.NODE_ENV == 'development-build'
) {
  require('dotenv').config({ path: './.env.dev' });
}
if (process.env.NODE_ENV == 'production') {
  require('dotenv').config({ path: './.env.prod' });
}

console.log('PROCESS ENV', process.env);

module.exports = configure(function (ctx) {
  console.log('Server IsServer', ctx.isServer);

  const envs = {
    APP_ENV: process.env.APP_ENV,
    BCMR_API:
      process.env.APP_ENV === 'development'
        ? 'https://bcmr-chipnet.paytaca.com/api/'
        : 'https://bcmr.paytaca.com/api/',
    WATCHTOWER_API:
      process.env.APP_ENV === 'development'
        ? 'https://chipnet.watchtower.cash/api/'
        : 'https://watchtower.cash/api/',
    CTS_API:
      process.env.APP_ENV === 'development'
        ? 'http://localhost:4000/api/'
        : 'https://',
    CTS_REGISTRY_API:
      process.env.APP_ENV === 'development'
        ? 'http://localhost:4000/api/'
        : 'https://',
    TX_EXPLORER_BASE_URL:
      process.env.APP_ENV === 'development'
        ? 'https://chipnet.imaginary.cash/'
        : 'https://explorer.bitcoinunlimited.info/',
    WALLET_CONNECT_PROJECT_ID: process.env.WALLET_CONNECT_PROJECT_ID,
    WALLET_CONNECT_VERIFIED_URL: process.env.URL || 'http://localhost:8000',
  };

  if (ctx.isServer) {
    envs.NFT_STORAGE_API_KEY_1 = process.env.NFT_STORAGE_API_KEY_1;
    envs.NFT_STORAGE_API_KEY_2 = process.env.NFT_STORAGE_API_KEY_2;
    envs.NFT_STORAGE_API_KEY_3 = process.env.NFT_STORAGE_API_KEY_3;
    envs.NFT_STORAGE_API_KEY_4 = process.env.NFT_STORAGE_API_KEY_4;
    envs.NFT_STORAGE_API_KEY_5 = process.env.NFT_STORAGE_API_KEY_5;
    envs.NFT_STORAGE_API_KEY_6 = process.env.NFT_STORAGE_API_KEY_6;
    envs.NFT_STORAGE_API_KEY_7 = process.env.NFT_STORAGE_API_KEY_7;
    envs.NFT_STORAGE_API_KEY_8 = process.env.NFT_STORAGE_API_KEY_8;
    envs.NFT_STORAGE_API_KEY_9 = process.env.NFT_STORAGE_API_KEY_9;
    envs.NFT_STORAGE_API_KEY_10 = process.env.NFT_STORAGE_API_KEY_10;
    envs.PINATA_JWT = process.env.PINATA_JWT;
    envs.CTS_API_KEY_CUSTOM_HEADER = process.env.CTS_API_KEY_CUSTOM_HEADER;
    envs.CTS_API_KEYS = process.env.CTS_API_KEYS;
  }

  return {
    // https://v2.quasar.dev/quasar-cli-webpack/supporting-ts
    supportTS: {
      tsCheckerConfig: {
        eslint: {
          enabled: true,
          files: './src/**/*.{ts,tsx,js,jsx,vue}',
        },
      },
    },

    // https://v2.quasar.dev/quasar-cli-webpack/prefetch-feature
    // preFetch: true,

    // app boot file (/src/boot)
    // --> boot files are part of "main.js"
    // https://v2.quasar.dev/quasar-cli-webpack/boot-files
    boot: ['eventbus.ts'],

    // https://v2.quasar.dev/quasar-cli-webpack/quasar-config-js#Property%3A-css
    css: ['app.scss'],

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

    // Full list of options: https://v2.quasar.dev/quasar-cli-webpack/quasar-config-js#Property%3A-build
    build: {
      vueRouterMode: 'hash', // available values: 'hash', 'history'
      transpile: true,

      // transpile: false,
      // publicPath: '/',

      // Add dependencies for transpiling with Babel (Array of string/regex)
      // (from node_modules, which are by default not transpiled).
      // Applies only if "transpile" is set to true.
      transpileDependencies: [
        '@bitauth/libauth',
        '@mainnet-cash/contract',
        'mainnet-js',
        'cashscript',
        '@cashscript/utils',
        'cashc',
        '@quasar/ssr-helpers',
        '@walletconnect/modal',
        '@walletconnect/sign-client',
      ],

      // rtl: true, // https://quasar.dev/options/rtl-support
      // preloadChunks: true,
      // showProgress: false,
      // gzip: true,
      // analyze: true,

      // Options below are automatically set depending on the env, set them if you want to override
      // extractCSS: false,

      // https://v2.quasar.dev/quasar-cli-webpack/handling-webpack
      // "chain" is a webpack-chain object https://github.com/neutrinojs/webpack-chain
      // chainWebpack (/* chain */) {}
      chainWebpack(chain, { isClient, isServer }) {
        chain.target.browser = ['es2022'];
        chain.target.node = 'node20';
        const nodePolyfillWebpackPlugin = require('node-polyfill-webpack-plugin');
        chain.plugin('node-polyfill').use(nodePolyfillWebpackPlugin);
        chain.resolve.alias.set('fs', require.resolve('browserfs'));
        if (isClient) {
          chain.externals = ['dns', 'dgram'];
        }
        // mainnet-js
        chain.resolve.alias.set('stream', require.resolve('stream-browserify')); // bip39
        chain.resolve.alias.set('crypto', require.resolve('crypto-browserify')); // bip39
        chain.resolve.alias.set('net', false); // electrum-cash tcp connections
        chain.resolve.alias.set('tls', false); // electrum-cash tcp connections
        chain.resolve.alias.set('fs', false); // qrcode-svg.save

        // @mainnet-cash/contract
        chain.resolve.alias.set('url', false); // cashscript/bitcoind-rpc
        chain.resolve.alias.set('https', false); // cashscript/bitcoind-rpc
        chain.resolve.alias.set('http', false); // cashscript/bitcoind-rpc
        chain.resolve.alias.set('dns', false); // cashscript/bitcoind-rpc

        // @mainnet-cash/smartbch
        chain.resolve.alias.set('require-from-string', false);
        chain.resolve.alias.set('module', false);
        chain.resolve.alias.set('path', false);
        chain.resolve.alias.set('child_process', false);

        // Added for Quasar v1 to v2 migration
        // chain
        //   .plugin('eslint-webpack-plugin')
        //   .use(ESLintPlugin, [{ extensions: ['js', 'vue'] }])
      },

      uglifyOptions: {
        compress: false,
        mangle: false,
      },
      env: envs,
    },

    // Full list of options: https://v2.quasar.dev/quasar-cli-webpack/quasar-config-js#Property%3A-devServer
    devServer: {
      server: {
        type: 'http',
      },
      port: 8080,
      open: true, // opens browser window automatically
    },

    // https://v2.quasar.dev/quasar-cli-webpack/quasar-config-js#Property%3A-framework
    framework: {
      config: {
        dark: true,
        notify: {},
        ripple: {
          early: true,
          stop: true,
        },
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
      plugins: ['Notify', 'Dialog', 'Loading'],
    },

    // animations: 'all', // --- includes all animations
    // https://quasar.dev/options/animations
    animations: [],

    // https://v2.quasar.dev/quasar-cli-webpack/developing-ssr/configuring-ssr
    ssr: {
      pwa: false,

      // manualStoreHydration: true,
      // manualPostHydrationTrigger: true,

      prodPort: process.env.PORT, // The default port that the production server should use
      // (gets superseded if process.env.PORT is specified at runtime)

      maxAge: 1000 * 60 * 60 * 24 * 30,
      // Tell browser when a file from the server should expire from cache (in ms)

      // chainWebpackWebserver (/* chain */) {},

      middlewares: [
        ctx.prod ? 'compression' : '',
        'api',
        'render', // keep this as last one
      ],
    },

    // https://v2.quasar.dev/quasar-cli-webpack/developing-pwa/configuring-pwa
    pwa: {
      workboxPluginMode: 'GenerateSW', // 'GenerateSW' or 'InjectManifest'
      workboxOptions: {}, // only for GenerateSW

      // for the custom service worker ONLY (/src-pwa/custom-service-worker.[js|ts])
      // if using workbox in InjectManifest mode
      // chainWebpackCustomSW (/* chain */) {},

      manifest: {
        name: 'Cashtoken Studio',
        short_name: 'Cashtoken Studio',
        description: '',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#ffffff',
        theme_color: '#027be3',
        icons: [
          {
            src: 'icons/icon-128x128.png',
            sizes: '128x128',
            type: 'image/png',
          },
          {
            src: 'icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icons/icon-256x256.png',
            sizes: '256x256',
            type: 'image/png',
          },
          {
            src: 'icons/icon-384x384.png',
            sizes: '384x384',
            type: 'image/png',
          },
          {
            src: 'icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
    },

    // Full list of options: https://v2.quasar.dev/quasar-cli-webpack/developing-cordova-apps/configuring-cordova
    cordova: {
      // noIosLegacyBuildFlag: true, // uncomment only if you know what you are doing
    },

    // Full list of options: https://v2.quasar.dev/quasar-cli-webpack/developing-capacitor-apps/configuring-capacitor
    capacitor: {
      hideSplashscreen: true,
    },

    // Full list of options: https://v2.quasar.dev/quasar-cli-webpack/developing-electron-apps/configuring-electron
    electron: {
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

        appId: 'cashtokenstudio',
      },

      // "chain" is a webpack-chain object https://github.com/neutrinojs/webpack-chain
      chainWebpackMain(/* chain */) {
        // do something with the Electron main process Webpack cfg
        // extendWebpackMain also available besides this chainWebpackMain
      },

      // "chain" is a webpack-chain object https://github.com/neutrinojs/webpack-chain
      chainWebpackPreload(/* chain */) {
        // do something with the Electron main process Webpack cfg
        // extendWebpackPreload also available besides this chainWebpackPreload
      },
    },
  };
});
