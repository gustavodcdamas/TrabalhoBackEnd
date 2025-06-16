// test/csrf-test.ts
import axios from 'axios';

async function testCsrf() {
  try {
    console.log('🧪 Testando CSRF...');
    
    const response = await axios.get('http://localhost:3333/api/csrf-token', {
      withCredentials: true
    });
    
    console.log('✅ CSRF Token:', response.data);
    
    // Testar com o token
    const token = response.data.csrfToken;
    
    const testResponse = await axios.get('http://localhost:3333/api/institucional', {
      headers: {
        'X-CSRF-Token': token
      },
      withCredentials: true
    });
    
    console.log('✅ Teste com token:', testResponse.status);
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.response?.data || error.message);
  }
}

testCsrf();