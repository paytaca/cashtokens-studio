FROM nikolaik/python-nodejs:python3.11-nodejs18
# RUN apt-get update
# # For libpq
# RUN apt-get install postgresql -y
# Installing node_modules first so it can be cached
COPY ./dist/ssr/package.json /tmp/package.json
RUN cd /tmp && yarn --ignore-engines
RUN mkdir -p /usr/cashtoken-studio/dist/ssr && cp -r /tmp/node_modules /usr/cashtoken-studio/dist/ssr
WORKDIR /usr/cashtoken-studio/dist/ssr
COPY ./dist/ssr/ .
ENV NODE_OPTIONS="--experimental-specifier-resolution=node index"
RUN cd /usr/cashtoken-studio/dist/ssr
ENTRYPOINT ["node", "index.js"]



