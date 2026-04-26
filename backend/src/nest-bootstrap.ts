import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ExpressAdapter } from '@nestjs/platform-express';
import * as express from 'express';

export async function bootstrapNest(expressApp: express.Express) {
  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(expressApp),
    { logger: ['error', 'warn', 'log'] }
  );
  
  // No need to call app.listen() if we're using the external httpServer
  // But we need to init the modules
  await app.init();
  
  console.log('NestJS modules initialized and attached to Express');
  return app;
}
