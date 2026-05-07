const path = require('path');
const fs = require('fs');

/**
 * Environment configuration loader
 * Loads the appropriate .env file based on NODE_ENV
 */
class EnvironmentConfig {
  constructor() {
    this.environment = process.env.NODE_ENV || 'development';
    this.loadEnvironmentFile();
  }

  loadEnvironmentFile() {
    const envFiles = {
      development: '.env',
      staging: '.env.deployment', 
      production: '.env.production'
    };

    const envFile = envFiles[this.environment] || '.env';
    const envPath = path.resolve(process.cwd(), envFile);

    // Check if environment file exists
if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
  console.log(`✅ Loaded environment: ${this.environment} from ${envFile}`);
} else {
  const fallbackPath = path.resolve(process.cwd(), '.env');
  if (envFile !== '.env' && fs.existsSync(fallbackPath)) {
    require('dotenv').config({ path: fallbackPath });
    console.log(`✅ Loaded environment: ${this.environment} from .env`);
  } else {
    console.warn(`⚠️ Environment file not found: ${envFile}. No environment variables loaded.`);
  }
}

    // Validate required environment variables
    this.validateRequiredVars();
  }

  validateRequiredVars() {
    // These are always required in every environment
    const alwaysRequired = [
      'MONGODB_URI',
      'JWT_SECRET',
      'SESSION_SECRET'
    ];

    // Email is required in production but optional in development
    const productionRequired = [
      'EMAIL_HOST',
      'EMAIL_USER',
      'EMAIL_PASS'
    ];

    const isDev = this.environment === 'development';
    const required = isDev ? alwaysRequired : [...alwaysRequired, ...productionRequired];

    const missingVars = required.filter(varName => !process.env[varName]);

    if (missingVars.length > 0) {
      console.error('❌ Missing required environment variables:', missingVars);
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }

    // JWT_SECRET must be at least 32 characters in production — shorter secrets
    // are trivially brute-forceable offline against a stolen JWT.
    if (!isDev && process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
      throw new Error('JWT_SECRET must be at least 32 characters long in staging/production');
    }

    if (isDev) {
      const missingEmail = productionRequired.filter(v => !process.env[v]);
      if (missingEmail.length > 0) {
        console.warn('⚠️  Email env vars not set (email features disabled in dev):', missingEmail.join(', '));
      }
    }

    console.log('✅ All required environment variables are present');
  }

  getConfig() {
    return {
      environment: this.environment,
      database: {
        uri: process.env.MONGODB_URI,
        maxPoolSize: parseInt(process.env.DB_MAX_POOL_SIZE) || 10,
        minPoolSize: parseInt(process.env.DB_MIN_POOL_SIZE) || 2
      },
      server: {
        port: parseInt(process.env.PORT) || 5003,
        corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000'
      },
      jwt: {
        secret: process.env.JWT_SECRET,
        expiresIn: process.env.JWT_EXPIRES_IN || '24h'
      },
      session: {
        secret: process.env.SESSION_SECRET
      },
      email: {
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT) || 587,
        secure: process.env.EMAIL_SECURE === 'true',
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
        from: process.env.EMAIL_FROM
      },
      upload: {
        maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 5242880,
        uploadPath: process.env.UPLOAD_PATH || 'uploads/'
      },
      security: {
        rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
        rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
      },
      logging: {
        level: process.env.LOG_LEVEL || 'info',
        filePath: process.env.LOG_FILE_PATH
      },
      ssl: {
        certPath: process.env.SSL_CERT_PATH,
        keyPath: process.env.SSL_KEY_PATH
      },
      cache: {
        redisUrl: process.env.REDIS_URL,
        ttl: parseInt(process.env.CACHE_TTL) || 3600
      },
      testing: {
        enableTestRoutes: process.env.ENABLE_TEST_ROUTES === 'true',
        mockEmailSending: process.env.MOCK_EMAIL_SENDING === 'true',
        debugMode: process.env.DEBUG_MODE === 'true'
      }
    };
  }

  isDevelopment() {
    return this.environment === 'development';
  }

  isProduction() {
    return this.environment === 'production';
  }

  isStaging() {
    return this.environment === 'staging';
  }
}

module.exports = new EnvironmentConfig();
