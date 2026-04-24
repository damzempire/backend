import { Injectable, NestMiddleware } from '@nestjs/common';
import { ThrottlerService } from '@nestjs/throttler';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class ThrottlerMiddleware implements NestMiddleware {
  constructor(private readonly throttlerService: ThrottlerService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const ip = req.ip || req.get('x-forwarded-for') || req.socket.remoteAddress;
    
    // Determine which throttler to use based on path
    const isAuth = req.path.includes('/auth/');
    const throttlerName = isAuth ? 'auth' : 'global';
    
    try {
      const { success } = await this.throttlerService.throttle(throttlerName, 1, ip || 'unknown');
      if (!success) {
        return res.status(429).json({
          success: false,
          error: 'Too many requests. Please try again later.',
        });
      }
      next();
    } catch (error) {
      console.error('Throttler error:', error);
      next(); // Fallback to allowing request if throttler fails
    }
  }
}
