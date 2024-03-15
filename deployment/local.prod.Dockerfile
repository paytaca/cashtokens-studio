FROM nikolaik/python-nodejs:python3.11-nodejs18
#For libpq
RUN apt-get update && apt-get install postgresql -y
RUN mkdir -p /cts
WORKDIR /cts
COPY packag*.json .
COPY yarn.lock .
RUN yarn --ignore-engines
RUN yarn add source-map && yarn global add pm2
COPY . .
ENV NODE_ENV=production
RUN yarn run build -m ssr
COPY packag*.json /cts/dist/ssr 
COPY yarn.lock /cts/dist/ssr
WORKDIR /cts/dist/ssr
RUN yarn --ignore-engines
EXPOSE 3000
# ENV NODE_OPTIONS="--experimental-specifier-resolution=node index"
CMD ["pm2-runtime", "index.js", "-i", "max"]



