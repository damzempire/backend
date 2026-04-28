import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PdfProcessor } from './pdf.processor';
import { ExportProcessor } from './export.processor';

@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
    }),
    BullModule.registerQueue(
      { name: 'pdf-generation' },
      { name: 'csv-export' },
    ),
  ],
  providers: [PdfProcessor, ExportProcessor],
  exports: [BullModule],
})
export class WorkersModule {}
