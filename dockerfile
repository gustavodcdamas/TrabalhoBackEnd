FROM node:16-alpine AS build

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build

RUN npm prune --production

FROM node:16-alpine

ENV NODE_ENV production

WORKDIR /usr/src/app

COPY --from=build /usr/src/app/package*.json ./
COPY --from=build /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/dist ./dist

RUN mkdir -p uploads

EXPOSE 3535

# Start the application
CMD ["node", "dist/main"]