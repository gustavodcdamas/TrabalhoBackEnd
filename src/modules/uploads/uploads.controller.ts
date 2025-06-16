import { 
  Controller, 
  Post, 
  UploadedFile, 
  UseInterceptors, 
  UseGuards, 
  Get, 
  Param, 
  Res, 
  Delete,
  HttpException,
  HttpStatus
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadsService } from './uploads.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Response } from 'express';
import * as path from 'path';
import * as fs from 'fs';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';

@ApiTags('Uploads')
@Controller('api/uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Upload de arquivo',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  @UseGuards(JwtAuthGuard)
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new HttpException('Nenhum arquivo enviado', HttpStatus.BAD_REQUEST);
    }

    try {
      if (file.mimetype.startsWith('image/')) {
        const processedImage = await this.uploadsService.processUploadedImage(file);
        return {
          original: this.getPublicUrl(processedImage.original),
          thumbnail: this.getPublicUrl(processedImage.thumbnail),
          medium: this.getPublicUrl(processedImage.medium),
        };
      }
      // adicionar outros tipos de midia depois
      
      throw new HttpException('Tipo de arquivo não suportado', HttpStatus.BAD_REQUEST);
    } catch (error) {
      throw new HttpException(
        `Erro ao processar upload: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get(':filename')
  async serveFile(@Param('filename') filename: string, @Res() res: Response) {
    try {
      const filePath = path.join(process.cwd(), 'uploads', filename);
      
      if (!fs.existsSync(filePath)) {
        throw new HttpException('Arquivo não encontrado', HttpStatus.NOT_FOUND);
      }

      return res.sendFile(filePath);
    } catch (error) {
      throw new HttpException(
        `Erro ao recuperar arquivo: ${error.message}`,
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Delete(':filename')
  @UseGuards(JwtAuthGuard)
  async deleteFile(@Param('filename') filename: string) {
    try {
      const filePath = path.join(process.cwd(), 'uploads', filename);
      await this.uploadsService.deleteFile(filePath);
      return { message: 'Arquivo deletado com sucesso' };
    } catch (error) {
      throw new HttpException(
        `Erro ao deletar arquivo: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  private getPublicUrl(filePath: string): string {
    const filename = path.basename(filePath);
    return `/api/uploads/${filename}`;
  }
}