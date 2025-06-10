// test-redis.js (na raiz do projeto)
const Redis = require('ioredis');

async function testRedis() {
  console.log('🧪 Testando conexão Redis...');
  
  const client = new Redis({
    host: 'localhost',
    port: 6379,
    password: 'StrongPassword!',
    connectTimeout: 5000,
    lazyConnect: true
  });
  
  try {
    await client.connect();
    console.log('✅ Conectado ao Redis');
    
    const pingResult = await client.ping();
    console.log('🏓 Ping:', pingResult);
    
    await client.set('test-key', 'test-value');
    console.log('✅ Chave definida');
    
    const value = await client.get('test-key');
    console.log('📤 Valor recuperado:', value);
    
    await client.del('test-key');
    console.log('🗑️ Chave removida');
    
    client.disconnect();
    console.log('✅ Teste concluído com sucesso');
    
  } catch (error) {
    console.error('❌ Erro no teste:', error);
  }
}

testRedis();