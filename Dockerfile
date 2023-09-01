FROM nikolaik/python-nodejs:python3.11-nodejs18
# RUN apt-get update
# # For libpq
# RUN apt-get install postgresql -y
# Installing node_modules first so it can be cached
# COPY ./dist/ssr/package.json /tmp/package.json
# RUN cd /tmp && yarn --ignore-engines
# RUN mkdir -p /usr/cashtoken-studio/dist/ssr && cp -r /tmp/node_modules /usr/cashtoken-studio/dist/ssr
RUN mkdir -p /app/ssr
COPY ./dist/ssr /app/ssr
WORKDIR /app/ssr
RUN echo $(ls -1 .)
RUN cd /app/ssr && yarn --ignore-engines
RUN cd /app/ssr && yarn add source-map && yarn global add pm2
# RUN npm install pm2 -g
# ENV NODE_OPTIONS="--experimental-specifier-resolution=node index"
# CMD ["node", "index.js"]
CMD ["pm2-runtime", "index.js", "-i", "max"]



