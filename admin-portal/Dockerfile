FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package*.json ./
RUN npm install

FROM base AS development
COPY . .
EXPOSE 3001
ENV PORT=3001
CMD ["npm", "run", "dev"]

FROM base AS build
COPY . .
ARG NEXT_PUBLIC_API_URL=http://localhost:5000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN npm run build
RUN npm prune --production

FROM node:20-alpine AS production
WORKDIR /app
USER node
COPY --chown=node:node --from=build /app/node_modules ./node_modules
COPY --chown=node:node --from=build /app/.next ./.next
COPY --chown=node:node --from=build /app/public ./public
COPY --chown=node:node --from=build /app/package*.json ./
EXPOSE 3001
ENV PORT=3001
ENV NODE_ENV=production
CMD ["npm", "run", "start"]
