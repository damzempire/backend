'use strict';

const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { JaegerExporter } = require('@opentelemetry/exporter-jaeger');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-grpc');
const { Resource } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');
const { ConsoleSpanExporter, SimpleSpanProcessor } = require('@opentelemetry/sdk-trace-node');
const { trace } = require('@opentelemetry/api');

// Configuration for OpenTelemetry
const OTEL_CONFIG = {
  serviceName: process.env.OTEL_SERVICE_NAME || 'vesting-vault-backend',
  serviceVersion: process.env.npm_package_version || '1.0.0',
  jaegerEndpoint: process.env.OTEL_EXPORTER_JAEGER_ENDPOINT || 'http://localhost:14268/api/traces',
  otlpEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4317',
  enableConsoleExport: process.env.OTEL_CONSOLE_EXPORT === 'true',
  tracesSampleRate: parseFloat(process.env.OTEL_TRACES_SAMPLE_RATE) || 1.0,
};

// Create resource with service metadata
const resource = new Resource({
  [SemanticResourceAttributes.SERVICE_NAME]: OTEL_CONFIG.serviceName,
  [SemanticResourceAttributes.SERVICE_VERSION]: OTEL_CONFIG.serviceVersion,
  [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
});

// Configure span exporters
const exporters = [];

// Add Jaeger exporter (primary)
if (process.env.ENABLE_JAEGER !== 'false') {
  exporters.push(
    new JaegerExporter({
      endpoint: OTEL_CONFIG.jaegerEndpoint,
    })
  );
}

// Add OTLP exporter (alternative)
if (process.env.ENABLE_OTLP === 'true') {
  exporters.push(
    new OTLPTraceExporter({
      url: OTEL_CONFIG.otlpEndpoint,
    })
  );
}

// Add console exporter for debugging
if (OTEL_CONFIG.enableConsoleExport) {
  exporters.push(new ConsoleSpanExporter());
}

// Initialize the SDK with auto-instrumentations
const sdk = new NodeSDK({
  resource,
  spanProcessor: new SimpleSpanProcessor(exporters.length > 0 ? exporters[0] : new ConsoleSpanExporter()),
  traceExporter: exporters.length > 0 ? exporters[0] : undefined,
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-http': {
        enabled: true,
        requestHook: (span, request) => {
          // Add custom attributes to HTTP requests
          if (request.method && request.path) {
            span.setAttribute('http.custom_method', request.method);
          }
        },
      },
      '@opentelemetry/instrumentation-express': {
        enabled: true,
        requestHook: (span, request) => {
          // Add request-specific attributes
          if (request.user && request.user.address) {
            span.setAttribute('user.address', request.user.address);
          }
          if (request.headers['x-request-id']) {
            span.setAttribute('http.request_id', request.headers['x-request-id']);
          }
        },
      },
    }),
  ],
  sampler: {
    shouldSample: () => {
      return {
        decision: Math.random() < OTEL_CONFIG.tracesSampleRate ? 1 : 0,
        attributes: {},
      };
    },
  },
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  await sdk.shutdown();
  console.log('OpenTelemetry SDK shut down successfully');
});

process.on('SIGINT', async () => {
  await sdk.shutdown();
  console.log('OpenTelemetry SDK shut down successfully');
});

// Initialize tracing before anything else
try {
  sdk.start();
  console.log(`✅ OpenTelemetry SDK started successfully for service: ${OTEL_CONFIG.serviceName}`);
  console.log(`📊 Tracing enabled with sample rate: ${OTEL_CONFIG.tracesSampleRate * 100}%`);
  if (process.env.ENABLE_JAEGER !== 'false') {
    console.log(`🔍 Jaeger exporter configured: ${OTEL_CONFIG.jaegerEndpoint}`);
  }
} catch (error) {
  console.error('❌ Failed to initialize OpenTelemetry SDK:', error);
}

// Helper function to get tracer
function getTracer(name = OTEL_CONFIG.serviceName) {
  return trace.getTracer(name);
}

// Helper function to extract trace context from headers
function extractTraceContext(headers) {
  const { propagation } = require('@opentelemetry/api');
  const context = propagation.extract(propagation.active(), headers);
  return context;
}

// Helper function to inject trace context into headers
function injectTraceContext(headers = {}) {
  const { propagation } = require('@opentelemetry/api');
  const context = propagation.inject(propagation.active(), headers);
  return context;
}

module.exports = {
  sdk,
  getTracer,
  extractTraceContext,
  injectTraceContext,
  OTEL_CONFIG,
};
