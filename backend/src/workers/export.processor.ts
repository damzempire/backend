import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
const vaultExportService = require('../services/vaultExportService');
import * as fs from 'fs';

@Processor('csv-export')
export class ExportProcessor extends WorkerHost {
  async process(job: Job<any, any, string>): Promise<any> {
    const { vaultId, outputPath } = job.data;
    console.log(`Processing CSV export for vault ${vaultId}`);
    
    try {
      const vaultData = await vaultExportService.getVaultDataForExport(vaultId);
      const csvContent = vaultExportService.generateCSVHeaders() + vaultExportService.vaultToCSV(vaultData);
      
      if (outputPath) {
        fs.writeFileSync(outputPath, csvContent);
        return { success: true, path: outputPath };
      }
      
      return { success: true, length: csvContent.length };
    } catch (error) {
      console.error('CSV export failed:', error);
      throw error;
    }
  }
}
