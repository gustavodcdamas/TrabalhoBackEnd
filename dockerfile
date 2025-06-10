# Estágio de construção (builder)
FROM node:18-alpine AS builder

WORKDIR /usr/src/app

COPY package*.json ./
COPY prisma ./prisma

RUN npm ci

COPY . .

RUN npm run build

# Estágio de produção
FROM node:18-alpine

WORKDIR /usr/src/app

ENV NODE_ENV production

# Copie apenas os arquivos necessários do estágio de construção
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/package*.json ./
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/prisma ./prisma

# Instale apenas produção dependencies se necessário
RUN npm prune --production

# Se você usa Prisma, descomente a linha abaixo
# RUN npx prisma generate

EXPOSE 3000

CMD ["node", "dist/main.js"]