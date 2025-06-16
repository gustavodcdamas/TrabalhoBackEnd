import { Controller, Get, Header, Req, Res, MiddlewareConsumer } from '@nestjs/common';
import { AppService } from './app.service';
import { Request, Response } from 'express';
import csurf from 'csurf';


@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('csrf-token')
  @Header('Cache-Control', 'none')
  getCsrfToken(@Req() req: Request, @Res() res: Response) {
    return res.json({ csrfToken: req.csrfToken() });
  }
}

@Controller()
export class CsrfTokenController {
  @Get('api/csrf-token')
  getCsrfToken(@Req() req: Request) {
    return { csrfToken: req.csrfToken() };
  }
}