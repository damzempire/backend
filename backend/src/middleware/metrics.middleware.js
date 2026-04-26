const { apiResponseTime } = require('../services/metricsService');

const metricsMiddleware = (req, res, next) => {
  const start = process.hrtime();

  res.on('finish', () => {
    const duration = process.hrtime(start);
    const durationInSeconds = duration[0] + duration[1] / 1e9;
    
    // Extract route pattern if possible (e.g., from req.route.path)
    const route = req.route ? req.route.path : req.path;
    
    apiResponseTime.observe(
      {
        method: req.method,
        route: route,
        status_code: res.statusCode
      },
      durationInSeconds
    );
  });

  next();
};

module.exports = { metricsMiddleware };
