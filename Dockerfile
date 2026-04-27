FROM node:22-alpine

WORKDIR /app
COPY package.json package-lock.json tsconfig.json ./
RUN npm ci
COPY strategy.ts ./
COPY src ./src
COPY tests ./tests
RUN npm run build

CMD ["node", "dist/src/runner.js"]
