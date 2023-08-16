FROM nikolaik/python-nodejs:python3.11-nodejs20-alpine

RUN mkdir -p /usr/cashtoken-studio
WORKDIR /usr/cashtoken-studio
COPY . .

RUN yarn global add node-gyp
RUN yarn --ignore-engines

RUN rm -rf node_modules/@mainnet-cash/contract/node_modules/cashscript
RUN rm -rf node_modules/@mainnet-cash/contract/node_modules/@cashscript/utils
# RUN npx nuxi clean
# RUN yarn postinstall

RUN yarn run build

# ENV NUXT_HOST=0.0.0.0
# ENV NUXT_PORT=9000

EXPOSE 9000

ENV NODE_OPTIONS="--experimental-specifier-resolution=node index"

RUN cd dist/ssr

# ENTRYPOINT ["yarn", "start"]
ENTRYPOINT ["quasar", "dev -m ssr"]
