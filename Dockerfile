FROM nikolaik/python-nodejs:python3.11-nodejs18
RUN apt-get update
#For libpq
RUN apt-get install postgresql -y
WORKDIR /cashtoken-studio
COPY . .
RUN yarn --ignore-engines
RUN yarn add source-map && yarn global add pm2
ENV NODE_ENV=development
RUN yarn run build -m ssr
RUN cd dist/ssr && yarn --ignore-engines
WORKDIR /cashtoken-studio/dist/ssr
CMD ["pm2-runtime", "index.js", "-i", "max"]
