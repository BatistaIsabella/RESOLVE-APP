FROM node:20-alpine

RUN apk add --no-cache openssl libc6-compat
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npx prisma generate
RUN npm run build

EXPOSE 3002

CMD ["sh", "-c", "echo 'CREATE SCHEMA IF NOT EXISTS \"demand\";' | npx prisma db execute --schema=./prisma/schema.prisma --stdin && npx prisma migrate deploy --schema=./prisma/schema.prisma && node dist/server.js"]
