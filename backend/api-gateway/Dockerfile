FROM node:20.19.6-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

EXPOSE 8080

CMD ["node", "dist/server.js"]
