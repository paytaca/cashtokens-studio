FROM nikolaik/python-nodejs:python3.11-nodejs18
#For libpq
RUN apt-get update && apt-get install postgresql -y
RUN mkdir -p /cashtoken-studio
WORKDIR /cashtoken-studio
COPY . .
RUN yarn --ignore-engines
RUN yarn add source-map && yarn global add pm2
ENV NODE_ENV=production
ENV PORT=3000
RUN yarn run build -m ssr
RUN cd dist/ssr && yarn --ignore-engines
WORKDIR /cashtoken-studio/dist/ssr
EXPOSE 3000
# ENV NODE_OPTIONS="--experimental-specifier-resolution=node index"
CMD ["pm2-runtime", "index.js", "-i", "max"]



