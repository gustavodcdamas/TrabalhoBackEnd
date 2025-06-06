import { Request } from 'express';

export interface CsrfRequest extends Request {
  csrfToken(): string;
}