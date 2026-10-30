FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl
COPY package*.json ./
COPY src/prisma ./src/prisma
RUN npm install
RUN npx prisma generate --schema=./src/prisma/schema.prisma

FROM base AS development
COPY . .
EXPOSE 5000
ENV PORT=5000
CMD ["sh", "-c", "npx prisma migrate deploy --schema=./src/prisma/schema.prisma && npm run start:dev"]

FROM base AS production
COPY . .
RUN npm run build
EXPOSE 5000
ENV PORT=5000
ENV NODE_ENV=production
CMD ["sh", "-c", "npx prisma migrate deploy --schema=./src/prisma/schema.prisma && node dist/src/main"]
