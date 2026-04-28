const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-otlp-grpc');
const { JaegerExporter } = require('@opentelemetry/exporter-jaeger');
const { Resource } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');

// Initialize OpenTelemetry tracing
function initializeTracing() {
  const isProduction = process.env.NODE_ENV === 'production';
  serviceName = process.env.OTEL_SERVICE_NAME || 'vesting-vault-backend';
  
  // Choose exporter based on environment
  let traceExporter;
  if (process.env.JAEGER_ENDPOINT) {
    traceExporter = new JaegerExporter({
      endpoint: process.env.JAEGER_ENDPOINT,
    });
  } else if (process.env.OTEL_EXPORTER_OTLP_ENDPOINT) {
    traceExporter = new OTLPTraceExporter({
      url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
    });
  } else {
    // Default to console exporter for development
    traceExporter = new OTLPTraceExporter({
      url: 'http://localhost:4317',
    });
  }

  const sdk = new NodeSDK({
    resource: new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
      [SemanticResourceAttributes.SERVICE_VERSION]: process.env.npm_package_version || '1.0.0',
      [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
    }),
    traceExporter,
    instrumentations: [getNodeAutoInstrumentations({
      // Disable some instrumentations if not needed
      '@opentelemetry/instrumentation-fs': {
        enabled: false,
      },
    })],
    // Sampling configuration
    sampler: {
      type: 'traceidratio',
      ratio: isProduction ? 0.1 : 1.0, // 10% sampling in production, 100% in development
    },
  });

  // Initialize the SDK
  sdk.start();

  console.log('🔍 OpenTelemetry tracing initialized');
  
  // Graceful shutdown
  process.on('SIGTERM', () => {
    sdk.shutdown()
      .then(() => console.log('🔍 OpenTelemetry tracing shut down'))
      .catch((error) => console.error('Error shutting down OpenTelemetry', error))
      .finally(() => process.exit(0));
  });

  return sdk;
}

module.exports = {
  initializeTracing,
};
