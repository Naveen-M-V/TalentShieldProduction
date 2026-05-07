'use strict';
/**
 * CORS Middleware Configuration
 * Extracted from server.js — configures Cross-Origin Resource Sharing for the Express app.
 *
 * Usage:  require('./middleware/corsConfig')(app);
 */

const cors = require('cors');

module.exports = function configureCors(app) {
  const isDevelopment =
    process.env.NODE_ENV === 'development' ||
    process.env.PORT === '5003' ||
    process.env.PORT === '5004';

  const corsOriginStr = process.env.CORS_ORIGIN || '';
  const baseOrigins   = corsOriginStr.split(',').map(o => o.trim()).filter(Boolean);

  if (baseOrigins.length === 0 && !isDevelopment) {
    console.warn('⚠️  WARNING: CORS_ORIGIN is not set in a non-development environment!');
    console.warn('⚠️  Set CORS_ORIGIN in .env, e.g.: CORS_ORIGIN=https://yourdomain.com');
  }

  const allowedOrigins = isDevelopment
    ? [...baseOrigins, 'http://localhost:3000', 'http://localhost:3001',
                       'http://localhost:5003', 'http://localhost:1222']
    : baseOrigins;

  console.log('🔧 Allowed CORS origins:', allowedOrigins);

  app.use(cors({
    origin(origin, callback) {
      // Allow all origins in development for easier testing
      if (isDevelopment) return callback(null, true);
      // Allow Postman / mobile / curl (no Origin header)
      if (!origin) return callback(null, true);
      if (allowedOrigins.length === 0) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.log('❌ CORS rejected origin:', origin);
        callback(null, false); // Instead of error, just reject silently
      }
    },
    credentials:    true,
    methods:        ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With',
                     'Cache-Control', 'cache-control', 'Pragma', 'pragma',
                     'Accept', 'If-None-Match', 'Expires'],
    exposedHeaders: ['Set-Cookie'],
  }));
};
