# Estágio de dependências
FROM node:18-alpine AS deps

RUN apk add --no-cache --virtual .build-deps \
    python3 \
    make \
    g++

WORKDIR /usr/src/app

# Copia arquivos de dependências
COPY package.json package-lock.json ./

# Instala dependências (todas para o build)
RUN npm ci --prefer-offline --no-audit --progress=false

# Estágio de build
FROM node:18-alpine AS build

WORKDIR /usr/src/app

# Copia node_modules do estágio anterior
COPY --from=deps /usr/src/app/node_modules ./node_modules

# Copia código fonte
COPY . .

# Build da aplicação
RUN npm run build && \
    npm prune --omit=dev && \
    npm cache clean --force

# Estágio de produção - imagem mínima
FROM node:18-alpine AS production

# Instala dumb-init e curl para healthcheck
RUN apk add --no-cache \
    dumb-init \
    curl && \
    rm -rf /var/cache/apk/*

WORKDIR /usr/src/app

# Cria usuário não-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001 -G nodejs

# Copia apenas o necessário do estágio de build
COPY --from=build --chown=nestjs:nodejs /usr/src/app/dist ./dist
COPY --from=build --chown=nestjs:nodejs /usr/src/app/node_modules ./node_modules
COPY --from=build --chown=nestjs:nodejs /usr/src/app/package.json ./

# Remove arquivos desnecessários
RUN find ./node_modules -name "*.md" -delete && \
    find ./node_modules -name "*.txt" -delete && \
    find ./node_modules -name "test" -type d -exec rm -rf {} + || true && \
    find ./node_modules -name "tests" -type d -exec rm -rf {} + || true && \
    find ./node_modules -name "*.map" -delete || true

# Muda para usuário não-root
USER nestjs

# Expõe porta
EXPOSE 3000

# Healthcheck otimizado
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Usa dumb-init para gerenciamento de processos
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]