FROM node:20-alpine AS base
WORKDIR /usr/src/app
RUN apk add --no-cache libc6-compat

FROM base AS development
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
ENV NODE_ENV=development
CMD ["npm", "run", "dev"]

FROM base AS build
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
RUN npm prune --production

FROM node:20-alpine AS production
WORKDIR /usr/src/app
USER node
COPY --chown=node:node --from=build /usr/src/app/node_modules ./node_modules
COPY --chown=node:node --from=build /usr/src/app/.next ./.next
COPY --chown=node:node --from=build /usr/src/app/public ./public
COPY --chown=node:node --from=build /usr/src/app/package*.json ./
EXPOSE 3000
ENV NODE_ENV=production
CMD ["npm", "run", "start"]