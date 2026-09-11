FROM node:20-slim AS build
WORKDIR /app
COPY package.json ./
COPY client/package.json client/package.json
RUN npm install --omit=dev && npm --prefix client install
COPY . .
RUN npm --prefix client run build

FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/server ./server
COPY --from=build /app/client/dist ./client/dist
COPY --from=build /app/client/public ./client/public

EXPOSE 3001
CMD ["node", "server/index.js"]
