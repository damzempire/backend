import { Module } from '@nestjs/common';
import { PrometheusModule, makeGaugeProvider } from '@willsoto/nestjs-prometheus';
import { MetricsService } from './metrics.service';

@Module({
  imports: [
    PrometheusModule.register({
      path: '/metrics',
      defaultMetrics: {
        enabled: true,
      },
    }),
  ],
  providers: [
    MetricsService,
    makeGaugeProvider({
      name: 'active_database_connections',
      help: 'Number of active database connections',
      labelNames: ['type'],
    }),
    makeGaugeProvider({
      name: 'total_indexed_ledger_blocks',
      help: 'Total number of indexed ledger blocks',
    }),
  ],
})
export class MetricsModule {}
