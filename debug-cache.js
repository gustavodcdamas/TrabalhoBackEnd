// debug-cache.js
console.log('🔍 Testando imports do cache...');

try {
  const redisStore = require('cache-manager-redis-store');
  console.log('✅ cache-manager-redis-store importado:', typeof redisStore);
  console.log('📋 Propriedades:', Object.keys(redisStore));
} catch (e) {
  console.error('❌ Erro ao importar cache-manager-redis-store:', e.message);
}

try {
  const cacheManager = require('cache-manager');
  console.log('✅ cache-manager importado:', typeof cacheManager);
} catch (e) {
  console.error('❌ Erro ao importar cache-manager:', e.message);
}

try {
  const nestCacheManager = require('@nestjs/cache-manager');
  console.log('✅ @nestjs/cache-manager importado:', typeof nestCacheManager);
} catch (e) {
  console.error('❌ Erro ao importar @nestjs/cache-manager:', e.message);
}