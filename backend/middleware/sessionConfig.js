'use strict';
/**
 * Session Middleware Configuration
 * Extracted from server.js — wires up express-session with MongoDB persistence.
 *
 * Usage:  require('./middleware/sessionConfig')(app, { mongoUri, jwtSecret });
 */

const session    = require('express-session');
const MongoStore = require('connect-mongo');

module.exports = function configureSession(app, { mongoUri, jwtSecret }) {
  app.use(session({
    secret: process.env.SESSION_SECRET || jwtSecret,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl:    mongoUri,
      touchAfter:  24 * 3600,           // Lazy update: re-save at most once per 24h
      ttl:         14 * 24 * 60 * 60,   // Session TTL: 14 days (seconds)
      autoRemove:  'native'
    }),
    cookie: {
      secure:   process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge:   14 * 24 * 60 * 60 * 1000, // 14 days (ms)
      sameSite: 'lax',
      domain:   undefined   // Same-origin only
    },
    name: 'talentshield.sid'
  }));
};
