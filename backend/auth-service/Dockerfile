FROM node:20-alpine

RUN apk add --no-cache openssl libc6-compat
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npx prisma generate
RUN npm run build

EXPOSE 3001

CMD ["sh", "-c", "npx prisma db push --schema=./prisma/schema.prisma && node dist/server.js"]
