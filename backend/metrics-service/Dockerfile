FROM node:20-alpine

RUN apk add --no-cache openssl libc6-compat
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npx prisma generate --schema=./prisma/schema.prisma
RUN npm run build

EXPOSE 3003

CMD ["node", "dist/server.js"]
