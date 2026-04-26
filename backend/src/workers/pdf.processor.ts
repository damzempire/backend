import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
const pdfService = require('../services/pdfService');
import * as fs from 'fs';
import * as path from 'path';

@Processor('pdf-generation')
export class PdfProcessor extends WorkerHost {
  async process(job: Job<any, any, string>): Promise<any> {
    const { vaultData, outputPath } = job.data;
    console.log(`Processing PDF generation for vault ${vaultData.vault.address}`);
    
    try {
      const pdfBuffer = await pdfService.generateVestingAgreement(vaultData);
      
      if (outputPath) {
        fs.writeFileSync(outputPath, pdfBuffer);
        return { success: true, path: outputPath };
      }
      
      return { success: true, size: pdfBuffer.length };
    } catch (error) {
      console.error('PDF generation failed:', error);
      throw error;
    }
  }
}
