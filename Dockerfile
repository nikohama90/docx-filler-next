FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

EXPOSE 3000
CMD ["sh", "-lc", "test -d node_modules || npm install && npm run dev -- -H 0.0.0.0 -p 3000"]