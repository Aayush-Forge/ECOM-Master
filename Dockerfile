FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package*.json ./
RUN npm install

FROM base AS development
COPY . .
EXPOSE 3000
ENV PORT=3000
CMD ["npm", "run", "dev"]

FROM base AS build
COPY . .
ARG NEXT_PUBLIC_BACKEND_URL=http://localhost:5000
ARG NEXT_PUBLIC_DEV_MODE=true
ARG NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_TeDsxH8VAgL0ZA
ENV NEXT_PUBLIC_BACKEND_URL=$NEXT_PUBLIC_BACKEND_URL
ENV NEXT_PUBLIC_DEV_MODE=$NEXT_PUBLIC_DEV_MODE
ENV NEXT_PUBLIC_RAZORPAY_KEY_ID=$NEXT_PUBLIC_RAZORPAY_KEY_ID
RUN npm run build
RUN npm prune --production

FROM node:20-alpine AS production
WORKDIR /app
USER node
COPY --chown=node:node --from=build /app/node_modules ./node_modules
COPY --chown=node:node --from=build /app/.next ./.next
COPY --chown=node:node --from=build /app/public ./public
COPY --chown=node:node --from=build /app/package*.json ./
EXPOSE 3000
ENV PORT=3000
ENV NODE_ENV=production
CMD ["npm", "run", "start"]
