const compression = require('compression');
const zlib = require('zlib');

/**
 * Custom compression middleware that compresses JSON responses >1KB
 * Prefers Brotli over Gzip for better compression ratios
 */
const smartCompression = compression({
  filter: (req, res) => {
    // Only compress JSON responses
    const contentType = res.getHeader('Content-Type');
    if (!contentType || !contentType.includes('application/json')) {
      return false;
    }
    
    // Check if response size is >1KB (1024 bytes)
    const contentLength = res.getHeader('Content-Length');
    if (contentLength && parseInt(contentLength) <= 1024) {
      return false;
    }
    
    return true;
  },
  threshold: 1024, // Only compress responses larger than 1KB
  level: 6, // Balanced compression level for performance
  strategy: zlib.constants.Z_DEFAULT_STRATEGY,
  
  // Use Brotli if available, fallback to Gzip
  brotli: {
    enabled: true,
    params: {
      [zlib.constants.BROTLI_PARAM_QUALITY]: 6,
      [zlib.constants.BROTLI_PARAM_SIZE_HINT]: 1024,
    },
  },
  
  // Gzip settings as fallback
  gzip: {
    level: 6,
  },
});

module.exports = { smartCompression };
