// debug.controller.ts - VERSÃO CORRIGIDA

import { Controller, Post, Body, Req, Get } from '@nestjs/common';

@Controller('debug')
export class DebugController {
  
  // ✅ ROTA GET para evitar CSRF
  @Get('test-password')
  testPasswordGet(@Req() req: any) {
    console.log('🔍 [DEBUG GET] Query params:', req.query);
    
    const password = req.query.password || 'Barata45!'; // Senha padrão para teste
    
    console.log('🔍 [DEBUG GET] ==================== TESTE SENHA ====================');
    console.log('🔍 [DEBUG GET] Senha de teste:', `"${password}"`);
    console.log('🔍 [DEBUG GET] Length:', password.length);
    
    // Análise caractere por caractere
    console.log('🔍 [DEBUG GET] Análise de cada caractere:');
    for (let i = 0; i < password.length; i++) {
      const char = password.charAt(i);
      console.log(`  ${i}: "${char}" (code: ${char.charCodeAt(0)})`);
    }
    
    console.log('🔍 [DEBUG GET] ==================== FIM TESTE SENHA ====================');
    
    return { 
      password: `"${password}"`,
      length: password.length,
      message: 'Debug GET realizado com sucesso'
    };
  }
  
  // ✅ SIMULAR RESET PASSWORD VIA GET
  @Get('simulate-reset')
  simulateReset(@Req() req: any) {
    const token = req.query.token || 'test-token';
    const newPassword = req.query.newPassword || 'Barata45!';
    
    console.log('🔍 [SIMULATE RESET] ==================== INÍCIO ====================');
    console.log('🔍 [SIMULATE RESET] Token:', token);
    console.log('🔍 [SIMULATE RESET] newPassword recebido:', `"${newPassword}"`);
    console.log('🔍 [SIMULATE RESET] Length:', newPassword.length);
    
    // Simular o que acontece no AuthService.resetPassword
    console.log('🔍 [SIMULATE RESET] Enviando para AuthService...');
    console.log('🔍 [SIMULATE RESET] Senha que seria enviada:', `"${newPassword}"`);
    
    // Simular o que acontece no UsersService.update
    const updateData = {
      password: newPassword,
      resetPasswordTokenHash: null,
      resetPasswordExpires: null
    };
    
    console.log('🔍 [SIMULATE RESET] updateData:', JSON.stringify(updateData, null, 2));
    console.log('🔍 [SIMULATE RESET] updateData.password:', `"${updateData.password}"`);
    
    console.log('🔍 [SIMULATE RESET] ==================== FIM ====================');
    
    return {
      message: 'Simulação de reset realizada',
      originalPassword: `"${newPassword}"`,
      updateDataPassword: `"${updateData.password}"`,
      areEqual: newPassword === updateData.password
    };
  }
  @Post('test-password-post')
  testPasswordPost(@Body() body: any, @Req() req: any) {
    console.log('🔍 [DEBUG POST] ==================== TESTE POST ====================');
    console.log('🔍 [DEBUG POST] Headers:', req.headers['content-type']);
    console.log('🔍 [DEBUG POST] Body completo:', JSON.stringify(body, null, 2));
    
    if (body.newPassword) {
      const password = String(body.newPassword);
      
      console.log('🔍 [DEBUG POST] newPassword encontrado!');
      console.log('🔍 [DEBUG POST] Valor:', `"${password}"`);
      console.log('🔍 [DEBUG POST] Length:', password.length);
      
      // Análise caractere por caractere
      console.log('🔍 [DEBUG POST] Análise de cada caractere:');
      for (let i = 0; i < password.length; i++) {
        const char = password.charAt(i);
        console.log(`  ${i}: "${char}" (code: ${char.charCodeAt(0)})`);
      }
      
      // Verificar símbolos específicos
      console.log('🔍 [DEBUG POST] Contém !:', password.includes('!'));
      console.log('🔍 [DEBUG POST] Contém @:', password.includes('@'));
      console.log('🔍 [DEBUG POST] Contém #:', password.includes('#'));
      
    } else {
      console.log('🔍 [DEBUG POST] newPassword NÃO encontrado!');
    }
    
    console.log('🔍 [DEBUG POST] ==================== FIM TESTE POST ====================');
    
    return { 
      received: body,
      message: 'Debug POST realizado com sucesso',
      passwordLength: body.newPassword?.length || 0
    };
  }
  testPassword(@Body() body: any, @Req() req: any) {
    console.log('🔍 [DEBUG CONTROLLER] ==================== TESTE SENHA ====================');
    console.log('🔍 [DEBUG CONTROLLER] Headers:', req.headers);
    console.log('🔍 [DEBUG CONTROLLER] Body completo:', JSON.stringify(body, null, 2));
    console.log('🔍 [DEBUG CONTROLLER] Body keys:', Object.keys(body));
    
    if (body.newPassword) {
      const password = String(body.newPassword); // Garantir que é string
      
      console.log('🔍 [DEBUG CONTROLLER] newPassword encontrado!');
      console.log('🔍 [DEBUG CONTROLLER] Valor:', `"${password}"`);
      console.log('🔍 [DEBUG CONTROLLER] Tipo:', typeof password);
      console.log('🔍 [DEBUG CONTROLLER] Length:', password.length);
      
      // Análise caractere por caractere
      console.log('🔍 [DEBUG CONTROLLER] Análise de cada caractere:');
      for (let i = 0; i < password.length; i++) {
        const char = password.charAt(i);
        console.log(`  ${i}: "${char}" (code: ${char.charCodeAt(0)})`);
      }
      
      // Testes específicos de símbolos
      console.log('🔍 [DEBUG CONTROLLER] Símbolos encontrados:');
      console.log('  Contém !:', password.includes('!'));
      console.log('  Contém @:', password.includes('@'));
      console.log('  Contém #:', password.includes('#'));
      console.log('  Contém $:', password.includes('$'));
      console.log('  Contém %:', password.includes('%'));
      console.log('  Contém ^:', password.includes('^'));
      console.log('  Contém &:', password.includes('&'));
      console.log('  Contém *:', password.includes('*'));
      console.log('  Contém (:', password.includes('('));
      console.log('  Contém ):', password.includes(')'));
      console.log('  Contém -:', password.includes('-'));
      console.log('  Contém +:', password.includes('+'));
      console.log('  Contém =:', password.includes('='));
      
      // Verificar se corresponde ao regex
      const passwordRegex = /^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$ %^&*-]).{8,}$/;
      console.log('🔍 [DEBUG CONTROLLER] Passa no regex:', passwordRegex.test(password));
      
    } else {
      console.log('🔍 [DEBUG CONTROLLER] newPassword NÃO encontrado!');
    }
    
    console.log('🔍 [DEBUG CONTROLLER] ==================== FIM TESTE SENHA ====================');
    
    return { 
      received: body,
      message: 'Debug realizado com sucesso',
      passwordLength: body.newPassword?.length || 0,
      passwordValue: body.newPassword ? `"${body.newPassword}"` : 'não fornecido'
    };
  }
}

// ✅ PARA TESTAR:
// POST http://localhost:3333/debug/test-password
// Body: {"newPassword": "Barata45!"}
//
// ✅ ADICIONAR NO app.module.ts:
// import { DebugController } from './path/to/debug.controller';
// 
// @Module({
//   controllers: [DebugController, ...outros controllers],
//   ...
// })