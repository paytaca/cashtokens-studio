import { boot } from 'quasar/wrappers';

const constants = {
  AppEnv: {
    DEVELOPMENT: 'development',
    DEVELOPMENT_BUILD: 'development-build',
    PRODUCTION : 'production'
  }
}

export default boot(({ app }) => {
  app.config.globalProperties.constants = constants;
});

export { constants };
