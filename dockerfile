# Estágio de dependências
FROM node:20-alpine AS deps

# Instala dependências do sistema necessárias para compilação
RUN apk add --no-cache --virtual .build-deps \
    python3 \
    make \
    g++ \
    && apk add --no-cache dumb-init

WORKDIR /usr/src/app

# Copia arquivos de dependências
COPY package*.json ./

# Instala dependências (incluindo devDependencies para o build)
RUN npm ci --only=production=false \
    --prefer-offline \
    --no-audit \
    --progress=false \
    --silent

# Remove dependências de build
RUN apk del .build-deps

# Estágio de build
FROM node:20-alpine AS build

WORKDIR /usr/src/app

# Copia node_modules do estágio anterior
COPY --from=deps /usr/src/app/node_modules ./node_modules

# Copia código fonte (usar .dockerignore para otimizar)
COPY . .

# Build da aplicação
RUN npm run build

# Limpa devDependencies após o build
RUN npm ci --only=production \
    --prefer-offline \
    --no-audit \
    --progress=false \
    --silent \
    && npm cache clean --force

# Estágio de produção
FROM node:20-alpine AS production

# Instala apenas o essencial
RUN apk add --no-cache \
    dumb-init \
    curl \
    && rm -rf /var/cache/apk/*

WORKDIR /usr/src/app

# Cria usuário não-root
RUN addgroup -g 1001 -S nodejs \
    && adduser -S nestjs -u 1001 -G nodejs

# Cria diretório uploads com permissões corretas
RUN mkdir -p /usr/src/app/uploads \
    && chown -R nestjs:nodejs /usr/src/app/uploads \
    && chmod 755 /usr/src/app/uploads

# Copia arquivos necessários do estágio de build
COPY --from=build --chown=nestjs:nodejs /usr/src/app/dist ./dist
COPY --from=build --chown=nestjs:nodejs /usr/src/app/node_modules ./node_modules
COPY --from=build --chown=nestjs:nodejs /usr/src/app/package.json ./

# Otimização adicional: remove arquivos desnecessários
RUN find ./node_modules -name "*.md" -delete 2>/dev/null || true \
    && find ./node_modules -name "*.txt" -delete 2>/dev/null || true \
    && find ./node_modules -name "test" -type d -exec rm -rf {} + 2>/dev/null || true \
    && find ./node_modules -name "tests" -type d -exec rm -rf {} + 2>/dev/null || true \
    && find ./node_modules -name "*.map" -delete 2>/dev/null || true \
    && find ./node_modules -name "*.ts" -delete 2>/dev/null || true

# Muda para usuário não-root
USER nestjs

# Expõe a porta
EXPOSE 3333

# Variáveis de ambiente (podem ser sobrescritas)
ENV NODE_ENV=production
ENV PORT=3333

# Volume para uploads
VOLUME ["/usr/src/app/uploads"]

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:$PORT/health || exit 1

# Comando de inicialização
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]