const { trace, SpanStatusCode, SpanKind } = require('@opentelemetry/api');

const tracer = trace.getTracer('vesting-vault-backend');

class TracingUtils {
  static async traceAsyncOperation(name, operation, attributes = {}) {
    const span = tracer.startSpan(name, {
      kind: SpanKind.INTERNAL,
      attributes: {
        'service.name': 'vesting-vault-backend',
        ...attributes
      }
    });

    try {
      const result = await operation();
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error.message
      });
      span.recordException(error);
      throw error;
    } finally {
      span.end();
    }
  }

  static traceDatabaseQuery(queryType, tableName, queryFn) {
    return this.traceAsyncOperation(
      `database.query.${queryType}`,
      queryFn,
      {
        'db.type': 'postgresql',
        'db.table': tableName,
        'db.operation': queryType
      }
    );
  }

  static traceRedisOperation(operationType, keyPattern, operationFn) {
    return this.traceAsyncOperation(
      `redis.${operationType}`,
      operationFn,
      {
        'cache.type': 'redis',
        'cache.operation': operationType,
        'cache.key_pattern': keyPattern
      }
    );
  }

  static traceExternalAPICall(serviceName, endpoint, method, operationFn) {
    return this.traceAsyncOperation(
      `external_api.${serviceName}.${method}`,
      operationFn,
      {
        'http.method': method,
        'http.url': endpoint,
        'external_service.name': serviceName
      }
    );
  }

  static traceBusinessOperation(operationName, operationFn, attributes = {}) {
    return this.traceAsyncOperation(
      `business.${operationName}`,
      operationFn,
      {
        'operation.type': 'business_logic',
        ...attributes
      }
    );
  }

  static addSpanAttributes(attributes) {
    const activeSpan = trace.getActiveSpan();
    if (activeSpan) {
      Object.entries(attributes).forEach(([key, value]) => {
        activeSpan.setAttribute(key, value);
      });
    }
  }

  static addSpanEvent(name, attributes = {}) {
    const activeSpan = trace.getActiveSpan();
    if (activeSpan) {
      activeSpan.addEvent(name, attributes);
    }
  }
}

module.exports = TracingUtils;
