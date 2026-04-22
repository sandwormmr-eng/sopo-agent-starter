FROM node:22-alpine

WORKDIR /app
COPY package.json tsconfig.json ./
RUN npm install --omit=dev && npm install --save-dev typescript @types/node
COPY strategy.ts ./
COPY src ./src
COPY tests ./tests
RUN npx tsc

CMD ["node", "dist/runner.js"]
