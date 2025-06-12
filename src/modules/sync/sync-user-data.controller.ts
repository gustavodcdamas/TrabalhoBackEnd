import { Controller, Get, Post, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../../enums/user-role.enum';
import { SyncUserDataService } from './sync-user-data.service';
import { RequestWithUser } from '../../common/interfaces/request-with-user.interface';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SyncReport, Inconsistency, FixedItem, DetailedReport } from '../../common/interfaces/sync.interfaces';
import { UserEntity } from '../users/entities/user.entity';

@Controller('api/admin/sync')
@ApiTags('admin-sync')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
@ApiBearerAuth()
export class SyncController {
  constructor(private readonly syncService: SyncUserDataService) {}

  @Get('check-inconsistencies')
  @ApiOperation({ summary: 'Verificar inconsistências de dados' })
  @ApiResponse({ status: 200, description: 'Relatório de inconsistências' })
  async checkInconsistencies(@Req() req: RequestWithUser): Promise<SyncReport> {
    console.log(`🔍 [SyncController] Verificação iniciada por: ${req.user.email}`);
    return this.syncService.findAndFixInconsistencies();
  }

  @Post('fix-duplicates')
  @ApiOperation({ summary: 'Corrigir usuários duplicados' })
  @ApiResponse({ status: 200, description: 'Relatório de correções aplicadas' })
  async fixDuplicates(@Req() req: RequestWithUser): Promise<SyncReport> {
    console.log(`🔧 [SyncController] Correção de duplicatas iniciada por: ${req.user.email}`);
    return this.syncService.fixDuplicatedUsers();
  }

  @Get('detailed-report')
  @ApiOperation({ summary: 'Relatório detalhado do sistema' })
  @ApiResponse({ status: 200, description: 'Relatório detalhado do sistema' })
  async getDetailedReport(@Req() req: RequestWithUser): Promise<DetailedReport> {
    console.log(`📊 [SyncController] Relatório solicitado por: ${req.user.email}`);
    return this.syncService.generateDetailedReport();
  }

  @Get('validate-current-token')
  @ApiOperation({ summary: 'Validar token do usuário atual' })
  @ApiResponse({ status: 200, description: 'Dados do usuário validado' })
  async validateCurrentToken(@Req() req: RequestWithUser): Promise<UserEntity | null> {
    console.log(`🔍 [SyncController] Validação de token para: ${req.user.email}`);
    return this.syncService.validateUserToken(req.user.id, req.user.email);
  }
}