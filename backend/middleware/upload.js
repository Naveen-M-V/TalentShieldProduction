'use strict';
/**
 * Multer Upload Middleware
 * Extracted from server.js — in-memory storage, 10 MB limit, PDF/image filter.
 *
 * Usage:  const upload = require('./middleware/upload');
 *         router.post('/route', upload.single('fieldName'), handler);
 */

const multer = require('multer');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter(_req, file, cb) {
    const allowed = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, JPEG, and PNG files are allowed'), false);
    }
  },
});

module.exports = upload;
