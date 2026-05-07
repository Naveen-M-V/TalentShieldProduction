'use strict';
/**
 * Supplier Routes
 * Mounted at:  /api/suppliers
 */

const express  = require('express');
const router   = express.Router();
const Supplier = require('../models/Supplier');

// ── GET /api/suppliers ────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const suppliers = await Supplier.find().sort({ usageCount: -1, name: 1 });
    res.json(suppliers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ── GET /api/suppliers/search ─────────────────────────────────────────────
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      const suppliers = await Supplier.find().sort({ usageCount: -1, name: 1 }).limit(50);
      return res.json(suppliers);
    }
    const suppliers = await Supplier.find({ name: { $regex: q, $options: 'i' } })
      .sort({ usageCount: -1, name: 1 });
    res.json(suppliers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ── POST /api/suppliers ───────────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ message: 'Supplier name is required' });
    }
    const trimmed = name.trim();
    let supplier  = await Supplier.findOne({ name: { $regex: new RegExp(`^${trimmed}$`, 'i') } });

    if (supplier) {
      supplier.usageCount += 1;
      await supplier.save();
    } else {
      supplier = await new Supplier({ name: trimmed, createdBy: req.user?.userId, usageCount: 1 }).save();
    }
    res.json(supplier);
  } catch (error) {
    if (error.code === 11000) return res.status(400).json({ message: 'Supplier already exists' });
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
