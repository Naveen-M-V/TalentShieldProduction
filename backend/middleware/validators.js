'use strict';
/**
 * Request Body Validators
 * Extracted from server.js — reusable middleware for common validation patterns.
 */

const validateProfileInput = (req, res, next) => {
  const { firstName, lastName, email } = req.body;

  if (!firstName || firstName.trim().length < 1) {
    return res.status(400).json({ message: 'First name is required' });
  }
  if (!lastName || lastName.trim().length < 1) {
    return res.status(400).json({ message: 'Last name is required' });
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ message: 'Valid email is required' });
  }

  next();
};

const validateCertificateInput = (req, res, next) => {
  const { certificate, category } = req.body;

  if (!certificate || certificate.trim().length < 1) {
    return res.status(400).json({
      message: 'Certificate name is required',
      received: { certificate, category }
    });
  }
  if (!category || category.trim().length < 1) {
    return res.status(400).json({
      message: 'Certificate category is required',
      received: { certificate, category }
    });
  }

  next();
};

module.exports = { validateProfileInput, validateCertificateInput };
