FROM node:22.11-bookworm-slim

RUN apt-get update && apt-get install -y bash vim git

RUN mkdir -p /home/node/app/node_modules
COPY --chown=node:node . /home/node/app

RUN chown -R node:node /home/node
USER node
WORKDIR /home/node/app
