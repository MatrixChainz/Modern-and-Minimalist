import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

declare module 'express-serve-static-core' {
  interface Request {
    id?: string;
  }
}

export const correlationIdMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const correlationId = req.headers['x-correlation-id'] || crypto.randomUUID();
  req.id = correlationId as string;
  res.setHeader('X-Correlation-ID', correlationId);
  next();
};
